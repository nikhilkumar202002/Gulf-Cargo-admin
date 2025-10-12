import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import "./layout.css";
import "@fontsource/roboto";
import { Outlet } from "react-router-dom";

export default function Layout({ userRole }) {
  return (
   <div className="app flex h-screen w-screen overflow-hidden">
  <Sidebar userRole={userRole} />

  <div className="main flex flex-col flex-1 min-w-0 overflow-hidden">
    <Header />
    <div className="content flex-1 overflow-y-auto bg-gray-50 p-4">
      <Outlet />
    </div>
    <Footer />
  </div>
</div>

  );
}
