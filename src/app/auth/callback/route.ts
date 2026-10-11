import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-link landing. Exchanges the code for a session, creates a
 * profile for first-time users (role comes from the login toggle), then
 * routes to the right app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const role = searchParams.get("role") === "creator" ? "creator" : "business";
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, origin));

  if (!code) return fail("oauth");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("oauth");

  const user = data.user;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  let finalRole = (profile as { role?: string } | null)?.role;
  if (!finalRole) {
    const meta = user.user_metadata ?? {};
    const name = meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "New user";
    const { error: pErr } = await supabase.from("profiles").insert({
      id: user.id,
      role,
      name,
      niche: role === "creator" ? "lifestyle" : null,
      followers: role === "creator" ? 50000 : 0,
      price_cents: role === "creator" ? 10000 : 0,
      avatar_url: meta.avatar_url ?? null,
    });
    if (pErr) return fail("profile");
    finalRole = role;
  }

  return NextResponse.redirect(new URL(finalRole === "creator" ? "/creator" : "/business", origin));
}
