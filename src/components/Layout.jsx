import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import "./layout.css";
import "@fontsource/roboto";
import { Outlet } from "react-router-dom";

export default function Layout({ userRole }) {
  return (
    <div className="app flex h-screen w-full overflow-hidden">
      {/* Sidebar should not shrink */}
      <div className="sidebar-container shrink-0">
        <Sidebar userRole={userRole} />
      </div>

      {/* Main column can shrink in width (critical) and allow inner scroll */}
      <div className="main flex min-w-0 min-h-0 flex-1 flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0">
          <Header />
        </div>

        {/* Scrollable Content (y only) */}
        <div className="content min-w-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <Outlet />
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
