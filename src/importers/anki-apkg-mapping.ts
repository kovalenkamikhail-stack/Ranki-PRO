export interface ImportedCardContent {
  frontText: string
  backText: string
  imageFileName: string | null
}

const FIELD_SEPARATOR = '\u001f'
const SOUND_TAG_PATTERN = /\[sound:[^\]]+\]/gi
const IMAGE_SOURCE_PATTERN = /<img[^>]+src=["']([^"']+)["'][^>]*>/i

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function stripSoundTags(value: string) {
  return value.replace(SOUND_TAG_PATTERN, ' ')
}

function toLookup(fields: Record<string, string>) {
  return new Map(
    Object.entries(fields).map(([name, value]) => [name.trim().toLowerCase(), value]),
  )
}

function pickField(
  lookup: ReadonlyMap<string, string>,
  candidates: readonly string[],
) {
  for (const candidate of candidates) {
    const value = lookup.get(candidate.toLowerCase())

    if (value && value.trim().length > 0) {
      return value
    }
  }

  return ''
}

export function splitAnkiFields(
  rawFields: string,
  orderedFieldNames: readonly string[],
) {
  const rawValues = rawFields.split(FIELD_SEPARATOR)
  const fieldMap: Record<string, string> = {}

  orderedFieldNames.forEach((fieldName, index) => {
    fieldMap[fieldName] = rawValues[index] ?? ''
  })

  return fieldMap
}

export function extractImageFileName(value: string) {
  const match = value.match(IMAGE_SOURCE_PATTERN)

  return match?.[1]?.trim() || null
}

function collectGlossListText(documentFragment: Document) {
  const glosses = [
    ...documentFragment.querySelectorAll('[data-sc-content="glosses"] > li'),
  ]
    .map((node) => normalizeWhitespace(node.textContent ?? ''))
    .filter((text) => text.length > 0)

  return glosses.join('; ')
}

export function htmlToPlainText(
  value: string,
  options: {
    preferGlossList?: boolean
  } = {},
) {
  const stripped = stripSoundTags(value)

  if (!stripped.includes('<')) {
    return normalizeWhitespace(stripped)
  }

  const documentFragment = new DOMParser().parseFromString(
    stripped,
    'text/html',
  )

  documentFragment
    .querySelectorAll('details, script, style, audio, [data-sc-content="backlink"]')
    .forEach((node) => node.remove())

  if (options.preferGlossList) {
    const glossListText = collectGlossListText(documentFragment)

    if (glossListText) {
      return glossListText
    }
  }

  return normalizeWhitespace(documentFragment.body.textContent ?? '')
}

function formatLabeledSection(label: string, value: string) {
  return `${label}: ${value}`
}

function buildSentenceFromClozeParts(fields: ReadonlyMap<string, string>) {
  const prefix = htmlToPlainText(
    pickField(fields, ['Cloze-Prefix', 'Cloze Prefix']),
  )
  const body = htmlToPlainText(
    pickField(fields, ['Cloze-Body', 'Cloze Body']),
  )
  const suffix = htmlToPlainText(
    pickField(fields, ['Cloze-Suffix', 'Cloze Suffix']),
  )

  if (!body) {
    return ''
  }

  return normalizeWhitespace(
    [prefix, body, suffix]
      .filter((part) => part.length > 0)
      .join(' '),
  ).replace(/\s+([,.;!?])/g, '$1')
}

function isStandaloneLinkText(value: string) {
  return /^https?:\/\/\S+$/i.test(value)
}

export function buildImportedCardContent(fields: Record<string, string>) {
  const lookup = toLookup(fields)
  const frontText = normalizeWhitespace(
    pickField(lookup, ['Expression', 'Front', 'Word', 'Question']),
  )
  const meaningText = htmlToPlainText(
    pickField(lookup, ['Meaning', 'Back', 'Definition', 'Answer']),
    {
      preferGlossList: true,
    },
  )
  const sentenceTranslationText = htmlToPlainText(
    pickField(lookup, ['Sentence-Translation', 'Sentence Translation']),
  )
  const clozeSentenceText = buildSentenceFromClozeParts(lookup)
  const fullSentenceText = htmlToPlainText(
    pickField(lookup, ['Full-Sentence', 'Full Sentence']),
  )
  const exampleText = htmlToPlainText(
    pickField(lookup, ['Examples', 'Sentence']),
  )
  const contextSentenceText =
    clozeSentenceText ||
    fullSentenceText ||
    (exampleText && !isStandaloneLinkText(exampleText) ? exampleText : '')
  const imageFileName = extractImageFileName(
    pickField(lookup, ['Image']),
  )
  const backSections = [
    meaningText,
    sentenceTranslationText
      ? formatLabeledSection('Sentence translation', sentenceTranslationText)
      : '',
    contextSentenceText
      ? formatLabeledSection('Sentence', contextSentenceText)
      : '',
  ].filter((section) => section.length > 0)

  if (!frontText || backSections.length === 0) {
    return null
  }

  return {
    frontText,
    backText: backSections.join('\n\n'),
    imageFileName,
  } satisfies ImportedCardContent
}
