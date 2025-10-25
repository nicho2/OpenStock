import { APIError } from "better-call";
import { NextResponse } from "next/server";

import { createResponseFromAuthResult } from "../utils";
import { getAuth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: Request) {
    try {
        const auth = await getAuth();
        const { email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry } = await request.json();

        const result = await auth.api.signUpEmail({
            body: { email, password, name: fullName },
            headers: request.headers,
            returnHeaders: true,
        });

        if (result.response.ok && process.env.INNGEST_EVENT_KEY) {
            try {
                await inngest.send({
                    name: "app/user.created",
                    data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry },
                });
            } catch (eventError) {
                console.error("[auth] Failed to dispatch Inngest event", eventError);
            }
        } else if (!process.env.INNGEST_EVENT_KEY) {
            console.warn("Skipping Inngest event 'app/user.created' because INNGEST_EVENT_KEY is not configured.");
        }

        return await createResponseFromAuthResult(result);
    } catch (error) {
        console.error("[auth] Sign up route failed", error);
        if (error instanceof APIError) {
            const status = error.statusCode ?? 500;
            const payload = error.body ?? { error: error.message ?? "Sign up failed" };
            return NextResponse.json(payload, { status });
        }

        return NextResponse.json({ error: "Sign up failed" }, { status: 500 });
    }
}
