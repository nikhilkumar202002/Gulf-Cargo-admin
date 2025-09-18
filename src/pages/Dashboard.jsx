
import { useSelector } from "react-redux";
import SuperAdminPanel from "./Dashboards/SuperAdminPanel";
import StaffDashboard from "./Dashboards/StaffDashboard";
import AgencyDashboard from "./Dashboards/AgencyDashboard";

const dashboardMap = {
  1: SuperAdminPanel, // Super Admin
  2: StaffDashboard,  // Staff
  3: AgencyDashboard, // Agency
};

export default function Dashboard() {
  // read from Redux, not AuthContext
  const { token, status, user } = useSelector((s) => s.auth || {});
  const isAuthenticated = Boolean(token);

  // while profile is loading (or not yet fetched), wait
  if (!isAuthenticated) {
    return (
      <p className="text-center text-red-500 text-lg mt-10">
        Please log in first.
      </p>
    );
  }
  if (status === "loading" || !user) {
    return <p className="text-center mt-10">Loading Dashboard...</p>;
  }

  // support multiple possible shapes for role
  const roleId =
    user?.role_id ?? user?.roleId ?? user?.role?.id ?? user?.role ?? null;

  const DashboardComponent = dashboardMap[roleId];

  return DashboardComponent ? (
    <DashboardComponent />
  ) : (
    <h2 className="text-center mt-10 text-red-500 text-xl">
      Unauthorized Access
    </h2>
  );
}
