import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-fg">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
        <h1 className="text-2xl font-semibold font-atlas">Route not found</h1>
        <p className="mt-2 text-sm text-fg-muted">Go back to home to see your novel tracker.</p>
        <Link className="mt-4 inline-block rounded-lg border border-accent-border bg-accent-soft px-4 py-2 text-sm text-accent transition hover:bg-accent hover:text-accent-fg" href="/">
          Back home
        </Link>
      </div>
    </main>
  );
}
