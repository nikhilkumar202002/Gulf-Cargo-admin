import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext); // Always call useContext at the top level

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(true);

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        await axios.get("https://gulfcargoapi.bhutanvoyage.in/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setIsAuthenticated(true);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          logout(); // Handle 401 by logging out
        }
      } finally {
        setLoading(false); // Set loading to false after checking
      }
    };

    verifyToken();

    const interval = setInterval(verifyToken, 5000); // Check every 5 seconds
    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [token]); // Token dependency, ensures effect runs when token changes

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
