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
    if (label.includes("agent") || s.includes("agency")) return 3;
  }
  return null;
};

const HEARTBEAT_MS = 5000;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [roleId, setRoleId] = useState(null);

  const inflightRef = useRef(false);
  const heartbeatId = useRef(null);

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    setAccessToken(newToken); // hydrate axios/token store
  };

  const logout = (redirect = true) => {
    try { localStorage.removeItem("token"); } catch {}
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setRoleId(null);
    clearAccessToken();

    if (heartbeatId.current) {
      clearInterval(heartbeatId.current);
      heartbeatId.current = null;
    }

    if (redirect) window.location.replace("/login");
  };

  const fetchProfile = async () => {
    const apiData = await getProfile(); // should 401 if token is invalid/revoked
    const profile = apiData?.user ?? apiData ?? null;
    setUser(profile);

    const rawRole = profile?.role?.id ?? profile?.role ?? profile?.role_id ?? null;
    setRoleId(normalizeRoleId(rawRole));
  };

  // Initial verify (on mount / token change)
  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setRoleId(null);
        setLoading(false);
        return;
      }
      setAccessToken(token); // ensure axios has it
      try {
        await fetchProfile();
        setIsAuthenticated(true);
      } catch (err) {
        if (err?.response?.status === 401) {
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

  // Heartbeat + global listeners
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const tick = async () => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      try {
        await fetchProfile();
      } catch (err) {
        const code = err?.response?.status;
        if (code === 401 || code === 419 || code === 440) {
          logout(true); // session invalid/expired/revoked
        }
      } finally {
        inflightRef.current = false;
      }
    };

    // run immediately, then every 5s
    tick();
    heartbeatId.current = setInterval(tick, HEARTBEAT_MS);

    // cross-tab logout on token change
    const onStorage = (e) => {
      if (e.key === "token") {
        // any change (login elsewhere or logout) → kill this session
        if (e.newValue !== token) logout(true);
      }
    };
    window.addEventListener("storage", onStorage);

    // instant logout on any 401 intercepted by axios
    const onUnauthorized = () => logout(true);
    window.addEventListener("auth:unauthorized", onUnauthorized);

    return () => {
      if (heartbeatId.current) clearInterval(heartbeatId.current);
      heartbeatId.current = null;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:unauthorized", onUnauthorized);
    };
  }, [isAuthenticated, token]);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout, loading, user, roleId }}>
      {children}
    </AuthContext.Provider>
  );
};
