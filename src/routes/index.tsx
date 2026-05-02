import { createFileRoute } from "@tanstack/react-router";
import { DreamFlow } from "@/components/DreamFlow";
import { PhoneFrame } from "@/components/PhoneFrame";
import { z } from "zod";

const searchSchema = z.object({
  session: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: Index,
});

function Index() {
  const { session } = Route.useSearch();
  return (
    <PhoneFrame>
      <DreamFlow sessionId={session} />
    </PhoneFrame>
  );
}
