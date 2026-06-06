import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            ok: true,
            service: "renovuj.me",
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
