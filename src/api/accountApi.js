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
