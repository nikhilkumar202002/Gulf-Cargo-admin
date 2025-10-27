// src/pages/Cargos/AllCargoList.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { GiCargoCrate } from "react-icons/gi";
import { IoIosSearch } from "react-icons/io";
import { SlEye } from "react-icons/sl";
import { FaFileInvoiceDollar } from "react-icons/fa6";
import { FiEdit2 } from "react-icons/fi";
import { listCargos } from "../../api/createCargoApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import BillModal from "./components/BillModal";
import EditCargoModal from "./components/EditCargoModal";

/* ---------------- helpers ---------------- */
const unwrapArray = (o) =>
  Array.isArray(o)
    ? o
    : Array.isArray(o?.data?.data)
    ? o.data.data
    : Array.isArray(o?.data)
    ? o.data
    : Array.isArray(o?.items)
    ? o.items
    : Array.isArray(o?.results)
    ? o.results
    : [];

const initialFilter = {
  sender: "",
  receiver: "",
  fromDate: "",
  tillDate: "",
  status: "",
};

const COLOR = {
  violet: "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
};

/* ---------------- skeleton ---------------- */
const Skel = ({ w = "100%", h = 12 }) => (
  <div
    className="animate-pulse rounded bg-slate-200/80"
    style={{ width: w, height: h }}
  />
);

const TableSkeleton = ({ rows = 8, cols = 13 }) => (
  <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
    <div className="overflow-x-auto">
      <table className="min-w-[1200px] whitespace-nowrap">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-semibold tracking-wide text-slate-600">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <Skel w="60%" h={12} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c} className="px-3 py-3">
                  <Skel
                    w={c === 0 ? "18px" : c % 3 === 0 ? "50%" : "70%"}
                    h={12}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ---------------- main ---------------- */
export default function AllCargoList() {
  const [allCargos, setAllCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [statuses, setStatuses] = useState([]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCargoId, setEditingCargoId] = useState(null);

  const [page, setPage] = useState(1);
  const perPage = 10;

  const navigate = useNavigate();

  /* ---------------- Status Fetch ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await getActiveShipmentStatuses();
        setStatuses(unwrapArray(res));
      } catch {
        setStatuses([]);
      }
    })();
  }, []);

  /* ---------------- Fetch Cargos ---------------- */
  const [pagination, setPagination] = useState({ total: 0, lastPage: 1 });

  const fetchCargos = async (pageToFetch = 1) => {
    setLoading(true);
    setError("");
    try {
      const response = await listCargos({
        page: pageToFetch,
        per_page: perPage,
        sender_name: filter.sender || undefined,
        receiver_name: filter.receiver || undefined,
        from_date: filter.fromDate || undefined,
        to_date: filter.tillDate || undefined,
        status_id: filter.status || undefined,
      });

      // Handle common Laravel pagination structures
      const data = response?.data || response?.items || response || [];
      const list = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);

      setAllCargos(list);
      setPagination({
        total: data?.total || response?.total || 0,
        lastPage: data?.last_page || response?.last_page || 1,
      });
    } catch (e) {
      setError(e?.message || "Failed to load cargos.");
      setAllCargos([]);
    } finally {
      setLoading(false);
    }
  };

  // This is a ref to hold the timeout for debouncing
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timeout to fetch data after 500ms of inactivity
    debounceTimeoutRef.current = setTimeout(() => {
      fetchCargos(page);
    }, 500);

    // Cleanup function to clear the timeout if the component unmounts
    // or if dependencies change again before the timeout fires.
    return () => clearTimeout(debounceTimeoutRef.current);
  }, [page, filter, perPage]); // Re-fetch when page, filters, or items per page change

  /* ---------------- Filters ---------------- */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    // When a filter changes, reset to page 1 and update the filter value
    setPage(1);
    setFilter((f) => ({ ...f, [name]: value }));
  };

  const applyFilters = () => {
    fetchCargos(1);
  };
  const resetFilters = () => {
    setFilter(initialFilter);
    fetchCargos();
  };

  /* ---------------- Pagination (Client Side) ---------------- */
  const totalItems = allCargos.length;
  const totalPages = pagination.lastPage;

  const pagedCargos = useMemo(() => {
    // Data is already paged by the server
    return allCargos;
  }, [allCargos]);

  const handleNextPage = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  /* ---------------- Excel Export ---------------- */
  const handleExcelExport = () => {
    if (!allCargos.length) return alert("No cargos to export.");

    const toRows = pagedCargos.map((c) => ({
      ID: c.id,
      "Booking No": c.booking_no,
      Branch: c.branch_name,
      Sender: c.sender_name,
      Receiver: c.receiver_name,
      Date: c.date,
      Time: c.time,
      "Shipping Method": c.shipping_method,
      "Payment Method": c.payment_method,
      Status: c.status?.name || c.status || "",
      "Total Weight": c.total_weight,
      "Total Cost": c.total_cost,
    }));

    const ws = XLSX.utils.json_to_sheet(toRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cargos");
    XLSX.writeFile(
      wb,
      `cargos_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.xlsx`
    );
  };

  /* ---------------- Helpers ---------------- */
  const getBoxCount = (c = {}) => {
    if (Number.isFinite(c.box_count)) return Number(c.box_count);
    if (Array.isArray(c.boxes)) return c.boxes.length;
    if (Array.isArray(c.items)) {
      const uniq = new Set(
        c.items
          .map((it) => it?.box_number ?? it?.boxNumber ?? it?.box)
          .filter(Boolean)
      );
      return uniq.size || 0;
    }
    return 0;
  };

  /* ---------------- UI ---------------- */
  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GiCargoCrate className="h-6 w-6 text-[#ED2624]" />
            <h1 className="text-xl font-semibold text-slate-900">All Cargo</h1>
            <span className="ml-3 rounded-lg bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 ring-1 ring-indigo-300"
            >
              Total Cargos: {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCargos}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={resetFilters}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={handleExcelExport}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
            >
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              type="text"
              name="sender"
              value={filter.sender}
              onChange={handleFilterChange}
              placeholder="Search by Sender"
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-indigo-300"
            />
            <input
              type="text"
              name="receiver"
              value={filter.receiver}
              onChange={handleFilterChange}
              placeholder="Search by Receiver"
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-indigo-300"
            />
            <select
              name="status"
              value={filter.status}
              onChange={handleFilterChange}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-indigo-300"
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="fromDate"
              value={filter.fromDate}
              onChange={handleFilterChange}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-indigo-300"
            />
            <input
              type="date"
              name="tillDate"
              value={filter.tillDate}
              onChange={handleFilterChange}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-indigo-300"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="rounded-xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200">
            {error}
          </div>
        ) : (
          <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] whitespace-nowrap">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold tracking-wide text-slate-600">
                    <th className="px-3 py-3">Actions</th>
                    <th className="px-3 py-3">Booking No.</th>
                    <th className="px-3 py-3">Branch</th>
                    <th className="px-3 py-3">Sender</th>
                    <th className="px-3 py-3">Receiver</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Time</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Boxes</th>
                    <th className="px-3 py-3">Weight (kg)</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {pagedCargos.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                        No cargos found.
                      </td>
                    </tr>
                  ) : (
                    pagedCargos.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/cargo/view/${c.id}`}
                              title="View"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-700 ring-1 ring-sky-200 hover:bg-sky-200"
                            >
                              <SlEye className="h-3 w-3" />
                            </Link>
                         <button
                              onClick={() => {
                                setEditingCargoId(c.id);
                                setEditModalOpen(true);
                              }}
                              title="Edit Cargo"
                              className="inline-flex items-center rounded-md bg-amber-100 p-2 text-amber-800 hover:bg-amber-200 transition"
                            >
                              ✏️
                            </button>

                            <button
                              onClick={() => {
                                setSelectedShipment(c);
                                setInvoiceModalOpen(true);
                              }}
                              title="Invoice"
                              className="inline-flex items-center rounded-md bg-sky-50 p-2 text-sky-700 hover:bg-sky-100"
                            >
                              <FaFileInvoiceDollar className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">{c.booking_no}</td>
                        <td className="px-3 py-2">{c.branch_name || "—"}</td>
                        <td className="px-3 py-2">{c.sender_name || "—"}</td>
                        <td className="px-3 py-2">{c.receiver_name || "—"}</td>
                        <td className="px-3 py-2">{c.date || "—"}</td>
                        <td className="px-3 py-2">{c.time || "—"}</td>
                        <td className="px-3 py-2">{c.shipping_method || "—"}</td>
                        <td className="px-3 py-2">{c.payment_method || "—"}</td>
                        <td className="px-3 py-2">{getBoxCount(c)}</td>
                        <td className="px-3 py-2">{c.total_weight ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${COLOR.violet}`}
                          >
                            {c.status?.name || c.status || "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Page <b>{page}</b> of <b>{totalPages}</b> — Showing{" "}
              <b>{pagedCargos.length}</b> per page (Total: <b>{pagination.total}</b>)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className={`rounded-md border px-3 py-1 text-sm ${
                  page === 1
                    ? "cursor-not-allowed border-slate-200 text-slate-400"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    page === i + 1
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className={`rounded-md border px-3 py-1 text-sm ${
                  page === totalPages
                    ? "cursor-not-allowed border-slate-200 text-slate-400"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <BillModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        shipment={selectedShipment}
      />

              <EditCargoModal
                  open={editModalOpen}
                  cargoId={editingCargoId}
                  onClose={() => setEditModalOpen(false)}
                  onSaved={() => {
                    setEditModalOpen(false);
                    fetchCargos(); // refresh after edit
                  }}
                />

    </section>
  );
}
