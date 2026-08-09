const test = require('node:test')
const assert = require('node:assert/strict')
const {
  backfillApprovedPlaceMappings,
  cosineSimilarity,
  placeSearchText,
  suggestPlaceCandidates,
  vectorLiteral
} = require('../../server/services/placeSemanticMatchingService')

test('place embedding backfill supports stable pagination', async () => {
  let findArgs
  const prisma = {
    priceComparisonPlaceMap: {
      findMany: async (args) => { findArgs = args; return [] }
    }
  }
  const result = await backfillApprovedPlaceMappings({ prisma, tenantId: 'tenant', sourceId: 'source', limit: 50, offset: 100 }, async () => ({ vectors: [] }))
  assert.equal(findArgs.skip, 100)
  assert.equal(findArgs.take, 50)
  assert.deepEqual(findArgs.orderBy, [{ updatedAt: 'asc' }, { id: 'asc' }])
  assert.equal(result.offset, 100)
  assert.equal(result.nextOffset, null)
})

test('semantic candidate ranking recommends only a clear winner', async () => {
  const mapping = {
    inputText: 'Yerevan Zvartnots Airport (EVN)',
    candidatesJson: JSON.stringify([
      { id: 'evn', label: 'Yerevan Airport (EVN)', description: 'Yerevan, Armenia' },
      { id: 'hotel', label: 'Yerevan Hotel', description: 'Tbilisi, Georgia' }
    ])
  }
  const result = await suggestPlaceCandidates(mapping, async () => ({
    model: 'EmbeddingsGigaR', requestId: 'test', vectors: [[1, 0], [0.99, 0.01], [0.2, 0.98]]
  }))
  assert.equal(result.recommended.id, 'evn')
  assert.equal(result.candidates[0].id, 'evn')
  assert.equal(mapping.status, undefined)
})

test('semantic ranking keeps close candidates behind manual review', async () => {
  const mapping = { inputText: 'Grand Hotel', candidatesJson: JSON.stringify([{ id: 'one', label: 'Grand Hotel Paris' }, { id: 'two', label: 'Grand Hotel Rome' }]) }
  const result = await suggestPlaceCandidates(mapping, async () => ({ model: 'EmbeddingsGigaR', vectors: [[1, 0], [0.9, 0.1], [0.89, 0.11]] }))
  assert.equal(result.recommended, null)
})

test('place embedding helpers are deterministic and dimension-safe', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1)
  assert.match(placeSearchText({ name: 'Heathrow', airportIata: 'LHR', country: 'UK' }), /IATA LHR/)
  assert.throws(() => vectorLiteral([0.1]), /dimension mismatch/i)
  assert.match(vectorLiteral(Array(2560).fill(0)), /^\[0,0/)
})
