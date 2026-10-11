import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Without Supabase env vars the app runs in demo mode; don't take every route down.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getAnonKey();
  if (!url || !key) return supabaseResponse;
  const supabase = createServerClient(url, key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired — required for Server Components
  try {
    await supabase.auth.getUser();
  } catch {
    // Supabase unreachable: continue signed out rather than failing the request.
  }

  return supabaseResponse;
}
