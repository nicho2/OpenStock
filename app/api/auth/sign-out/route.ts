import { NextResponse } from "next/server";
import { getAuth } from "@/lib/better-auth/auth";

export async function POST(request: Request) {
    try {
        const auth = await getAuth();
        const result = await auth.api.signOut({
            headers: request.headers,
            returnHeaders: true,
        });

        const response = NextResponse.json({}, {
            status: result.response.status,
            statusText: result.response.statusText,
        });

        const setCookie = result.headers?.get("set-cookie");
        if (setCookie) {
            response.headers.set("set-cookie", setCookie);
        }

        return response;
    } catch (error) {
        console.error("[auth] Sign out route failed", error);
        return NextResponse.json({ error: "Sign out failed" }, { status: 500 });
    }
}
