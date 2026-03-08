import { describe, expect, it } from 'vitest'
import {
  decodeAnkiMediaPayload,
  loadMediaEntryIdsByFileName,
  parseModernAnkiMediaManifest,
} from '@/importers/anki-apkg-media'

function encodeVarint(value: number) {
  const bytes: number[] = []
  let remaining = value >>> 0

  while (remaining >= 0x80) {
    bytes.push((remaining & 0x7f) | 0x80)
    remaining >>>= 7
  }

  bytes.push(remaining)

  return Uint8Array.from(bytes)
}

function encodeLengthDelimitedField(fieldNumber: number, valueBytes: Uint8Array) {
  return Uint8Array.from([
    ...encodeVarint((fieldNumber << 3) | 2),
    ...encodeVarint(valueBytes.length),
    ...valueBytes,
  ])
}

function encodeVarintField(fieldNumber: number, value: number) {
  return Uint8Array.from([
    ...encodeVarint(fieldNumber << 3),
    ...encodeVarint(value),
  ])
}

function concatBytes(...parts: Uint8Array[]) {
  return Uint8Array.from(parts.flatMap((part) => [...part]))
}

function hexToBytes(value: string) {
  return Uint8Array.from(
    value.match(/.{1,2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [],
  )
}

function buildModernManifestRecord(input: {
  fileName: string
  sizeBytes: number
  sha1: string
}) {
  const nestedRecord = concatBytes(
    encodeLengthDelimitedField(
      1,
      new TextEncoder().encode(input.fileName),
    ),
    encodeVarintField(2, input.sizeBytes),
    encodeLengthDelimitedField(3, hexToBytes(input.sha1)),
  )

  return encodeLengthDelimitedField(1, nestedRecord)
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

describe('anki apkg media helpers', () => {
  it('loads the legacy json media map', () => {
    const entries = {
      media: new TextEncoder().encode('{"0":"hello.png","14":"word.mp3"}'),
    }

    return expect(loadMediaEntryIdsByFileName(entries)).resolves.toEqual(
      new Map([
        ['hello.png', '0'],
        ['word.mp3', '14'],
      ]),
    )
  })

  it('parses the modern manifest format and maps archive ids by payload fingerprint', async () => {
    const firstPayload = new Uint8Array([1, 2, 3, 4])
    const secondPayload = new Uint8Array([5, 6, 7])
    const firstPayloadSha1 = await sha1Hex(firstPayload)
    const secondPayloadSha1 = await sha1Hex(secondPayload)
    const manifest = concatBytes(
      buildModernManifestRecord({
        fileName: 'hello.png',
        sizeBytes: firstPayload.byteLength,
        sha1: firstPayloadSha1,
      }),
      buildModernManifestRecord({
        fileName: 'sentence.webp',
        sizeBytes: secondPayload.byteLength,
        sha1: secondPayloadSha1,
      }),
    )
    const entries = {
      0: secondPayload,
      1: firstPayload,
      media: manifest,
    }

    expect(parseModernAnkiMediaManifest(manifest)).toEqual([
      {
        fileName: 'hello.png',
        sizeBytes: firstPayload.byteLength,
        sha1: firstPayloadSha1,
      },
      {
        fileName: 'sentence.webp',
        sizeBytes: secondPayload.byteLength,
        sha1: secondPayloadSha1,
      },
    ])
    await expect(loadMediaEntryIdsByFileName(entries)).resolves.toEqual(
      new Map([
        ['hello.png', '1'],
        ['sentence.webp', '0'],
      ]),
    )
  })

  it('fails loudly when the modern media manifest cannot be matched to archive payloads', async () => {
    const manifest = buildModernManifestRecord({
      fileName: 'broken.png',
      sizeBytes: 10,
      sha1: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    })

    await expect(
      loadMediaEntryIdsByFileName({
        0: new Uint8Array([1, 2, 3]),
        media: manifest,
      }),
    ).rejects.toThrow('Ranki could not match')
  })

  it('fails loudly when the modern media manifest is malformed', async () => {
    await expect(
      loadMediaEntryIdsByFileName({
        0: new Uint8Array([1, 2, 3]),
        media: new Uint8Array([0xff]),
      }),
    ).rejects.toThrow()
  })

  it('returns raw bytes unchanged when a media payload is not compressed', () => {
    const payload = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

    expect(decodeAnkiMediaPayload(payload)).toEqual(payload)
  })
})
