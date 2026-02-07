import { NovelWorkspace } from "@/components/NovelWorkspace";

export default async function NovelPage({
  params,
  searchParams
}: {
  params: Promise<{ novelId: string }>;
  searchParams: Promise<{ title?: string; author?: string }>;
}) {
  const [{ novelId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const initialTitle = typeof resolvedSearchParams.title === "string" ? resolvedSearchParams.title : undefined;
  const initialAuthor = typeof resolvedSearchParams.author === "string" ? resolvedSearchParams.author : undefined;

  return <NovelWorkspace novelId={novelId} initialTitle={initialTitle} initialAuthor={initialAuthor} />;
}
