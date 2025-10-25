import { NextResponse } from "next/server";

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
};

export const createResponseFromAuthResult = async (result: {
    response: unknown;
    headers?: Headers | null;
}) => {
    const setCookie = result.headers instanceof Headers ? result.headers.get("set-cookie") : undefined;

    if (result.response instanceof Response) {
        const response = result.response;
        if (setCookie) {
            response.headers.set("set-cookie", setCookie);
        }
        return response;
    }

    const payload = result.response === undefined ? null : result.response;
    const init: ResponseInit = { status: 200 };

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

    const response = NextResponse.json(payload, init);

    if (setCookie) {
        response.headers.set("set-cookie", setCookie);
    }

    return response;
};
