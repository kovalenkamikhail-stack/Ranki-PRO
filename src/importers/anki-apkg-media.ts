import { decompress as decompressZstd } from 'fzstd'

const textDecoder = new TextDecoder()
const ZSTD_MAGIC_HEADER = [0x28, 0xb5, 0x2f, 0xfd] as const

export interface AnkiMediaManifestRecord {
  fileName: string
  sizeBytes: number
  sha1: string
}

interface ParsedVarint {
  value: bigint
  nextOffset: number
}

function readVarint(bytes: Uint8Array, startOffset: number): ParsedVarint {
  let value = 0n
  let shift = 0n
  let offset = startOffset

  while (offset < bytes.length) {
    const byte = bytes[offset]
    value |= BigInt(byte & 0x7f) << shift
    offset += 1

    if ((byte & 0x80) === 0) {
      return {
        value,
        nextOffset: offset,
      }
    }

    shift += 7n
  }

  throw new Error('The Anki media manifest contained an invalid varint.')
}

function readLengthDelimitedField(bytes: Uint8Array, startOffset: number) {
  const length = readVarint(bytes, startOffset)
  const nextOffset = length.nextOffset + Number(length.value)

  if (nextOffset > bytes.length) {
    throw new Error('The Anki media manifest ended unexpectedly.')
  }

  return {
    valueBytes: bytes.slice(length.nextOffset, nextOffset),
    nextOffset,
  }
}

function parseModernAnkiMediaManifestRecord(bytes: Uint8Array) {
  let offset = 0
  let fileName = ''
  let sizeBytes = 0
  let sha1 = ''

  while (offset < bytes.length) {
    const key = readVarint(bytes, offset)
    const fieldNumber = Number(key.value >> 3n)
    const wireType = Number(key.value & 7n)
    offset = key.nextOffset

    if (wireType === 0) {
      const value = readVarint(bytes, offset)
      offset = value.nextOffset

      if (fieldNumber === 2) {
        sizeBytes = Number(value.value)
      }

      continue
    }

    if (wireType !== 2) {
      throw new Error('The Anki media manifest used an unsupported field format.')
    }

    const value = readLengthDelimitedField(bytes, offset)
    offset = value.nextOffset

    if (fieldNumber === 1) {
      fileName = textDecoder.decode(value.valueBytes).trim()
    } else if (fieldNumber === 3) {
      sha1 = [...value.valueBytes]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
    }
  }

  if (!fileName) {
    throw new Error('The Anki media manifest contained a blank file name.')
  }

  return {
    fileName,
    sizeBytes,
    sha1,
  } satisfies AnkiMediaManifestRecord
}

export function isZstdBuffer(bytes: Uint8Array) {
  return ZSTD_MAGIC_HEADER.every((byte, index) => bytes[index] === byte)
}

export function maybeDecompressZstd(bytes: Uint8Array) {
  return isZstdBuffer(bytes) ? decompressZstd(bytes) : bytes
}

export function parseModernAnkiMediaManifest(bytes: Uint8Array) {
  const normalizedBytes = maybeDecompressZstd(bytes)
  const records: AnkiMediaManifestRecord[] = []
  let offset = 0

  while (offset < normalizedBytes.length) {
    const key = readVarint(normalizedBytes, offset)
    const fieldNumber = Number(key.value >> 3n)
    const wireType = Number(key.value & 7n)
    offset = key.nextOffset

    if (fieldNumber !== 1 || wireType !== 2) {
      throw new Error('The Anki media manifest had an unexpected top-level field.')
    }

    const value = readLengthDelimitedField(normalizedBytes, offset)
    offset = value.nextOffset
    records.push(parseModernAnkiMediaManifestRecord(value.valueBytes))
  }

  return records
}

export function decodeAnkiMediaPayload(bytes: Uint8Array) {
  return maybeDecompressZstd(bytes)
}

async function sha1Hex(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  const digest = await crypto.subtle.digest('SHA-1', buffer)

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getMediaFingerprint(sizeBytes: number, sha1: string) {
  return `${sizeBytes}:${sha1}`
}

export async function loadMediaEntryIdsByFileName(
  entries: Record<string, Uint8Array>,
) {
  const mediaEntry = entries.media

  if (!mediaEntry) {
    return new Map<string, string>()
  }

  const normalizedMediaEntry = maybeDecompressZstd(mediaEntry)
  const mediaMapText = textDecoder.decode(normalizedMediaEntry).trim()

  if (mediaMapText.startsWith('{')) {
    const mediaMap = JSON.parse(mediaMapText) as Record<string, string>

    return new Map(
      Object.entries(mediaMap).map(([entryId, fileName]) => [fileName, entryId]),
    )
  }

  const numberedEntryIds = Object.keys(entries)
    .filter((entryName) => /^\d+$/.test(entryName))
    .sort((left, right) => Number(left) - Number(right))

  const manifestRecords = parseModernAnkiMediaManifest(normalizedMediaEntry)
  const entryIdsByFingerprint = new Map<string, string[]>()

  for (const entryId of numberedEntryIds) {
    const decodedPayload = decodeAnkiMediaPayload(entries[entryId])
    const fingerprint = getMediaFingerprint(
      decodedPayload.byteLength,
      await sha1Hex(decodedPayload),
    )
    const existing = entryIdsByFingerprint.get(fingerprint) ?? []
    existing.push(entryId)
    entryIdsByFingerprint.set(fingerprint, existing)
  }

  const mediaEntryIdsByFileName = new Map<string, string>()

  for (const manifestRecord of manifestRecords) {
    const fingerprint = getMediaFingerprint(
      manifestRecord.sizeBytes,
      manifestRecord.sha1,
    )
    const matchingEntryIds = entryIdsByFingerprint.get(fingerprint)

    if (!matchingEntryIds || matchingEntryIds.length === 0) {
      throw new Error(
        `This Anki package uses a media manifest entry that Ranki could not match for "${manifestRecord.fileName}".`,
      )
    }

    mediaEntryIdsByFileName.set(
      manifestRecord.fileName,
      matchingEntryIds.shift()!,
    )
  }

  return mediaEntryIdsByFileName
}
