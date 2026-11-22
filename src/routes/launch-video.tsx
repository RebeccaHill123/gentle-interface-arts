import { createFileRoute } from "@tanstack/react-router";
import { LaunchFilm } from "@/components/launch-video/launch-film";

// Isolated, recording-ready 9:16 launch preview. Not linked from navigation,
// noindexed, and backed only by a local deterministic fixture.
export const Route = createFileRoute("/launch-video")({
  validateSearch: (search: Record<string, unknown>): { still?: number } =>
    typeof search.still === "number" ? { still: search.still } : {},
  component: LaunchVideoPage,
  head: () => ({
    meta: [
      { title: "Launch film preview · Tentra" },
      {
        name: "description",
        content: "Isolated 9:16 recording preview of Tentra practice and adaptive plan recalibration.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function LaunchVideoPage() {
  const { still } = Route.useSearch();
  return <LaunchFilm autoplay={still === undefined} />;
}
