import { APIError } from "better-call";
import { NextResponse } from "next/server";

import { createResponseFromAuthResult } from "../utils";
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

        return await createResponseFromAuthResult(result);
    } catch (error) {
        console.error("[auth] Sign in route failed", error);
        if (error instanceof APIError) {
            const status = error.statusCode ?? 500;
            const payload = error.body ?? { error: error.message ?? "Sign in failed" };
            return NextResponse.json(payload, { status });
        }

        return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
    }
}
