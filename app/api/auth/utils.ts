import { NextResponse } from "next/server";

type HeadersLike =
    | Headers
    | Map<string, unknown>
    | Record<string, unknown>
    | Array<[string, unknown]>
    | Iterable<[string, unknown]>
    | null
    | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const toStringArray = (value: unknown): string[] => {
    if (typeof value === "string") {
        return [value];
    }

    if (Array.isArray(value)) {
        return value.flatMap((entry) => (typeof entry === "string" ? [entry] : []));
    }

    return [];
};

const isHeadersInstance = (value: unknown): value is Headers => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Headers;
    return (
        typeof candidate.append === "function" &&
        typeof candidate.delete === "function" &&
        typeof candidate.entries === "function" &&
        typeof candidate.forEach === "function" &&
        typeof candidate.get === "function" &&
        typeof candidate.has === "function"
    );
};

const extractSetCookieFromHeadersInstance = (headers: Headers): string[] => {
    const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof getSetCookie === "function") {
        try {
            const cookies = getSetCookie.call(headers);
            console.info("[auth] Extracted Set-Cookie headers via headers.getSetCookie()");
            return cookies;
        } catch (error) {
            console.error("[auth] Failed to invoke headers.getSetCookie()", error);
        }
    }

    const raw = (headers as Headers & { raw?: () => Record<string, unknown> }).raw?.();
    if (raw) {
        console.info("[auth] Extracted Set-Cookie headers via headers.raw()");
        const value = raw["set-cookie"] ?? raw["Set-Cookie"];
        return toStringArray(value);
    }

    console.info("[auth] Falling back to manual Set-Cookie header scan");
    const values: string[] = [];
    headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie" && typeof value === "string") {
            values.push(value);
        }
    });

    return values;
};

const logCookieExtraction = (source: string, cookies: string[]) => {
    if (cookies.length === 0) {
        console.info(`[auth] No Set-Cookie headers detected from ${source}`);
        return;
    }

    console.info(`[auth] Detected ${cookies.length} Set-Cookie header(s) from ${source}`);
};

const extractSetCookieValues = (headers: HeadersLike): string[] => {
    if (!headers) {
        return [];
    }

    if (isHeadersInstance(headers)) {
        const cookies = extractSetCookieFromHeadersInstance(headers);
        logCookieExtraction("Headers instance", cookies);
        return cookies;
    }

    if (headers instanceof Map) {
        return extractSetCookieValues(Object.fromEntries(headers));
    }

    if (isRecord(headers)) {
        const entries = Object.entries(headers);
        const cookies = entries.flatMap(([key, value]) => {
            if (key.toLowerCase() !== "set-cookie") {
                return [];
            }

            return toStringArray(value);
        });
        logCookieExtraction("record headers", cookies);
        return cookies;
    }

    if (Array.isArray(headers)) {
        const iterable = headers as Array<[string, unknown]>;
        const cookies: string[] = [];
        for (const [key, value] of iterable) {
            if (typeof key === "string" && key.toLowerCase() === "set-cookie") {
                cookies.push(...toStringArray(value));
            }
        }
        logCookieExtraction("array headers", cookies);
        return cookies;
    }

    if (headers && typeof headers === "object" && Symbol.iterator in headers) {
        const iterable = headers as Iterable<[string, unknown]>;
        const cookies: string[] = [];
        for (const [key, value] of iterable) {
            if (typeof key === "string" && key.toLowerCase() === "set-cookie") {
                cookies.push(...toStringArray(value));
            }
        }
        logCookieExtraction("iterable headers", cookies);
        return cookies;
    }

    return [];
};

const applySetCookieHeaders = (response: Response, cookies: string[]) => {
    if (cookies.length === 0) {
        return;
    }

    const uniqueCookies = Array.from(new Set(cookies.filter((cookie) => typeof cookie === "string" && cookie.length > 0)));
    if (uniqueCookies.length === 0) {
        return;
    }

    console.info(`[auth] Applying ${uniqueCookies.length} Set-Cookie header(s) to response`);
    response.headers.delete("set-cookie");
    for (const cookie of uniqueCookies) {
        response.headers.append("set-cookie", cookie);
    }
};

const buildResponse = (payload: unknown, init: ResponseInit & { headers?: HeadersInit }, cookies: string[], contentType?: string | null) => {
    const headers = new Headers(init.headers);

    if (contentType && !headers.has("content-type")) {
        headers.set("content-type", contentType);
    }

    const finalInit: ResponseInit = { status: init.status, statusText: init.statusText, headers };

    let response: NextResponse;
    if (payload === null || typeof payload === "object") {
        response = NextResponse.json(payload, finalInit);
    } else {
        if (!headers.has("content-type")) {
            headers.set("content-type", "text/plain; charset=utf-8");
        }
        response = new NextResponse(String(payload), finalInit);
    }

    console.info(
        "[auth] Built response",
        JSON.stringify({ status: finalInit.status, statusText: finalInit.statusText, hasBody: payload !== null })
    );
    applySetCookieHeaders(response, cookies);
    return response;
};

const readResponsePayload = async (response: Response): Promise<{ body: unknown; contentType: string | null }> => {
    const contentType = response.headers.get("content-type");
    const text = await response.text();

    if (!text) {
        return { body: null, contentType };
    }

    if (contentType?.includes("application/json")) {
        try {
            return { body: JSON.parse(text), contentType };
        } catch (error) {
            console.error("[auth] Failed to parse JSON response", error);
            return { body: text, contentType };
        }
    }

    return { body: text, contentType };
};

export const createResponseFromAuthResult = async (result: {
    response: unknown;
    headers?: HeadersLike;
}) => {
    const cookies: string[] = [];
    console.info("[auth] Processing auth result headers for cookies");
    cookies.push(...extractSetCookieValues(result.headers));

    if (result.response instanceof Response) {
        console.info(
            "[auth] Received Response instance from auth result",
            JSON.stringify({ status: result.response.status, statusText: result.response.statusText })
        );
        cookies.push(...extractSetCookieValues(result.response.headers));

        const { body, contentType } = await readResponsePayload(result.response);
        const init: ResponseInit & { headers?: HeadersInit } = {
            status: result.response.status,
            statusText: result.response.statusText,
        };

        return buildResponse(body, init, cookies, contentType);
    }

    const payload = result.response === undefined ? null : result.response;
    const init: ResponseInit & { headers?: HeadersInit } = { status: 200 };

    if (isRecord(payload)) {
        const maybeStatus = payload.status;
        const maybeStatusText = payload.statusText;

        if (typeof maybeStatus === "number") {
            init.status = maybeStatus;
        }

        if (typeof maybeStatusText === "string") {
            init.statusText = maybeStatusText;
        }
    }

    return buildResponse(payload, init, cookies, "application/json");
};
