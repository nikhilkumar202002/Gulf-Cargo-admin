import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { getProfile } from "../api/accountApi"; 
import { setToken as setAccessToken, clearToken as clearAccessToken } from "../auth/tokenStore";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// normalize role to 1 (superadmin) / 2 (staff) / 3 (agent)
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
  const inflightRef = useRef(false);

  const login = (newToken) => {
    // persist for reloads
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    // 👇 keep axios/tokenStore in sync
    setAccessToken(newToken);
  };

  const logout = (redirect = true) => {
    localStorage.removeItem("token");
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setRoleId(null);
    // 👇 clear memory so axios stops sending Authorization
    clearAccessToken();

    if (redirect) {
      window.location.replace("/login");
    }
  };

  const fetchProfile = async () => {
    const apiData = await getProfile(); // returns response.data
    const profile = apiData?.user ?? apiData ?? null;
    setUser(profile);

    const rawRole = profile?.role?.id ?? profile?.role ?? profile?.role_id ?? null;
    setRoleId(normalizeRoleId(rawRole));
  };

  // Initial verify on mount / token change
  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setRoleId(null);
        setLoading(false);
        return;
      }

      // 👇 HYDRATE memory from localStorage BEFORE hitting API
      setAccessToken(token);

      try {
        await fetchProfile();
        setIsAuthenticated(true);
      } catch (err) {
        if (err?.response?.status === 401) {
          // token invalid on server
          logout(true);
          return;
        }
        console.error("Profile fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  // (Optional) Heartbeat remains as in your file if you like, or make it less frequent.

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated, login, logout, loading, user, roleId }}
    >
      {children}
    </AuthContext.Provider>
  );
};
