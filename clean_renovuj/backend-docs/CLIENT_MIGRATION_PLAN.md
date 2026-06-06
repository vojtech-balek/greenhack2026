# Client Migration Plan: Integrating Frontend Wizard to Backend APIs

This document outlines how we connect the React frontend (`src/routes/index.tsx`) to the migrated REST APIs under `src/routes/api/`.

## 1. Local Image Assets Integration
- **Source**: `/home/samariva/greenhack2026/backend/img/`
- **Destination**: `/home/samariva/greenhack2026/clean_renovuj/public/img/` (Completed)
- **Mapping in Frontend**:
  - `buildingsAsset.url` -> `/img/houses/panelak.png` (Default dawning view)
  - `houseAsset.url` -> Dynamically resolved: `/img/houses/basic_house.png` (for family houses) or `/img/houses/panelak.png` (for apartment buildings)

## 2. API Integrations

### A. Step 1: Hero Address Search
- **Action**: When the user enters an address and submits/presses enter:
  - Fetch `GET /api/address-search?q=<query>`
  - Render a glassmorphic dropdown list of matched address candidates.
  - When the user selects an address match:
    - Call `POST /api/building-info` with body `{ selectedAddress: match }`.
    - Save the response `buildingInfo` in the React state.
    - Set the dynamic `address` to the display name of the selected match.
    - Transition to the `goals` step.

### B. Step 4: Summary Step
- **Action**: Render RÚIAN building parameters dynamically from the `buildingInfo` state:
  - `address` -> `buildingInfo.address.displayName`
  - `yearBuilt` -> `buildingInfo.building.completedAt`
  - `buildingType` -> `buildingInfo.building.buildingType`
  - `floors` -> `buildingInfo.building.floors` floors
  - `flats` -> `buildingInfo.building.flats` residential units
  - `cadastralId` -> Stavební objekt Kód: `buildingInfo.building.stavebniObjektKod`

### C. Step 5: Financials Step
- **Action**: Call `POST /api/calculate-renovation` reactively whenever `buildingInfo`, `selected` goals, or `answers` change.
- **Calculator Inputs Mapping**:
  - `floorArea`: `buildingInfo.building.floorAreaM2` (fallback to 1440)
  - `footprintArea`: `buildingInfo.building.builtAreaM2` (fallback to 280)
  - `numberOfFlats`: `buildingInfo.building.flats` (fallback to 18)
  - `vulnerableFlats`: Derived from question `vulnerable` ("Yes, significant share" -> 30%, "Some" -> 15%, "No / unsure" -> 0)
  - `selectedGoals`: Mapped array of `INSULATION`, `HEAT_SOURCE`, `VENTILATION`, `GREEN_ROOF`, `PHOTOVOLTAICS`
- **Output Mapping**:
  - Populate financials metrics on the charts and cards dynamically from the calculation response.

### D. Step 6: Urgency Step
- **Action**: Feed the dynamic `grossCapEx` and `estimatedYearlySavings` from the `calculation` state directly into the Recharts area chart builder function (`buildUrgencyData`).

### E. Step 7: Community Examples Step
- **Action**: Whenever `buildingInfo` changes, call `GET /api/reconstruction-examples?municipalityName=<municipality>`:
  - Render the municipality name, SVJ stats (applicants, amount paid) on cards.
  - Display actual local SVJ reconstruction cards from the SFŽP database.

### F. Step 9: Stakeholder Custom Persona
- **Action**: Call `POST /api/advisor` (or `/api/generate-material` depending on format) when adding custom stakeholders.

### G. Step 10: Distribution & Toolkit Downloads
- **Action**: Bind click handlers on the Toolkit download and copy buttons:
  - `Hallway cheat-sheet` -> `POST /api/generate-pdf` (triggers PDF download).
  - `Notice-board flyer` -> `POST /api/generate-leaflet` (triggers PDF download).
  - `Group chat message` -> `POST /api/generate-material` with format `"whatsapp"`, and display it in a `GlassDialog` to let the user review and copy.
