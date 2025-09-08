
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RoleSwitch() {
  const { roleId, loading } = useAuth(); // 1=superadmin, 2=staff, 3=agency
  if (loading || roleId == null) return null; // wait until auth resolves

  const map = { 1: "/sa", 2: "/staff", 3: "/agency" };
  return <Navigate to={map[roleId] ?? "/not-authorized"} replace />;
}
