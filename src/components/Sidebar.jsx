import React, { useState } from "react";
import {
  FaUsers,
  FaTruck,
  FaBox,
  FaBuilding,
  FaUser,
  FaMoneyBill,
  FaChartBar,
  FaCog
} from "react-icons/fa";
import { BiSolidDashboard } from "react-icons/bi";
import "./layout.css";
import { IoIosArrowDown, IoIosArrowUp  } from "react-icons/io";
import { Link } from "react-router-dom";

export default function Sidebar() {
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const menuItems = [
    { key: "dashboard", icon: <BiSolidDashboard />, label: "Dashboard", path: "/dashboard" },
    {
      key: "branch",
      icon: <FaBuilding />,
      label: "Branches",
        submenus: [
        { name: "All Branches", path: "/branches" },
        { name: "Add New Branch", path: "/branches/add" },
      ]
    },
    {
      key: "hr",
      icon: <FaUsers />,
      label: "HR & Staff",
      submenus: [
        "Staff List",
        "Attendance & Leave",
        "Payroll & Salaries",
        "Performance Review"
      ]
    },
    {
      key: "fleet",
      icon: <FaTruck />,
      label: "Fleet & Drivers",
      submenus: [
        "Driver List",
        "Assign Driver to Shipment",
        "Vehicle Management",
        "Maintenance Schedule"
      ]
    },
    {
      key: "shipments",
      icon: <FaBox />,
      label: "Shipments",
      submenus: [
        "Create Shipment",
        "All Shipments",
        "Pending / In Transit / Delivered",
        "Shipment Tracking"
      ]
    },
    {
      key: "agency",
      icon: <FaUser />,
      label: "Agency & Partners",
      submenus: ["Partner Agencies", "Contracts & Agreements", "Agency Performance"]
    },
    {
      key: "sender",
      icon: <FaUser />,
      label: "Sender / Receiver",
       submenus: [
        { name: "Create Receiver", path: "/receiver/create" },
        { name: "View Receiver", path: "/allreceiver" },
      ]
    },
    {
      key: "finance",
      icon: <FaMoneyBill />,
      label: "Finance & Accounts",
      submenus: [
        "Invoices & Payments",
        "Expenses & Purchase Orders",
        "Outstanding Payments",
        "Financial Reports"
      ]
    },
    {
      key: "reports",
      icon: <FaChartBar />,
      label: "Reports & Analytics",
      submenus: [
        "Shipment Reports",
        "Revenue & Expense Reports",
        "Delivery Performance",
        "Branch-wise Analysis"
      ]
    },
    {
      key: "settings",
      icon: <FaCog />,
      label: "System Settings",
      submenus: [
        "User Roles & Permissions",
        "API Integrations",
        "System Preferences",
        "Notification Settings"
      ]
    }
  ];

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="logo-section" style={{ display: "flex", alignItems: "center", padding: "16px" }}>
        <img src="/Logo.png" alt="Logo" style={{ height: "40px", marginRight: "10px" }} />
      </div>

      {/* Menu List */}
        <ul className="menu-list" style={{ padding: 0, margin: 0 }}>
        {menuItems.map(({ key, icon, label, submenus, path }) => (
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
                tabIndex={0}
                onKeyDown={(e) => {
                  if (submenus && (e.key === "Enter" || e.key === " ")) {
                    toggleMenu(key);
                  }
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
                  <Link to={path} style={{ textDecoration: "none", color: "inherit" }}>
                  <li
                    key={name}
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
