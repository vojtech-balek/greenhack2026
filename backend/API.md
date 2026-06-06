# Backend API

Backend is frontend-agnostic. Any UI can call these JSON endpoints.

API routes send permissive CORS headers for hackathon/dev use, so a separate frontend dev server can call this backend directly.

## Address + Building

`GET /api/address-search?q=<query>`

Returns candidate Czech addresses from OpenStreetMap/Nominatim.

`POST /api/building-info`

Body:
```json
{
  "address": "Praha, Vodičkova 18"
}
```

or:
```json
{
  "selectedAddress": {
    "displayName": "...",
    "municipalityName": "...",
    "street": "...",
    "cp": "...",
    "zip": "..."
  }
}
```

Returns normalized address and RÚIAN building facts.

## Local Proof

`GET /api/reconstruction-examples?municipalityName=<name>`

Returns local/fallback SVJ reconstruction examples and aggregate stats.

## Materials

`POST /api/calculate-renovation`

Runs deterministic NZÚ calculation. Body:
```json
{
  "floorArea": 1000,
  "footprintArea": 300,
  "numberOfFlats": 10,
  "vulnerableFlats": 2,
  "selectedGoals": ["INSULATION", "PHOTOVOLTAICS"]
}
```

`POST /api/generate-material`

Generates text output for `whatsapp` or `leaflet`.

`POST /api/generate-pdf`

Generates binary A4 one-pager PDF for HOA/SVJ meeting handout.

Expected payload shape:
```json
{
  "format": "pdf",
  "context": {
    "address": {},
    "building": {},
    "selectedGoals": [],
    "answeredQuestions": [],
    "nonFinancialBenefits": [],
    "calculation": {
      "input": {},
      "result": {}
    },
    "selectedPersonas": []
  },
  "selectedPersonas": [],
  "visuals": {
    "penaltyBreakdown": []
  },
  "localExamples": {
    "summary": {},
    "examples": []
  }
}
```

Material generation internals live in `backend/materials.js`. Persona and format prompts live in `backend/prompts/`.
