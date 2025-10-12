// src/pages/PhysicalBills/BillsViews.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { getPhysicalBills, importCustomShipments } from "../../api/billApi";

function BillsViews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // optional status filter
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
      const hitStatus = !status || statusText(r).toLowerCase() === status.toLowerCase();
      return hitQ && hitStatus;
    });
  }, [rows, q, status]);

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
    <section className="max-w-6xl mx-auto px-4 py-8">
      <Toaster position="top-right" />

      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Bills</h2>
          <p className="text-sm text-slate-500">List of physical bills</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search bill no, destination, method…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-72 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {/* (Optional) Status filter dropdown—kept simple */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Status</option>
            <option value="ENQUIRY COLLECTED">ENQUIRY COLLECTED</option>
            <option value="SAME FILED">SAME FILED</option>
            <option value="SHIPMENT BOOKED">SHIPMENT BOOKED</option>
            {/* add more if your backend uses different statuses */}
          </select>

          {/* Import Excel */}
          <div className="flex items-center">
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
              title="Import from Excel"
            >
              {uploading ? "Importing…" : "Import Excel"}
            </button>
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">SL No</th>
              <th className="px-4 py-3">Invoice / Bill No</th>
              <th className="px-4 py-3">Pcs</th>
              <th className="px-4 py-3">Weight (kg)</th>
              <th className="px-4 py-3">Shipment Method</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={`sk-${i}`} className="animate-pulse">
                  {[...Array(8)].map((__, j) => (
                    <td key={`sk-${i}-${j}`} className="px-4 py-3">
                      <div className="h-3 w-full max-w-[160px] rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  No bills found.
                </td>
              </tr>
            ) : (
              paged.map((r, idx) => {
                const slno = (safePage - 1) * pageSize + idx + 1;
                const pcsVal = pcs(r);
                const wtVal = weight(r);
                const dVal = fmtDate(isoDate(r));
                const statusVal = statusText(r) || "—";

                // status chip color (very light heuristic)
                const statusColor =
                  /booked/i.test(statusVal)
                    ? "emerald"
                    : /enquiry|inquiry/i.test(statusVal)
                    ? "amber"
                    : /cancel|hold|error/i.test(statusVal)
                    ? "rose"
                    : "slate";

                return (
                  <tr key={r?.id ?? `${billNo(r)}-${isoDate(r) ?? slno}`} className="border-t border-slate-100 hover:bg-slate-50/40">
                    <td className="px-4 py-3 text-slate-700">{slno}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{billNo(r) || "—"}</td>
                    <td className="px-4 py-3">{pcsVal ?? "—"}</td>
                    <td className="px-4 py-3">{wtVal ?? "—"}</td>
                    <td className="px-4 py-3">{method(r) || "—"}</td>
                    <td className="px-4 py-3">{destination(r) || "—"}</td>
                    <td className="px-4 py-3">{dVal || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium
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
                        {statusVal}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <div>
          Page <span className="font-medium">{safePage}</span> of{" "}
          <span className="font-medium">{totalPages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            Prev
          </button>
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

export default BillsViews;
