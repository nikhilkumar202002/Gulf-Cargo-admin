import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute() {
  const location = useLocation();
  const token = useSelector((s) => s.auth.token);
  const status = useSelector((s) => s.auth.status); // 'idle' | 'loading' | 'succeeded' | 'failed'

  // Optional: show a tiny loader while profile is fetching.
  if (status === "loading") {
    return <div className="loader" style={{ padding: 24 }}>Loading…</div>;
  }

  // No token → kick to login, remember where they tried to go.
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Authenticated → render the nested route
  return <Outlet />;
}
