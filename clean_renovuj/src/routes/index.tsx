import { createFileRoute } from "@tanstack/react-router";

import { RenovationFlowPage } from "@/features/renovation-flow/RenovationFlowPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "renovuj.me · your first step to collective renovation" },
      {
        name: "description",
        content:
          "Plan, cost, and defend a renovation for your building. Made for the people who keep apartment owner associations moving.",
      },
      { property: "og:title", content: "renovuj.me" },
      {
        property: "og:description",
        content: "Your first step to collective renovation.",
      },
    ],
  }),
  component: RenovationFlowPage,
});
