import { createFileRoute } from "@tanstack/react-router";
import { DreamFlow } from "@/components/DreamFlow";
import { PhoneFrame } from "@/components/PhoneFrame";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <PhoneFrame>
      <DreamFlow />
    </PhoneFrame>
  );
}
