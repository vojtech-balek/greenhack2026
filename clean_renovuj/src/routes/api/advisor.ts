import { createFileRoute } from "@tanstack/react-router";
import { runAdvisorPipeline } from "../../backend/advisorPipeline";

export const Route = createFileRoute("/api/advisor")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as { question?: string; context?: any };
          const question = `${body.question || ""}`.trim();

          if (!question) {
            return new Response(
              JSON.stringify({ error: "Question is required." }),
              {
                status: 400,
                headers: {
                  "content-type": "application/json; charset=utf-8",
                  "access-control-allow-origin": "*",
                },
              }
            );
          }

          const contextStr = body.context ? `\n\nCurrent app context:\n${JSON.stringify(body.context, null, 2)}` : "";
          const answer = await runAdvisorPipeline(`${question}${contextStr}`);

          return new Response(
            JSON.stringify({
              answer,
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
            JSON.stringify({ error: error.message || "Advisor pipeline execution failed." }),
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
