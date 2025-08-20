import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AllBranches from "./pages/Branches/AllBranches";
import AddBranch from "./pages/Branches/AddBranch";
import ReceiverCreate from "./pages/SenderReceiver/ReceiverCreate"
import ReceiverView from "./pages/SenderReceiver/ReceiverView"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="branches" element={<AllBranches />} />
          <Route path="/branches/add" element={<AddBranch />} />
          <Route path="/receiver/create" element={<ReceiverCreate />} />
          <Route path="/allreceiver" element={<ReceiverView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
