# CRM + Pricing + Ops API (MVP-1)

All endpoints require:
- `Authorization: Bearer <jwt>`
- mapped permission via RBAC (owner/admin still has legacy compatibility).

## Promote staging -> production
`POST /api/admin/crm/promote-from-staging`

Response:
```json
{
  "success": true,
  "stats": {
    "companies": { "upserted": 0 },
    "contacts": { "upserted": 0 },
    "companySegments": { "upserted": 0 },
    "contactSegments": { "upserted": 0 },
    "links": { "upserted": 0 }
  }
}
```

## Companies list
`GET /api/admin/crm/companies?q=&segment=&limit=100&offset=0`

## Company details
`GET /api/admin/crm/companies/:companyId`

Includes:
- company fields
- segments
- links -> contact (with contact segments)

## Contacts list
`GET /api/admin/crm/contacts?q=&segment=&limit=100&offset=0`

## Contact details
`GET /api/admin/crm/contacts/:contactId`

Includes:
- contact fields
- segments
- links -> company (with company segments)

## City pricing (price book)
`GET /api/admin/pricing/cities?q=&limit=200`  
Permission: `pricing.read`

`POST /api/admin/pricing/cities`  
Permission: `pricing.manage`

Body example:
```json
{
  "country": "ES",
  "city": "Barcelona",
  "routeFrom": "BCN",
  "routeTo": "Sitges",
  "fixedPrice": 85,
  "pricePerKm": 1.3,
  "hourlyRate": 42,
  "childSeatPrice": 6,
  "currency": "EUR"
}
```

`PUT /api/admin/pricing/cities/:id`  
Permission: `pricing.manage`

## Ops drafts (temporary -> approved permanent)
`GET /api/admin/ops/drafts?status=pending&limit=100`  
Permission: `ops.read`

`POST /api/admin/ops/drafts/:draftId/approve`  
Permission: `ops.manage`

`POST /api/admin/ops/drafts/:draftId/reject`  
Permission: `ops.manage`

`GET /api/admin/ops/unavailability`  
Permission: `ops.read`

`GET /api/admin/ops/unavailability/:id/conflicts`  
Permission: `ops.read`
