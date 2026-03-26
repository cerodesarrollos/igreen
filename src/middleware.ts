import { NextResponse } from "next/server";

// Middleware is a pass-through — auth protection handled client-side in AppShell
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
