
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

axiosInstance.interceptors.request.use(
  (config) => {

    if (!hydrated) {
      try {
        const lsToken = localStorage.getItem("token");
        if (lsToken && !getToken()) {
          setToken(lsToken);
        }
      } catch {
      }
      hydrated = true;
    }

    const token = getToken?.();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try { clearToken?.(); } catch {}
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
