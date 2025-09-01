import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { getProfile } from "../api/accountApi"; // uses axiosInstance + token

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

  // prevent overlapping profile checks
  const inflightRef = useRef(false);

  const login = (newToken) => {
    localStorage.setItem("token", newToken);          // store plain token (no "Bearer ")
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const logout = (redirect = true) => {
    localStorage.removeItem("token");
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setRoleId(null);
    if (redirect) {
      // hard redirect ensures we land on login even if routing state is weird
      window.location.replace("/login");
    }
  };

  const fetchProfile = async () => {
    // getProfile() should return response.data
    const apiData = await getProfile();

    // Your sample payload: { success: true, user: { name, role: { id } } }
    const profile = apiData?.user ?? apiData ?? null;
    setUser(profile);

    const rawRole =
      profile?.role?.id ??     // nested role object (id 1/2/3)
      profile?.role ??         // sometimes backend sends raw number here
      profile?.role_id ?? null;

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
      try {
        await fetchProfile();
        setIsAuthenticated(true);
      } catch (err) {
        if (err?.response?.status === 401) {
          logout(true); // token invalid on server: clear + redirect
          return;
        }
        console.error("Profile fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  // 🔁 Heartbeat: every 5s re-read token from localStorage and validate with server
  useEffect(() => {
    const HEARTBEAT_MS = 5000;

    const pulse = async () => {
      if (inflightRef.current) return;
      inflightRef.current = true;

      try {
        const lsToken = localStorage.getItem("token");

        // If token removed locally (e.g., another part of app), logout
        if (!lsToken) {
          if (token) logout(true);
          return;
        }

        // If token changed in localStorage (e.g., refresh), adopt it
        if (lsToken !== token) {
          setToken(lsToken);
          setIsAuthenticated(true);
        }

        // Validate against server; 401 => logout
        await fetchProfile();
      } catch (err) {
        if (err?.response?.status === 401) {
          logout(true);
          return;
        }
        // non-401 errors: log and continue (network hiccup, etc.)
        console.warn("Auth heartbeat error:", err?.message || err);
      } finally {
        inflightRef.current = false;
      }
    };

    const id = setInterval(pulse, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [token]); // re-arm on token changes

  // 🔄 Cross-tab sync: if token changes in another tab, update here too
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token") {
        const newTok = e.newValue;
        if (!newTok) {
          logout(true);
        } else if (newTok !== token) {
          setToken(newTok);
          setIsAuthenticated(true);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated, login, logout, loading, user, roleId }}
    >
      {children}
    </AuthContext.Provider>
  );
};
