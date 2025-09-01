import React, { createContext, useContext, useState, useEffect } from "react";
import { getProfile } from "../api/accountApi"; // ← adjust path if needed

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Map text/number roles to numeric ids used by the menu (1=Super Admin, 2=Staff, 3=Agency)
// 1 = superadmin, 2 = staff, 3 = agent
const normalizeRoleId = (raw) => {
  if (raw == null) return null;

  // numeric or numeric string: "1", 2, "3"
  const n = Number(raw);
  if (Number.isFinite(n)) return n;

  // text labels from API: "superadmin", "staff", "agent"
  const s = String(raw).trim().toLowerCase();
  if (s === "superadmin" || s === "super admin" || s === "admin") return 1;
  if (s === "staff") return 2;
  if (s === "agent" || s === "agency") return 3; // keep agency as synonym just in case
  return null;
};


export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [roleId, setRoleId] = useState(null);

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setRoleId(null);
  };

  const fetchProfile = async () => {
    const res = await getProfile(); // your wrapper sets Authorization header
    const profile = res?.data?.data ?? res?.data?.user ?? res?.data ?? res ?? null;
    setUser(profile);

   const rawRole =
   profile?.roleId ??
   profile?.role_id ??
  profile?.role ??     
   profile?.role?.id ??
   profile?.role_type ??
   profile?.roleName ??
   profile?.role_name ?? null;

    setRoleId(normalizeRoleId(rawRole));
  };

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setRoleId(null);
        setLoading(false);
        return;
      }
      try {
        await fetchProfile();
        setIsAuthenticated(true);
      } catch (err) {
        if (err?.response?.status === 401) {
          logout();
        } else {
          console.error("Profile fetch failed:", err);
        }
      } finally {
        setLoading(false);
      }
    };
    verify();
    // Optional: re-verify every 5s if you truly need live token checks.
    // const id = setInterval(verify, 5000); return () => clearInterval(id);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated, login, logout, loading, user, roleId }}
    >
      {children}
    </AuthContext.Provider>
  );
};
