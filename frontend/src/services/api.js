const API_URL = "https://fix-first-sigma.vercel.app";

export function getStoredToken() {
  try {
    return localStorage.getItem("fixfirstToken");
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("fixfirstUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  try {
    localStorage.setItem("fixfirstToken", token);
    localStorage.setItem("fixfirstUser", JSON.stringify(user));
  } catch (err) {
    console.error("Failed to save session to localStorage:", err);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem("fixfirstToken");
    localStorage.removeItem("fixfirstUser");
  } catch (err) {
    console.error("Failed to clear session:", err);
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error) {
    throw new Error(
      `Cannot connect to FixFirst API at ${API_URL}. Check that the backend is running and the API URL is correct. (${error.message})`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  const responseText = await response.text();

  if (responseText) {
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }
    } else {
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes("/auth/login")) {
      clearSession();
    }
    const message = data?.message || data?.error ||
      `Request failed (${response.status} ${response.statusText || ""}).`;
    throw new Error(message);
  }

  return data;
}

export { API_URL };
