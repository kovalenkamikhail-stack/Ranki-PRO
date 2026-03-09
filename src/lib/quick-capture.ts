export const QUICK_CAPTURE_ROUTE = '/capture/card'
export const MAX_QUICK_CAPTURE_QUERY_LENGTH = 6_000
export const MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH = 300
export const MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH = 4_000
export const MAX_QUICK_CAPTURE_CONTEXT_LENGTH = 2_000
export const MAX_QUICK_CAPTURE_DECK_ID_LENGTH = 120

export interface QuickCapturePayload {
  frontText: string
  backText: string
  contextText: string | null
  deckId: string | null
}

export interface ParseQuickCaptureResult {
  payload: QuickCapturePayload
  errors: string[]
  warnings: string[]
  hasSupportedFields: boolean
}

const SUPPORTED_QUICK_CAPTURE_PARAMS = new Set([
  'back',
  'context',
  'deckId',
  'front',
])

function normalizeQuickCaptureValue(value: string) {
  const withoutControlCharacters = value
    .replace(/\r\n/g, '\n')
    .split('')
    .filter((character) => {
      if (character === '\n' || character === '\t') {
        return true
      }

      const codePoint = character.charCodeAt(0)
      return !(codePoint < 32 || codePoint === 127)
    })
    .join('')
    .trim()

  return withoutControlCharacters.length > 0 ? withoutControlCharacters : ''
}

function readNormalizedParam(params: URLSearchParams, key: string, warnings: string[]) {
  const normalizedValues = params.getAll(key).map(normalizeQuickCaptureValue)
  const values = normalizedValues.filter(Boolean)

  if (normalizedValues.length > 1) {
    warnings.push(`Multiple ${key} values were provided. Ranki kept the first usable value.`)
  }

  const value = values[0] ?? ''
  return value.length > 0 ? value : ''
}

function clampFieldLength(
  value: string,
  maxLength: number,
  fieldLabel: string,
  warnings: string[],
) {
  if (value.length > maxLength) {
    warnings.push(`${fieldLabel} was trimmed to ${maxLength} characters.`)
    return value.slice(0, maxLength)
  }

  return value
}

function normalizeDeckId(deckId: string, warnings: string[]) {
  if (!deckId) {
    return null
  }

  if (deckId.length > MAX_QUICK_CAPTURE_DECK_ID_LENGTH || /\s/.test(deckId)) {
    warnings.push(
      'The requested deck reference was ignored because it was malformed.',
    )
    return null
  }

  return deckId
}

export function hasQuickCaptureContent(payload: QuickCapturePayload) {
  return Boolean(payload.frontText || payload.backText || payload.contextText)
}

export function hasQuickCaptureCardDraftContent(payload: QuickCapturePayload) {
  return Boolean(payload.frontText || payload.backText)
}

export function parseQuickCaptureSearchParams(
  params: URLSearchParams,
): ParseQuickCaptureResult {
  const errors: string[] = []
  const warnings: string[] = []
  const unsupportedParams = [...new Set([...params.keys()])].filter(
    (key) => !SUPPORTED_QUICK_CAPTURE_PARAMS.has(key),
  )

  if (unsupportedParams.length > 0) {
    warnings.push(
      `Ignored ${unsupportedParams.length} unsupported capture field${unsupportedParams.length === 1 ? '' : 's'}.`,
    )
  }

  const frontText = clampFieldLength(
    readNormalizedParam(params, 'front', warnings),
    MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH,
    'Front text',
    warnings,
  )
  const backText = clampFieldLength(
    readNormalizedParam(params, 'back', warnings),
    MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH,
    'Back text',
    warnings,
  )
  const contextParam = clampFieldLength(
    readNormalizedParam(params, 'context', warnings),
    MAX_QUICK_CAPTURE_CONTEXT_LENGTH,
    'Context text',
    warnings,
  )
  const deckId = normalizeDeckId(
    readNormalizedParam(params, 'deckId', warnings),
    warnings,
  )
  const payload: QuickCapturePayload = {
    frontText,
    backText,
    contextText: contextParam || null,
    deckId,
  }

  if (params.toString().length > MAX_QUICK_CAPTURE_QUERY_LENGTH) {
    warnings.push(
      `This first-pass capture URL was longer than ${MAX_QUICK_CAPTURE_QUERY_LENGTH} characters. Ranki kept the supported fields it could read.`,
    )
  }

  if (!hasQuickCaptureCardDraftContent(payload) && payload.contextText) {
    errors.push(
      'Quick capture needs front or back text before it can continue into the card editor.',
    )
  } else if (payload.frontText && !payload.backText) {
    warnings.push('Back text is missing. You can finish it in the editor before saving.')
  } else if (!payload.frontText && payload.backText) {
    warnings.push('Front text is missing. You can finish it in the editor before saving.')
  }

  if (!hasQuickCaptureContent(payload)) {
    errors.push(
      'No supported capture fields were found. Use front, back, and optional context.',
    )
  }

  return {
    payload,
    errors,
    warnings,
    hasSupportedFields: hasQuickCaptureContent(payload),
  }
}

export function buildQuickCaptureSearchParams(
  payload: QuickCapturePayload,
  options?: {
    includeDeckId?: boolean
  },
) {
  const params = new URLSearchParams()
  const includeDeckId = options?.includeDeckId ?? true

  if (payload.frontText) {
    params.set('front', payload.frontText)
  }

  if (payload.backText) {
    params.set('back', payload.backText)
  }

  if (payload.contextText) {
    params.set('context', payload.contextText)
  }

  if (includeDeckId && payload.deckId) {
    params.set('deckId', payload.deckId)
  }

  return params
}
