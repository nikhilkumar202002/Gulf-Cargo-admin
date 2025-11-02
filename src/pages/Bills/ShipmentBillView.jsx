import React, { useEffect, useMemo, useState } from "react";
import {
  getBillShipments,
  updateBillShipmentStatuses,
} from "../../api/billShipmentApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

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

const statusPill = (s) => {
  const v = String(s || "").toLowerCase();
  if (!v || v === "pending") return "bg-amber-100 text-amber-800";
  if (v.includes("received") || v.includes("delivered"))
    return "bg-emerald-100 text-emerald-800";
  if (v.includes("cancel")) return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-800";
};

const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ShipmentBillView() {
  const [q, setQ] = useState("");
  const [statusId, setStatusId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const navigate = useNavigate();

  const [statuses, setStatuses] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getActiveShipmentStatuses();
        setStatuses(unwrapArray(res));
      } catch (e) {
        console.warn("[UI] statuses load error", e?.message);
      }
    })();
    refresh();
  }, []);

  const buildParams = () => {
    const p = {};
    if (q.trim()) p.search = q.trim();
    if (statusId) p.shipment_status_id = statusId;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    return p;
  };

  const refresh = async () => {
    setLoading(true);
    setErr("");
    setSelectedIds(new Set());
    const params = buildParams();
    try {
      const data = await getBillShipments(params);
      const list = unwrapArray(data);
      setRows(list);
      setPage(1);
    } catch (e) {
      setErr(e?.message || "Failed to load shipments.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setQ("");
    setStatusId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    refresh();
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  const toggleRow = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(Number(id));
      else next.delete(Number(id));
      return next;
    });
  };

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selectedIds.has(Number(r.id)));

  const toggleSelectAllPage = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => {
        const id = Number(r.id);
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatusId || selectedIds.size === 0) return;
    setSavingBulk(true);
    setErr("");
    const ids = [...selectedIds].map(Number);
    try {
      await updateBillShipmentStatuses(ids, Number(bulkStatusId));
      refresh();
    } catch (e) {
      setErr(e?.message || "Failed to update status.");
    } finally {
      setSavingBulk(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Shipments</h2>
          <div className="text-gray-500">Physical shipments list</div>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-white p-3 md:p-4 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search number, AWB, port, method…"
            className="border rounded-lg px-3 py-2 flex-1 min-w-[220px] focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none"
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
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <button
            onClick={resetFilters}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={refresh}
            className="px-3 py-2 rounded-lg border bg-gray-900 text-white hover:bg-black"
          >
            Apply
          </button>
        </div>

        {/* Bulk actions toolbar */}
        <div className="mt-3 border-t pt-3 flex flex-wrap items-center gap-3">
          <div className="text-sm text-gray-600">
            Selected: <b>{selectedIds.size}</b>
          </div>
          <select
            value={bulkStatusId}
            onChange={(e) => setBulkStatusId(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-200 outline-none"
          >
            <option value="">Set status…</option>
            {statuses.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleBulkUpdate}
            disabled={!bulkStatusId || selectedIds.size === 0 || savingBulk}
            className="ml-auto px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {savingBulk ? "Updating…" : `Update ${selectedIds.size || ""}`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <div className="px-3 py-2 rounded-md border bg-white shadow-sm text-gray-600 text-sm">
                Loading…
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr className="text-left text-gray-700">
                  <th className="py-2 px-3 border">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={(e) => toggleSelectAllPage(e.target.checked)}
                    />
                  </th>
                  <th className="py-2 px-3 border">SL No</th>
                  <th className="py-2 px-3 border">Shipment No</th>
                  <th className="py-2 px-3 border">AWB / Container</th>
                  <th className="py-2 px-3 border">Origin</th>
                  <th className="py-2 px-3 border">Destination</th>
                  <th className="py-2 px-3 border">Method</th>
                  <th className="py-2 px-3 border">Items</th>
                  <th className="py-2 px-3 border">Created On</th>
                  <th className="py-2 px-3 border">Status</th>
                  <th className="py-2 px-3 border text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {!loading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-10 text-center text-gray-500"
                    >
                      No shipments found for the selected filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  pageRows.map((r, idx) => {
                    const id = Number(r.id);
                    const sl = (page - 1) * pageSize + idx + 1;
                    const statusName = r?.status?.name || r?.status || "";
                    const itemsCount = Array.isArray(r?.custom_shipments)
                      ? r.custom_shipments.length
                      : 0;
                    const checked = selectedIds.has(id);

                    return (
                      <tr
                        key={id}
                        className={`hover:bg-gray-50 ${
                          idx % 2 ? "bg-white" : "bg-gray-50/40"
                        }`}
                      >
                        <td className="py-2 px-3 border">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleRow(id, e.target.checked)}
                          />
                        </td>
                        <td className="py-2 px-3 border">{sl}</td>
                        <td className="py-2 px-3 border font-medium">
                          {r.shipment_number || "—"}
                        </td>
                        <td className="py-2 px-3 border">
                          {r.awb_or_container_number || "—"}
                        </td>
                        <td className="py-2 px-3 border">
                          {r?.origin_port?.name || "—"}
                        </td>
                        <td className="py-2 px-3 border">
                          {r?.destination_port?.name || "—"}
                        </td>
                        <td className="py-2 px-3 border">
                          {r?.shipping_method?.name || "—"}
                        </td>
                        <td className="py-2 px-3 border">{itemsCount}</td>
                        <td className="py-2 px-3 border whitespace-nowrap">
                          {fmtDateTime(r.created_at)}
                        </td>
                        <td className="py-2 px-3 border">
                          <span
                            className={`px-2 py-1 text-[11px] rounded-lg ${statusPill(
                              statusName
                            )}`}
                          >
                            {statusName || "—"}
                          </span>
                        </td>
                        <td className="py-2 px-3 border text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              title="View"
                              onClick={() =>
                                navigate(`/billshipment/${r.id}`)
                              }
                              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                            >
                              <FaEye className="w-3.5 h-3.5" />
                            </button>
                            <button
                                title="Edit"
                                onClick={() => navigate(`/billshipment/${r.id}/edit`)}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                              >
                                <FaEdit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Delete"
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                            >
                              <FaTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-3 py-3 text-sm text-gray-600 border-t bg-gray-50">
            <div>
              Page {page} of {totalPages} · Rows: {rows.length}
              {err && <span className="text-rose-600 ml-3">{err}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <button
                className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
