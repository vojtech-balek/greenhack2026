import { createFileRoute } from "@tanstack/react-router";
import { getBuildingInfo } from "../../backend/ruianService";

export const Route = createFileRoute("/api/building-info")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as { selectedAddress?: any; address?: string };
          const addressInput = body.selectedAddress || body.address || "";
          const buildingInfo = await getBuildingInfo(addressInput);

          return new Response(JSON.stringify(buildingInfo), {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "access-control-allow-origin": "*",
            },
          });
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: error.message || "Nepodařilo se načíst údaje o domu." }),
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
