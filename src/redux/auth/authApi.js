// Base URL for the Node/MySQL backend.
// Set VITE_API_BASE_URL in a .env file at your project root to override,
// e.g. VITE_API_BASE_URL=http://localhost:5000/api
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Backend sends { success: false, message: "..." } on errors
    throw new Error(body.message || "Something went wrong");
  }

  return body.data; // { user, token }
}

export function loginApi({ identifier, password }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export function signupApi({ name, identifier, password }) {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, identifier, password }),
  });
}