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
import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { BiSolidDashboard } from "react-icons/bi";
import "./layout.css";

export default function Sidebar({ collapsed, setCollapsed }) {
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const menuItems = [
    {
      key: "dashboard",
      icon: <BiSolidDashboard />,
      label: "Dashboard",
    },
    {
      key: "branch",
      icon: <FaBuilding />,
      label: "Branch Management",
      submenus: ["All Branches", "Add New Branch", "Branch Performance Report"]
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
      submenus: [
        "Partner Agencies",
        "Contracts & Agreements",
        "Agency Performance"
      ]
    },
    {
      key: "sender",
      icon: <FaUser />,
      label: "Sender / Receiver",
      submenus: [
        "Customer Database",
        "KYC & Verification",
        "Customer History"
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
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      {/* Logo Section */}
      <div
        className="logo-section"
        onClick={() => {
          if (collapsed) setCollapsed(false);
        }}
        style={{
          cursor: collapsed ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          padding: "16px"
        }}
      >
        <img
          src={collapsed ? "/Logo-collapse.png" : "/Logo.png"}
          alt="Logo"
          style={{
            height: "40px",
            marginRight: collapsed ? 0 : "10px",
            transition: "all 0.3s ease"
          }}
        />

        {/* Arrow icon only in expanded mode */}
        {!collapsed && (
          <button
            className="toggle-btn"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse menu"
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center"
            }}
          >
            <MdKeyboardDoubleArrowLeft />
          </button>
        )}
      </div>

      {/* Menu List */}
      <ul className="menu-list" style={{ padding: 0, margin: 0 }}>
        {menuItems.map(({ key, icon, label, submenus }) => (
          <li key={key} style={{ listStyle: "none" }}>
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
              {!collapsed && (
                <span style={{ flex: 1, marginLeft: "14px" }}>{label}</span>
              )}
              {!collapsed && submenus && (
                <span style={{ marginLeft: "auto" }}>
                  {openMenu === key ? "▲" : "▼"}
                </span>
              )}
            </div>
            {/* Submenu */}
            {submenus && openMenu === key && !collapsed && (
              <ul className="submenu" style={{ paddingLeft: 48 }}>
                {submenus.map((submenu) => (
                  <li
                    key={submenu}
                    className="submenu-item"
                    style={{
                      padding: "8px 0",
                      fontSize: "14px"
                    }}
                  >
                    {submenu}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
