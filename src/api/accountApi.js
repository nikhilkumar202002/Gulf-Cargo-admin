import axiosInstance from "./axiosInstance";
import { setToken, clearToken } from "../auth/tokenStore";

const unwrap = (res) => res?.data ?? res;
const pickToken = (payload) =>
  payload?.access_token || payload?.token || payload?.data?.access_token || null;

// Register
export const register = async (userData) => {
  const res = await axiosInstance.post("/register", userData);
  return unwrap(res);
};

// Login
export const loginUser = async (credentials) => {
  const loginPath = import.meta.env.VITE_AUTH_LOGIN_PATH || "/login";
  const res = await axiosInstance.post(loginPath, credentials);
  const data = res?.data ?? res;
  const t = data?.access_token || data?.token || data?.data?.access_token || null;
  if (t) setToken(t);
  return data;
};

// Profile (protected)
export const getProfile = async () => {
  const res = await axiosInstance.get("/profile");
  return unwrap(res);
};

// Logout
export const logout = async () => {
  try {
    await axiosInstance.post("/logout");
  } finally {
    clearToken();                 // drop token client-side regardless
  }
};

// Forgot Password
export const forgotPassword = async (email) => {
  const res = await axiosInstance.post("/forgot-password", { email });
  return unwrap(res);
};

export const resetPassword = async (email, otp, password) => {
  const res = await axiosInstance.post("/reset-password", { email, otp, password });
  return unwrap(res);
};

export const staffRegister = async (userData, _tokenArgIgnored, axiosOpts = {}) => {
  const res = await axiosInstance.post("/register", userData, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    ...axiosOpts,
  });
  return unwrap(res);
};


export const listStaffs = async (params = {}) => {
  const res = await axiosInstance.get("/staffs", { params });
  const payload = unwrap(res);

  // Robust array picker (kept lightweight)
  const pickArray = (o) => {
    if (!o) return [];
    if (Array.isArray(o)) return o;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o?.data?.data)) return o.data.data;
    const keys = ["staffs", "staff", "users", "items", "results", "records", "rows", "list"];
    for (const k of keys) {
      if (Array.isArray(o[k])) return o[k];
      if (Array.isArray(o?.data?.[k])) return o.data[k];
    }
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        const nested = pickArray(v);
        if (nested.length) return nested;
      }
    }
    return [];
  };

  return pickArray(payload);
};