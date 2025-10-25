import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
    const sessionCookie = getSessionCookie(request);

    // Check cookie presence - prevents obviously unauthorized users
    if (!sessionCookie) {
        console.info("[middleware] Missing session cookie, redirecting to /sign-in", {
            path: request.nextUrl.pathname,
            search: request.nextUrl.search,
        });
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    console.info("[middleware] Session cookie detected, allowing request", {
        path: request.nextUrl.pathname,
        hasValue: Boolean(sessionCookie.value),
        valuePreview: sessionCookie.value?.slice(0, 12),
    });

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|assets).*)',
    ],
};