# Integration & Merger Guide: Renovuj Backend

This document details how to merge the extracted Renovuj backend modules into another project (even a "completely shittily vibe-coded" codebase).

## Recommended Merger Workflow

1.  **Copy the Files**: Copy the `/backend` folder directly into the target project workspace.
2.  **Install Dependencies**: Make sure Zod is installed in the target workspace:
    ```bash
    npm install zod
    # or
    bun add zod
    ```
3.  **Setup Environment Variables**:
    Configure the environment variables in your target project `.env` file:
    ```bash
    NODE_ENV=production
    DATABASE_URL=your-database-connection-url
    # etc.
    ```

---

## API Integrations (Framework Adaptors)

Here are three examples of how to wire the modular functions in `backend/src/index.ts` to different popular backend runtimes.

### Option A: Express.js (Node.js)
```typescript
import express from "express";
import { getPropertyByAddress, getCalculationMetrics } from "./backend/src";

const app = express();
app.use(express.json());

// 1. Property lookup endpoint
app.post("/api/property", (req, res) => {
  try {
    const { address } = req.body;
    const property = getPropertyByAddress(address);
    return res.status(200).json(property);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// 2. Calculations & metrics endpoint
app.post("/api/calculate", (req, res) => {
  try {
    const result = getCalculationMetrics(req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Server listening on port 3000"));
```

### Option B: Hono / Cloudflare Workers
```typescript
import { Hono } from "hono";
import { getPropertyByAddress, getCalculationMetrics } from "./backend/src";

const app = new Hono();

app.post("/api/property", async (c) => {
  try {
    const body = await c.req.json();
    const property = getPropertyByAddress(body.address);
    return c.json(property);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post("/api/calculate", async (c) => {
  try {
    const body = await c.req.json();
    const result = getCalculationMetrics(body);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

export default app;
```

### Option C: Next.js API Routes (App Router)
Create `app/api/calculate/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getCalculationMetrics } from "@/backend/src";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = getCalculationMetrics(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

---

## Front-end Migration Mapping

If you are replacing client-side logic with backend API requests, map the following functions in the frontend wizard UI to API calls:

| Frontend UI Wizard Step | Client-Side Logic / Local Variable | Extracted Backend Source | REST Endpoint Route |
| :--- | :--- | :--- | :--- |
| **Hero Step** | `address` text input | `getPropertyByAddress(address)` | `POST /api/property` |
| **Goals Step** | `selected` goal IDs | `getQuestionsForGoals(selected)` | `POST /api/property/questions` |
| **Property Step** | Questionnaire inputs, PDF upload | `calculateFinancials` / `buildUrgencyData` | `POST /api/calculate` |
| **Financials Step** | `FINANCIALS` mock data | `getCalculationMetrics` (response data) | `POST /api/calculate` |
| **Urgency Step** | `buildUrgencyData()` Recharts loop | `getCalculationMetrics` (response data) | `POST /api/calculate` |
| **Community Step** | `NEIGHBOURS` constant | `getNeighbourhoodMetadata()` | `GET /api/neighbours` |
| **Stakeholder Step** | `PERSONAS` constant | `getResidentPersonas()` | `GET /api/personas` |
