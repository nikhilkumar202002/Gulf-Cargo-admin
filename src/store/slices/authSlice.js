import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosInstance";

/**
 * Fetch user profile using the token from localStorage/Redux.
 * Keeps status so guards can avoid flicker during loading.
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

      if (!res.data?.success || !res.data?.user) {
        return rejectWithValue("Unexpected profile API response");
      }
      return res.data.user;
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
    /**
     * Sets token and persists/removes in localStorage synchronously
     * so route guards see it on the next paint.
     */
    setToken: (state, { payload }) => {
      state.token = payload;
      if (payload) localStorage.setItem("token", payload);
      else localStorage.removeItem("token");
    },
    setUser: (state, { payload }) => {
      state.user = payload;
      const minimalUser =
        payload
          ? { id: payload.id, name: payload.name, role: payload.role?.name }
          : null;
      if (minimalUser) {
        localStorage.setItem("user", JSON.stringify(minimalUser));
      } else {
        localStorage.removeItem("user");
      }
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
      // Optionally re-persist normalized user
      const minimalUser = payload
        ? { id: payload.id, name: payload.name, role: payload.role?.name }
        : null;
      if (minimalUser) {
        localStorage.setItem("user", JSON.stringify(minimalUser));
      }
    });
    b.addCase(fetchProfile.rejected, (s, { payload }) => {
      s.status = "failed";
      s.user = null;
      s.error = payload || "Failed to fetch profile";
      // If backend responds "Unauthenticated.", drop token.
      if (payload === "Unauthenticated.") {
        s.token = null;
        localStorage.removeItem("token");
      }
    });
  },
});

export const { setToken, setUser, clearAuth } = slice.actions;
export default slice.reducer;
