import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AllBranches from "./pages/Branches/AllBranches";
import AddBranch from "./pages/Branches/AddBranch";
import ReceiverCreate from "./pages/SenderReceiver/ReceiverCreate";
import ReceiverView from "./pages/SenderReceiver/ReceiverView";
import SenderCreate from "./pages/SenderReceiver/SenderCreate";
import SenderView from "./pages/SenderReceiver/SenderView";
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
import UserProfile from "./pages/Profile/UserProfile";
import EditBranch from "./pages/Branches/EditBranch";

import Login from "./pages/Login/Login";
import Register from "./pages/Login/Register";
import { useAuth } from "./auth/AuthContext";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loader">Checking authentication...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  const { isAuthenticated, loading } = useAuth();


  if (loading) {
    return <div className="loader">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        <Route element={<Layout />}>
          <Route
            index
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="branches"
            element={
              <PrivateRoute>
                <AllBranches />
              </PrivateRoute>
            }
          />
          <Route
            path="branches/add"
            element={
              <PrivateRoute>
                <AddBranch />
              </PrivateRoute>
            }
          />
          <Route
            path="receiver/create"
            element={
              <PrivateRoute>
                <ReceiverCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="allreceiver"
            element={
              <PrivateRoute>
                <ReceiverView />
              </PrivateRoute>
            }
          />
          <Route
            path="sender/create"
            element={
              <PrivateRoute>
                <SenderCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="senders"
            element={
              <PrivateRoute>
                <SenderView />
              </PrivateRoute>
            }
          />
          <Route
            path="visa/allvisa"
            element={
              <PrivateRoute>
                <AllVisa />
              </PrivateRoute>
            }
          />
          <Route
            path="visaemployee"
            element={
              <PrivateRoute>
                <VisaEmployees />
              </PrivateRoute>
            }
          />
          <Route
            path="visatype/create"
            element={
              <PrivateRoute>
                <VisaTypeCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="hr&staff/allstaffs"
            element={
              <PrivateRoute>
                <StaffPanel />
              </PrivateRoute>
            }
          />
          <Route
            path="hr&staff/createstaffs"
            element={
              <PrivateRoute>
                <NewStaffForm />
              </PrivateRoute>
            }
          />
          <Route
            path="hr&staff/view"
            element={
              <PrivateRoute>
                <StaffView />
              </PrivateRoute>
            }
          />

            <Route
            path="drivers/alldriverslist"
            element={
              <PrivateRoute>
                <ViewAllDriver />
              </PrivateRoute>
            }
          />

        <Route
            path="cargoshipment/createcargo"
            element={
              <PrivateRoute>
                <CreateCargo />
              </PrivateRoute>
            }
          />

            <Route
            path="shipment/shipmentreport"
            element={
              <PrivateRoute>
                <ShippingReport />
              </PrivateRoute>
            }
          />

           <Route
            path="profile"
            element={
              <PrivateRoute>
                <UserProfile />
              </PrivateRoute>
            }
          />

          <Route path="/branches/edit/:id" element={<EditBranch />} />

            <Route path="drivers/addnewdriver" element={ <PrivateRoute><AddDriver /></PrivateRoute> } />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
