import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold">
            M
          </div>
          <span className="font-semibold">Meta Ads Connect</span>
        </div>
        <Link
          href="/login"
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
        >
          Launch demo
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <p className="mb-3 inline-block rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
          Hackathon MVP — creator outreach automation for SMEs
        </p>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight">
          Meta Ads Manager,
          <br />
          but for creators.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Businesses build a campaign once. We auto-match creators and fire
          offers as bids. Creators accept or reject — no tedious DMs and
          negotiations.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            href="/business"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-blue-500"
          >
            <p className="text-xs uppercase tracking-wide text-blue-400">
              For businesses
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Build a campaign → auto-match → send offers
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Ads-manager style table, match scores, bulk outreach in 1 click.
            </p>
            <span className="mt-4 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-medium">
              Open business demo →
            </span>
          </Link>

          <Link
            href="/creator"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-green-500"
          >
            <p className="text-xs uppercase tracking-wide text-green-400">
              For creators
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Offer inbox → accept / reject
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Bids arrive with brief + payout. One tap to accept, live updates.
            </p>
            <span className="mt-4 inline-block rounded-full bg-green-600 px-4 py-2 text-sm font-medium">
              Open creator demo →
            </span>
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
          <p className="font-medium text-white">How the demo works (no backend needed)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>All data is in-memory seed (8 creators, 2 campaigns).</li>
            <li>Matching score = niche match + follower fit + price fit.</li>
            <li>Connect Supabase later for persistence — see README + <code>supabase/schema.sql</code>.</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
