"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp } from "@/app/actions/auth";
import { NICHE_OPTIONS } from "@/lib/types";

const input =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [role, setRole] = useState<"business" | "creator">("business");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => action(formData),
    undefined
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <Link href="/" className="text-xs text-zinc-500">← Home</Link>
        <h1 className="mt-1 text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          One account = one role. Businesses go to Ads Manager, creators to the offer inbox.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-800 p-1 text-sm">
          {(["business", "creator"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-lg py-2 font-medium capitalize ${role === r ? "bg-white text-black" : "text-zinc-400"}`}
            >
              {r}
            </button>
          ))}
        </div>

        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="role" value={role} />
          {mode === "signup" && (
            <>
              <input name="name" placeholder="Name (e.g. Glow Inc. / Maya Chen)" required className={input} />
              {role === "creator" && (
                <select name="niche" className={input} defaultValue="lifestyle">
                  {NICHE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              )}
            </>
          )}
          <input name="email" type="email" placeholder="Email" required className={input} />
          <input name="password" type="password" placeholder="Password (min 6 chars)" required minLength={6} className={input} />

          {state?.error && (
            <p className="rounded-xl bg-red-950 p-3 text-xs text-red-300">{state.error}</p>
          )}

          <button
            disabled={pending}
            className="w-full rounded-xl bg-blue-600 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {pending ? "Please wait…" : mode === "signin" ? "Sign in →" : "Sign up →"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-3 w-full text-center text-sm text-zinc-400 underline"
        >
          {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>

        <div className="mt-4 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
          <p className="font-medium text-zinc-300">No Supabase tables yet? Use demo mode:</p>
          <div className="mt-2 flex gap-2">
            <Link href="/business" className="flex-1 rounded-lg border border-zinc-700 py-2 text-center hover:bg-zinc-800">Business demo</Link>
            <Link href="/creator" className="flex-1 rounded-lg border border-zinc-700 py-2 text-center hover:bg-zinc-800">Creator demo</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
