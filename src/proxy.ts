import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/" || pathname === "") {
    const redirectUrl = new URL(`/ceo-tower${search}`, request.url);
    return NextResponse.redirect(redirectUrl, 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
