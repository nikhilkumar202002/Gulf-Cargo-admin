import React, { useState, useEffect, useRef } from "react";
import { IoIosArrowDown, IoIosSettings, IoIosLogOut } from "react-icons/io";
import { IoNotifications } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import "./layout.css";
import { useAuth } from "../auth/AuthContext";
import { getProfile, logout } from "../api/accountApi";

export default function Header() {
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userName, setUserName] = useState("User");
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const { logout: contextLogout } = useAuth();

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        const name = data?.user?.name || "User";
        setUserName(name);
        localStorage.setItem("userName", name);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate]);

  // Set dummy notifications
  useEffect(() => {
    const dummyNotifications = [
      { id: 1, message: "Your shipment has been dispatched 🚚" },
      { id: 2, message: "Invoice #452 generated successfully 📄" },
      { id: 3, message: "New update available, please refresh 🔄" },
      { id: 4, message: "Your profile was viewed 5 times today 👀" },
    ];

    // Simulate API delay
    setTimeout(() => {
      setNotifications(dummyNotifications);
    }, 800);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !event.target.closest(".acount-avatar")
      ) {
        setShowSettings(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target) &&
        !event.target.closest(".header-notification")
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logout function
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      contextLogout();
      navigate("/login", { replace: true });
    }
  };

    const openSidebar = () => {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  };

  return (
    <header className="header flex justify-between items-center">
      
       <div className="flex items-center gap-3">
        <button
          type="button"
          className="icon-btn lg:hidden"
          aria-label="Open menu"
          onClick={openSidebar}
        >
          <FiMenu size={22} />
        </button>

        <span className="flex gap-2">
          Welcome Back <h1 className="header-username">{userName}!</h1>
        </span>
      </div>

      {/* Right Section */}
      <div className="header-right flex gap-3 items-center">
        {/* Notifications */}
        <div
          className="relative header-notification cursor-pointer"
          onClick={() => setShowNotifications((prev) => !prev)}
        >
          <IoNotifications size={22} />
          {notifications.length > 0 && (
            <span className="notification-badge absolute -top-1 -right-1 bg-red-500 text-white font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow">
              {notifications.length}
            </span>
          )}
          {showNotifications && (
            <div
              ref={notificationRef}
              className="notification-container absolute right-0 top-12 w-80 rounded-md shadow-lg bg-white z-50 max-h-80 overflow-y-auto"
            >
              {notifications.length > 0 ? (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className="notification-items cursor-pointer border-b last:border-none"
                  >
                    {item.message}
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-400 text-center">
                  No new notifications
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div style={{ position: "relative" }} className="header-user">
          <div
            className="acount-avatar flex items-center gap-2 cursor-pointer"
            onClick={() => setShowSettings((s) => !s)}
          >
            <img src="/avatar.png" alt="User" className="w-8 h-8 rounded-full" />
            <span className="user flex gap-1 items-center font-medium select-none">
              {userName}
              <IoIosArrowDown
                className={`transition-transform duration-200 ${
                  showSettings ? "rotate-180" : ""
                }`}
                size={18}
              />
            </span>
          </div>
          {showSettings && (
            <div
              ref={dropdownRef}
              className="settings absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white py-2"
            >
              <Link
                to="/profile"
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 w-full text-left text-gray-700"
              >
                <IoIosSettings className="text-gray-500" size={20} />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 w-full text-left text-gray-700"
              >
                <IoIosLogOut className="text-red-400" size={20} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
