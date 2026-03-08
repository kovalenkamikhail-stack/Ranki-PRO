export const QUICK_CAPTURE_ROUTE = '/capture/card'
export const MAX_QUICK_CAPTURE_QUERY_LENGTH = 6_000
export const MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH = 300
export const MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH = 4_000
export const MAX_QUICK_CAPTURE_CONTEXT_LENGTH = 2_000

export interface QuickCapturePayload {
  frontText: string
  backText: string
  contextText: string | null
  deckId: string | null
}

export interface ParseQuickCaptureResult {
  payload: QuickCapturePayload
  errors: string[]
  hasSupportedFields: boolean
}

function readTrimmedParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim() ?? ''
  return value.length > 0 ? value : ''
}

function validateFieldLength(
  value: string,
  maxLength: number,
  fieldLabel: string,
  errors: string[],
) {
  if (value.length > maxLength) {
    errors.push(`${fieldLabel} must stay under ${maxLength} characters.`)
  }
}

export function hasQuickCaptureContent(payload: QuickCapturePayload) {
  return Boolean(payload.frontText || payload.backText || payload.contextText)
}

export function parseQuickCaptureSearchParams(
  params: URLSearchParams,
): ParseQuickCaptureResult {
  const frontText = readTrimmedParam(params, 'front')
  const backText = readTrimmedParam(params, 'back')
  const contextParam = readTrimmedParam(params, 'context')
  const deckId = readTrimmedParam(params, 'deckId')
  const payload: QuickCapturePayload = {
    frontText,
    backText,
    contextText: contextParam || null,
    deckId: deckId || null,
  }
  const errors: string[] = []

  if (params.toString().length > MAX_QUICK_CAPTURE_QUERY_LENGTH) {
    errors.push(
      `This first-pass capture URL must stay under ${MAX_QUICK_CAPTURE_QUERY_LENGTH} characters.`,
    )
  }

  validateFieldLength(
    payload.frontText,
    MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH,
    'Front text',
    errors,
  )
  validateFieldLength(
    payload.backText,
    MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH,
    'Back text',
    errors,
  )
  validateFieldLength(
    payload.contextText ?? '',
    MAX_QUICK_CAPTURE_CONTEXT_LENGTH,
    'Context text',
    errors,
  )

  if (!hasQuickCaptureContent(payload)) {
    errors.push(
      'No supported capture fields were found. Use front, back, and optional context.',
    )
  }

  return {
    payload,
    errors,
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
