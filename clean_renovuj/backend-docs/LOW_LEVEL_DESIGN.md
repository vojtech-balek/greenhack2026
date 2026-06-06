# Low-Level Code Design & Calculations: Renovuj Backend

This document details the low-level logic, schemas, and mathematical calculations implemented in the Renovuj backend.

## Data Schemas & Validation (Zod)

The backend exposes strongly-typed interfaces. The following schema definitions ensure request payload sanitization:

### 1. Calculation Request Schema
```typescript
import { z } from "zod";

export const CalculateRequestSchema = z.object({
  address: z.string().min(1, "Address is required"),
  selectedGoals: z.array(z.string()).min(1, "At least one goal must be selected"),
  answers: z.record(z.string(), z.string()).default({}),
});

export type CalculateRequest = z.infer<typeof CalculateRequestSchema>;
```

### 2. File Upload Validation (Energy Audit PDFs)
```typescript
export const FileUploadSchema = z.object({
  filename: z.string().regex(/^[\w\-. ]+$/, "Invalid filename characters"),
  mimeType: z.literal("application/pdf"),
  size: z.number().max(10 * 1024 * 1024, "File exceeds 10MB limit"),
});
```

---

## Detailed Mathematics & Algorithms

### 1. The Urgency Curve (Cost of Waiting)
The cost of waiting aggregates two distinct compound rates: utility waste inflation and construction material/labor cost inflation.

```
                  ┌──────────────────────────────────────────────┐
                  │          Total Cost of Waiting S(t)          │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
      ┌───────────────────────────┐             ┌───────────────────────────┐
      │  Utilities Wasted U(t)    │             │   Material Inflation M(t) │
      │  (Compounded Continuous)  │             │   (Discrete Compounded)   │
      └───────────────────────────┘             └───────────────────────────┘
```

#### A. Cumulative Utilities Wasted: $U(t)$
Energy bills overpaid vs. a renovated building grow continuously due to energy price drift.
*   **Parameters**:
    *   $U_0$ = Annual baseline energy waste (e.g., $38,000$ CZK).
    *   $r_u$ = Long-term annual utility inflation/drift rate (e.g., $4\% = 0.04$).
    *   $t$ = Time elapsed in fractional years.
*   **Integral Formulation**:
    $$U(t) = \int_{0}^{t} U_0 (1 + r_u)^x \, dx$$
*   **Analytical Solution**:
    $$U(t) = U_0 \frac{(1 + r_u)^t - 1}{\ln(1 + r_u)}$$

#### B. Material & Labor Inflation: $M(t)$
The compounded extra cost of performing the renovation in the future rather than today.
*   **Parameters**:
    *   $C_0$ = Today's baseline renovation project cost (e.g., $1,250,000$ CZK).
    *   $r_m$ = Long-term annual construction inflation rate (e.g., $3\% = 0.03$).
*   **Formulation**:
    $$M(t) = C_0 \left((1 + r_m)^t - 1\right)$$

#### C. Total Cumulative Cost: $S(t)$
$$S(t) = U(t) + M(t) = U_0 \frac{(1 + r_u)^t - 1}{\ln(1 + r_u)} + C_0 \left((1 + r_m)^t - 1\right)$$

---

### 2. Financial Metrics & Amortization

All metrics are based on an 18-flat tenement (činžovní dům) baseline:

#### A. Value Uplift Calculations
*   **Property Value Before Renovation**:
    $$V_{\text{before}} = \text{Area} \times \text{Average Price per } m^2$$
    For a typical Vinohrady building: $1,440 \, m^2 \times 180,000 \, \text{CZK}/m^2 = 259,200,000 \, \text{CZK}$.
*   **Property Value After Renovation** (+11% uplift):
    $$V_{\text{after}} = V_{\text{before}} \times 1.11 = 287,700,000 \, \text{CZK}$$
*   **Net Capital Gain per Flat**:
    $$\Delta V_{\text{unit}} = \frac{V_{\text{after}} - V_{\text{before}}}{\text{Flats}} = \frac{28,500,000}{18} = 1,583,333 \, \text{CZK}$$

#### B. Monthly Net Impact (Straight-Line Amortization)
*   **NZÚ 2026+ Loan Repayment per Flat**:
    Since the Nová zelená úsporám (NZÚ) 2026+ loan is interest-free (0% interest rate), the monthly payment is straight-line:
    $$\text{Monthly Repayment} = \frac{\text{Principal Limit per Flat}}{\text{Splatnost in Years} \times 12}$$
    $$\text{Monthly Repayment} = \frac{750,000 \, \text{CZK}}{25 \times 12} = 2,500 \, \text{CZK/month}$$
*   **Net Monthly Delta**:
    $$\text{Net Monthly Delta} = \text{Monthly Savings} - \text{Monthly Repayment}$$
    $$\text{Net Monthly Delta} = 2,450 - 2,500 = -50 \, \text{CZK/month}$$

---

### 3. Dynamic Question Logic
The dynamic questionnaire evaluates question visibility based on selected renovation goals:
*   A question $q$ is rendered if:
    $$\text{Length}(q.\text{triggers}) == 0 \quad \lor \quad \exists g \in \text{SelectedGoals} \text{ s.t. } g \in q.\text{triggers}$$
