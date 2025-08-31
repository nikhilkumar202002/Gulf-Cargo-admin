import React, { useState } from "react";
import "./layout.css";
import { IoIosArrowDown, IoIosArrowUp  } from "react-icons/io";
import { Link } from "react-router-dom";
import { rolesMenu } from "../rolemenu/rolesMenu";

export default function Sidebar({ userRole }) {

  const roleMenuItems = rolesMenu[userRole] || [];

  const [openMenu, setOpenMenu] = useState(null);
  
  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };


  return (
   <aside className="sidebar">
      {/* Logo Section */}
      <div className="logo-section" style={{ display: "flex", alignItems: "center", padding: "16px" }}>
        <img src="/Logo.png" alt="Logo" style={{ height: "40px", marginRight: "10px" }} />
      </div>

      {/* Menu List */}
      <ul className="menu-list" style={{ padding: 0, margin: 0 }}>
        {roleMenuItems.map(({ key, icon, label, submenus, path }) => (
          <li key={key} style={{ listStyle: "none" }}>
            {/* Menu Header */}
            {path && !submenus ? (
              <Link
                to={path}
                className="menu-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 20px",
                  textDecoration: "none",
                  color: "inherit",
                  fontWeight: "550"
                }}
              >
                <span className="menu-icon" style={{ minWidth: 24 }}>
                  {icon}
                </span>
                <span style={{ flex: 1, fontSize: "14px" }}>{label}</span>
              </Link>
            ) : (
              <div
                className="menu-header"
                onClick={() => submenus && toggleMenu(key)}
                style={{
                  cursor: submenus ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 20px"
                }}
              >
                <span className="menu-icon" style={{ minWidth: 24 }}>
                  {icon}
                </span>
                <span style={{ flex: 1, fontSize: "14px", fontWeight: "550" }}>{label}</span>
                {submenus && (
                  <span style={{ marginLeft: "auto" }}>
                    {openMenu === key ? <IoIosArrowUp /> : <IoIosArrowDown />}
                  </span>
                )}
              </div>
            )}

            {/* Submenu */}
            {submenus && openMenu === key && (
              <ul className="submenu">
                {submenus.map(({ name, path }) => (
                  <Link to={path} style={{ textDecoration: "none", color: "inherit" }} key={name}>
                    <li
                      className="submenu-item"
                      style={{ padding: "8px 0px 8px 48px", fontSize: "14px" }}
                    >
                      {name}
                    </li>
                  </Link>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
