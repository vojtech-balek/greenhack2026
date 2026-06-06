# Backend Documentation

Node backend for `renovuj.me`. It is designed to be usable with the current static frontend or any future frontend through HTTP APIs.

## Responsibilities

- Serve the static frontend from `../frontend`.
- Resolve Czech addresses and building facts.
- Load local/fallback SVJ reconstruction examples.
- Run deterministic NZÚ renovation calculations.
- Generate persuasion materials through the e-infra LLM endpoint.
- Render an A4 HOA/SVJ one-pager PDF.

## Runtime

Start:
```bash
npm run dev
```

Production-style start:
```bash
npm start
```

Validate syntax and calculator regression:
```bash
npm run check
```

Default port:
```text
3000
```

Override:
```bash
PORT=4000 npm start
```

## Environment

`.env` is loaded manually by `backend/server.mjs`.

Supported variables:

| Variable | Required | Purpose |
|---|---:|---|
| `PORT` | No | HTTP server port. Defaults to `3000`. |
| `RUIAN_API_KEY` | No | Optional API key for `ruian.fnx.io`. |
| `E_INFRA_API_TOKEN` | Yes for generation | Bearer token for e-infra chat completions. |
| `E_INFRA_MODEL` | No | LLM model. Defaults to `mini`. |
| `PDF_BROWSER_PATH` | No | Optional path to Edge/Chrome executable for PDF printing (Windows only). |

LLM endpoint is fixed in code:
```js
https://llm.ai.e-infra.cz/v1/chat/completions
```

PDF generation:
- On **Windows**: Uses headless Edge/Chrome via executables. If `PDF_BROWSER_PATH` is not set, the backend tries common Windows install paths.
- On **Linux/Render**: Uses [Puppeteer](https://pptr.dev/) to control a headless Chromium browser automatically.

## Main Files

| File | Purpose |
|---|---|
| `backend/server.mjs` | HTTP server, API route wiring, static frontend serving, address/building/community data endpoints. |
| `backend/materials.js` | LLM prompt assembly, persona prompt loading, strict JSON parsing, A4 HTML rendering, PDF conversion. |
| `backend/nzuCalculator.js` | Deterministic NZÚ calculation engine. |
| `backend/prompts/` | Prompt fragments for base behavior, output formats, and personas. |
| `backend/API.md` | Frontend-facing endpoint contract. |
| `backend/data/reconstructions/` | SFŽP/SVJ reconstruction source and prepared data. |
| `backend/img/` | Static image assets served under `/img/...`. |

## API Summary

Full endpoint details are in [`API.md`](./API.md).

Primary endpoints:

- `GET /api/health`
- `GET /api/site-status`
- `GET /api/address-search?q=<query>`
- `POST /api/building-info`
- `GET /api/reconstruction-examples?municipalityName=<name>`
- `POST /api/calculate-renovation`
- `POST /api/generate-material`
- `POST /api/generate-pdf`
- `POST /api/generate-leaflet`

API routes include permissive CORS headers for hackathon/dev use:

```text
Access-Control-Allow-Origin: *
```

That means a different frontend can call the backend directly from another local dev server.

## Data Flow

Typical frontend flow:

1. Search address:
   - `GET /api/address-search`
2. Load building data:
   - `POST /api/building-info`
3. User selects renovation goals and answers context questions.
4. Frontend calls or locally mirrors:
   - `POST /api/calculate-renovation`
5. Fetch local proof:
   - `GET /api/reconstruction-examples`
6. Build material payload and call:
   - `POST /api/generate-material`
   - or `POST /api/generate-pdf`
   - or `POST /api/generate-leaflet`

## NZÚ Calculator

Export:
```js
import { calculateNzuRenovation } from "./nzuCalculator.js";
```

Input:
```json
{
  "floorArea": 1000,
  "footprintArea": 300,
  "numberOfFlats": 10,
  "vulnerableFlats": 2,
  "selectedGoals": ["INSULATION", "PHOTOVOLTAICS"]
}
```

Output:
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

- `INSULATION`
- `HEAT_SOURCE`
- `PHOTOVOLTAICS`
- `GREEN_ROOF`
- `VENTILATION`

Loan/subsidy assumptions:

- `PARTIAL`: 0% loan up to `250 000 Kč / byt`.
- `COMPLEX`: 0% loan up to `750 000 Kč / byt`.
- If `renovationType` is omitted, calculator treats any input containing `INSULATION` as `COMPLEX`, otherwise `PARTIAL`.
- State loan term is `10 years` up to `1.5 mil. Kč`, otherwise `15 years`.
- Vulnerable household bonus applies only to `COMPLEX`: `2 000 Kč/m²`, capped at `60 m²` per vulnerable flat, max `120 000 Kč/byt`.

## Material Generation

`backend/materials.js` exposes:

```js
loadMaterialGeneratorConfig(env)
setMaterialGeneratorConfig(config)
generatePersuasionMaterial(payload)
generateHoaOnePagerPdf(payload)
```

Text material:

- `format: "whatsapp"`

PDF material:

- `POST /api/generate-pdf`
- `POST /api/generate-leaflet`
- LLM returns strict JSON for copy content.
- Backend renders deterministic A4 HTML.
- Headless browser prints binary PDF.

The LLM does not directly create PDF bytes.

## Prompt Organization

Prompt files:

```text
backend/prompts/material-base.md
backend/prompts/material-pdf-json.md
backend/prompts/material-whatsapp.md
backend/prompts/material-leaflet.md
backend/prompts/personas/opatrna.md
backend/prompts/personas/kalkulacka.md
backend/prompts/personas/zitrek.md
backend/prompts/personas/neduverivy.md
backend/prompts/personas/inzenyr.md
```

Known persona IDs:

- `opatrna`
- `kalkulacka`
- `zitrek`
- `neduverivy`
- `inzenyr`

Unknown/custom personas are passed into the prompt as raw user-provided descriptions with guardrails to avoid inventing demographic facts.

## PDF Rendering

Flow:

1. Backend sends strict JSON prompt to LLM.
2. `materials.js` extracts and validates JSON.
3. Backend normalizes/falls back missing one-pager fields.
4. Backend renders a deterministic A4 HTML template.
5. PDF conversion:
   - **Windows**: Headless Edge/Chrome writes PDF via `--print-to-pdf`
   - **Linux/Render**: Puppeteer controls headless Chromium to generate PDF
6. Endpoint returns:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="renovace-svj-onepager.pdf"
```

Error scenarios:

- Windows without browser: `No PDF browser found. Set PDF_BROWSER_PATH to msedge.exe or chrome.exe.`
- Linux without Puppeteer dependency: Install via `npm install puppeteer` at root level

## External Services

| Service | Used for |
|---|---|
| OpenStreetMap Nominatim | Address search candidates. |
| `ruian.fnx.io` | RÚIAN address validation. |
| ČÚZK ArcGIS RÚIAN MapServer | Building and codelist facts. |
| e-infra LLM | Text and one-pager content generation. |

## Frontend Replacement Notes

A new frontend should treat the backend as an API service:

- Do not depend on current DOM IDs or frontend state shape.
- Build the material payload using `API.md`.
- Use `/api/calculate-renovation` instead of duplicating financial logic.
- Use `/api/generate-pdf` for a binary A4 handout.
- Use `/api/generate-leaflet` for a binary A4 notice-board leaflet.
- Use `/api/generate-material` for chat text.
- Send selected/custom personas as data; backend owns prompt interpretation.

## Known Prototype Limitations

- CORS is permissive for development; tighten for production.
- NZÚ calculator is deterministic but still heuristic, not legal/technical advice.
- PDF layout is optimized for one A4 page; long LLM output is normalized/truncated.
- Local reconstruction examples depend on prepared SFŽP data availability.
- Address/building lookups depend on external public services.
