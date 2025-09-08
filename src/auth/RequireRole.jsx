// src/auth/RequireRole.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireRole({ allow, children }) {
  const { roleId, loading } = useAuth();
  if (loading) return null;
  return allow.includes(roleId) ? children : <Navigate to="/not-authorized" replace />;
}
