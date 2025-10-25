'use server';

import {getAuth} from "@/lib/better-auth/auth";
import {inngest} from "@/lib/inngest/client";
import {headers} from "next/headers";

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

        return { success: true, data: response }
    } catch (e) {
        console.log('Sign up failed', e)
        return { success: false, error: 'Sign up failed' }
    }
}

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    try {
        const auth = await getAuth();
        const response = await auth.api.signInEmail({
            body: { email, password },
            headers: await headers(),
        })

        return { success: true, data: response }
    } catch (e) {
        console.log('Sign in failed', e)
        return { success: false, error: 'Sign in failed' }
    }
}

export const signOut = async () => {
    try {
        const auth = await getAuth();
        await auth.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('Sign out failed', e)
        return { success: false, error: 'Sign out failed' }
    }
}

