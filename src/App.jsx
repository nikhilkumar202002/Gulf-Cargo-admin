import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, clearAuth } from "./store/slices/authSlice";

import ResetPassword from "./pages/Login/ResetPassword";
import ForgotPassword from "./pages/Login/ForgotPassword";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AllBranches from "./pages/Branches/AllBranches";
import AddBranch from "./pages/Branches/AddBranch";
import SenderCreate from "./pages/SenderReceiver/SenderReceiverCreate";
import SenderView from "./pages/SenderReceiver/SenderReceiverView";
import AllVisa from "./pages/Visa/VisaTypeList";
import VisaEmployees from "./pages/Visa/VisaEmployees";
import VisaTypeCreate from "./pages/Visa/VisaTypeCreate";
import StaffPanel from "./pages/Staffs/StaffPanel";
import NewStaffForm from "./pages/Staffs/StaffCreate";
import StaffView from "./pages/Staffs/StaffView";
import AddDriver from "./pages/Drivers/AddDriver";
import ViewAllDriver from "./pages/Drivers/ViewAllDriver";
import CreateCargo from "./pages/CargoShipment/CreateCargo";
import ShippingReport from "./pages/CargoShipment/ShipmentReport";
import ShipmentList from "./pages/CargoShipment/ShipmentList";
import CreateShipment from "./pages/CargoShipment/CreateShipment";
import CargoList from "./pages/CargoShipment/CargoList";
import EditCargo from "./pages/CargoShipment/EditCargo";

import UserProfile from "./pages/Profile/UserProfile";
import EditBranch from "./pages/Branches/EditBranch";
import AllRoles from "./pages/Roles/AllRoles";
import CreateRoles from "./pages/Roles/CreateRoles";
import DocumentTypeCreate from "./pages/Document/CreateDocument";
import DocumentList from "./pages/Document/DocumentList";
import ViewBranch from "./pages/Branches/ViewBranch";

import Preloader from "./components/Preloader";
import Login from "./pages/Login/Login";
import Register from "./pages/Login/Register";

import InvoicesPayments from "./pages/FinanceAccounts/InvoicesPayments";
import OutstandingPayments from "./pages/FinanceAccounts/OutstandingPayments";
import ExpensesPurchaseOrders from "./pages/FinanceAccounts/ExpensesPurchaseOrders";
import FinancialReports from "./pages/FinanceAccounts/FinancialReports";

import MonthlyReport from "./pages/FinanceAccounts/MonthlyReport";
import QuarterlyReport from "./pages/FinanceAccounts/QuarterlyReport";
import AnnualReport from "./pages/FinanceAccounts/AnnualReport";

import ShipmentReport from "./pages/Shipment Reports/ShipmentReport";
import BranchAnalysis from "./pages/Shipment Reports/BranchAnalysis";
import DeliveryPerformance from "./pages/Shipment Reports/DeliveryPerformance";
import RevenueExpenseReport from "./pages/Shipment Reports/RevenueExpenseReport";

import SenderShow from "./pages/SenderReceiver/SenderShow";
import InvoiceView from "./components/InvoiceView";

import ShipmentMethodCreate from "./pages/Shipment Method/ShipmentMethodCreate";
import ShipmentMethodView from "./pages/Shipment Method/ShipmentMethodView";
import PortCreate from "./pages/Ports/portCreate";
import PortView from "./pages/Ports/portView";
import ShipmentStatusView from "./pages/Shipment Status/ShipmentStatusView";

import LicenceCreate from "./pages/Licence type/LicenceCreate";
import LicenceView from "./pages/Licence type/LicenceView";

import PaymentTypeList from "./pages/Payment Types/PaymentTypeList";


const getRoleInfo = (user) => {
  const roleVal = user?.role;
  const roleId =
    user?.role_id ??
    user?.roleId ??
    (roleVal && typeof roleVal === "object" ? roleVal.id : undefined) ??
    (typeof roleVal === "number" ? roleVal : undefined) ??
    null;

  const roleName =
    user?.role_name ??
    user?.roleName ??
    (roleVal && typeof roleVal === "object" ? roleVal.name : undefined) ??
    (typeof roleVal === "string" ? roleVal : "") ??
    "";

  return { roleId: roleId != null ? Number(roleId) : null, roleName: String(roleName || "") };
};

const PrivateRoute = ({ children }) => {
  const { token, status } = useSelector((s) => s.auth || {});
  if (status === "loading") return <div className="loader">Checking authentication...</div>;
  return token ? children : <Navigate to="/login" replace />;
};

const RoleRoute = ({ allow, children }) => {
  const { user } = useSelector((s) => s.auth || {});
  const { roleId } = getRoleInfo(user);
  return roleId != null && allow.includes(Number(roleId))
    ? children
    : <Navigate to="/dashboard" replace />;
};

export default function App() {
  const dispatch = useDispatch();
  const { token, status, user } = useSelector((s) => s.auth || {});
  const [ready, setReady] = useState(false);

  // 🔑 Bootstrap on app load: if we have a token but no user yet, fetch profile.
   useEffect(() => {
    if (!token) return;
    if (status === "idle" && !user) {
      dispatch(fetchProfile())
        .unwrap()
        .catch(() => dispatch(clearAuth()));
    }
  }, [dispatch, token, status, user]);

  if (!ready || status === "loading") {
    return <Preloader onDone={() => setReady(true)} duration={800} />;
  }

  // Preloader + while redux is fetching profile
  if (!ready || status === "loading") {
    return <Preloader onDone={() => setReady(true)} duration={800} />;
  }

  

  // Resolve roleId for Layout/Sidebar (supports several shapes)
  const isAuthenticated = Boolean(token);
  const { roleId, roleName } = getRoleInfo(user); // ← normalized here

  return (
     <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route path="/resetpassword" element={<ResetPassword />} />

        <Route element={<Layout userRole={roleId} />}>
          <Route path="dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

          <Route path="branches" element={<PrivateRoute><AllBranches /></PrivateRoute>} />
          <Route path="branches/add" element={<PrivateRoute><AddBranch /></PrivateRoute>} />

          <Route path="customers/create" element={<PrivateRoute><SenderCreate /></PrivateRoute>} />
          <Route path="customers" element={<PrivateRoute><SenderView /></PrivateRoute>} />

          <Route path="visa/allvisa" element={<PrivateRoute><AllVisa /></PrivateRoute>} />
          <Route path="visaemployee" element={<PrivateRoute><VisaEmployees /></PrivateRoute>} />
          <Route path="visatype/create" element={<PrivateRoute><VisaTypeCreate /></PrivateRoute>} />

          <Route path="hr&staff/allstaffs" element={<PrivateRoute><StaffPanel /></PrivateRoute>} />
          <Route path="hr&staff/createstaffs" element={<PrivateRoute><NewStaffForm /></PrivateRoute>} />
          <Route path="hr&staff/view" element={<PrivateRoute><StaffView /></PrivateRoute>} />

          <Route path="drivers/alldriverslist" element={<PrivateRoute><ViewAllDriver /></PrivateRoute>} />
          <Route path="drivers/addnewdriver" element={<PrivateRoute><AddDriver /></PrivateRoute>} />

          <Route path="cargoshipment/createcargo" element={<PrivateRoute><CreateCargo /></PrivateRoute>} />
          <Route path="shipment/createshipment" element={<PrivateRoute><CreateShipment /></PrivateRoute>} />
          <Route path="shipment/shipmentreport" element={<PrivateRoute><ShippingReport /></PrivateRoute>} />

          <Route path="documents/documentlist" element={<PrivateRoute><DocumentList /></PrivateRoute>} />
          <Route path="documents/createdocument" element={<PrivateRoute><DocumentTypeCreate /></PrivateRoute>} />
          
          <Route path="financeaccounts/invoicepayment" element={<PrivateRoute><InvoicesPayments /></PrivateRoute>} />
          <Route path="financeaccounts/outstandingpayments" element={<PrivateRoute><OutstandingPayments /></PrivateRoute>} />
          <Route path="financeaccounts/expensespurchaseorders" element={<PrivateRoute><ExpensesPurchaseOrders /></PrivateRoute>} />
          <Route path="financeaccounts/financialreports" element={<PrivateRoute><FinancialReports /></PrivateRoute>} />

          <Route path="financeaccounts/monthlyreport" element={<PrivateRoute><MonthlyReport /></PrivateRoute>} />
          <Route path="financeaccounts/quarterlyreport" element={<PrivateRoute><QuarterlyReport /></PrivateRoute>} />
          <Route path="financeaccounts/annualreport" element={<PrivateRoute><AnnualReport /></PrivateRoute>} />

          <Route path="shipmentreport/shipmentreport" element={<PrivateRoute><ShipmentReport /></PrivateRoute>} />
          <Route path="shipmentreport/branchanalysis" element={<PrivateRoute><BranchAnalysis /></PrivateRoute>} />
          <Route path="shipmentreport/deliveryperformance" element={<PrivateRoute><DeliveryPerformance /></PrivateRoute>} />
          <Route path="shipmentreport/revenueexpensereport" element={<PrivateRoute><RevenueExpenseReport /></PrivateRoute>} />

          <Route path="shipmentmethod/create" element={<PrivateRoute><ShipmentMethodCreate /></PrivateRoute>} />
          <Route path="shipmentmethod/view" element={<PrivateRoute><ShipmentMethodView /></PrivateRoute>} />
          <Route path="port/view" element={<PrivateRoute><PortView /></PrivateRoute>} />
          <Route path="port/create" element={<PrivateRoute><PortCreate /></PrivateRoute>} />
          <Route path="shipmentstatus/view" element={<PrivateRoute><ShipmentStatusView /></PrivateRoute>} />
          <Route path="cargo/allcargolist" element={<PrivateRoute><CargoList /></PrivateRoute>} />
          <Route path="paymenttype/view" element={<PrivateRoute><PaymentTypeList /></PrivateRoute>} />

          <Route path="licence/create" element={<PrivateRoute><LicenceCreate /></PrivateRoute>} />
          <Route path="licence/view" element={<PrivateRoute><LicenceView /></PrivateRoute>} />

          {/* Super Admin only */}
          <Route
            path="roles/allroles"
            element={
              <PrivateRoute>
                <RoleRoute allow={[1]}>
                  <AllRoles />
                </RoleRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="roles/addroles"
            element={
              <PrivateRoute>
                <RoleRoute allow={[1]}>
                  <CreateRoles />
                </RoleRoute>
              </PrivateRoute>
            }
          />

          <Route path="profile" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
          <Route path="branch/viewbranch/:id" element={<PrivateRoute><ViewBranch /></PrivateRoute>} />
          <Route path="/senderreceiver/senderview/:id" element={<PrivateRoute><SenderShow /></PrivateRoute>} />
          <Route path="branches/edit/:id" element={<PrivateRoute><EditBranch /></PrivateRoute>} />
          <Route path="shipments/shipmentsview/:id" element={<PrivateRoute><ShipmentList /></PrivateRoute>} />
          <Route path="cargo/:id" element={<PrivateRoute><EditCargo /></PrivateRoute>} />
          <Route path="shipments/shipmentsview/:id/invoice" element={<PrivateRoute><InvoiceView /></PrivateRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
