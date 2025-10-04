import axiosInstance from "./axiosInstance";
import { setToken, clearToken } from "../auth/tokenStore";

const unwrap = (res) => res?.data ?? res;

const DELETE_PATTERN =
  import.meta.env.VITE_STAFF_DELETE_PATTERN || "/staffs/:id"; // e.g. "/staff/:id" or "/staffs/delete/:id"
const withCreds = { withCredentials: false }; // Sanctum / cookie auth

const buildDeleteUrl = (id) => {
  if (!id && id !== 0) throw new Error("Staff id is required");
  return DELETE_PATTERN.replace(":id", String(id));
};

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
    clearToken(); 
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

export const staffRegister = async (payload, token, axiosOpts = {}) => {
  // Normalize payload to FormData
  const formData = payload instanceof FormData ? payload : (() => {
    const fd = new FormData();
    Object.entries(payload || {}).forEach(([k, v]) => {
      if (v == null) return;
      if (Array.isArray(v)) {
        const key = k.endsWith("[]") ? k : `${k}[]`;
        v.forEach((val) => fd.append(key, val));
      } else {
        fd.append(k, v);
      }
    });
    return fd;
  })();

  // Use proper staff endpoint (configurable)
  const path = import.meta.env.VITE_STAFF_REGISTER_PATH || "/register";

  const res = await axiosInstance.post(path, formData, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    },
    ...axiosOpts,
  });

  return unwrap(res);
};

export const listStaffs = async (params = {}) => {
  const res = await axiosInstance.get("/staffs", { params });
  const payload = unwrap(res);

  // capture meta in common Laravel / JSON:API shapes
  const meta =
    payload?.meta ||
    payload?.data?.meta ||
    payload?.data?.staffs?.meta ||
    payload?.staffs?.meta ||
    null;

  // robust array picker
  const pickArray = (o) => {
    if (!o) return [];
    if (Array.isArray(o)) return o;

    // common shapes
    if (Array.isArray(o.data)) return o.data;                 // { data: [...] }
    if (Array.isArray(o?.data?.data)) return o.data.data;     // { data: { data: [...] } }

    if (Array.isArray(o?.staffs)) return o.staffs;            // { staffs: [...] }
    if (Array.isArray(o?.staff)) return o.staff;              // { staff: [...] }
    if (Array.isArray(o?.staffs?.data)) return o.staffs.data; // { staffs: { data:[...] } }
    if (Array.isArray(o?.data?.staffs)) return o.data.staffs; // { data:{ staffs:[...] } }
    if (Array.isArray(o?.data?.staffs?.data)) return o.data.staffs.data; // { data:{ staffs:{data:[...]}} }

    // generic keys
    const keys = ["users", "items", "results", "records", "rows", "list"];
    for (const k of keys) {
      if (Array.isArray(o[k])) return o[k];
      if (Array.isArray(o?.data?.[k])) return o.data[k];
    }

    // deep walk
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        const nested = pickArray(v);
        if (nested.length) return nested;
      }
    }
    return [];
  };

  const items = pickArray(payload);
  return { items, meta };
};

export const deleteStaff = async (id, axiosOpts = {}) => {
  const url = buildDeleteUrl(id);

  // 1) Try plain DELETE first
  try {
    const res = await axiosInstance.delete(url, {
      ...withCreds,
      headers: { Accept: "application/json" },
      ...axiosOpts,
    });
    return res?.data ?? true; // many APIs return 204 No Content
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    // Bubble up detailed server message for toasts
    const serverMsg =
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data : null) ||
      `Delete failed (${status || "network"})`;

    // 2) If 400/405/419 (Laravel CSRF) → try Sanctum + form override fallback
    if ([400, 401, 403, 405, 419].includes(status || 0)) {
      try {
        // get CSRF cookie (Sanctum on same domain)
        await axiosInstance.get("/sanctum/csrf-cookie", withCreds);

        // Some Laravel routes only accept POST + _method=DELETE
        const res2 = await axiosInstance.post(
          url,
          { _method: "DELETE" },
          {
            ...withCreds,
            headers: {
              Accept: "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
          }
        );
        return res2?.data ?? true;
      } catch (err2) {
        const data2 = err2?.response?.data;
        const msg2 =
          data2?.message ||
          data2?.error ||
          (typeof data2 === "string" ? data2 : null) ||
          serverMsg;
        const e = new Error(msg2);
        e.status = err2?.response?.status;
        throw e;
      }
    }

    const e = new Error(serverMsg);
    e.status = status;
    throw e;
  }
};