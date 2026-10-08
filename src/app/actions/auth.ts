"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "Demo User");
  const role = (String(formData.get("role") ?? "business") as Role) === "creator" ? "creator" : "business";
  const niche = String(formData.get("niche") ?? "lifestyle");

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  const user = data.user;
  if (!user) return { error: "Signup failed — check email confirmation settings." };

  // Create profile row (RLS allows users to upsert own profile)
  const { error: pErr } = await supabase.from("profiles").upsert({
    id: user.id,
    role,
    name,
    niche: role === "creator" ? niche : null,
    followers: role === "creator" ? 50000 : 0,
    price_cents: role === "creator" ? 10000 : 0,
  });
  if (pErr) return { error: `Auth OK but profile failed: ${pErr.message}. Did you run supabase/schema.sql?` };

  redirect(role === "business" ? "/business" : "/creator");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

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
