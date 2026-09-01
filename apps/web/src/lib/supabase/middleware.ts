import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic = pathname === "/"
    || pathname === "/login"
    || pathname === "/signup"
    || pathname === "/forgot-password"
    || pathname === "/reset-password"
    || pathname === "/auth/callback"
    || pathname === "/privacy"
    || pathname === "/robots.txt"
    || pathname === "/sitemap.xml"
    || pathname === "/icon.svg"
    || pathname === "/manifest.webmanifest"
    || pathname === "/sw.js"
    || pathname === "/offline.html"
    || pathname === "/roleway-mark.svg"
    || pathname.startsWith("/icons/")
    || pathname.startsWith("/_next/");
  const hasAuthCookie = request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));

  // Reject anonymous protected traffic without spending a Supabase Auth request.
  if (!hasAuthCookie && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
    return NextResponse.redirect(url);
  }
  if (!hasAuthCookie) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    const intendedPath = `${pathname}${request.nextUrl.search}`;
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(intendedPath)}`;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
