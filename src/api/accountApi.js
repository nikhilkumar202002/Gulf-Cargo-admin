import axiosInstance from "./axiosInstance";

// Register
export const register = async (userData) => {
  try {
    const response = await axiosInstance.post("/register", userData);
    return response.data;
  } catch (error) {
    console.error("Error during registration", error);
    throw error;
  }
};

// Login
export const loginUser = async (credentials) => {
  try {
    const response = await axiosInstance.post("/login", credentials);
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error("Error during login", error);
    throw error;
  }
};

// Profile (protected)
export const getProfile = async () => {
  try {
    const token = localStorage.getItem("token");

    if (token) {
      axiosInstance.defaults.headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await axiosInstance.get("/profile");
    return response.data;
  } catch (error) {
    console.error("Error fetching profile", error);
    throw error;
  }
};

// Logout
export const logout = async () => {
  try {
    const response = await axiosInstance.post("/logout");
    localStorage.removeItem("token");
    return response.data;
  } catch (error) {
    console.error("Error during logout", error);
    throw error;
  }
};

// Forgot Password
export const forgotPassword = async (email) => {
  try {
    const response = await axiosInstance.post("/forgot-password", { email });
    return response.data;  // Returns message like "OTP sent to your email address."
  } catch (error) {
    console.error("Error during forgot password", error);
    throw error;
  }
};

// Reset Password
export const resetPassword = async (email, otp, password) => {
  try {
    const response = await axiosInstance.post("/reset-password", { email, otp, password });
    return response.data; // Returns message like "Password has been reset successfully."
  } catch (error) {
    console.error("Error during reset password", error);
    throw error;
  }
};

export const staffRegister = async (userData, tokenArg, axiosOpts = {}) => {
  const token = tokenArg || localStorage.getItem("token");

  try {
    const res = await axiosInstance.post("/register", userData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      ...axiosOpts, // safe spread
    });
    return res.data;
  } catch (error) {
    // Normalize every failure path
    const status = error?.response?.status ?? null;
    const data = error?.response?.data ?? null;

    let msg =
      data?.message ||
      (data?.errors && Object.values(data.errors)[0]?.[0]) ||
      error?.message ||
      "Request failed";

    // mark abort/cancel clearly
    if (error?.name === "CanceledError" || error?.message === "canceled") {
      msg = "Request was canceled";
    }

    const err = new Error(msg);
    err.status = status;
    err.data = data;
    err.isAxios = !!error?.isAxiosError;
    throw err;
  }
};

export const listStaffs = async (params = {}) => {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await axiosInstance.get("/staffs", { params, headers });
  const payload = res?.data ?? {};

  // DEBUG: see what keys exist in your response
  console.log("listStaffs payload keys:", Object.keys(payload));
  console.log("listStaffs payload preview:", payload);

  // Find the first plausible array of rows in typical API shapes
  const pickArray = (o) => {
    if (!o) return [];
    if (Array.isArray(o)) return o;
    if (Array.isArray(o.data)) return o.data;               // {data:[...]}
    if (Array.isArray(o?.data?.data)) return o.data.data;   // {data:{data:[...]}} (Laravel paginator)
    const keys = ["staffs", "staff", "users", "items", "results", "records", "rows", "list"];
    for (const k of keys) {
      if (Array.isArray(o[k])) return o[k];
      if (Array.isArray(o?.data?.[k])) return o.data[k];
    }
    // deep fallback: scan one level down for any array
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        const nested = pickArray(v);
        if (nested.length) return nested;
      }
    }
    return [];
  };

  const list = pickArray(payload);
  console.log("listStaffs normalized length:", list.length);
  return list;
};