import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosInstance";

/**
 * Fetch user profile using the token from localStorage/Redux.
 */
export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("token");
    if (!token) return rejectWithValue("NO_TOKEN");

    try {
      const res = await axiosInstance.get("/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Adjust to your API shape
      const user = res.data?.user || res.data?.data || res.data;
      if (!user) return rejectWithValue("Unexpected profile API response");
      return user;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || err?.message || "Profile fetch failed"
      );
    }
  }
);

const initialState = {
  token: localStorage.getItem("token") || null,
  user: JSON.parse(localStorage.getItem("user") || "null"),
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, { payload }) => {
      state.token = payload;
      if (payload) localStorage.setItem("token", payload);
      else localStorage.removeItem("token");
    },
    setUser: (state, { payload }) => {
      state.user = payload || null;
      if (payload) localStorage.setItem("user", JSON.stringify(payload));
      else localStorage.removeItem("user");
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
      state.status = "idle";
      state.error = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchProfile.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchProfile.fulfilled, (s, { payload }) => {
      s.status = "succeeded";
      s.user = payload;
      localStorage.setItem("user", JSON.stringify(payload));
    });
    b.addCase(fetchProfile.rejected, (s, { payload }) => {
      s.status = "failed";
      s.user = null;
      s.error = payload || "Failed to fetch profile";
      if (payload === "Unauthenticated." || payload === "NO_TOKEN") {
        s.token = null;
        localStorage.removeItem("token");
      }
    });
  },
});

export const { setToken, setUser, clearAuth } = slice.actions;
export default slice.reducer;
