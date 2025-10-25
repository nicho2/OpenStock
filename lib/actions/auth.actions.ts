'use server';

import {getAuth} from "@/lib/better-auth/auth";
import {inngest} from "@/lib/inngest/client";
import {cookies, headers} from "next/headers";
import {parseSetCookieHeader} from "better-auth/cookies";

const syncCookiesFromResponse = async (responseHeaders?: Headers | null) => {
    if (!responseHeaders) {
        console.warn("[auth] syncCookiesFromResponse called without headers");
        return;
    }

    const setCookieHeader = responseHeaders.get("set-cookie");
    if (!setCookieHeader) {
        console.warn("[auth] Auth response did not include a set-cookie header", {
            receivedHeaders: Object.fromEntries(responseHeaders.entries()),
        });
        return;
    }

    console.info("[auth] Received set-cookie header from auth response", setCookieHeader);

    const parsedCookies = parseSetCookieHeader(setCookieHeader);
    if (!parsedCookies.size) {
        console.warn("[auth] Unable to parse set-cookie header from auth response");
        return;
    }

    const cookieStore = await cookies();

    parsedCookies.forEach((value, key) => {
        if (!key) return;

        const maxAge = value["max-age"] ? Number(value["max-age"]) : undefined;

        try {
            console.info("[auth] Persisting auth cookie", {
                key,
                domain: value.domain,
                path: value.path,
                secure: value.secure,
                sameSite: value.samesite,
                maxAge,
            });
            cookieStore.set(key, decodeURIComponent(value.value), {
                httpOnly: value.httponly,
                secure: value.secure,
                sameSite: value.samesite,
                maxAge,
                domain: value.domain,
                path: value.path,
            });
            console.info("[auth] Auth cookie persisted successfully", key);
        } catch (error) {
            console.error(`Failed to persist auth cookie: ${key}`, error);
        }
    });
};

const cloneRequestHeaders = () => {
    const incomingHeaders = headers();
    const clonedHeaders = new Headers();

    incomingHeaders.forEach((value, key) => {
        clonedHeaders.set(key, value);
    });

    return clonedHeaders;
};

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData) => {
    try {
        const auth = await getAuth();
        const response = await auth.api.signUpEmail({
            body: { email, password, name: fullName },
            headers: await headers(),
        })

        if(response) {
            if (!process.env.INNGEST_EVENT_KEY) {
                console.warn("Skipping Inngest event 'app/user.created' because INNGEST_EVENT_KEY is not configured.")
            } else {
                await inngest.send({
                    name: 'app/user.created',
                    data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry }
                })
            }
        }

        console.info("Sign up completed successfully for", email);
        return { success: true, data: response.response }
    } catch (e) {
        console.log('Sign up failed', e)
        return { success: false, error: 'Sign up failed' }
    }
}

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    try {
        console.info("[auth] Starting sign-in flow", { email });
        const auth = await getAuth();
        const response = await auth.api.signInEmail({
            body: { email, password },
            headers: await headers(),
            returnHeaders: true,
        })

        console.info("[auth] Sign-in API call completed", {
            status: response.response.status,
            statusText: response.response.statusText,
        });

        await syncCookiesFromResponse(response.headers);

        console.info("Sign in completed successfully for", email);
        return { success: true, data: response.response }
    } catch (e) {
        console.error('[auth] Sign in failed', e)
        return { success: false, error: 'Sign in failed' }
    }
}

export const signOut = async () => {
    try {
        const auth = await getAuth();
        const response = await auth.api.signOut({
            headers: cloneRequestHeaders(),
            returnHeaders: true,
        });

        await syncCookiesFromResponse(response.headers);

        console.info("Sign out completed successfully");
    } catch (e) {
        console.error('[auth] Sign out failed', e)
        return { success: false, error: 'Sign out failed' }
    }
}

