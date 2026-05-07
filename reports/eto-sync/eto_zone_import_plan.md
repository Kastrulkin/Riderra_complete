# Riderra ETO Zone Import Plan

Generated: 2026-05-06

## Current Baseline

- Current ETO zones scraped: `eto_zones_current.csv`
- Required Riderra price-book places: `riderra_price_places_required.csv`
- Missing ETO zones before import: 1082
- Draft fixed-price rows with confident zone/vehicle mapping before new zones: 3586
- Rows blocked by unmapped vehicle classes: 620
- Same route/vehicle price conflicts to review: 54

## Upload Sequence

Upload one KML batch at a time in ETO `Zones > Import`. After each successful import, re-scrape ETO zones and rerun:

```bash
node scripts/eto_prepare_sync.js reports/eto-sync/eto_zones_current.csv
```

### Batch 1

File: `batch1_top30_missing_zones.kml`

- 30 zones
- Top missing places by price-book row count
- Mostly compact airport/port zones
- Includes `Tokyo (within 23 wards)` as a named district boundary

### Batch 2

File: `batch2_airports_ports_next100_after_batch1.kml`

- 100 zones
- Airports/ports/stations after excluding Batch 1
- Compact generated zones:
  - airport: 3 km radius
  - port/station: 2 km radius

### Batch 3

File: `batch3_cities_top60_after_batch1.kml`

- 60 city zones after excluding Batch 1
- Sources:
  - 57 Google city bounds/viewports
  - 3 named manual boundaries
- No fallback-circle city zones
- Moscow rule: inside MKAD only, excluding New Moscow

### Batch 4

File: `batch4_districts_top60_after_batch1.kml`

- 60 district/area/island zones after excluding Batch 1
- Sources:
  - 23 named manual boundaries
  - 37 Google bounds/viewports
- No fallback-circle district zones
- Manual protections added for large-city districts such as Tokyo 23 wards, LA area, Dubai areas, Stockholm city center, Shanghai/Guangzhou/Shenzhen city centers, Marrakech riads, Antalya center, Choeng Mon Beach, Sukhumvit Road Bangkok.

## Do Not Auto-Import Yet

Per project policy, generated KML files are draft artifacts. Import into ETO should happen only after explicit approval/dry validation.

## Manual Review Queue

File: `batch5_local_review_needs_review.csv`

- 11 local/hotel/resort/ambiguous zones require manual review before creating KML.

## Notes

- Live OSM/Nominatim boundary lookup is opt-in via `--use-osm`; it was unstable/slow during preparation.
- Default generation now uses manual named boundaries first, then Google geocoding bounds/viewports.
- The generator can exclude already prepared/imported KML names via `--exclude-kml=...`.
