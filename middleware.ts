import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/reservation-carte-grise") {
    const url = request.nextUrl.clone();
    url.pathname = "/reservation-carte-grise-v2";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/reservation-carte-grise"] };
