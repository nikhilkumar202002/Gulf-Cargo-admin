import React, { lazy } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

/* ---------------- utils ---------------- */
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

/* ---------------- guards ---------------- */
const PrivateRoute = ({ children }) => {
  const { token, status } = useSelector((s) => s.auth || {});
  if (status === "loading") return <div className="p-6 text-sm text-slate-600">Checking authentication…</div>;
  return token ? children : <Navigate to="/login" replace />;
};

const RoleRoute = ({ allow, children }) => {
  const { user } = useSelector((s) => s.auth || {});
  const { roleId } = getRoleInfo(user);
  return roleId != null && allow.includes(Number(roleId))
    ? children
    : <Navigate to="/dashboard" replace />;
};

/* ---------------- layout wrapper (inject userRole) ---------------- */
import Layout from "../components/Layout";
const LayoutWithRole = () => {
  const { user } = useSelector((s) => s.auth || {});
  const { roleId } = getRoleInfo(user);
  return <Layout userRole={roleId} />;
};

/* ---------------- lazy pages ---------------- */
const Login = lazy(() => import("../pages/Login/Login"));
const Register = lazy(() => import("../pages/Login/Register"));
const ForgotPassword = lazy(() => import("../pages/Login/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/Login/ResetPassword"));

const Dashboard = lazy(() => import("../pages/Dashboard"));

const AllBranches = lazy(() => import("../pages/Branches/AllBranches"));
const AddBranch = lazy(() => import("../pages/Branches/AddBranch"));
const EditBranch = lazy(() => import("../pages/Branches/EditBranch"));
const ViewBranch = lazy(() => import("../pages/Branches/ViewBranch"));

const SenderCreate = lazy(() => import("../pages/SenderReceiver/SenderReceiverCreate"));
const SenderView = lazy(() => import("../pages/SenderReceiver/SenderReceiverView"));
const SenderShow = lazy(() => import("../pages/SenderReceiver/SenderShow"));

const AllVisa = lazy(() => import("../pages/Visa/VisaTypeList"));
const VisaEmployees = lazy(() => import("../pages/Visa/VisaEmployees"));
const VisaTypeCreate = lazy(() => import("../pages/Visa/VisaTypeCreate"));

const StaffPanel = lazy(() => import("../pages/Staffs/StaffPanel"));
const NewStaffForm = lazy(() => import("../pages/Staffs/StaffCreate"));
const StaffView = lazy(() => import("../pages/Staffs/StaffView"));

const AddDriver = lazy(() => import("../pages/Drivers/AddDriver"));
const ViewAllDriver = lazy(() => import("../pages/Drivers/ViewAllDriver"));

const CreateCargo = lazy(() => import("../pages/CargoShipment/CreateCargo"));
const ShippingReport = lazy(() => import("../pages/CargoShipment/ShipmentReport"));
const ShipmentList = lazy(() => import("../pages/CargoShipment/ShipmentList"));
const CreateShipment = lazy(() => import("../pages/CargoShipment/CreateShipment"));
const CargoList = lazy(() => import("../pages/CargoShipment/CargoList"));
const EditCargo = lazy(() => import("../pages/CargoShipment/EditCargo"));
const ViewCargo = lazy(() => import("../pages/CargoShipment/ViewCargo"));

const UserProfile = lazy(() => import("../pages/Profile/UserProfile"));

const AllRoles = lazy(() => import("../pages/Roles/AllRoles"));
const CreateRoles = lazy(() => import("../pages/Roles/CreateRoles"));

const DocumentTypeCreate = lazy(() => import("../pages/Document/CreateDocument"));
const DocumentList = lazy(() => import("../pages/Document/DocumentList"));

const InvoicesPayments = lazy(() => import("../pages/FinanceAccounts/InvoicesPayments"));
const OutstandingPayments = lazy(() => import("../pages/FinanceAccounts/OutstandingPayments"));
const ExpensesPurchaseOrders = lazy(() => import("../pages/FinanceAccounts/ExpensesPurchaseOrders"));
const FinancialReports = lazy(() => import("../pages/FinanceAccounts/FinancialReports"));
const MonthlyReport = lazy(() => import("../pages/FinanceAccounts/MonthlyReport"));
const QuarterlyReport = lazy(() => import("../pages/FinanceAccounts/QuarterlyReport"));
const AnnualReport = lazy(() => import("../pages/FinanceAccounts/AnnualReport"));

/* Note: folder name has a space per your structure */
const ShipmentReport = lazy(() => import("../pages/Shipment Reports/ShipmentReport"));
const BranchAnalysis = lazy(() => import("../pages/Shipment Reports/BranchAnalysis"));
const DeliveryPerformance = lazy(() => import("../pages/Shipment Reports/DeliveryPerformance"));
const RevenueExpenseReport = lazy(() => import("../pages/Shipment Reports/RevenueExpenseReport"));

/* Note: folder name has spaces in your structure */
const ShipmentMethodCreate = lazy(() => import("../pages/Shipment Method/ShipmentMethodCreate"));
const ShipmentMethodView = lazy(() => import("../pages/Shipment Method/ShipmentMethodView"));
const PortCreate = lazy(() => import("../pages/Ports/portCreate"));
const PortView = lazy(() => import("../pages/Ports/portView"));
const ShipmentStatusView = lazy(() => import("../pages/Shipment Status/ShipmentStatusView"));
const LicenceCreate = lazy(() => import("../pages/Licence type/LicenceCreate"));
const LicenceView = lazy(() => import("../pages/Licence type/LicenceView"));
const PaymentTypeList = lazy(() => import("../pages/Payment Types/PaymentTypeList"));
const InvoiceView = lazy(() => import("../components/InvoiceView"));
const CustomerManifest = lazy(() => import("../pages/All Excels/CustomManifest"));
const DeliveryList = lazy(() => import("../pages/All Excels/DeliveryList"));
const LoadingList = lazy(() => import("../pages/All Excels/LoadingList"));
const PackingList = lazy(() => import("../pages/All Excels/PackingList"));
const ListInvoicePrefix = lazy(() => import("../pages/Invoice Number/ListInvoicePrefix"));
const ListDeliveryType = lazy(() => import("../pages/Delivery Type/ListDeliveryType"));
const InvoiceOnly = lazy(() => import("../components/InvoiceOnly"));
const CreateBills = lazy(() => import("../pages/Bills/CreateBills"));
const BillsViews = lazy(() => import("../pages/Bills/BillsViews"));
const CreateShipmentBill = lazy(() => import("../pages/Bills/CreateShipmentBill"));
const ShipmentBillView = lazy(() => import("../pages/Bills/ShipmentBillView"));

/* ---------------- helpers ---------------- */
const AuthRedirect = () => {
  const { token } = useSelector((s) => s.auth || {});
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

/* ---------------- routes ---------------- */
const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthRedirect />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/forgotpassword",
    element: <ForgotPassword />,
  },
  {
    path: "/resetpassword",
    element: <ResetPassword />,
  },

  {
    element: (
      <PrivateRoute>
        <LayoutWithRole />
      </PrivateRoute>
    ),
    children: [
      { path: "dashboard", element: <Dashboard /> },

      { path: "branches", element: <AllBranches /> },
      { path: "branches/add", element: <AddBranch /> },
      { path: "branches/edit/:id", element: <EditBranch /> },
      { path: "branch/viewbranch/:id", element: <ViewBranch /> },

      { path: "customers", element: <SenderView /> },
      { path: "customers/create", element: <SenderCreate /> },
      { path: "senderreceiver/senderview/:id", element: <SenderShow /> },

      { path: "visa/allvisa", element: <AllVisa /> },
      { path: "visaemployee", element: <VisaEmployees /> },
      { path: "visatype/create", element: <VisaTypeCreate /> },

      { path: "hr&staff/allstaffs", element: <StaffPanel /> },
      { path: "hr&staff/createstaffs", element: <NewStaffForm /> },
      { path: "hr&staff/view", element: <StaffView /> },

      { path: "drivers/alldriverslist", element: <ViewAllDriver /> },
      { path: "drivers/addnewdriver", element: <AddDriver /> },

      { path: "cargoshipment/createcargo", element: <CreateCargo /> },
      { path: "shipment/createshipment", element: <CreateShipment /> },
      { path: "shipment/shipmentreport", element: <ShippingReport /> }, // from CargoShipment folder

      { path: "documents/documentlist", element: <DocumentList /> },
      { path: "documents/createdocument", element: <DocumentTypeCreate /> },

      { path: "financeaccounts/invoicepayment", element: <InvoicesPayments /> },
      { path: "financeaccounts/outstandingpayments", element: <OutstandingPayments /> },
      { path: "financeaccounts/expensespurchaseorders", element: <ExpensesPurchaseOrders /> },
      { path: "financeaccounts/financialreports", element: <FinancialReports /> },

      { path: "financeaccounts/monthlyreport", element: <MonthlyReport /> },
      { path: "financeaccounts/quarterlyreport", element: <QuarterlyReport /> },
      { path: "financeaccounts/annualreport", element: <AnnualReport /> },

      // “Shipment Reports” section (different folder)
      { path: "shipmentreport/shipmentreport", element: <ShipmentReport /> },
      { path: "shipmentreport/branchanalysis", element: <BranchAnalysis /> },
      { path: "shipmentreport/deliveryperformance", element: <DeliveryPerformance /> },
      { path: "shipmentreport/revenueexpensereport", element: <RevenueExpenseReport /> },

      { path: "shipmentmethod/create", element: <ShipmentMethodCreate /> },
      { path: "shipmentmethod/view", element: <ShipmentMethodView /> },

      { path: "port/create", element: <PortCreate /> },
      { path: "port/view", element: <PortView /> },

      { path: "shipmentstatus/view", element: <ShipmentStatusView /> },

      { path: "cargo/allcargolist", element: <CargoList /> },
      { path: "cargo/:id", element: <EditCargo /> },
      { path: "cargo/view/:id", element: <ViewCargo /> },

      { path: "paymenttype/view", element: <PaymentTypeList /> },

      { path: "bills/create", element: <CreateBills/> },
      { path: "bills/view", element: <BillsViews/> },
      { path: "bills-shipments/create", element: <CreateShipmentBill/> },
      { path: "bills-shipments/list", element: <ShipmentBillView/> },

      { path: "licence/create", element: <LicenceCreate /> },
      { path: "licence/view", element: <LicenceView /> },
      { path: "shipments/:id/manifest", element: <CustomerManifest /> },
      { path: "shipments/:id/packinglist", element: <PackingList /> },
      { path: "shipments/:id/loadinglist", element: <LoadingList /> },
      { path: "shipments/:id/deliverylist", element: <DeliveryList /> },
      { path: "invoiceprevix/list", element: <ListInvoicePrefix /> },
      { path: "deliverytype/list", element: <ListDeliveryType /> },
      { path: "invoice/:id", element: <InvoiceOnly /> },
      
      {
        path: "roles/allroles",
        element: (
          <RoleRoute allow={[1]}>
            <AllRoles />
          </RoleRoute>
        ),
      },
      {
        path: "roles/addroles",
        element: (
          <RoleRoute allow={[1]}>
            <CreateRoles />
          </RoleRoute>
        ),
      },

      { path: "profile", element: <UserProfile /> },
      { path: "shipments/shipmentsview/:id", element: <ShipmentList /> },
      { path: "shipments/shipmentsview/:id/invoice", element: <InvoiceView /> },
    ],
  },

  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default router;
