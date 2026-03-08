export const rankiSchemaV1 = {
  decks: 'id, updatedAt',
  cards: 'id, deckId, dueAt, [deckId+dueAt], [deckId+createdAt]',
  mediaAssets: 'id, cardId, createdAt',
  reviewLogs: 'id, cardId, deckId, reviewedAt, [cardId+reviewedAt], [deckId+reviewedAt]',
  appSettings: 'id',
} as const

export const rankiSchema = {
  ...rankiSchemaV1,
  mediaBlobs: 'blobRef, createdAt',
} as const
