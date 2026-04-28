import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

type ClerkMetadata = {
  role?: string;
  approval_status?: string;
};

const isPublicPath = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/account-status(.*)",
  "/sso-callback(.*)",
  "/api/webhooks(.*)",
]);

const clerkHandler = clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();
  const pathname = request.nextUrl.pathname;

  // Unauthenticated on a protected route
  if (!userId && !isPublicPath(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Unauthenticated on a public route — allow through
  if (!userId) {
    return NextResponse.next();
  }

  // Read role and approval_status from JWT claims (set via Clerk JWT template)
  const metadata = (sessionClaims?.metadata ?? {}) as ClerkMetadata;
  const approvalStatus = metadata.approval_status ?? "pending";
  const role = metadata.role ?? "user";

  // Account not yet approved — gate all protected routes
  if (approvalStatus !== "approved") {
    if (!pathname.startsWith("/account-status")) {
      const url = request.nextUrl.clone();
      url.pathname = "/account-status";
      url.searchParams.set("status", approvalStatus);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Approved user landing on /account-status — send home
  if (pathname.startsWith("/account-status")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Admin route guard
  if (pathname.startsWith("/admin") && role !== "super_admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Signed-in + approved on a public auth page — send home
  if (isPublicPath(request)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/",
    "/entities/:path*",
    "/projects/:path*",
    "/tasks/:path*",
    "/finance/:path*",
    "/admin/:path*",
    "/assigned-to-me(.*)",
    "/notifications(.*)",
    "/login(.*)",
    "/register(.*)",
    "/account-status(.*)",
    "/sso-callback(.*)",
    "/api/webhooks(.*)",
    "/logout(.*)",
  ],
};
