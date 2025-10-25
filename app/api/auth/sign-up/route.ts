import { NextResponse } from "next/server";
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
        console.error("[auth] Sign up route failed", error);
        return NextResponse.json({ error: "Sign up failed" }, { status: 500 });
    }
}
