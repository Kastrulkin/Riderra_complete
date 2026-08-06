const crypto = require('crypto')
const { embedTexts, enabled, model } = require('./gigaChatEmbeddingsService')
const { normalizeTextKey } = require('./priceComparisonService')

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || left.length !== right?.length || !left.length) return 0
  let dot = 0; let leftNorm = 0; let rightNorm = 0
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index]
    leftNorm += left[index] ** 2
    rightNorm += right[index] ** 2
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0
}

function placeSearchText({ name, label, description, country, city, airportIata }) {
  return [name || label, description, city, country, airportIata ? `IATA ${airportIata}` : '']
    .map((value) => String(value || '').trim()).filter(Boolean).join(' | ')
}

function vectorLiteral(vector) {
  if (!Array.isArray(vector) || vector.length !== 2560) throw new Error('Embedding dimension mismatch')
  return `[${vector.map((value) => Number(value)).join(',')}]`
}

async function suggestPlaceCandidates(mapping, embedder = embedTexts) {
  let candidates = []
  try { candidates = JSON.parse(mapping.candidatesJson || '[]') } catch (_) {}
  candidates = candidates.slice(0, 20)
  if (!candidates.length) return { model: model(), recommended: null, candidates: [] }
  const texts = [placeSearchText({ name: mapping.inputText }), ...candidates.map((candidate) => placeSearchText(candidate))]
  const response = await embedder(texts)
  const queryVector = response.vectors[0]
  const scored = candidates.map((candidate, index) => ({
    ...candidate,
    semanticScore: Number(cosineSimilarity(queryVector, response.vectors[index + 1]).toFixed(6))
  })).sort((a, b) => b.semanticScore - a.semanticScore)
  const margin = scored.length > 1 ? scored[0].semanticScore - scored[1].semanticScore : scored[0].semanticScore
  const recommended = scored[0].semanticScore >= 0.82 && margin >= 0.04 ? scored[0] : null
  return { model: response.model || model(), requestId: response.requestId || '', recommended, margin: Number(margin.toFixed(6)), candidates: scored }
}

async function backfillApprovedPlaceMappings({ prisma, tenantId, sourceId = null, limit = 100 }, embedder = embedTexts) {
  const mappings = await prisma.priceComparisonPlaceMap.findMany({
    where: { tenantId, status: 'approved', externalPlaceId: { not: null }, ...(sourceId ? { sourceId } : {}) },
    orderBy: { updatedAt: 'asc' }, take: Math.min(Math.max(Number(limit) || 100, 1), 500)
  })
  const pending = []
  for (const mapping of mappings) {
    const canonicalKey = `source-place:${mapping.sourceId}:${mapping.externalPlaceId}`
    const searchText = placeSearchText({ name: mapping.inputText, description: mapping.externalLabel })
    const place = await prisma.canonicalTransferPlace.upsert({
      where: { tenantId_canonicalKey: { tenantId, canonicalKey } },
      update: { name: mapping.inputText, normalizedName: normalizeTextKey(mapping.inputText), searchText, status: 'verified' },
      create: { tenantId, canonicalKey, name: mapping.inputText, normalizedName: normalizeTextKey(mapping.inputText), searchText, status: 'verified' }
    })
    await prisma.canonicalTransferPlaceAlias.upsert({
      where: { sourceId_externalPlaceId: { sourceId: mapping.sourceId, externalPlaceId: mapping.externalPlaceId } },
      update: { canonicalPlaceId: place.id, label: mapping.externalLabel, normalizedLabel: normalizeTextKey(mapping.externalLabel), status: 'verified', verificationMethod: 'approved_place_mapping' },
      create: { tenantId, canonicalPlaceId: place.id, sourceId: mapping.sourceId, externalPlaceId: mapping.externalPlaceId, label: mapping.externalLabel, normalizedLabel: normalizeTextKey(mapping.externalLabel), status: 'verified', verificationMethod: 'approved_place_mapping' }
    })
    const hash = crypto.createHash('sha256').update(searchText).digest('hex')
    const stored = await prisma.$queryRawUnsafe('SELECT "contentHash", status FROM "CanonicalTransferPlaceEmbedding" WHERE "canonicalPlaceId" = $1', place.id)
    if (stored[0]?.contentHash === hash && stored[0]?.status === 'ready') continue
    pending.push({ place, searchText, hash })
  }
  let embedded = 0
  for (let offset = 0; offset < pending.length; offset += 16) {
    const batch = pending.slice(offset, offset + 16)
    const response = await embedder(batch.map((item) => item.searchText))
    for (let index = 0; index < batch.length; index++) {
      const item = batch[index]
      await prisma.$executeRawUnsafe(`INSERT INTO "CanonicalTransferPlaceEmbedding" ("canonicalPlaceId","contentHash","embeddingModel","embeddingVersion","dimensions","embedding","status","providerRequestId","embeddedAt","updatedAt") VALUES ($1,$2,$3,'transfer_places_v1',2560,$4::halfvec,'ready',$5,NOW(),NOW()) ON CONFLICT ("canonicalPlaceId") DO UPDATE SET "contentHash"=EXCLUDED."contentHash", "embeddingModel"=EXCLUDED."embeddingModel", "embedding"=EXCLUDED."embedding", "status"='ready', "providerRequestId"=EXCLUDED."providerRequestId", "embeddedAt"=NOW(), "updatedAt"=NOW()`, item.place.id, item.hash, response.model || model(), vectorLiteral(response.vectors[index]), response.requestId || null)
      embedded++
    }
  }
  return { examined: mappings.length, embedded, skipped: mappings.length - pending.length, model: model() }
}

module.exports = { backfillApprovedPlaceMappings, cosineSimilarity, enabled, placeSearchText, suggestPlaceCandidates, vectorLiteral }
