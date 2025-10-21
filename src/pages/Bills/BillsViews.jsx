// src/pages/PhysicalBills/BillsViews.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { getPhysicalBills, importCustomShipments } from "../../api/billApi";
import { Link } from "react-router-dom";
import { FiEye, FiSearch, FiUpload, FiFilter, FiInbox } from "react-icons/fi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";

function BillsViews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // holds a status NAME from the master list
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const pageSize = 10;

  /** ---------- small utils ---------- */
  const str = (v) => (v == null ? "" : String(v));
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const billNo = (r) =>
    str(r?.bill_no || r?.invoice_no || r?.booking_no || r?.ref_no || r?.ref).trim();

    const destination = (r) =>
    str(
      r?.destination ??
      r?.des ??               // ← backend sends "des": "Dubai"
      r?.dest ??
      r?.port_of_destination ??
      r?.to ??
      r?.Destination          // optional: handle accidental PascalCase
    ).trim();

  const method = (r) =>
    str(r?.shipment_method || r?.method || r?.mode || r?.shipping_method).trim();

  const pcs = (r) => num(r?.pcs ?? r?.pieces);
  const weight = (r) => num(r?.weight ?? r?.total_weight ?? r?.gross_weight);

  const statusText = (r) => str(r?.status || r?.current_status || r?.state).trim();

  const isoDate = (r) => r?.created_at || r?.date || r?.createdDate || r?.created_at_utc || null;

  const fmtDate = (v) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return str(v);
      // dd-MMM-YYYY, 24h time (local)
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return str(v);
    }
  };

  /** ---------- data fetch ---------- */
  const fetchBills = async () => {
    setLoading(true);
    try {
      // No is_shipment filter here -> full list view
      const data = await getPhysicalBills();
      const list = Array.isArray(data) ? data : [];
      setRows(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bills.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const [statusList, setStatusList] = useState([]);
  const statusMap = useMemo(() => {
    const m = new Map();
    for (const s of statusList) if (s?.id != null && s?.name) m.set(String(s.id), s.name);
    return m;
  }, [statusList]);

  const statusLabel = (r) => {
    const raw = str(r?.status).trim();
    if (raw && statusMap.has(raw)) return statusMap.get(raw);
    const direct = str(r?.status_name || r?.current_status || r?.state).trim();
    return direct || raw || "—";
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchBills();
    })();
    return () => {
      alive = false;
    };
  }, []);

useEffect(() => {
  let alive = true;
  (async () => {
    try {
      const list = await getActiveShipmentStatuses();
      if (!alive) return;
      setStatusList(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load statuses", e);
      setStatusList([]);
    }
  })();
  return () => { alive = false; };
}, []);

  /** ---------- import (Excel/CSV) ---------- */
  const onPickFile = () => fileInputRef.current?.click();

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-upload of same name
    if (!file) return;

    const validExt = [".xlsx", ".xls", ".csv"];
    const name = file.name.toLowerCase();
    if (!validExt.some((ext) => name.endsWith(ext))) {
      toast.error("Please upload an Excel file (.xlsx/.xls) or CSV.");
      return;
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File too large. Max 10 MB.");
      return;
    }

    try {
      setUploading(true);
      const tId = toast.loading("Importing…");
      const res = await importCustomShipments(file);
      const ok = res?.data?.success ?? true;
      const msg = res?.data?.message || "Import completed.";
      toast.dismiss(tId);
      if (ok) {
        toast.success(msg);
        await fetchBills();
      } else {
        toast.error(msg || "Import failed.");
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Import failed. Please check your file and try again.";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  /** ---------- client-side search & filter ---------- */
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const hitQ =
        !query ||
        billNo(r).toLowerCase().includes(query) ||
        destination(r).toLowerCase().includes(query) ||
        method(r).toLowerCase().includes(query);
      const label = statusLabel(r);
      const hitStatus = !status || label.toLowerCase() === status.toLowerCase();
      return hitQ && hitStatus;
    });
  }, [rows, q, status, statusMap]);

  const totalPages =
    filtered.length === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  /** ---------- UI ---------- */
  return (
   <section className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
  <Toaster position="top-right" />

  {/* Page header */}
  <header className="mb-6">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900">
          Bills
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">List of physical bills</p>
      </div>
      {/* Quick count (optional) */}
      <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1">
          Total:&nbsp;<span className="font-medium text-slate-700">{rows.length}</span>
        </span>
      </div>
    </div>
  </header>

  {/* Controls card */}
  <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: search + status */}
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search bill no, destination, method…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        {/* Status filter */}
        <div className="relative shrink-0">
          <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-56 appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-8 py-2 text-sm focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All Status</option>
            {statusList.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          {/* tiny caret */}
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
        </div>
      </div>

      {/* Right: Import */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFileSelected}
          className="hidden"
        />
        <button
          type="button"
          onClick={onPickFile}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
          title="Import from Excel"
        >
          <FiUpload className="h-4 w-4" />
          {uploading ? "Importing…" : "Import Excel"}
        </button>
      </div>
    </div>
  </div>

  {/* Table card */}
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="relative overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/75 text-slate-700">
          <tr className="border-b border-slate-200">
            <th className="px-4 py-3 font-semibold">SL No</th>
            <th className="px-4 py-3 font-semibold">Invoice / Bill No</th>
            <th className="px-4 py-3 font-semibold">Pcs</th>
            <th className="px-4 py-3 font-semibold">Weight (kg)</th>
            <th className="px-4 py-3 font-semibold">Shipment Method</th>
            <th className="px-4 py-3 font-semibold">Destination</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <tr key={`sk-${i}`} className="animate-pulse">
                {[...Array(9)].map((__, j) => (
                  <td key={`sk-${i}-${j}`} className="px-4 py-3">
                    <div className="h-3 w-full max-w-[160px] rounded bg-slate-200" />
                  </td>
                ))}
              </tr>
            ))
          ) : paged.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <FiInbox className="h-5 w-5" />
                  </div>
                  <div className="text-slate-700 font-medium">No bills found</div>
                  <p className="mt-1 text-sm text-slate-500">
                    Try adjusting your search or filters.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            paged.map((r, idx) => {
              const slno = (safePage - 1) * pageSize + idx + 1;
              const pcsVal = pcs(r);
              const wtVal = weight(r);
              const dVal = fmtDate(isoDate(r));
              const statusVal = statusLabel(r);

              // status chip color (very light heuristic)
              const statusColor =
                /delivered|booked|forwarded|arrived|cleared|out for delivery/i.test(statusVal)
                  ? "emerald"
                  : /enquiry|inquiry|pending|waiting/i.test(statusVal)
                  ? "amber"
                  : /cancel|hold|error|not delivered/i.test(statusVal)
                  ? "rose"
                  : "slate";

              return (
                <tr
                  key={r?.id ?? `${billNo(r)}-${isoDate(r) ?? slno}`}
                  className={idx % 2 ? "bg-slate-50/20" : "bg-white hover:bg-slate-50/60"}
                >
                  <td className="px-4 py-3 text-slate-600">{slno}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{billNo(r) || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{pcsVal ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{wtVal ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{method(r) || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{destination(r) || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{dVal || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium
                        ${
                          statusColor === "emerald"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : statusColor === "amber"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : statusColor === "rose"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          statusColor === "emerald"
                            ? "bg-emerald-600"
                            : statusColor === "amber"
                            ? "bg-amber-600"
                            : statusColor === "rose"
                            ? "bg-rose-600"
                            : "bg-slate-400"
                        }`}
                      />
                      {statusVal}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r?.id ? (
                      <Link
                        to={`/bill/view/${r.id}`}
                        state={{ row: r }}
                        title="View"
                        aria-label="View bill"
                        className="inline-flex items-center rounded-md bg-sky-50 p-2 text-sky-700 hover:bg-sky-100 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200 transition"
                      >
                        <FiEye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Link>
                    ) : billNo(r) ? (
                      <Link
                        to={`/bill/view/view?bill_no=${encodeURIComponent(billNo(r))}`}
                        state={{ row: r }}
                        title="View"
                        aria-label="View bill"
                        className="inline-flex items-center rounded-md bg-sky-50 p-2 text-sky-700 hover:bg-sky-100 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200 transition"
                      >
                        <FiEye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>

    {/* Footer / pagination */}
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-3 sm:flex-row sm:p-4">
      <div className="text-xs sm:text-sm text-slate-600">
        Page <span className="font-medium">{safePage}</span> of{" "}
        <span className="font-medium">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
        >
          Prev
        </button>
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  </div>
</section>

  );
}

export default BillsViews;
