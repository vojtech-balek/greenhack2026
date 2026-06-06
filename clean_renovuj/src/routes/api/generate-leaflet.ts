import { createFileRoute } from "@tanstack/react-router";
import { generateHallLeafletPdf } from "../../backend/materials";

export const Route = createFileRoute("/api/generate-leaflet")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const pdfBuffer = await generateHallLeafletPdf(body);

          return new Response(pdfBuffer as any, {
            headers: {
              "content-type": "application/pdf",
              "content-disposition": 'attachment; filename="renovace-svj-letak.pdf"',
              "access-control-allow-origin": "*",
            },
          });
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: error.message || "Nepodařilo se vygenerovat leták." }),
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
