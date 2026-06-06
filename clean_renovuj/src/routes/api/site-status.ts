import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/site-status")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            label: "Ready",
            updatedAt: new Date().toISOString(),
          }),
          {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "access-control-allow-origin": "*",
            },
          }
        );
      },
    },
  },
});
