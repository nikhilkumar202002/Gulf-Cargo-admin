
import axios from "axios";
import { getToken, setToken, clearToken } from "../auth/tokenStore";

export const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "https://gulfcargoapi.bhutanvoyage.in/api";

export const USE_COOKIES =
  String(import.meta.env.VITE_AUTH_COOKIES ?? "false").toLowerCase() === "true";

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: USE_COOKIES,
  headers: { Accept: "application/json" },
});

// ---- Request: attach token; hydrate from storage on first hit after reload ----
axiosInstance.interceptors.request.use(
  (config) => {
    let token = getToken();

    // 👇 Fallback for hard reloads: adopt token from storage once
    if (!token) {
      try {
        const lsToken = localStorage.getItem("token"); // your AuthContext key
        if (lsToken) {
          token = lsToken;
          setToken(lsToken); // hydrate memory so subsequent requests are clean
        }
      } catch {
        /* ignore storage errors (Safari private mode, etc.) */
      }
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Response: optional auto-refresh with HttpOnly cookie (unchanged) ----
let isRefreshing = false;
let queue = [];
const resumeQueued = () => { queue.forEach(({ resolve }) => resolve()); queue = []; };
const waitForRefresh = () => new Promise((resolve) => queue.push({ resolve }));

const shouldRefresh = (status, url) => {
  if (!USE_COOKIES) return false;
  if (status !== 401) return false;
  return !url || !url.includes("/auth/refresh"); // avoid loops
};

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error || {};
    const status = response?.status;
    const original = config || {};
    const originalUrl = original?.url || "";

    if (!shouldRefresh(status, originalUrl) || original._retry) {
      if (status === 401) clearToken();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!isRefreshing) {
        isRefreshing = true;
        // use plain axios to avoid recursion
        const r = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        const newToken =
          r?.data?.access_token || r?.data?.token || r?.data?.data?.access_token;
        if (!newToken) throw new Error("No access_token in refresh response");

        setToken(newToken);
        resumeQueued();
      } else {
        await waitForRefresh();
      }

      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${getToken()}`;
      return axiosInstance(original);
    } catch (e) {
      clearToken();
      resumeQueued();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosInstance;
