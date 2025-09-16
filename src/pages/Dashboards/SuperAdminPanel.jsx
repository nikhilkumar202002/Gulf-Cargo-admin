import React, { useMemo, useState, useEffect } from "react";
import {
  FaUsers, FaClock, FaInbox, FaTruck, FaUserCheck, FaUserTimes, FaUserMinus,
  FaBoxOpen, FaRegClock, FaPeopleCarry, FaExchangeAlt, FaCircle,
  FaChevronRight, FaChevronLeft,
  FaDollarSign, FaShieldAlt, FaExclamationTriangle, FaMoneyBillWave, FaMapMarkerAlt, FaChartBar
} from "react-icons/fa";
import "../Styles.css";

/* ---------- helpers ---------- */
const fmtCurrency = (n, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n ?? 0);

const StatusPill = ({ status }) => {
  const map = {
    Delivered: "bg-green-600",
    "Out for Delivery": "bg-blue-600",
    Pending: "bg-yellow-500",
    "Waiting for Clearance": "bg-orange-500",
    Cleared: "bg-purple-600",
    "In Transit": "bg-cyan-600",
  };
  const color = map[status] || "bg-gray-500";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${color}`}>
      <FaCircle className="w-2 h-2" /> {status}
    </span>
  );
};

const Card = ({ icon, title, value, sub }) => (
  <div className="dashboard-card flex items-center gap-3 bg-white rounded-2xl shadow-sm p-4">
    <div className="card-icon flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-xl text-blue-600">
      {icon}
    </div>
    <div className="flex flex-col">
      <h1 className="text-xl font-semibold">{value}</h1>
      <p className="text-sm text-gray-500">{title}</p>
      {sub ? <p className="text-xs text-gray-400">{sub}</p> : null}
    </div>
  </div>
);

const PagedBars = ({
  title,
  items,
  icon: HeadingIcon = FaChartBar,
  itemsPerPage = 5,
  barColor = "#262262",
}) => {
  const [page, setPage] = useState(1);
  const [branchSel, setBranchSel] = useState("ALL");

  const branchOptions = useMemo(
    () => ["ALL", ...Array.from(new Set((items || []).map(i => i.label)))],
    [items]
  );

  const filtered = useMemo(
    () => (branchSel === "ALL" ? items : items.filter(i => i.label === branchSel)),
    [items, branchSel]
  );

  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / itemsPerPage));
  const max = Math.max(...(filtered?.map(i => i.value) || [1]));
  const start = (page - 1) * itemsPerPage;
  const pageItems = (filtered || []).slice(start, start + itemsPerPage);

  useEffect(() => setPage(1), [filtered, itemsPerPage]);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 flex-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HeadingIcon className="text-[#262262]" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={branchSel}
            onChange={(e) => setBranchSel(e.target.value)}
            className="px-2 py-1 rounded-lg border text-xs text-gray-700"
            title="Filter by branch"
          >
            {branchOptions.map(opt => <option key={opt} value={opt}>{opt === "ALL" ? "All Branches" : opt}</option>)}
          </select>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded-lg border bg-white disabled:opacity-40"
              title="Previous"
            >
              <FaChevronLeft className="inline w-3 h-3 mr-1" /> Prev
            </button>
            <span>{page}/{totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded-lg border bg-white disabled:opacity-40"
              title="Next"
            >
              Next <FaChevronRight className="inline w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {pageItems.map((x) => (
          <div key={x.label}>
            <div className="text-sm text-gray-700 mb-2">{x.label}</div>
            <div className="h-2 bg-gray-100 rounded">
              <div
                className="h-2 rounded"
                style={{ width: `${(x.value / (max || 1)) * 100}%`, background: barColor }}
              />
            </div>
          </div>
        ))}
        {pageItems.length === 0 && (
          <div className="text-sm text-gray-500">No data.</div>
        )}
      </div>
    </div>
  );
};

/* ---------- demo data ---------- */
const STAFF = [
  { label: "Present", value: 80, icon: <FaUserCheck className="text-green-500" /> },
  { label: "Absent", value: 15, icon: <FaUserTimes className="text-red-500" /> },
  { label: "Partial", value: 5, icon: <FaUserMinus className="text-yellow-500" /> },
  { label: "Moving Pending", value: 4, icon: <FaExchangeAlt className="text-pink-500" /> },
];

const CARGO_OVERVIEW = [
  { label: "Receiver", value: 2928, icon: <FaBoxOpen className="text-blue-400" /> },
  { label: "Out for Delivery", value: 63, icon: <FaTruck className="text-purple-500" /> },
  { label: "Waiting for Clearance", value: 12, icon: <FaRegClock className="text-orange-500" /> },
  { label: "Enquiries Collected", value: 87, icon: <FaPeopleCarry className="text-cyan-500" /> },
];

const today = new Date();
const aDay = (d) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);

const SHIPMENTS = [
  { date: aDay(0),  dateLabel: "Today", shipmentId: "CARGO-2023123", sender: "Acme Logistics",  destination: "New York, NY",   branch: "NYC", mode: "Road", service: "Express",   status: "Out for Delivery", onTime: true,  amount: 120, cost: 84 },
  { date: aDay(0),  dateLabel: "Today", shipmentId: "CARGO-2023124", sender: "FastShip",       destination: "Los Angeles, CA", branch: "LAX", mode: "Road", service: "Standard",  status: "Pending",           onTime: false, amount: 45,  cost: 30 },
  { date: aDay(2),  dateLabel: "2d ago", shipmentId: "CARGO-2023125", sender: "Eagle Carriers", destination: "Chicago, IL",     branch: "CHI", mode: "Air",  service: "Overnight", status: "Delivered",         onTime: true,  amount: 150, cost: 105 },
  { date: aDay(3),  dateLabel: "3d ago", shipmentId: "CARGO-2023126", sender: "ShipRight",      destination: "Houston, TX",     branch: "HOU", mode: "Road", service: "Standard",  status: "Cleared",           onTime: true,  amount: 100, cost: 68 },
  { date: aDay(4),  dateLabel: "4d ago", shipmentId: "CARGO-2023127", sender: "Urban Movers",   destination: "Miami, FL",       branch: "MIA", mode: "Air",  service: "Express",   status: "In Transit",        onTime: true,  amount: 85,  cost: 57 },
];

/* ---------- main ---------- */
const SuperAdminPanel = () => {
  // Removed: global filters (date/branch/mode/service/search)

  /* table filters */
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  /* paging */
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  /* filtered shipments (only using table filters now) */
  const filteredShipments = useMemo(() => {
    let rows = [...SHIPMENTS];

    if (statusFilter !== "ALL") rows = rows.filter(s => s.status === statusFilter);

    const compare = (a, b) => {
      let res = 0;
      if (sortBy === "date") res = a.date - b.date;
      if (sortBy === "amount") res = (a.amount ?? 0) - (b.amount ?? 0);
      if (sortBy === "destination") res = a.destination.localeCompare(b.destination);
      return sortDir === "asc" ? res : -res;
    };
    return rows.sort(compare);
  }, [statusFilter, sortBy, sortDir]);

  const paged = useMemo(() => {
    const startIdx = (page - 1) * PAGE_SIZE;
    return filteredShipments.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredShipments, page]);

  useEffect(() => setPage(1), [statusFilter, sortBy, sortDir]);

  /* KPIs (computed off filtered set) */
  const kpis = useMemo(() => {
    const todayStr = today.toDateString();
    const todayRows = filteredShipments.filter(s => s.date.toDateString() === todayStr);
    const shipmentsToday = todayRows.length;

    const delivered = filteredShipments.filter(s => s.status === "Delivered");
    const onTimeDelivered = delivered.filter(s => s.onTime).length;
    const onTimePct = delivered.length ? Math.round((onTimeDelivered / delivered.length) * 100) : 0;

    const exceptionsOpen = filteredShipments.filter(s =>
      ["Pending", "Waiting for Clearance"].includes(s.status)
    ).length;

    const revenue = filteredShipments.reduce((sum, s) => sum + (s.amount ?? 0), 0);
    const cost = filteredShipments.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    const marginPct = revenue ? Math.round(((revenue - cost) / revenue) * 100) : 0;

    return { shipmentsToday, onTimePct, exceptionsOpen, revenue, marginPct };
  }, [filteredShipments]);

  /* Exceptions worklist */
  const exceptionsList = useMemo(() => {
    const buckets = {
      "Waiting for Clearance": [],
      "Pending": [],
      "Address Issue": [],
      "RTO Initiated": [],
    };
    filteredShipments.forEach(s => {
      if (s.status === "Waiting for Clearance") buckets["Waiting for Clearance"].push(s);
      if (s.status === "Pending") buckets["Pending"].push(s);
    });
    return buckets;
  }, [filteredShipments]);

  const branchPerf = useMemo(() => {
    const map = {};
    filteredShipments.forEach(s => {
      if (!map[s.branch]) map[s.branch] = { count: 0, rev: 0 };
      map[s.branch].count += 1;
      map[s.branch].rev += (s.amount ?? 0);
    });
    const itemsCount = Object.entries(map).map(([label, v]) => ({ label, value: v.count }));
    const itemsRev   = Object.entries(map).map(([label, v]) => ({ label, value: v.rev }));
    return { itemsCount, itemsRev };
  }, [filteredShipments]);

  const mainCards = [
    { title: "Shipments Today", value: kpis.shipmentsToday, icon: <FaTruck /> },
    { title: "On-Time Delivery %", value: `${kpis.onTimePct}%`, icon: <FaClock /> },
    { title: "Exceptions Open", value: kpis.exceptionsOpen, icon: <FaExclamationTriangle/> },
    { title: "Revenue (Filtered)", value: fmtCurrency(kpis.revenue), sub: `Gross Margin ${kpis.marginPct}%`, icon: <FaDollarSign /> },
  ];

  const topInfoCards = [
    { title: "Total Staffs", value: 100, icon: <FaUsers /> },
    { title: "Senders", value: 2868, icon: <FaInbox /> },
    { title: "Out for Delivery", value: 63, icon: <FaTruck /> },
    { title: "Pending Dispatch", value: 41, icon: <FaClock /> },
  ];

  /* ---------- UI ---------- */
  return (
    <section className="dashboard min-h-screen bg-gray-50">
      <div className="dashboard-container max-w-7xl mx-auto py-8 px-4">

        {/* KPI cards */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-2">
          {mainCards.map((c, i) => <Card key={i} {...c} />)}
        </div>

        {/* Info cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
          {topInfoCards.map((c, i) => <Card key={i} {...c} />)}
        </div>

     

        {/* Operations Overview */}
        <div className="dashboard-row mt-8">
          <div className="dashboard-row-heading mb-4">
            <h1 className="dashboard-overview text-xl font-bold">Operations Overview</h1>
          </div>

          <div className="flex gap-3 flex-col lg:flex-row">
            {/* Staff Attendance */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex-1">
              <h2 className="text-lg font-semibold mb-5">Staff Attendance</h2>
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-left font-semibold text-xs">
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right pr-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {STAFF.map((row) => (
                    <tr key={row.label} className="border-b last:border-b-0">
                      <td className="flex items-center gap-3 py-3">
                        <span className="p-2 rounded-lg bg-gray-100">{row.icon}</span>
                        <span className="font-medium">{row.label}</span>
                      </td>
                      <td className="text-right font-semibold text-gray-700 pr-2">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cargo & Movement */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex-1">
              <h2 className="text-lg font-semibold mb-5">Cargo & Movement Overview</h2>
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-left font-semibold text-xs">
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right pr-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {CARGO_OVERVIEW.map((row) => (
                    <tr key={row.label} className="border-b last:border-b-0">
                      <td className="flex items-center gap-3 py-3">
                        <span className="p-2 rounded-lg bg-gray-100">{row.icon}</span>
                        <span className="font-medium">{row.label}</span>
                      </td>
                      <td className="text-right font-semibold text-gray-700 pr-2">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Branch Performance */}
      

        {/* Latest Shipments */}
        <div className="dashboard-cargo-list mt-10">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold">Latest Shipments</h1>

            {/* Inline filters for the table */}
            <div className="flex gap-2 items-center">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      className="px-2 py-1 rounded-lg border text-sm">
                <option value="ALL">All Statuses</option>
                <option>Delivered</option>
                <option>Out for Delivery</option>
                <option>Pending</option>
                <option>Waiting for Clearance</option>
                <option>Cleared</option>
                <option>In Transit</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                      className="px-2 py-1 rounded-lg border text-sm">
                <option value="date">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="destination">Sort: Destination</option>
              </select>
              <button
                onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
                className="px-2 py-1 rounded-lg border text-sm bg-white"
                title="Toggle sort direction"
              >
                {sortDir === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl shadow-md bg-white px-6 py-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 font-semibold">
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Shipment ID</th>
                  <th className="py-2 text-left">Sender</th>
                  <th className="py-2 text-left">Destination</th>
                  <th className="py-2 text-left">Branch</th>
                  <th className="py-2 text-left">Mode</th>
                  <th className="py-2 text-left">Service</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Amount</th>
                  <th className="py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((item) => (
                  <tr key={item.shipmentId} className="border-t last:border-b-0 hover:bg-gray-50 transition">
                    <td className="py-2">{item.dateLabel}</td>
                    <td className="py-2 font-medium">{item.shipmentId}</td>
                    <td className="py-2">{item.sender}</td>
                    <td className="py-2">{item.destination}</td>
                    <td className="py-2">{item.branch}</td>
                    <td className="py-2">{item.mode}</td>
                    <td className="py-2">{item.service}</td>
                    <td className="py-2"><StatusPill status={item.status} /></td>
                    <td className="py-2 font-semibold">{fmtCurrency(item.amount)}</td>
                    <td className="py-2">
                      <button className="px-2 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200">View</button>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-6 text-gray-500">No shipments match the filters.</td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <button
                className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <FaChevronLeft className="w-3 h-3" /> Prev
              </button>
              <span className="text-gray-600 text-sm">
                Page {page} of {Math.max(1, Math.ceil(filteredShipments.length / PAGE_SIZE))}
              </span>
              <button
                className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
                disabled={page >= Math.ceil(filteredShipments.length / PAGE_SIZE)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <FaChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default SuperAdminPanel;
