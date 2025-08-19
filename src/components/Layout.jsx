import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "./layout.css";
import "@fontsource/montserrat";
import { Outlet } from "react-router-dom";

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="main">
        <Header />
        <div className="content">
          <Outlet /> {/* This is where page content will render */}
        </div>
      </div>
    </div>
  );
};

export default Layout;
