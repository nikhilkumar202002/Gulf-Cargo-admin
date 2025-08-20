import React, { useState, useEffect, useRef } from "react";
import { IoIosArrowDown, IoIosSettings, IoIosLogOut } from "react-icons/io";
import "./layout.css";
import { IoNotifications } from "react-icons/io5";

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
    <header className="header flex justify-between items-center">
      <span>Welcome Back User</span>


      <div className="header-right flex gap-3">
 <div style={{ position: "relative" }} className="header-user">
        <div
          className="acount-avatar flex items-center gap-2 cursor-pointer"
          onClick={() => setShowSettings(s => !s)}
        >
          <img src="/avatar.png" alt="User" className="w-8 h-8 rounded-full" />
          <span className="user flex gap-1 items-center font-medium select-none">
            User
            <IoIosArrowDown
              className={`transition-transform duration-200 ${showSettings ? "rotate-180" : ""}`}
              size={18}
            />
          </span>
        </div>
        {showSettings && (
          <div ref={dropdownRef} className="settings absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white py-2">
            <button className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 w-full text-left text-gray-700">
              <IoIosSettings className="text-gray-500" size={20} />
              Settings
            </button>
            <button className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 w-full text-left text-gray-700">
              <IoIosLogOut className="text-red-400" size={20} />
              Logout
            </button>
          </div>
        )}

        
      </div>

      <div className="header-notification">
              <IoNotifications />
        </div>
      </div>
     
    </header>
  );
}
