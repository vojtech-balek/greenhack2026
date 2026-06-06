# Backend API

Backend is frontend-agnostic. Any UI can call these endpoints.

API routes send permissive CORS headers for hackathon/dev use, so a separate frontend dev server can call this backend directly.

Base URL in local development:

```text
http://localhost:3000
```

## Health

### `GET /api/health`

Returns:
```json
{
  "ok": true,
  "service": "renovuj.me"
}
```

### `GET /api/site-status`

Returns lightweight status metadata.

## Address + Building

### `GET /api/address-search?q=<query>`

Returns candidate Czech addresses from OpenStreetMap/Nominatim.

Example:

```http
GET /api/address-search?q=Praha%20Vodi%C4%8Dkova%2018
```

Response shape:

```json
{
  "query": "Praha Vodičkova 18",
  "matches": [
    {
      "id": "...",
      "displayName": "...",
      "municipalityName": "Praha",
      "street": "Vodičkova",
      "cp": "18",
      "zip": "11000",
      "lat": "...",
      "lon": "..."
    }
  ],
  "attribution": "© OpenStreetMap contributors"
}
```

### `POST /api/building-info`

Body with free-text address:

```json
{
  "address": "Praha, Vodičkova 18"
}
```

or body with selected address candidate:

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

Returns normalized address and RÚIAN building facts:

```json
{
  "query": "...",
  "lookup": {
    "addressId": 123,
    "buildingId": 456
  },
  "address": {
    "municipalityName": "...",
    "streetName": "...",
    "cp": "...",
    "zip": "..."
  },
  "building": {
    "usage": "bytový dům",
    "completedAt": "01.01.1980",
    "builtAreaM2": 300,
    "floorAreaM2": 1000,
    "floors": 4,
    "flats": 12,
    "utilities": {
      "heating": "..."
    }
  }
}
```

## Local Proof

### `GET /api/reconstruction-examples?municipalityName=<name>`

Returns local/fallback SVJ reconstruction examples and aggregate stats.

Response shape:

```json
{
  "municipalityName": "Praha",
  "mode": "same-city",
  "localCount": 3,
  "totalCount": 100,
  "stats": {},
  "examples": []
}
```

## Calculation

### `POST /api/calculate-renovation`

Runs deterministic NZÚ calculation.

Body:

```json
{
  "floorArea": 1000,
  "footprintArea": 300,
  "numberOfFlats": 10,
  "vulnerableFlats": 2,
  "selectedGoals": ["INSULATION", "PHOTOVOLTAICS"]
}
```

Returns:

```json
{
  "grossCapEx": 5800000,
  "directSubsidyVulnerable": 240000,
  "netStateLoanAmount": 5560000,
  "maxStateLoanAmount": 7500000,
  "stateLoanTermYears": 15,
  "monthlyStateLoanPayment": 30889,
  "estimatedYearlySavings": 270000,
  "penaltyLostSavings": 1462407,
  "penaltyCapexInflation": 1602433,
  "penaltyLostZeroInterest": 6905761,
  "totalWaitPenalty": 9970601
}
```

Supported goals:

```text
INSULATION
HEAT_SOURCE
PHOTOVOLTAICS
GREEN_ROOF
VENTILATION
```

## Materials

Both material endpoints expect the same context payload.

Payload:

```json
{
  "format": "pdf",
  "context": {
    "address": {
      "input": "...",
      "municipalityName": "...",
      "streetName": "...",
      "cp": "..."
    },
    "building": {
      "usage": "bytový dům",
      "completedAt": "...",
      "floorAreaM2": 1000,
      "builtAreaM2": 300,
      "floors": 4,
      "flats": 10,
      "heating": "..."
    },
    "selectedGoals": [
      {
        "id": "zatepleni",
        "label": "Zateplení",
        "nzuGoal": "INSULATION"
      }
    ],
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
    "penaltyBreakdown": [
      {
        "label": "Dražší stavba",
        "value": 1602433
      }
    ]
  },
  "localExamples": {
    "summary": {},
    "examples": []
  }
}
```

### `POST /api/generate-material`

Generates text output for:

- `format: "whatsapp"`
- `format: "leaflet"`

Returns:

```json
{
  "content": "...",
  "model": "mini",
  "generatedAt": "2026-06-06T00:00:00.000Z"
}
```

### `POST /api/generate-pdf`

Generates binary A4 one-pager PDF for HOA/SVJ meeting handout.

Returns:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="renovace-svj-onepager.pdf"
```

## Error Shape

Errors return JSON:

```json
{
  "error": "Human-readable message"
}
```

## Internal Modules

- Material generation internals live in `backend/materials.js`.
- Deterministic financial logic lives in `backend/nzuCalculator.js`.
- Persona and format prompts live in `backend/prompts/`.
