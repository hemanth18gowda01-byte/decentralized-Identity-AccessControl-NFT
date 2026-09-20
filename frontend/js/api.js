import {
    BACKEND_URL
} from "./config.js";

function authorizationHeaders(headers = {}) {
    const token = sessionStorage.getItem("identity_access_token");
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}


export async function apiGet(endpoint) {

    const response = await fetch(
        `${BACKEND_URL}${endpoint}`,
        { headers: authorizationHeaders() }
    );

    if (!response.ok) {

        const error = await response.text();

        throw new Error(error);
    }

    return await response.json();
}


export async function apiPost(
    endpoint,
    body
) {

    const response = await fetch(
        `${BACKEND_URL}${endpoint}`,
        {
            method: "POST",

            headers: authorizationHeaders({
                "Content-Type": "application/json"
            }),

            body: JSON.stringify(body)
        }
    );


    if (!response.ok) {

        const error = await response.text();

        throw new Error(error);
    }

    return await response.json();
}

export async function apiUpload(endpoint, formData) {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: authorizationHeaders(),
        body: formData
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json();
}

export async function apiDelete(endpoint) {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "DELETE",
        headers: authorizationHeaders()
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json();
}