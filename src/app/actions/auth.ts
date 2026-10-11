"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getSupabaseAnonKey } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

/** Form-level error shown in the login Alert. */
export type AuthError = { title: string; message: string };
export type AuthResult = { error?: AuthError; notice?: string } | undefined;

const NOT_CONFIGURED: AuthError = {
  title: "Sign-in isn't available in this demo",
  message: "Use the demo links below to explore as a brand or a creator.",
};

function isConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseAnonKey());
}

async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

function parseRole(formData: FormData): Role {
  return formData.get("role") === "creator" ? "creator" : "business";
}

/** Turn Supabase error messages into copy people can act on. */
function friendly(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return {
      title: "That email and password don't match",
      message: "Check for typos or reset your password. Signed up with Google? Use Continue with Google instead.",
    };
  if (m.includes("email not confirmed"))
    return { title: "Confirm your email first", message: "We sent a link to your inbox. Open it, then sign in." };
  if (m.includes("already registered"))
    return { title: "An account with this email already exists", message: "Sign in instead, or use Continue with Google." };
  if (m.includes("rate limit"))
    return { title: "Too many attempts", message: "Wait a minute, then try again." };
  return { title: "Something went wrong", message };
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  if (!isConfigured()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "Demo User");
  const role = parseRole(formData);
  const niche = String(formData.get("niche") ?? "lifestyle");

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: friendly(error.message) };
  const user = data.user;
  if (!user) return { error: { title: "Check your inbox", message: "Confirm your email to finish creating your account." } };

  // Create profile row (RLS allows users to upsert own profile)
  const { error: pErr } = await supabase.from("profiles").upsert({
    id: user.id,
    role,
    name,
    niche: role === "creator" ? niche : null,
    followers: role === "creator" ? 50000 : 0,
    price_cents: role === "creator" ? 10000 : 0,
  });
  if (pErr) return { error: { title: "We couldn't set up your profile", message: pErr.message } };

  redirect(role === "business" ? "/business" : "/creator");
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  if (!isConfigured()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message) };

  // Route by role
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile as { role?: string } | null)?.role;
    redirect(role === "creator" ? "/creator" : "/business");
  }
  redirect("/business");
}

/**
 * Start Google OAuth. The chosen role rides along to /auth/callback so a
 * first-time Google user gets the right profile; returning users keep theirs.
 */
export async function signInWithGoogle(formData: FormData): Promise<AuthResult> {
  if (!isConfigured()) return { error: NOT_CONFIGURED };
  if (!(await isGoogleEnabled()))
    return { error: { title: "Google sign-in isn't switched on yet", message: "Sign in with email for now, or try the demo below." } };
  const supabase = await createClient();
  const role = parseRole(formData);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await getOrigin()}/auth/callback?role=${role}` },
  });
  if (error || !data.url) return { error: friendly(error?.message ?? "Couldn't reach Google. Try again.") };
  redirect(data.url);
}

/**
 * signInWithOAuth doesn't check the provider, so a disabled one would dump
 * people on a raw Supabase error page. The public settings endpoint tells us first.
 */
async function isGoogleEnabled() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: getSupabaseAnonKey() },
      cache: "no-store",
    });
    if (!res.ok) return true; // can't tell; let Supabase decide
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return settings.external?.google !== false;
  } catch {
    return true;
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!isConfigured()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/callback`,
  });
  if (error) return { error: friendly(error.message) };
  return { notice: `If an account exists for ${email}, a sign-in link is on its way.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getSessionProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return { user, profile };
}
