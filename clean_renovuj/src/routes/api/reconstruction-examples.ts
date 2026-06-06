import { createFileRoute } from "@tanstack/react-router";
import { getReconstructionExamples } from "../../backend/ruianService";

export const Route = createFileRoute("/api/reconstruction-examples")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const municipalityName = url.searchParams.get("municipalityName") || "";

        try {
          const examples = await getReconstructionExamples({ municipalityName });
          return new Response(JSON.stringify(examples), {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "access-control-allow-origin": "*",
            },
          });
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: error.message || "Nepodařilo se načíst příklady rekonstrukcí." }),
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
