"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCampaign } from "@/app/actions/campaigns";
import { NICHE_OPTIONS, formatMoney } from "@/lib/types";

const input = "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500";

export default function NewCampaignPage() {
  const router = useRouter();
  const [budget, setBudget] = useState(1500);
  const [maxPayout, setMaxPayout] = useState(200);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; id?: string } | undefined, formData: FormData) => {
      const res = await createCampaign(formData);
      if (res.error) return { error: res.error };
      router.push("/business");
      return { id: res.id };
    },
    undefined
  );

  return (
    <div className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
        <Link href="/business" className="text-sm text-blue-600">← Back to Ads Manager</Link>
        <h1 className="mt-2 text-2xl font-bold">New campaign</h1>
        <p className="text-sm text-zinc-500">Like boosting a post — but it goes to creators as bids.</p>

        <form action={formAction} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium">Campaign title</label>
            <input name="title" className={input} defaultValue="Holiday Drop Collab" required />
          </div>
          <div>
            <label className="text-sm font-medium">Brief for creators</label>
            <textarea name="brief" className={input} rows={3} defaultValue="1x TikTok unboxing + link in bio for 48h." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Total budget (USD)</label>
              <input name="budget_usd" type="number" className={input} value={budget} onChange={(e) => setBudget(Number(e.target.value))} min={50} />
            </div>
            <div>
              <label className="text-sm font-medium">Target niche</label>
              <select name="niche" className={input} defaultValue="lifestyle">
                {NICHE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Min followers</label>
              <input name="min_followers" type="number" className={input} defaultValue={50000} step={1000} />
            </div>
            <div>
              <label className="text-sm font-medium">Max payout / creator (USD)</label>
              <input name="max_payout_usd" type="number" className={input} value={maxPayout} onChange={(e) => setMaxPayout(Number(e.target.value))} min={10} />
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            Est. reach: ~{Math.max(1, Math.round(budget / Math.max(1, maxPayout)))} creators · {formatMoney(budget * 100)} total
          </div>

          {state?.error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
          )}

          <button disabled={pending} className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50">
            {pending ? "Creating…" : "Create campaign & auto-match →"}
          </button>
        </form>
      </div>
    </div>
  );
}
