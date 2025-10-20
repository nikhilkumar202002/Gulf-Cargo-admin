import React, { useEffect, useMemo, useState } from "react";
import { getBillShipments, updateBillShipmentStatuses, updateSingleBillShipmentStatus } from "../../api/billShipmentApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";

const unwrapArray = (o) =>
  Array.isArray(o) ? o :
  Array.isArray(o?.data?.data) ? o.data.data :
  Array.isArray(o?.data) ? o.data :
  Array.isArray(o?.items) ? o.items :
  Array.isArray(o?.results) ? o.results : [];

const statusPill = (s) => {
  const v = String(s || "").toLowerCase();
  if (!v || v === "pending") return "bg-amber-100 text-amber-800";
  if (v.includes("received") || v.includes("delivered")) return "bg-emerald-100 text-emerald-800";
  if (v.includes("cancel")) return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-800";
};

const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
};

export default function ShipmentBillView() {
  // Filters
  const [q, setQ] = useState("");
  const [statusId, setStatusId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Status master
  const [statuses, setStatuses] = useState([]);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [newStatusId, setNewStatusId] = useState(""); // for single update
  const [savingSingle, setSavingSingle] = useState(false);

  // Bulk selection + update
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);

  const openDetail = (row) => {
    setDetailRow(row);
    // initialize single-update select with current status id if available
    const currentStatusId =
      Number(row?.status?.id) ||
      Number(row?.status_id) ||
      Number(row?.shipment_status_id) || "";
    setNewStatusId(currentStatusId ? String(currentStatusId) : "");
    setDetailOpen(true);
  };
  const closeDetail = () => { setDetailOpen(false); setDetailRow(null); };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSelectedIds(new Set()); // clear selection on refresh
    const params = buildParams();
    try {
      const data = await getBillShipments(params);
      const list = unwrapArray(data);
      setRows(list);
      setPage(1);
    } catch (e) {
      const status = e?.response?.status ?? e?.status;
      const data = e?.response?.data ?? e?.data;
      console.error("[UI] refresh() error", { message: e?.message, status, data });
      setRows([]);
      setErr(e?.message || "Failed to load shipments.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setQ(""); setStatusId(""); setDateFrom(""); setDateTo(""); setPage(1);
    refresh();
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  // ---- Selection helpers
  const toggleRow = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(Number(id));
      else next.delete(Number(id));
      return next;
    });
  };
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(Number(r.id)));
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

  // ---- Single update (modal)
  const handleUpdateStatus = async () => {
    if (!detailRow?.id || !newStatusId) return;
    setSavingSingle(true);
    setErr("");
    try {
      await updateSingleBillShipmentStatus(detailRow.id, Number(newStatusId));

      const picked = statuses.find((s) => String(s.id) === String(newStatusId));
      const updatedStatusObj = picked
        ? { id: picked.id, name: picked.name }
        : { id: Number(newStatusId), name: String(newStatusId) };

      setDetailRow((prev) => ({ ...prev, status: updatedStatusObj }));
      setRows((prev) =>
        prev.map((r) =>
          Number(r.id) === Number(detailRow.id) ? { ...r, status: updatedStatusObj } : r
        )
      );
    } catch (e) {
      const status = e?.response?.status ?? e?.status;
      const data = e?.response?.data ?? e?.data;
      console.error("[UI] update status error", { status, data, message: e?.message });
      setErr(e?.message || "Failed to update status.");
    } finally {
      setSavingSingle(false);
    }
  };

  // ---- Bulk update (toolbar)
  const handleBulkUpdate = async () => {
    if (!bulkStatusId || selectedIds.size === 0) return;
    setSavingBulk(true);
    setErr("");

    const ids = [...selectedIds].map(Number);
    const newStatusIdNum = Number(bulkStatusId);
    const picked = statuses.find((s) => Number(s.id) === newStatusIdNum);
    const updatedStatusObj = picked
      ? { id: picked.id, name: picked.name }
      : { id: newStatusIdNum, name: String(newStatusIdNum) };

    try {
      await updateBillShipmentStatuses(ids, newStatusIdNum);

      // Optimistic UI
      setRows((prev) =>
        prev.map((r) => (ids.includes(Number(r.id)) ? { ...r, status: updatedStatusObj } : r))
      );
      setSelectedIds(new Set());
    } catch (e) {
      const status = e?.response?.status ?? e?.status;
      const data = e?.response?.data ?? e?.data;
      console.error("[UI] bulk update error", { status, data, message: e?.message });
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
              <option key={s.id} value={String(s.id)}>{s.name}</option>
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
          <button onClick={resetFilters} className="px-3 py-2 rounded-lg border hover:bg-gray-50">
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
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </select>

          <button
            onClick={handleBulkUpdate}
            disabled={!bulkStatusId || selectedIds.size === 0 || savingBulk}
            className="ml-auto px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {savingBulk ? "Updating…" : `Update ${selectedIds.size || ""} Shipment(s)`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
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
                  <th className="py-2 px-3 border">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-gray-500">
                      No shipments found for the selected filters.
                    </td>
                  </tr>
                )}

                {!loading && pageRows.map((r, idx) => {
                  const id = Number(r.id);
                  const sl = (page - 1) * pageSize + idx + 1;
                  const statusName = r?.status?.name || r?.status || "";
                  const itemsCount = Array.isArray(r?.custom_shipments) ? r.custom_shipments.length : 0;
                  const checked = selectedIds.has(id);

                  return (
                    <tr key={id} className={`hover:bg-gray-50 ${idx % 2 ? "bg-white" : "bg-gray-50/40"}`}>
                      <td className="py-2 px-3 border">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleRow(id, e.target.checked)}
                        />
                      </td>
                      <td className="py-2 px-3 border">{sl}</td>
                      <td className="py-2 px-3 border font-medium">{r.shipment_number || "—"}</td>
                      <td className="py-2 px-3 border">{r.awb_or_container_number || "—"}</td>
                      <td className="py-2 px-3 border">{r?.origin_port?.name || "—"}</td>
                      <td className="py-2 px-3 border">{r?.destination_port?.name || "—"}</td>
                      <td className="py-2 px-3 border">{r?.shipping_method?.name || "—"}</td>
                      <td className="py-2 px-3 border">{itemsCount}</td>
                      <td className="py-2 px-3 border whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                      <td className="py-2 px-3 border">
                        <span className={`px-2 py-1 text-[11px] rounded-lg ${statusPill(statusName)}`}>
                          {statusName || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 border">
                        <button className="text-indigo-600 hover:underline" onClick={() => openDetail(r)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
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

      {/* Details modal */}
      {detailOpen && detailRow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4
                          max-h-[85vh] flex flex-col overscroll-contain">
            {/* Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Shipment #{detailRow.id}</h3>
              <button onClick={closeDetail} className="text-gray-600 hover:text-gray-900">✕</button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Shipment No:</span> <b>{detailRow.shipment_number || "—"}</b></div>
                <div><span className="text-gray-500">AWB / Container:</span> <b>{detailRow.awb_or_container_number || "—"}</b></div>
                <div><span className="text-gray-500">Origin:</span> <b>{detailRow?.origin_port?.name || "—"}</b></div>
                <div><span className="text-gray-500">Destination:</span> <b>{detailRow?.destination_port?.name || "—"}</b></div>
                <div><span className="text-gray-500">Method:</span> <b>{detailRow?.shipping_method?.name || "—"}</b></div>
                <div><span className="text-gray-500">Created On:</span> <b>{fmtDateTime(detailRow.created_at)}</b></div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Status:</span>{" "}
                  <span className={`px-2 py-1 text-xs rounded-lg ${statusPill(detailRow?.status?.name || detailRow?.status)}`}>
                    {detailRow?.status?.name || detailRow?.status || "—"}
                  </span>
                </div>
              </div>

              {/* Single update controls */}
              <div className="mt-2 grid sm:grid-cols-2 gap-3 items-end">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1">Update Status</label>
                  <select
                    value={newStatusId}
                    onChange={(e) => setNewStatusId(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                  >
                    <option value="">Select status…</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    onClick={handleUpdateStatus}
                    disabled={!newStatusId || savingSingle}
                    className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {savingSingle ? "Updating…" : "Update Status"}
                  </button>
                </div>
              </div>

              {/* Items table */}
              <div>
                <div className="font-medium mb-2">
                  Items ({Array.isArray(detailRow.custom_shipments) ? detailRow.custom_shipments.length : 0})
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="min-w-full table-auto text-sm">
                      <thead className="bg-gray-100 text-gray-700 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 border">SL No</th>
                          <th className="py-2 px-3 border">Invoice / Bill No</th>
                          <th className="py-2 px-3 border">Pcs</th>
                          <th className="py-2 px-3 border">Weight (kg)</th>
                          <th className="py-2 px-3 border">Shipment Method</th>
                          <th className="py-2 px-3 border">Destination</th>
                          <th className="py-2 px-3 border">Status</th>
                          <th className="py-2 px-3 border">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailRow.custom_shipments || []).map((c, i) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="py-2 px-3 border">{i + 1}</td>
                            <td className="py-2 px-3 border">{c.invoice_no}</td>
                            <td className="py-2 px-3 border">{c.pcs}</td>
                            <td className="py-2 px-3 border">{Number(c.weight)}</td>
                            <td className="py-2 px-3 border">{c.shipment_method}</td>
                            <td className="py-2 px-3 border">{c.des}</td>
                            <td className="py-2 px-3 border">
                              <span className={`px-2 py-1 text-xs rounded-lg ${statusPill(c.status)}`}>{c.status}</span>
                            </td>
                            <td className="py-2 px-3 border">{fmtDateTime(c.created_at)}</td>
                          </tr>
                        ))}
                        {(!detailRow.custom_shipments || detailRow.custom_shipments.length === 0) && (
                          <tr><td colSpan={8} className="py-4 text-center text-gray-500">No items.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div> 
          </div>
        </div>
      )}
    </div>
  );
}
