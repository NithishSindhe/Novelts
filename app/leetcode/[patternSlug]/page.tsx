import { PatternWorkspace } from "@/components/PatternWorkspace";

export default async function LeetcodePatternPage({
  params,
  searchParams
}: {
  params: Promise<{ patternSlug: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const [{ patternSlug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const selectedNote = typeof resolvedSearchParams.note === "string" ? resolvedSearchParams.note : undefined;

  return <PatternWorkspace patternSlug={patternSlug} selectedNote={selectedNote} />;
}
