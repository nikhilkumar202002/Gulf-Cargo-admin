import React, { useState, useEffect, useRef } from "react";
import "./layout.css";

export default function Header() {
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="header">
      <span>Welcome Back User</span>
      <div style={{ position: "relative" }}>
        <div className="acount-avatar" style={{ cursor: "pointer" }}
          onClick={() => setShowSettings(s => !s)}>
          <img src="https://ui-avatars.com/api/?name=User" alt="User" />
          <span className="user">User</span>
        </div>
        {showSettings && (
          <div ref={dropdownRef} className="settings">
            <p>Settings</p>
            <p>Logout</p>
          </div>
        )}
      </div>
    </header>
  );
}
