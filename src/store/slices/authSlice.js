import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = 'https://api.gulfcargoksa.com/public/api';

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('token');
    if (!token) return rejectWithValue('NO_TOKEN');
    try {
      const res = await axios.get(`${API}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.data?.success || !res.data?.user) {
        return rejectWithValue('Unexpected profile API response');
      }
      return res.data.user;
    } catch (err) {
      return rejectWithValue(err?.response?.data || err.message || 'Profile fetch failed');
    }
  }
);

const initialState = {
  token: localStorage.getItem('token') || null,
  user: null,
  status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, { payload }) => {
      state.token = payload;
      if (payload) localStorage.setItem('token', payload);
      else localStorage.removeItem('token');
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchProfile.pending, (s) => {
      s.status = 'loading';
      s.error = null;
    });
    b.addCase(fetchProfile.fulfilled, (s, { payload }) => {
      s.status = 'succeeded';
      s.user = payload;
    });
    b.addCase(fetchProfile.rejected, (s, { payload }) => {
      s.status = 'failed';
      s.user = null;
      s.error = payload || 'Failed to fetch profile';
    });
  },
});

export const { setToken, clearAuth } = slice.actions;
export default slice.reducer;
