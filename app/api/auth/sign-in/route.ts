import { APIError } from "better-call";
import { NextResponse } from "next/server";

import { createResponseFromAuthResult } from "../utils";
import { getAuth } from "@/lib/better-auth/auth";

const normalizeRequestHeaders = (headers: Headers) => {
    const result: Record<string, string> = {};

    for (const [key, value] of headers.entries()) {
        result[key] = value;
    }

    return result;
};

const sanitizeHeadersForLog = (headers: Record<string, string>) => {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        sanitized[key] = key.toLowerCase() === "cookie" ? "[redacted]" : value;
    }

    return sanitized;
};

export async function POST(request: Request) {
    try {
        const auth = await getAuth();
        const body = await request.json();

        const { email } = body ?? {};
        console.info("[auth] Sign in request received", { email });

        const normalizedHeaders = normalizeRequestHeaders(request.headers);
        console.debug("[auth] Normalized request headers", sanitizeHeadersForLog(normalizedHeaders));

        const result = await auth.api.signInEmail({
            body,
            headers: normalizedHeaders,
            returnHeaders: true,
        });

        console.info("[auth] Sign in successful", { email });
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
