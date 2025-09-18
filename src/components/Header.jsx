// src/layout/Header.jsx
import { useEffect, useState, useRef } from "react";
import { IoIosArrowDown, IoIosSettings, IoIosLogOut } from "react-icons/io";
import { IoNotifications } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import "./layout.css";
import { useDispatch } from "react-redux";
import { clearAuth } from "../store/slices/authSlice";
import { logout as apiLogout, getProfile } from "../api/accountApi";
import axiosInstance from "../api/axiosInstance";

/* helpers */
const pickFirst = (obj, paths) => {
  for (const p of paths) {
    const chain = p.split(".");
    let cur = obj;
    for (const key of chain) {
      if (cur == null) break;
      cur = cur[key];
    }
    if (cur != null && String(cur).trim() !== "") return cur;
  }
  return null;
};
const resolveAssetUrl = (u) => {
  if (!u) return null;
  if (/^(https?:)?\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) return u;
  const base = (axiosInstance?.defaults?.baseURL || "").replace(/\/+$/, "");
  return `${base}/${String(u).replace(/^\/+/, "")}`;
};

export default function Header() {
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [user, setUser] = useState(null); // fetched from DB

  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await apiLogout(); } catch {}
    try { localStorage.removeItem("token"); } catch {}
    dispatch(clearAuth());
    navigate("/login", { replace: true });
  };

  // Redirect to /login if axios interceptor emits 'auth:unauthorized'
  useEffect(() => {
    const onUnauthorized = () => handleLogout();
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch profile (DB)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      try {
        const payload = await getProfile();
        const profile = payload?.data?.user || payload?.user || payload?.data || payload;

        const name =
          pickFirst(profile, ["name", "user.name", "profile.name"]) || "User";

        // Your API gives absolute URL at 'profile_pic'
        const rawPic = pickFirst(profile, [
          "profile_pic",
          "user.profile_pic",
          "avatar",
          "profile_image",
          "photo",
        ]);
        const photo = resolveAssetUrl(rawPic) || "/avatar.png";

        if (!cancelled) setUser({ ...profile, name, profile_pic: photo });
      } catch (e) {
        // 401 handled by interceptor → will trigger handleLogout via event
        console.error("getProfile failed:", e?.response?.data || e?.message);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Dummy notifications (replace with API later)
  useEffect(() => {
    const dummy = [
      { id: 1, message: "Your shipment has been dispatched 🚚" },
      { id: 2, message: "Invoice generated successfully 📄" },
      { id: 3, message: "New update available, please refresh 🔄" },
    ];
    const t = setTimeout(() => setNotifications(dummy), 800);
    return () => clearTimeout(t);
  }, []);

  // Close dropdowns on outside click
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

  const openSidebar = () => {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  };

  const userName = user?.name || "User";
  const avatarUrl = user?.profile_pic || "/avatar.png";

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
          Welcome Back{" "}
          <h1 className="header-username">{loadingProfile ? "…" : `${userName}!`}</h1>
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
            <img
              src={avatarUrl}
              alt="User"
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                if (!e.currentTarget.src.includes("/avatar.png")) {
                  e.currentTarget.src = "/avatar.png";
                }
              }}
            />
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
