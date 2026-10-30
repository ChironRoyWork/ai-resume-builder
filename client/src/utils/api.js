export const AUTHENTICATION_REQUIRED = "resumeai:authentication-required";

// This identity is only a UI key. The server verifies every token and owner.
export function getAccountKey(token) {
  if (!token) return null;
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(encoded));
    if (/^[1-9]\d*$/.test(String(payload.userId))) return `user:${payload.userId}`;
  } catch {
    // A malformed stored token still reaches the server's authentication check.
  }
  return `token:${token}`;
}

export async function apiFetch(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") throw error;
    throw new Error("Could not reach the server. Check your connection and try again.", { cause: error });
  }
  const authorization = new Headers(options.headers).get("Authorization");
  if (response.status === 401 && authorization && typeof window !== "undefined") {
    const token = authorization.replace(/^Bearer\s+/i, "");
    window.dispatchEvent(new CustomEvent(AUTHENTICATION_REQUIRED, { detail: { token } }));
  }
  return response;
}
