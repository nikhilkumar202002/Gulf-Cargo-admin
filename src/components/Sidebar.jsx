import React, { useState, useEffect  } from "react";
import "./layout.css";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { NavLink } from "react-router-dom";
import { rolesMenu } from "../rolemenu/rolesMenu"; 
import { IoClose } from "react-icons/io5";

export default function Sidebar({ userRole }) {
  
  const roleKey = (() => {
    if (userRole == null) return null;
    const m = String(userRole).toLowerCase().match(/\d+/);
    return m ? Number(m[0]) : null;
  })();

  const items = Number.isFinite(roleKey) ? (rolesMenu[roleKey] || []) : [];

  const [openMenu, setOpenMenu] = useState(null);
  const toggleMenu = (id) => setOpenMenu((p) => (p === id ? null : id));

  const [mobileOpen, setMobileOpen] = useState(false);

   useEffect(() => {
    const onToggle = () => setMobileOpen((p) => !p);
    const onClose = () => setMobileOpen(false);
    const onEsc = (e) => e.key === "Escape" && setMobileOpen(false);

    window.addEventListener("toggle-sidebar", onToggle);
    window.addEventListener("close-sidebar", onClose);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("toggle-sidebar", onToggle);
      window.removeEventListener("close-sidebar", onClose);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <aside className="sidebar">
      <div className="logo-section" style={{ display: "flex", alignItems: "center", padding: 16 }}>
        <img src="/Logo.png" alt="Logo" style={{ height: 40, marginRight: 10 }} />
      </div>

      <ul className="menu-list" style={{ padding: 0, margin: 0 }}>
        {items.map((item) => {
          const id = item.key || item.label;
          const hasSubs = Array.isArray(item.submenus) && item.submenus.length > 0;

          return (
            <li key={id} style={{ listStyle: "none" }}>
              {item.path && !hasSubs ? (
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `menu-header ${isActive ? "active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 20px",
                    textDecoration: "none",
                    color: "inherit",
                    fontWeight: 550,
                  }}
                >
                  <span className="menu-icon" style={{ minWidth: 24 }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
                </NavLink>
              ) : (
                <button
                  type="button"
                  className="menu-header"
                  onClick={() => hasSubs && toggleMenu(id)}
                  aria-expanded={hasSubs ? openMenu === id : undefined}
                  aria-controls={hasSubs ? `submenu-${id}` : undefined}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: 0,
                    cursor: hasSubs ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 20px",
                    color: "inherit",
                    fontWeight: 550,
                  }}
                >
                  <span className="menu-icon" style={{ minWidth: 24 }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
                  {hasSubs && (
                    <span style={{ marginLeft: "auto" }}>
                      {openMenu === id ? <IoIosArrowUp /> : <IoIosArrowDown />}
                    </span>
                  )}
                </button>
              )}

              {hasSubs && (
                <ul
                  id={`submenu-${id}`}
                  className="submenu"
                  style={{ padding: 0, margin: 0, display: openMenu === id ? "block" : "none" }}
                >
                  {item.submenus.map((sub) => (
                    <li key={sub.path || sub.name} style={{ listStyle: "none" }}>
                      <NavLink
                        to={sub.path}
                        className={({ isActive }) => `submenu-item ${isActive ? "active" : ""}`}
                        style={{
                          display: "block",
                          padding: "8px 0 8px 48px",
                          textDecoration: "none",
                          color: "inherit",
                          fontSize: 14,
                        }}
                      >
                        {sub.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}

        {items.length === 0 && (
          <li style={{ listStyle: "none" }}>
            <div style={{ padding: 16, color: "#9CA3AF", fontSize: 12 }}>
              No menu configured for your role.
            </div>
          </li>
        )}
      </ul>
    </aside>
  );
}
