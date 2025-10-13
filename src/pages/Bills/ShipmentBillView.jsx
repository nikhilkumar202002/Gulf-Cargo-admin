import React, { useEffect, useMemo, useState } from "react";
import { getBillShipments } from "../../api/billShipmentApi";
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
  const [q, setQ] = useState("");
  const [statusId, setStatusId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [statuses, setStatuses] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  const openDetail = (row) => { setDetailRow(row); setDetailOpen(true); };
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
    const params = buildParams();
    console.log("[UI] refresh() params =>", params);
    try {
      const data = await getBillShipments(params);
      const list = unwrapArray(data);
      console.log("[UI] refresh() list =>", list);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <h2 className="text-2xl font-semibold text-gray-800">Shipments</h2>
      <div className="text-gray-500 mb-4">Physical shipments list</div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search number, AWB, port, method..."
          className="border rounded-lg px-3 py-2 flex-1 min-w-[220px]"
        />
        <select
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
          className="border rounded-lg px-3 py-2"
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
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border rounded-lg px-3 py-2"
        />
        <button onClick={resetFilters} className="px-3 py-2 rounded border">Reset</button>
        <button
          onClick={refresh}
          className="ml-auto px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-4 border">SL No</th>
              <th className="py-2 px-4 border">Shipment No</th>
              <th className="py-2 px-4 border">AWB / Container</th>
              <th className="py-2 px-4 border">Origin</th>
              <th className="py-2 px-4 border">Destination</th>
              <th className="py-2 px-4 border">Method</th>
              <th className="py-2 px-4 border">Items</th>
              <th className="py-2 px-4 border">Created On</th>
              <th className="py-2 px-4 border">Status</th>
              <th className="py-2 px-4 border">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-gray-500">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-gray-500">No shipments found.</td>
              </tr>
            )}
            {!loading && pageRows.map((r, idx) => {
              const id = Number(r.id);
              const sl = (page - 1) * pageSize + idx + 1;
              const statusName = r?.status?.name || r?.status || "";
              const itemsCount = Array.isArray(r?.custom_shipments) ? r.custom_shipments.length : 0;
              return (
                <tr key={id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{sl}</td>
                  <td className="py-2 px-4 border">{r.shipment_number || "—"}</td>
                  <td className="py-2 px-4 border">{r.awb_or_container_number || "—"}</td>
                  <td className="py-2 px-4 border">{r?.origin_port?.name || "—"}</td>
                  <td className="py-2 px-4 border">{r?.destination_port?.name || "—"}</td>
                  <td className="py-2 px-4 border">{r?.shipping_method?.name || "—"}</td>
                  <td className="py-2 px-4 border">{itemsCount}</td>
                  <td className="py-2 px-4 border">{fmtDateTime(r.created_at)}</td>
                  <td className="py-2 px-4 border">
                    <span className={`px-2 py-1 text-xs rounded-lg ${statusPill(statusName)}`}>
                      {statusName || "—"}
                    </span>
                  </td>
                  <td className="py-2 px-4 border">
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

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
        <div>
          Page {page} of {totalPages} · Rows: {rows.length}
          {err && <span className="text-rose-600 ml-3">{err}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* Details modal */}
      {detailOpen && detailRow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4
                          max-h-[85vh] flex flex-col overscroll-contain">
            {/* Header (sticky) */}
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Shipment #{detailRow.id}</h3>
              <button onClick={closeDetail} className="text-gray-600 hover:text-gray-900">✕</button>
            </div>

            {/* Scrollable body */}
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
