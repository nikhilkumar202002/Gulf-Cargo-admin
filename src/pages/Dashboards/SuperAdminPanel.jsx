// src/pages/SuperAdminPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  FaTruck, FaClock, FaExclamationTriangle, FaDollarSign,
  FaUsers, FaUserPlus, FaRegClock, FaInbox,
  FaUserCheck, FaUserTimes, FaUserMinus, FaExchangeAlt
} from "react-icons/fa";
import "../Styles.css";
// keep your relative path; just import the new helper
import { getCounters } from "../../api/dashboardCountersApi";

const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);
const fmtMoney = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const KPI = ({ value, label, Icon, sublabel, loading }) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 flex items-center gap-4">
    <div className="shrink-0 w-11 h-11 rounded-xl bg-red-500 text-white grid place-items-center">
      <Icon className="text-xl" />
    </div>
    <div className="min-w-0">
      <div className="text-xl font-semibold leading-none truncate">{loading ? "…" : value}</div>
      <div className="text-gray-600 text-sm">{label}</div>
      {sublabel ? <div className="text-gray-400 text-xs">{sublabel}</div> : null}
    </div>
  </div>
);

const Card = ({ title, children }) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-0">
    <div className="px-5 py-4 border-b border-gray-100">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

const Row = ({ Icon, label, value, iconBg = "bg-gray-100", iconColor = "text-gray-700" }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg grid place-items-center ${iconBg}`}>
        <Icon className={`${iconColor}`} />
      </div>
      <span className="text-gray-800">{label}</span>
    </div>
    <span className="font-semibold text-gray-900">{value}</span>
  </div>
);

export default function SuperAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [live, setLive] = useState({ totalStaff: 0, sender: 0, receiver: 0 });

  // Dummy (swap to live later if needed)
  const [dummy] = useState({
    shipmentsToday: 2,
    onTimePct: "100%",
    exceptionsOpen: 1,
    revenue: 500,
    outForDelivery: 63,
    pendingDispatch: 41,
    present: 80,
    absent: 15,
    partial: 5,
    movingPending: 4,
    waitingClearance: 12,
    enquiriesCollected: 87,
  });

  // Guard React 18 dev double-mount
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await getCounters({ totalStaff: false, sender: true, receiver: true });
        setLive({
          totalStaff: num(res?.totalStaff),
          sender: num(res?.customerType1),
          receiver: num(res?.customerType2),
        });
      } catch (e) {
        setErr(e?.message || "Failed to load counters");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h1>
          <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg text-sm bg-white border hover:bg-gray-50">
            Refresh
          </button>
        </div>

        {err && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{err}</div>}

        {/* TOP: Major KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <KPI value={dummy.shipmentsToday} label="Shipments Today" Icon={FaTruck} />
          <KPI value={dummy.onTimePct} label="On-Time Delivery %" Icon={FaClock} />
          <KPI value={dummy.exceptionsOpen} label="Exceptions Open" Icon={FaExclamationTriangle} />
          <KPI value={fmtMoney(dummy.revenue)} label="Revenue (Filtered)" Icon={FaDollarSign} sublabel="Gross Margin 31%" />
          <KPI value={live.totalStaff} label="Total Staffs" Icon={FaUsers} loading={loading} />
          <KPI value={live.sender} label="Senders" Icon={FaUserPlus} loading={loading} />
          <KPI value={dummy.outForDelivery} label="Out for Delivery" Icon={FaTruck} />
          <KPI value={dummy.pendingDispatch} label="Pending Dispatch" Icon={FaRegClock} />
        </div>

        {/* BELOW: Rest */}
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Operations Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Staff Attendance">
            <div className="grid">
              <Row Icon={FaUserCheck} label="Present" value={dummy.present} iconBg="bg-green-100" iconColor="text-green-700" />
              <Row Icon={FaUserTimes} label="Absent" value={dummy.absent} iconBg="bg-rose-100" iconColor="text-rose-700" />
              <Row Icon={FaUserMinus} label="Partial" value={dummy.partial} iconBg="bg-yellow-100" iconColor="text-yellow-700" />
              <Row Icon={FaExchangeAlt} label="Moving Pending" value={dummy.movingPending} iconBg="bg-fuchsia-100" iconColor="text-fuchsia-700" />
            </div>
          </Card>

          <Card title="Cargo & Movement Overview">
            <div className="grid">
              <Row Icon={FaInbox} label="Receiver" value={loading ? "…" : live.receiver} iconBg="bg-blue-100" iconColor="text-blue-700" />
              <Row Icon={FaTruck} label="Out for Delivery" value={dummy.outForDelivery} iconBg="bg-purple-100" iconColor="text-purple-700" />
              <Row Icon={FaRegClock} label="Waiting for Clearance" value={dummy.waitingClearance} iconBg="bg-orange-100" iconColor="text-orange-700" />
              <Row Icon={FaInbox} label="Enquiries Collected" value={dummy.enquiriesCollected} iconBg="bg-cyan-100" iconColor="text-cyan-700" />
            </div>
          </Card>
        </div>

     
      </div>
    </section>
  );
}
