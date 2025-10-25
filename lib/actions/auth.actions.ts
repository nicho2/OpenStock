const DEFAULT_HEADERS = {
    "Content-Type": "application/json",
};

const parseErrorMessage = async (response: Response) => {
    try {
        const payload = await response.json();
        if (typeof payload?.error === "string") {
            return payload.error;
        }
        if (typeof payload?.message === "string") {
            return payload.message;
        }
    } catch (error) {
        console.error("[auth] Failed to parse error response", error);
    }

    return `${response.status} ${response.statusText}`.trim();
};

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }:
 SignUpFormData) => {
    try {
        const response = await fetch("/api/auth/sign-up", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({
                email,
                password,
                fullName,
                country,
                investmentGoals,
                riskTolerance,
                preferredIndustry,
            }),
        });

        if (!response.ok) {
            const message = await parseErrorMessage(response);
            return { success: false, error: message };
        }

        const data = await response.json();
        console.info("Sign up completed successfully for", email);
        return { success: true, data };
    } catch (e) {
        console.error("[auth] Sign up request failed", e);
        return { success: false, error: "Sign up failed" };
    }
};

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    try {
        const response = await fetch("/api/auth/sign-in", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const message = await parseErrorMessage(response);
            return { success: false, error: message };
        }

        const data = await response.json();
        console.info("Sign in completed successfully for", email);
        return { success: true, data };
    } catch (e) {
        console.error("[auth] Sign in request failed", e);
        return { success: false, error: "Sign in failed" };
    }
};

export const signOut = async () => {
    try {
        const response = await fetch("/api/auth/sign-out", {
            method: "POST",
            headers: DEFAULT_HEADERS,
        });

        if (!response.ok) {
            const message = await parseErrorMessage(response);
            return { success: false, error: message };
        }

        console.info("Sign out completed successfully");
        return { success: true };
    } catch (e) {
        console.error("[auth] Sign out request failed", e);
        return { success: false, error: "Sign out failed" };
    }
};
