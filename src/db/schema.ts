export const rankiSchema = {
  decks: 'id, updatedAt',
  cards: 'id, deckId, dueAt, [deckId+dueAt], [deckId+createdAt]',
  mediaAssets: 'id, cardId, createdAt',
  reviewLogs: 'id, cardId, deckId, reviewedAt, [cardId+reviewedAt], [deckId+reviewedAt]',
  appSettings: 'id',
} as const
