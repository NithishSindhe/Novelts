import { NotesReader } from "@/components/NotesReader";

export default async function NovelNotesPage({
  params,
  searchParams
}: {
  params: Promise<{ novelId: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const [{ novelId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const selectedNoteId = typeof resolvedSearchParams.note === "string" ? resolvedSearchParams.note : undefined;

  return <NotesReader novelId={novelId} selectedNoteId={selectedNoteId} />;
}
