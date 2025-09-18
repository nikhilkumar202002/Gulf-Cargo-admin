import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import "./layout.css";
import "@fontsource/roboto";
import { Outlet } from "react-router-dom";

export default function Layout({ userRole }) {
  return (
 <div className="app flex h-screen w-full overflow-hidden">
  <div className="sidebar-container">
    <Sidebar userRole={userRole} />
  </div>

  <div className="main flex flex-col flex-1 h-screen">
    {/* Fixed Header */}
    <div className="flex-shrink-0 max-w-full">
      <Header />
    </div>

    {/* Scrollable Content */}
    <div className="content flex-1 overflow-y-auto bg-gray-50">
      <Outlet />
    </div>

    {/* Fixed Footer */}
    <div className="flex-shrink-0 max-w-full">
      <Footer />
    </div>
  </div>
</div>

  );
}
