import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware is a pass-through — auth protection handled client-side in AppShell
// Only skip static assets
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
