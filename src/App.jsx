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
import Login from "./pages/Login/Login";
import Register from "./pages/Login/Register";
import { AuthProvider, useAuth } from "./auth/AuthContext"; // FIXED HERE

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const { isAuthenticated } = useAuth?.() || {};

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
          />
          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="branches" element={<AllBranches />} />
            <Route path="branches/add" element={<AddBranch />} />
            <Route path="receiver/create" element={<ReceiverCreate />} />
            <Route path="allreceiver" element={<ReceiverView />} />
            <Route path="sender/create" element={<SenderCreate />} />
            <Route path="senders" element={<SenderView />} />
            <Route path="visa/allvisa" element={<AllVisa />} />
            <Route path="visaemployee" element={<VisaEmployees />} />
            <Route path="visatype/create" element={<VisaTypeCreate />} />
            <Route path="hr&staff/allstaffs" element={<StaffPanel />} />
            <Route path="hr&staff/createstaffs" element={<NewStaffForm />} />
            <Route path="hr&staff/view" element={<StaffView />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
