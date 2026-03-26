import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/privacy"];
const SKIP_PREFIXES = ["/api/", "/ventas/print/", "/_next/", "/favicon", "/manifest", "/logo", "/icons"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public and static paths
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    SKIP_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|json|webmanifest)$/)
  ) {
    return NextResponse.next();
  }

  // Check for supabase session cookie
  const cookies = request.cookies.getAll();
  const hasSession = cookies.some(c =>
    (c.name.includes("sb-") && c.name.includes("-auth-token")) ||
    c.name === "sb-access-token"
  );

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
