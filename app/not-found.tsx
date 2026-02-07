import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
        <h1 className="text-2xl font-semibold">Route not found</h1>
        <p className="mt-2 text-sm text-slate-300">Go back to home to see your novel tracker.</p>
        <Link className="mt-4 inline-block rounded-lg border border-slate-400 px-4 py-2 text-sm" href="/">
          Back home
        </Link>
      </div>
    </main>
  );
}
