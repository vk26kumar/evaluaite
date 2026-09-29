import { readStorage, writeStorage } from "./storage";

const TOKEN_KEY = "evaluaite.session";

const BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN", details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get fieldErrors() {
    const map = {};
    for (const detail of this.details || []) {
      if (detail.field && !map[detail.field]) map[detail.field] = detail.message;
    }
    return map;
  }
}

export const session = {
  getToken: () => readStorage(TOKEN_KEY),
  setToken: (token) => writeStorage(TOKEN_KEY, token),
  clear: () => writeStorage(TOKEN_KEY, null),
};

const listeners = new Set();

export function onSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function readError(response) {
  const body = await response.json().catch(() => null);
  const error = body?.error;
  const fallback =
    response.status >= 500
      ? "Something went wrong on our side. Please try again."
      : `Request failed (${response.status}).`;
  return new ApiError(error?.message || fallback, {
    status: response.status,
    code: error?.code,
    details: error?.details,
  });
}

export async function request(path, { method = "GET", body, form, signal, timeout = 60_000, raw = false } = {}) {
  const headers = { Accept: raw ? "*/*" : "application/json" };
  const token = session.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), timeout);
  const abortFromCaller = () => controller.abort(signal.reason);
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload, signal: controller.signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    if (controller.signal.aborted) {
      throw new ApiError("The server took too long to respond. Please try again.", { code: "TIMEOUT" });
    }
    throw new ApiError("Can't reach the server. Check your connection and try again.", { code: "NETWORK" });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    const error = await readError(response);
    if (response.status === 401 && token && session.getToken() === token) {
      session.clear();
      listeners.forEach((listener) => listener(error));
    }
    throw error;
  }

  if (raw) return response;
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
  upload: (path, form, options) => request(path, { timeout: 180_000, ...options, method: "POST", form }),
};

export const apiUrl = (path) => `${BASE_URL}${path}`;
