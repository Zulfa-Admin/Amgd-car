import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/auction/")({
  beforeLoad: () => { throw redirect({ to: "/auctions" }); },
});
