import { createFileRoute } from "@tanstack/react-router";
import { calculateNzuRenovation } from "../../backend/nzuCalculator";

export const Route = createFileRoute("/api/calculate-renovation")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const results = calculateNzuRenovation(body);

          return new Response(JSON.stringify(results), {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "access-control-allow-origin": "*",
            },
          });
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: error.message || "Nepodařilo se spočítat renovaci." }),
            {
              status: 400,
              headers: {
                "content-type": "application/json; charset=utf-8",
                "access-control-allow-origin": "*",
              },
            }
          );
        }
      },
    },
  },
});
