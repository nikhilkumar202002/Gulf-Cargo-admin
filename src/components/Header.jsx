// src/layout/Header.jsx
import { useEffect, useState, useRef } from "react";
import { IoIosArrowDown, IoIosSettings, IoIosLogOut } from "react-icons/io";
import { IoNotifications } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import "./layout.css";
import { useDispatch } from "react-redux";
import { clearAuth } from "../store/slices/authSlice";
import { setBranch as setBranchGlobal, clearBranch } from "../store/slices/branchSlice";
import { logout as apiLogout, getProfile } from "../api/accountApi";
import axiosInstance from "../api/axiosInstance";

/* skeleton helpers */
const SkeletonLine = ({ w = 120, h = 16, className = "" }) => (
  <span className={`skel skel-line ${className}`} style={{ width: typeof w === "number" ? `${w}px` : w, height: typeof h === "number" ? `${h}px` : h }} aria-hidden="true" />
);
const SkeletonCircle = ({ size = 32, className = "" }) => (
  <span className={`skel skel-circle ${className}`} style={{ width: size, height: size }} aria-hidden="true" />
);

const resolveAssetUrl = (u) => {
  if (!u) return null;
  if (/^(https?:)?\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) return u;
  const base = (axiosInstance?.defaults?.baseURL || "").replace(/\/+$/, "");
  return `${base}/${String(u).replace(/^\/+/, "")}`;
};

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [userName, setUserName] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState("/avatar.png");
  const [branchName, setBranchName] = useState("");
  const [branchId, setBranchId] = useState(null);

  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const handleLogout = async () => {
    try { await apiLogout(); } catch {}
    try { localStorage.removeItem("token"); } catch {}
    dispatch(clearAuth());
    dispatch(clearBranch());
    navigate("/login", { replace: true });
  };

  const updateProfileState = (profile) => {
    if (!profile) return;
    const nm = typeof profile?.name === "string" ? profile.name : "User";
    const rawPic = profile?.profile_pic || "";
    const pic = resolveAssetUrl(rawPic) || "/avatar.png";
    const bObj = profile?.branch;
    const bName =
      (bObj && typeof bObj.name === "string" && bObj.name) ||
      (typeof profile?.branch_name === "string" && profile.branch_name) ||
      (typeof bObj === "string" ? bObj : "") ||
      "";
    const bIdRaw = (bObj && bObj.id != null ? bObj.id : profile?.branch_id);
    const bId = bIdRaw != null && !Number.isNaN(Number(bIdRaw)) ? Number(bIdRaw) : null;

    setUserName(nm);
    setAvatarUrl(pic);
    setBranchName(String(bName));
    setBranchId(bId);
    dispatch(setBranchGlobal({ branchId: bId, branchName: String(bName) }));
  };

  useEffect(() => {
    const onUnauthorized = () => handleLogout();
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []); // eslint-disable-line

  useEffect(() => {
    // --- OPTIMIZATION: Load from cache first, then fetch latest ---

    // 1. Immediately try to load from localStorage
    try {
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");
      const cachedProfile = authData?.user;
      if (cachedProfile) {
        updateProfileState(cachedProfile);
        setLoadingProfile(false); // Stop loading skeleton immediately
      }
    } catch {
      // Cached data might be invalid, proceed to fetch
    }

    // 2. Fetch latest profile from API in the background
    (async () => {
      try {
        const payload = await getProfile();
        const profile = payload?.user ?? payload?.data?.user ?? payload;
        updateProfileState(profile);
      } catch (e) {
        console.error("Failed to fetch latest profile", e);
      } finally {
        // Ensure loading is off, even if initial cache load failed
        setLoadingProfile(false);
      }
    })();
  }, [dispatch]);

  useEffect(() => {
    const dummy = [
      { id: 1, message: "Your shipment has been dispatched 🚚" },
      { id: 2, message: "Invoice generated successfully 📄" },
      { id: 3, message: "New update available, please refresh 🔄" },
    ];
    setNotifications(dummy);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !event.target.closest(".acount-avatar")) {
        setShowSettings(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target) && !event.target.closest(".header-notification")) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openSidebar = () => window.dispatchEvent(new CustomEvent("toggle-sidebar"));

  return (
    <header className="header flex justify-between items-center" aria-busy={loadingProfile}>
      <div className="flex items-center gap-3">
        <button type="button" className="icon-btn lg:hidden" aria-label="Open menu" onClick={openSidebar}>
          <FiMenu size={22} />
        </button>

        <span>
          <h1 className="header-name flex items-center gap-2">
            <span>Welcome Back</span>
            <span className="header-username">
              {loadingProfile ? <SkeletonLine w={120} h={20} /> : `${userName}!`}
            </span>
          </h1>

          <div className="mt-0.5 h-5">
            {loadingProfile ? (
              <SkeletonLine w={160} h={14} />
            ) : (
              branchName && <h2 className="header-branch-name">{branchName}</h2>
            )}
          </div>
        </span>
      </div>

      <div className="header-right flex gap-3 items-center">
        <div
          className={`relative header-notification cursor-pointer ${loadingProfile ? "pointer-events-none opacity-70" : ""}`}
          onClick={() => !loadingProfile && setShowNotifications((prev) => !prev)}
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
                  <div key={item.id} className="notification-items cursor-pointer border-b last:border-none">
                    {String(item.message)}
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-400 text-center">No new notifications</div>
              )}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }} className="header-user">
          <div
            className={`acount-avatar flex items-center gap-2 ${loadingProfile ? "pointer-events-none" : "cursor-pointer"}`}
            onClick={() => !loadingProfile && setShowSettings((s) => !s)}
          >
            {loadingProfile ? (
              <SkeletonCircle size={32} />
            ) : (
              <img
                src={avatarUrl}
                alt="User"
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  if (!e.currentTarget.src.includes("/avatar.png")) e.currentTarget.src = "/avatar.png";
                }}
              />
            )}
            <span className="user flex gap-1 items-center font-medium select-none">
              {loadingProfile ? <SkeletonLine w={90} h={16} /> : userName}
              <IoIosArrowDown className={`transition-transform duration-200 ${showSettings ? "rotate-180" : ""}`} size={18} />
            </span>
          </div>

          {showSettings && (
            <div ref={dropdownRef} className="settings absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white py-2">
              <Link to="/profile" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 w-full text-left text-gray-700">
                <IoIosSettings className="text-gray-500" size={20} />
                Profile
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 w-full text-left text-gray-700">
                <IoIosLogOut className="text-red-400" size={20} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .skel { position: relative; overflow: hidden; display: inline-block; border-radius: 6px; background: #e5e7eb; }
        .skel::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
          background: linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(255,255,255,0.75) 50%, rgba(229,231,235,0) 100%);
          animation: skel-shimmer 1.2s infinite; }
        .skel-circle { border-radius: 9999px; }
        @keyframes skel-shimmer { 100% { transform: translateX(100%); } }
      `}</style>
    </header>
  );
}
