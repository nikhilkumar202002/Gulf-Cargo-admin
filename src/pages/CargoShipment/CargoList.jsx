// src/pages/AllCargoList.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { GiCargoCrate } from "react-icons/gi";
import { IoIosSearch } from "react-icons/io";
import { listCargos } from "../../api/createCargoApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { SlEye } from "react-icons/sl";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { Link } from "react-router-dom";

/* ---------------- helpers ---------------- */
const unwrapArray = (o) =>
  Array.isArray(o) ? o :
  Array.isArray(o?.data?.data) ? o.data.data :
  Array.isArray(o?.data) ? o.data :
  Array.isArray(o?.items) ? o.items :
  Array.isArray(o?.results) ? o.results : [];

const initialFilter = { sender: "", receiver: "", fromDate: "", tillDate: "", status: "" };

const COLOR = {
  slate:   "bg-slate-100 text-slate-800 ring-1 ring-slate-200",
  indigo:  "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
  violet:  "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
  sky:     "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
  cyan:    "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200",
  teal:    "bg-teal-100 text-teal-800 ring-1 ring-teal-200",
  emerald: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  lime:    "bg-lime-100 text-lime-800 ring-1 ring-lime-200",
  amber:   "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  orange:  "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
  yellow:  "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200",
  rose:    "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
  red:     "bg-red-100 text-red-800 ring-1 ring-red-200",
};

/* ---------------- skeleton components ---------------- */
const Skel = ({ w = "100%", h = 12, className = "" }) => (
  <div
    className={`animate-pulse rounded bg-slate-200/80 ${className}`}
    style={{ width: w, height: h }}
  />
);
const SkelBar = ({ labelW = "30%", inputW = "100%" }) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skel w={labelW} h={12} />
        <Skel w={inputW} h={36} />
      </div>
    ))}
  </div>
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
            <tr key={`sk-${r}`} className="animate-pulse">
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c} className="px-3 py-3">
                  <Skel w={c === 0 ? "18px" : (c % 3 === 0 ? "50%" : "70%")} h={12} />
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
  // data
  const [allCargos, setAllCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [statuses, setStatuses] = useState([]);
  // pagination (client-side)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // statuses
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

  // fetch cargos
  const fetchCargos = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await listCargos({
        from_date: filter.fromDate || undefined,
        to_date: filter.tillDate || undefined,
        status_id: filter.status || undefined,
      });
      const arr =
        Array.isArray(rows?.data) ? rows.data :
        Array.isArray(rows?.items) ? rows.items :
        Array.isArray(rows) ? rows : [];
      setAllCargos(arr);
      setPage(1);
    } catch (e) {
      setError(e?.message || "Failed to load cargos.");
      setAllCargos([]);
    } finally {
      setLoading(false);
    }
  };

  const getBoxCount = (c = {}) => {
    if (Number.isFinite(c.box_count)) return Number(c.box_count);
    if (c.boxes && !Array.isArray(c.boxes) && typeof c.boxes === "object") return Object.keys(c.boxes).length;
    if (Array.isArray(c.boxes)) return c.boxes.length;
    if (Array.isArray(c.items)) {
      const uniq = new Set(
        c.items
          .map((it) => it?.box_number ?? it?.boxNumber ?? it?.boxNo ?? it?.box)
          .filter(Boolean)
      );
      return uniq.size || 0;
    }
    return 0;
  };

  useEffect(() => {
    fetchCargos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // local filter for sender/receiver text
  const locallyFiltered = useMemo(() => {
    const { sender, receiver } = filter;
    if (!sender && !receiver) return allCargos;
    return allCargos.filter((c) => {
      const senderMatch = sender
        ? String(c.sender_name || c.sender || "").toLowerCase().includes(sender.toLowerCase())
        : true;
      const receiverMatch = receiver
        ? String(c.receiver_name || c.receiver || "").toLowerCase().includes(receiver.toLowerCase())
        : true;
      return senderMatch && receiverMatch;
    });
  }, [allCargos, filter.sender, filter.receiver]);

  // pagination
  const total = locallyFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return locallyFiltered.slice(start, start + perPage);
  }, [locallyFiltered, page, perPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((f) => ({ ...f, [name]: value }));
  };
  const applyServerFilters = () => fetchCargos();
  const resetFilters = () => {
    setFilter(initialFilter);
    setBulkStatusId("");
    fetchCargos();
  };

  // selection
  const currentPageIds = useMemo(() => paged.map((c) => c.id), [paged]);

  // Excel export
  const handleExcelExport = () => {
    const toRows = locallyFiltered.map((c) => ({
      ID: c.id,
      "Booking No": c.booking_no,
      Branch: c.branch_name,
      Sender: c.sender_name,
      Receiver: c.receiver_name,
      Date: c.date,
      Time: c.time,
      "Shipping Method": c.shipping_method,
      "Payment Method": c.payment_method,
      "Box Count": getBoxCount(c),
      Status: c.status?.name || c.status || "",
      "Delivery Type": c.delivery_type,
      "Total Weight (kg)": c.total_weight,
      "Total Cost": c.total_cost,
      "Bill Charges": c.bill_charges,
      "VAT %": c.vat_percentage,
      "VAT Cost": c.vat_cost,
      "Net Total": c.net_total,
      "Track Code": c.lrl_tracking_code,
      Remarks: c.special_remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(toRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cargos");
    XLSX.writeFile(wb, `cargos_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.xlsx`);
  };

  // NOTE: assumes you have a handler; keep as-is if defined elsewhere
  const handleInvoice = (id) => {
    // implement/integrate your invoice flow here
    alert(`Invoice for cargo #${id}`);
  };

  /* ---------------- UI ---------------- */
  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl text-[#ED2624]">
              <GiCargoCrate className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">All Cargo</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCargos}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              onClick={() => window.history.back()}
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

        {/* Filters & bulk update toolbar */}
        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          {loading ? (
            <SkelBar />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="flex items-center rounded-lg bg-slate-50 ring-1 ring-slate-200 focus-within:ring-indigo-300">
                  <input
                    type="text"
                    name="sender"
                    value={filter.sender}
                    onChange={handleFilterChange}
                    placeholder="Sender (client-side)"
                    className="w-full bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center rounded-lg bg-slate-50 ring-1 ring-slate-200 focus-within:ring-indigo-300">
                  <input
                    type="text"
                    name="receiver"
                    value={filter.receiver}
                    onChange={handleFilterChange}
                    placeholder="Receiver (client-side)"
                    className="w-full bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <select
                  name="status"
                  value={filter.status}
                  onChange={handleFilterChange}
                  className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
                  className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />

                <input
                  type="date"
                  name="tillDate"
                  value={filter.tillDate}
                  onChange={handleFilterChange}
                  className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />

                <button
                  onClick={applyServerFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#262262] px-3 py-2 text-sm font-medium text-white hover:bg-[#161436]"
                  title="Apply filters"
                >
                  <IoIosSearch className="h-4 w-4" />
                  Search
                </button>
              </div>

            </>
          )}
        </div>

        {/* States */}
        {!loading && error && (
          <div className="rounded-xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200">{error}</div>
        )}

        {/* Table / Skeleton */}
        {loading ? (
          <TableSkeleton rows={8} cols={13} />
        ) : !error ? (
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
                    <th className="px-3 py-3">Booked Date</th>
                    <th className="px-3 py-3">Time</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Boxes</th>
                    <th className="px-3 py-3">Weight (kg)</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>

                <tbody className="cargo-all-lists divide-y divide-slate-100 text-sm text-slate-700">
                  {paged.length === 0 && (
                    <tr>
                      <td className="px-3 py-8 text-center text-slate-500" colSpan={13}>
                        No cargos found.
                      </td>
                    </tr>
                  )}

                  {paged.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
               

                      <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/cargo/view/${c.id}`}
                            aria-label="View"
                            title="View"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md
                               bg-sky-100 text-sky-700 ring-1 ring-sky-200
                               hover:bg-sky-200 hover:text-sky-800
                               focus:outline-none focus:ring-2 focus:ring-sky-400
                               transition"
                          >
                            <SlEye className="h-3 w-3" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleInvoice(c.id)}
                            aria-label="Invoice"
                            title="Invoice"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md
                               bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200
                               hover:bg-emerald-200
                               focus:outline-none focus:ring-2 focus:ring-emerald-400
                               transition disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <LiaFileInvoiceDollarSolid className="h-3 w-3" />
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">{c.booking_no}</td>
                      <td className="px-3 py-2 align-top">{c.branch_name || "—"}</td>
                      <td className="px-3 py-2 align-top">{c.sender_name || "—"}</td>
                      <td className="px-3 py-2 align-top">{c.receiver_name || "—"}</td>
                      <td className="px-3 py-2 align-top">{c.date || "—"}</td>
                      <td className="px-3 py-2 align-top tabular-nums">{c.time || "—"}</td>
                      <td className="px-3 py-2 align-top">{c.shipping_method || "—"}</td>
                      <td className="px-3 py-2 align-top">{c.payment_method || "—"}</td>
                      <td className="px-3 py-2 align-top tabular-nums">{getBoxCount(c)}</td>
                      <td className="px-3 py-2 align-top">{c.total_weight ?? "—"}</td>
                      <td className="px-3 py-2 align-top">
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap bg-violet-100 text-violet-800 ring-1 ring-violet-200">
                          {c.status?.name || c.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Footer: pagination */}
        {!loading && !error && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing{" "}
              <b>{total === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, total)}</b> of{" "}
              <b>{total}</b>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Rows:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-800 hover:bg-slate-50"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    page === 1 ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Prev
                </button>
                <span className="px-2 text-sm text-slate-700">
                  Page <b>{page}</b> / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
          </div>
        )}
      </div>
    </section>
  );
}
