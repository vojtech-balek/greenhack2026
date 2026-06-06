import { createFileRoute } from "@tanstack/react-router";
import { searchAddresses } from "../../backend/ruianService";

export const Route = createFileRoute("/api/address-search")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") || "";

        try {
          const results = await searchAddresses(q);
          return new Response(JSON.stringify(results), {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "access-control-allow-origin": "*",
            },
          });
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: error.message || "Nepodařilo se vyhledat adresu." }),
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
