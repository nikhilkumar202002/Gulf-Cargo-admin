
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return null; // or a tiny spinner
  return token ? children : <Navigate to="/login" replace />;
}
