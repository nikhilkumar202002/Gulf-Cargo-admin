import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import dashboard from './slices/dashboardSlice'; // example, below

export const store = configureStore({
  reducer: {
    auth,
    dashboard,
  },
  middleware: (getDefault) => getDefault({
    serializableCheck: false, // you’re storing tokens/axios errors; skip noise
  }),
});

export const selectAuth = (state) => state.auth;
export const selectDashboard = (state) => state.dashboard;
