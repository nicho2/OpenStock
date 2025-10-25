import { NextResponse } from "next/server";

import { createResponseFromAuthResult } from "../utils";
import { getAuth } from "@/lib/better-auth/auth";

export async function POST(request: Request) {
    try {
        const auth = await getAuth();
        const result = await auth.api.signOut({
            headers: request.headers,
            returnHeaders: true,
        });

        if (result.response instanceof Response) {
            console.info(
                "[auth] Received Response instance from sign out result",
                JSON.stringify({ status: result.response.status, statusText: result.response.statusText })
            );
        }

        return await createResponseFromAuthResult(result);
    } catch (error) {
        console.error("[auth] Sign out route failed", error);
        return NextResponse.json({ error: "Sign out failed" }, { status: 500 });
    }
}
