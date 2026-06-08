import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refresh the auth session cookie on every request and gate protected routes.
 * Public routes: "/" (login screen) and "/api/auth/*" (login endpoints).
 * Everything else requires a valid Supabase session.
 *
 * Onboarding gate: any signed-in user with onboarding_completed=false is
 * forced into /onboarding (AM) or /admin/onboarding (admin) until done.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path.startsWith("/api/auth") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const meta = (user?.app_metadata ?? {}) as { role?: string; onboarding_completed?: boolean };
  const role = meta.role;
  const onboarded = meta.onboarding_completed !== false; // default true for legacy users with no flag

  // Onboarding gate (applies to signed-in users only, before role gating)
  if (user && !onboarded) {
    const target = role === "admin" ? "/admin/onboarding" : "/onboarding";
    const isOnboardingPath = path === target;
    const isOnboardingApi =
      path === "/api/onboarding/am" || path === "/api/onboarding/admin" || path === "/api/auth/signout";
    if (!isOnboardingPath && !isOnboardingApi) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url);
    }
  }

  // Already-onboarded users shouldn't sit on the onboarding screens
  if (user && onboarded && (path === "/onboarding" || path === "/admin/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin" : "/home";
    return NextResponse.redirect(url);
  }

  // Role-based gates
  if (user && path.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }
  if (user && role === "admin" && !path.startsWith("/admin") && !path.startsWith("/api") && path !== "/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
