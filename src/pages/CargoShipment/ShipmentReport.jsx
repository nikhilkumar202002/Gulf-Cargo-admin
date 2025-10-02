// src/pages/ShipmentReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listCargoShipments, updateCargoShipmentStatus, bulkUpdateCargoShipmentStatus } from "../../api/shipmentCargo";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi"; // <- load status options
import { IoMdEye } from "react-icons/io";
const cx = (...c) => c.filter(Boolean).join(" ");

/* ---------------- Skeleton helpers (lightweight) ---------------- */
const Skel = ({ w = "100%", h = 14, rounded = 8, className = "" }) => (
  <span
    className={cx("inline-block bg-slate-200 animate-pulse", className)}
    style={{
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: rounded,
    }}
    aria-hidden="true"
  />
);
const SkelInput = () => <Skel w="100%" h={36} rounded={10} />;
const SkelBtn = ({ wide = false }) => <Skel w={wide ? 120 : 90} h={36} rounded={10} />;

const Spinner = ({ className = "h-5 w-5 text-indigo-600" }) => (
  <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const Badge = ({ text = "", color = "indigo" }) => (
  <span
    className={cx(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      {
        indigo: "bg-indigo-100 text-indigo-700",
        green: "bg-emerald-100 text-emerald-700",
        amber: "bg-amber-100 text-amber-800",
        red: "bg-rose-100 text-rose-700",
        slate: "bg-slate-100 text-slate-700",
      }[color] || "bg-slate-100 text-slate-700"
    )}
  >
    {text || "—"}
  </span>
);

const statusColor = (s = "") => {
  const v = s.toLowerCase();
  if (v.includes("hold") || v.includes("wait")) return "amber";
  if (v.includes("deliver") || v.includes("cleared") || v.includes("forward")) return "green";
  if (v.includes("cancel")) return "red";
  return "indigo";
};

// Unwrap server response into (list, meta)
function unwrapShipments(resp, fallbackPage = 1, fallbackSize = 10) {
  const list =
    (Array.isArray(resp?.data?.data) && resp.data.data) ||
    (Array.isArray(resp?.data) && resp.data) ||
    (Array.isArray(resp?.list) && resp.list) ||
    (Array.isArray(resp?.items) && resp.items) ||
    (Array.isArray(resp) && resp) ||
    [];
  const meta =
    resp?.meta ||
    resp?.data?.meta || {
      current_page: fallbackPage,
      per_page: fallbackSize,
      last_page: 1,
      total: list.length,
    };
  return { list, meta };
}

export default function ShipmentReport() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, last_page: 1, total: 0 });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState(""); // yyyy-mm-dd
  const [statusId, setStatusId] = useState(""); // filter: id

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // status options
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusErr, setStatusErr] = useState("");

  // selection for bulk
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // per-row draft status
  const [rowStatusDraft, setRowStatusDraft] = useState({}); // { [id]: statusId }
  const [rowBusyId, setRowBusyId] = useState(null);

  const loadStatuses = async () => {
    setStatusLoading(true);
    setStatusErr("");
    try {
      const list = await getActiveShipmentStatuses();
      const normalized = (list || []).map((s) => ({
        id: s.id ?? s.value ?? s._id ?? s.code ?? String(s.name || "Unknown"),
        name: s.name ?? s.label ?? s.title ?? String(s.code || s.id || "Status"),
      }));
      setStatusOptions(normalized);
    } catch (e) {
      setStatusErr(e?.message || "Failed to load statuses");
      setStatusOptions([]);
    } finally {
      setStatusLoading(false);
    }
  };

  const load = async (overrides = {}) => {
    setLoading(true);
    setErr("");
    try {
      const p = overrides.page ?? page;
      const pp = overrides.perPage ?? perPage;

      const params = {
        page: p,
        per_page: pp,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        status_id: statusId || undefined,
      };

      const resp = await listCargoShipments(params);
      const { list, meta: m } = unwrapShipments(resp, p, pp);
      setRows(list);
      setMeta(m);
    } catch (e) {
      setErr(e?.message || "Failed to load shipments");
      setRows([]);
      setMeta({ current_page: 1, per_page: perPage, last_page: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  // initial loads
  useEffect(() => {
    loadStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload on page/perPage
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  // reload when filters change (and reset to page 1)
  useEffect(() => {
    setPage(1);
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, statusId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => {
      const hay = [
        r.id,
        r.shipment_number,
        r.awb_or_container_number,
        r.track_code,
        r.sender,
        r.receiver,
        r.origin_port,
        r.destination_port,
        r.shipment_status,
        r.created_on,
        r.branch,
        r.created_by,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const columns = [
    { key: "select", label: "" },
     // selection checkbox
    { key: "id", label: "ID" },
    { key: "actions", label: "Actions" },

    { key: "created_on", label: "Shipment Date" },
    { key: "awb_or_container_number", label: "AWB / Container" },
    { key: "origin_port", label: "Origin" },
    { key: "destination_port", label: "Destination" },
    { key: "branch", label: "Branch" },
    { key: "created_by", label: "Created By" },
    { key: "no_of_cargos", label: "No. of Cargos" },
    { key: "status", label: "Status" },
  ];

  const showingFrom = filtered.length ? (meta.current_page - 1) * meta.per_page + 1 : 0;
  const showingTo = filtered.length ? showingFrom + filtered.length - 1 : 0;

  const toggleSelected = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllThisPage = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      });
      return next;
    });
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatusId) {
      alert("Choose a status to update to.");
      return;
    }
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      alert("Select at least one shipment.");
      return;
    }
    try {
      setBulkBusy(true);
      await bulkUpdateCargoShipmentStatus({
        shipment_status_id: Number(bulkStatusId),
        shipment_ids: ids,
      });
      // refresh and clear selection
      await load();
      setSelectedIds(new Set());
      setBulkStatusId("");
    } catch (e) {
      console.error("Bulk update failed:", e);
      alert(e?.message || "Bulk update failed");
    } finally {
      setBulkBusy(false);
    }
  };

 

  return (
    <div className="min-h-screen mx-auto max-w-6xl">
      {/* Header */}
      <header className="flex justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {loading ? <Skel w={200} h={24} /> : "Shipment Report"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {loading ? <Skel w={260} h={14} /> : "All shipments fetched from the API."}
          </p>
        </div>
        <div className="flex items-end">
            {loading ? (
              <SkelBtn wide />
            ) : (
              <Link
                to="/shipment/createshipment"
                className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                + Add Shipment
              </Link>
            )}
          </div>
      </header>

      <main className="mx-auto max-w-6xl py-6">
 
        <div className="mb-4 grid grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4 lg:grid-cols-4">

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
            {loading ? (
              <SkelInput />
            ) : (
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search AWB, ports, branch, user, status…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
            {loading ? (
              <SkelInput />
            ) : (
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
            {loading ? (
              <SkelInput />
            ) : (
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || undefined}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Filter: Status</label>
            {loading || statusLoading ? (
              <SkelInput />
            ) : (
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                {statusOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            {!loading && statusErr && <p className="mt-1 text-xs text-rose-600">{statusErr}</p>}
          </div>

           <div className="flex items-center gap-2">
                <select
                  value={bulkStatusId}
                  onChange={(e) => setBulkStatusId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading || statusLoading}
                  title="Choose status to apply to selected rows"
                >
                  <option value="">Bulk: set status…</option>
                  {statusOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkUpdate}
                  disabled={bulkBusy || !bulkStatusId || selectedIds.size === 0}
                  className={cx(
                    "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium",
                    bulkBusy || !bulkStatusId || selectedIds.size === 0
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {bulkBusy ? <Spinner className="h-4 w-4" /> : "Update Selected"}
                </button>
              </div>
         
        </div>


        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cx(
                        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600",
                        c.key === "select" && "w-10"
                      )}
                    >
                      {c.key === "select" ? (
                        <input
                          type="checkbox"
                          aria-label="Select all on this page"
                          onChange={(e) => toggleSelectAllThisPage(e.target.checked)}
                          checked={
                            filtered.length > 0 &&
                            filtered.every((r) => selectedIds.has(r.id))
                          }
                        />
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Skeleton rows */}
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      {columns.map((c, j) => (
                        <td key={`${c.key}-${j}`} className="px-4 py-3">
                          <Skel w={j === 1 ? 30 : "80%"} h={14} />
                        </td>
                      ))}
                    </tr>
                  ))}

                {/* Error */}
                {!loading && err && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-rose-600">
                      {err}
                    </td>
                  </tr>
                )}

                {/* Empty */}
                {!loading && !err && filtered.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                      No shipments found.
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!loading &&
                  !err &&
                  filtered.map((r) => {
                    const noOfCargos = Array.isArray(r.cargos)
                      ? r.cargos.length
                      : Number(r.no_of_cargos || r.total_cargos || r.cargo_count || 0);

                    const statusText = r.shipment_status || r.status || "";
                    return (
                      <tr key={r.id}>
                        {/* select */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={(e) => toggleSelected(r.id, e.target.checked)}
                            aria-label={`Select shipment ${r.id}`}
                          />
                        </td>
                  
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                          {r.id ?? "—"}
                        </td>
                              <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                      
                            <Link
                              to={`/shipments/shipmentsview/${r.id}`}
                              state={{ shipment: r }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md
                               bg-sky-100 text-sky-700 ring-1 ring-sky-200
                               hover:bg-sky-200 hover:text-sky-800
                               focus:outline-none focus:ring-2 focus:ring-sky-400
                               transition"
                              title="View"
                            >
                              <IoMdEye/>
                            </Link>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          {formatDate(r.created_on ?? r.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {r.awb_or_container_number ?? r.awb_number ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{r.origin_port ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{r.destination_port ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{r.branch ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{r.created_by ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-800">{noOfCargos}</td>

                        <td className="px-4 py-3 text-sm">
                          <Badge text={statusText || "—"} color={statusColor(statusText)} />
                        </td>

                        {/* Actions: per-row quick update + view */}
                        
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination + Bulk update controls */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-3 sm:flex-row">
            <div className="text-sm text-slate-600">
              {loading ? (
                <Skel w={220} h={16} />
              ) : (
                <>
                  Showing <span className="font-medium">{filtered.length ? showingFrom : 0}</span> to{" "}
                  <span className="font-medium">{filtered.length ? showingTo : 0}</span> of{" "}
                  <span className="font-medium">{meta.total ?? filtered.length}</span> shipments
                </>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              {/* Rows / page selector sits near pagination */}
              {loading ? (
                <Skel w={140} h={28} rounded={6} />
              ) : (
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
              )}

              {/* Bulk updater */}
             

              {/* Pager */}
              {loading ? (
                <>
                  <SkelBtn />
                  <Skel w={120} h={28} rounded={6} />
                  <SkelBtn />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={loading || meta.current_page <= 1}
                    className={cx(
                      "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium",
                      meta.current_page <= 1 || loading
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-700">
                    Page <span className="font-semibold">{meta.current_page}</span> of{" "}
                    <span className="font-semibold">{meta.last_page}</span>
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                    disabled={loading || meta.current_page >= meta.last_page}
                    className={cx(
                      "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium",
                      meta.current_page >= meta.last_page || loading
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
