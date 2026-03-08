import { unzipSync } from 'fflate'
import initSqlJs from 'sql.js'
import { appDb, type RankiDb } from '@/db/app-db'
import { createCard, type CardDraft } from '@/db/cards'
import { createDeck } from '@/db/decks'
import { prepareBackImageDraft } from '@/db/media-assets'
import {
  decodeAnkiMediaPayload,
  loadMediaEntryIdsByFileName,
  maybeDecompressZstd,
} from '@/importers/anki-apkg-media'
import {
  buildImportedCardContent,
  splitAnkiFields,
} from '@/importers/anki-apkg-mapping'
import { locateSqlJsFile } from '@/importers/sqljs-wasm-url'

interface SqlJsDatabase {
  exec(sql: string): Array<{
    columns: string[]
    values: unknown[][]
  }>
  close(): void
}

interface ParsedImportedCard {
  frontText: string
  backText: string
  imageFileName: string | null
}

interface ParsedImportedDeck {
  name: string
  cards: ParsedImportedCard[]
}

export interface ImportedDeckSummary {
  id: string
  name: string
  cardCount: number
}

export interface ApkgImportSummary {
  deckCount: number
  cardCount: number
  skippedCardCount: number
  importedImageCount: number
  skippedImageCount: number
  decks: ImportedDeckSummary[]
}

let sqlJsPromise: Promise<{
  Database: new (data?: Uint8Array) => SqlJsDatabase
}> | null = null

function getSqlJs() {
  sqlJsPromise ??= initSqlJs({
    locateFile: locateSqlJsFile,
  })

  return sqlJsPromise
}

function queryRows(database: SqlJsDatabase, sql: string) {
  return database.exec(sql)[0]?.values ?? []
}

function hasTable(database: SqlJsDatabase, tableName: string) {
  return queryRows(
    database,
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${tableName}'`,
  ).length > 0
}

function getSingleTextValue(database: SqlJsDatabase, sql: string) {
  const row = queryRows(database, sql)[0]

  if (!row || typeof row[0] !== 'string' || row[0].length === 0) {
    return null
  }

  return row[0]
}

function loadDeckNames(database: SqlJsDatabase) {
  const deckNames = new Map<number, string>()

  if (hasTable(database, 'decks')) {
    for (const [id, name] of queryRows(database, 'SELECT id, name FROM decks')) {
      if (typeof id === 'number' && typeof name === 'string' && name.trim()) {
        deckNames.set(id, name.trim())
      }
    }

    return deckNames
  }

  const rawDecks = getSingleTextValue(database, 'SELECT decks FROM col LIMIT 1')

  if (!rawDecks) {
    return deckNames
  }

  const parsedDecks = JSON.parse(rawDecks) as Record<
    string,
    { name?: string }
  >

  for (const [deckId, deck] of Object.entries(parsedDecks)) {
    const parsedDeckId = Number(deckId)

    if (Number.isFinite(parsedDeckId) && deck.name?.trim()) {
      deckNames.set(parsedDeckId, deck.name.trim())
    }
  }

  return deckNames
}

function loadFieldNamesByModelId(database: SqlJsDatabase) {
  const fieldsByModelId = new Map<number, string[]>()

  if (hasTable(database, 'fields')) {
    for (const [modelId, fieldOrd, fieldName] of queryRows(
      database,
      'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord',
    )) {
      if (
        typeof modelId !== 'number' ||
        typeof fieldOrd !== 'number' ||
        typeof fieldName !== 'string'
      ) {
        continue
      }

      const existing = fieldsByModelId.get(modelId) ?? []
      existing[fieldOrd] = fieldName
      fieldsByModelId.set(modelId, existing)
    }

    return fieldsByModelId
  }

  const rawModels = getSingleTextValue(database, 'SELECT models FROM col LIMIT 1')

  if (!rawModels) {
    return fieldsByModelId
  }

  const parsedModels = JSON.parse(rawModels) as Record<
    string,
    { flds?: Array<{ name?: string }> }
  >

  for (const [modelId, model] of Object.entries(parsedModels)) {
    const parsedModelId = Number(modelId)

    if (!Number.isFinite(parsedModelId)) {
      continue
    }

    fieldsByModelId.set(
      parsedModelId,
      (model.flds ?? []).map((field) => field.name?.trim() || ''),
    )
  }

  return fieldsByModelId
}

function inferImageMimeType(fileName: string) {
  const normalizedExtension = fileName.split('.').pop()?.toLowerCase()

  switch (normalizedExtension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    default:
      return null
  }
}

function makeUniqueDeckName(
  baseName: string,
  existingNames: Set<string>,
) {
  if (!existingNames.has(baseName)) {
    existingNames.add(baseName)
    return baseName
  }

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidate = `${baseName} (${suffix})`

    if (!existingNames.has(candidate)) {
      existingNames.add(candidate)
      return candidate
    }
  }

  throw new Error(`Could not allocate a unique deck name for ${baseName}.`)
}

function loadCollectionBytes(entries: Record<string, Uint8Array>) {
  const collectionEntry =
    entries['collection.anki21b'] ??
    entries['collection.anki21'] ??
    entries['collection.anki2']

  if (!collectionEntry) {
    throw new Error('This Anki package does not contain a supported collection file.')
  }

  return maybeDecompressZstd(collectionEntry)
}

function parseImportedDecks(
  database: SqlJsDatabase,
  deckNamesById: ReadonlyMap<number, string>,
  fieldNamesByModelId: ReadonlyMap<number, string[]>,
) {
  const parsedDecks = new Map<number, ParsedImportedDeck>()
  let skippedCardCount = 0

  for (const [deckId, modelId, rawFields] of queryRows(
    database,
    'SELECT c.did, n.mid, n.flds FROM cards c JOIN notes n ON n.id = c.nid WHERE c.ord = 0 ORDER BY c.did, c.id',
  )) {
    if (
      typeof deckId !== 'number' ||
      typeof modelId !== 'number' ||
      typeof rawFields !== 'string'
    ) {
      skippedCardCount += 1
      continue
    }

    const fieldNames = fieldNamesByModelId.get(modelId)

    if (!fieldNames || fieldNames.length === 0) {
      skippedCardCount += 1
      continue
    }

    const cardContent = buildImportedCardContent(
      splitAnkiFields(rawFields, fieldNames),
    )

    if (!cardContent) {
      skippedCardCount += 1
      continue
    }

    const deckName =
      deckNamesById.get(deckId)?.trim() || 'Imported Anki Deck'
    const parsedDeck = parsedDecks.get(deckId) ?? {
      name: deckName,
      cards: [],
    }

    parsedDeck.cards.push(cardContent)
    parsedDecks.set(deckId, parsedDeck)
  }

  return {
    decks: [...parsedDecks.values()],
    skippedCardCount,
  }
}

async function buildCardDraft(
  card: ParsedImportedCard,
  mediaEntryIdsByFileName: ReadonlyMap<string, string>,
  entries: Record<string, Uint8Array>,
) {
  const draft: CardDraft = {
    frontText: card.frontText,
    backText: card.backText,
  }

  if (!card.imageFileName) {
    return {
      draft,
      importedImage: false,
      skippedImage: false,
    }
  }

  const entryId = mediaEntryIdsByFileName.get(card.imageFileName)

  if (!entryId) {
    return {
      draft,
      importedImage: false,
      skippedImage: true,
    }
  }

  const imageBytes = entries[entryId]
  const mimeType = inferImageMimeType(card.imageFileName)

  if (!imageBytes || !mimeType) {
    return {
      draft,
      importedImage: false,
      skippedImage: true,
    }
  }

  try {
    const decodedImageBytes = decodeAnkiMediaPayload(imageBytes)
    const imageBuffer = decodedImageBytes.buffer.slice(
      decodedImageBytes.byteOffset,
      decodedImageBytes.byteOffset + decodedImageBytes.byteLength,
    ) as ArrayBuffer
    const imageFile = new File([imageBuffer], card.imageFileName, {
      type: mimeType,
    })

    return {
      draft: {
        ...draft,
        backImage: await prepareBackImageDraft(imageFile),
      },
      importedImage: true,
      skippedImage: false,
    }
  } catch {
    return {
      draft,
      importedImage: false,
      skippedImage: true,
    }
  }
}

export async function importAnkiPackage(
  file: File,
  database: RankiDb = appDb,
): Promise<ApkgImportSummary> {
  if (!file.name.toLowerCase().endsWith('.apkg')) {
    throw new Error('Choose an Anki .apkg package.')
  }

  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const collectionBytes = loadCollectionBytes(entries)
  const SQL = await getSqlJs()
  const sqliteDatabase = new SQL.Database(collectionBytes)

  try {
    const deckNamesById = loadDeckNames(sqliteDatabase)
    const fieldNamesByModelId = loadFieldNamesByModelId(sqliteDatabase)
    const mediaEntryIdsByFileName = await loadMediaEntryIdsByFileName(entries)
    const parsedImport = parseImportedDecks(
      sqliteDatabase,
      deckNamesById,
      fieldNamesByModelId,
    )

    if (parsedImport.decks.length === 0) {
      throw new Error(
        'No supported cards were found in this package. Right now Ranki imports only the first front/back-style card from each Anki note.',
      )
    }

    const existingDeckNames = new Set(
      (await database.decks.toArray()).map((deck) => deck.name),
    )
    const importedDecks: ImportedDeckSummary[] = []
    let importedCardCount = 0
    let importedImageCount = 0
    let skippedImageCount = 0

    for (const parsedDeck of parsedImport.decks) {
      const createdDeck = await createDeck(
        {
          name: makeUniqueDeckName(parsedDeck.name, existingDeckNames),
          description: `Imported from ${file.name}. Audio, source links, and Anki scheduling were not preserved.`,
        },
        database,
      )

      for (const card of parsedDeck.cards) {
        const { draft, importedImage, skippedImage } = await buildCardDraft(
          card,
          mediaEntryIdsByFileName,
          entries,
        )

        if (importedImage) {
          importedImageCount += 1
        }

        if (skippedImage) {
          skippedImageCount += 1
        }

        await createCard(createdDeck.id, draft, database)
        importedCardCount += 1
      }

      importedDecks.push({
        id: createdDeck.id,
        name: createdDeck.name,
        cardCount: parsedDeck.cards.length,
      })
    }

    return {
      deckCount: importedDecks.length,
      cardCount: importedCardCount,
      skippedCardCount: parsedImport.skippedCardCount,
      importedImageCount,
      skippedImageCount,
      decks: importedDecks,
    }
  } finally {
    sqliteDatabase.close()
  }
}
