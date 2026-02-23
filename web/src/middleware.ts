import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/join(.*)",
  "/how-it-works",
  "/compare(.*)",
  "/no-subscription-dog-tracker",
  "/dog-tracker-without-cell-service",
  "/sitemap.xml",
  "/robots.txt",
]);

function noAuthMiddleware(request: NextRequest) {
  return NextResponse.next();
}

const clerkAuth = clerkMiddleware(async (auth, req) => {
  // Redirect authenticated users from marketing page to dashboard
  if (req.nextUrl.pathname === "/") {
    const { userId } = await auth();
    if (userId) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkAuth
  : noAuthMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
