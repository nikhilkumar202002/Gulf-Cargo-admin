import React, { createContext, useContext, useEffect, useState } from "react";
import { getProfile } from "../api/accountApi"; // uses axiosInstance + token

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);


const normalizeRoleId = (raw) => {
  if (raw == null) return null;

  const n = Number(raw);
  if (Number.isFinite(n)) return n;

  const s = String(raw).trim().toLowerCase();
  const m = s.match(/\d+/);
  if (m && Number.isFinite(Number(m[0]))) return Number(m[0]);
  if (s.includes("super")) return 1;
  if (s.includes("staff")) return 2;
  if (s.includes("agent") || s.includes("agency")) return 3;

  if (typeof raw === "object") {
    if (raw.id != null && Number.isFinite(Number(raw.id))) return Number(raw.id);
    const label = String(raw.role_name ?? raw.name ?? raw.title ?? "").toLowerCase();
    if (label.includes("super")) return 1;
    if (label.includes("staff")) return 2;
    if (label.includes("agent") || label.includes("agency")) return 3;
  }
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
    // IMPORTANT: getProfile() returns response.data already
    const apiData = await getProfile();

    // Accept common shapes coming from your backend:
    // - { data: {...profile} }
    // - { user: {...profile} }
    // - { ...profile }
    const profile =
      apiData?.data ?? apiData?.user ?? apiData ?? null;
    setUser(profile);

    // Try all plausible fields your API may use
    const rawRole =
      profile?.role ??             // preferred: 1/2/3 here
      profile?.role_id ??
      profile?.roleId ??
      profile?.role_type ??
      profile?.role_name ??
      profile?.roleName ??
      profile?.role?.id ??         // nested object
      profile?.role?.name ?? null;

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
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout, loading, user, roleId }}>
      {children}
    </AuthContext.Provider>
  );
};
