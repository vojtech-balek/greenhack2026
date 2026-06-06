import { createFileRoute } from "@tanstack/react-router";
import { generatePersuasionMaterial, loadMaterialGeneratorConfigSync } from "../../backend/materials";

export const Route = createFileRoute("/api/generate-material")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const content = await generatePersuasionMaterial(body);
          const config = loadMaterialGeneratorConfigSync();

          return new Response(
            JSON.stringify({
              content,
              model: config.eInfraModel,
              generatedAt: new Date().toISOString(),
            }),
            {
              headers: {
                "content-type": "application/json; charset=utf-8",
                "access-control-allow-origin": "*",
              },
            }
          );
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: error.message || "Nepodařilo se vygenerovat materiál." }),
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
