import axios from "axios";
import { getToken, setToken, clearToken } from "../auth/tokenStore";

export const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "https://gulfcargoapi.bhutanvoyage.in/api";

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: false,
  headers: { Accept: "application/json" },
});

let hydrated = false;

const ensureSessionId = () => {
  try {
    let sid = localStorage.getItem("session_id");
    if (!sid) {
      sid = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now().toString(36);
      localStorage.setItem("session_id", sid);
    }
    return sid;
  } catch {
    return "anon";
  }
};

axiosInstance.interceptors.request.use(
  (config) => {
    if (!hydrated) {
      try {
        const lsToken = localStorage.getItem("token");
        if (lsToken && !getToken()) setToken(lsToken);
      } catch {}
      hydrated = true;
    }

    const token = getToken?.();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers["X-Client-Session"] = ensureSessionId();
    if (config.data instanceof FormData) {
     if (config.headers) {
        delete config.headers["Content-Type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const code = String(error?.response?.data?.code || "").toLowerCase();
    const msg  = String(error?.response?.data?.message || "").toLowerCase();

    if (status === 401 || status === 419 || status === 440 || code.includes("session") || msg.includes("revoked")) {
      try {
        clearToken?.();
        localStorage.removeItem("token");
      } catch {}
      try {
        window.dispatchEvent(new Event("auth:unauthorized"));
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
