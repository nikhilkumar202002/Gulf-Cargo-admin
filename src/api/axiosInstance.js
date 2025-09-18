import axios from "axios";
import { getToken, clearToken } from "../auth/tokenStore";

export const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.gulfcargoksa.com/public/api";

// Hard-fail in production if API is not HTTPS
if (import.meta.env.PROD) {
  const proto = new URL(baseURL).protocol;
  if (proto !== "https:") throw new Error(`Insecure API baseURL: ${baseURL}`);
}

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: false,
  headers: { Accept: "application/json" },
});

// Optional anonymous session ID (non-sensitive) stored in sessionStorage for security
const ensureSessionId = () => {
  try {
    let sid = sessionStorage.getItem("session_id"); // Use sessionStorage instead of localStorage
    if (!sid) {
      sid =
        (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) +
        Date.now().toString(36);
      sessionStorage.setItem("session_id", sid); // Store in sessionStorage
    }
    return sid;
  } catch {
    return "anon";
  }
};

// Request interceptor to add Authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from memory (getToken stores it in memory or sessionStorage)
    const token = getToken?.();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach session ID header
    config.headers["X-Client-Session"] = ensureSessionId();

    // Handle multipart form data by letting the browser set the boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authorization errors (e.g., token expiry)
axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Handle unauthorized requests, clear the token, and trigger logout
      try {
        clearToken?.();
        // Dispatch the event for the app to react (e.g., navigate to login)
        window.dispatchEvent(new Event("auth:unauthorized"));
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
