import React from "react";
import { useAuth } from "../auth/AuthContext";
import SuperAdminPanel from "./Dashboards/SuperAdminPanel";
import StaffDashboard from "./Dashboards/StaffDashboard";
import AgencyDashboard from "./Dashboards/AgencyDashboard";

const dashboardMap = {
  1: SuperAdminPanel,
  2: StaffDashboard,
  3: AgencyDashboard,
};

export default function Dashboard() {
  const { roleId, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <p className="text-center mt-10">Loading Dashboard...</p>;
  }

  if (!isAuthenticated) {
    return <p className="text-center text-red-500 text-lg mt-10">Please log in first.</p>;
  }

  const DashboardComponent = dashboardMap[roleId];

  return DashboardComponent ? (
    <DashboardComponent />
  ) : (
    <h2 className="text-center mt-10 text-red-500 text-xl">
      Unauthorized Access
    </h2>
  );
}