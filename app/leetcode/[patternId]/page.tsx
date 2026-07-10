import { PatternWorkspace } from "@/components/PatternWorkspace";

export default async function LeetcodePatternPage({
  params,
  searchParams
}: {
  params: Promise<{ patternId: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const [{ patternId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const selectedNote = typeof resolvedSearchParams.note === "string" ? resolvedSearchParams.note : undefined;

  return <PatternWorkspace patternId={patternId} selectedNote={selectedNote} />;
}
