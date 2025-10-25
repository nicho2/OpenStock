import { NextResponse } from "next/server";
import { getAuth } from "@/lib/better-auth/auth";

export async function POST(request: Request) {
    try {
        const auth = await getAuth();
        const body = await request.json();

        const result = await auth.api.signInEmail({
            body,
            headers: request.headers,
            returnHeaders: true,
        });

        const responsePayload = await result.response.json();
        const response = NextResponse.json(responsePayload, {
            status: result.response.status,
            statusText: result.response.statusText,
        });

        const setCookie = result.headers?.get("set-cookie");
        if (setCookie) {
            response.headers.set("set-cookie", setCookie);
        }

        return response;
    } catch (error) {
        console.error("[auth] Sign in route failed", error);
        return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
    }
}
