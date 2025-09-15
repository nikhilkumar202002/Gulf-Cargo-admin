import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listShipments } from "../../api/shipmentsApi";

const cx = (...c) => c.filter(Boolean).join(" ");

const Spinner = ({ className = "h-5 w-5 text-indigo-600" }) => (
  <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

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

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function ShipmentReport() {
  // server data
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, last_page: 1, total: 0 });

  // ui state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters (sent to server; backend may ignore some — harmless)
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(""); // yyyy-mm-dd
  const [to, setTo] = useState("");     // yyyy-mm-dd

  // pagination (server-side)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { list, meta } = await listShipments({ page, perPage, query, status, from, to });
      setRows(Array.isArray(list) ? list : []);
      setMeta(
        meta || {
          current_page: page,
          per_page: perPage,
          last_page: 1,
          total: Array.isArray(list) ? list.length : 0,
        }
      );
    } catch (e) {
      setErr(e?.message || "Failed to load shipments");
      setRows([]);
      setMeta({ current_page: 1, per_page: perPage, last_page: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  // initial + when page/perPage change (server pagination)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  const onApply = (e) => {
    e?.preventDefault?.();
    setPage(1);
    load();
  };

  const onReset = () => {
    setQuery("");
    setStatus("all");
    setFrom("");
    setTo("");
    setPerPage(10);
    setPage(1);
    load();
  };

  const statusColor = (s = "") => {
    const v = s.toLowerCase();
    if (v.includes("hold")) return "amber";
    if (v.includes("deliver")) return "green";
    if (v.includes("cancel")) return "red";
    if (v.includes("book")) return "indigo";
    if (v.includes("wait")) return "amber";
    return "indigo";
  };

  const columns = useMemo(
    () => [
      { key: "id", label: "ID" },
      { key: "created_at", label: "Booking Date" },
      { key: "awb_number", label: "AWB No." },
      { key: "sender", label: "Sender" },
      { key: "receiver", label: "Receiver" },
      { key: "origin_port", label: "Origin" },
      { key: "destination_port", label: "Destination" },
      { key: "cargo", label: "Cargo Items" },
      { key: "total_weight", label: "Weight (kg)" },
      { key: "status", label: "Status" },
      { key: "view", label: "View" },
    ],
    []
  );

  // footer counts using server meta
  const showingFrom = rows.length ? (meta.current_page - 1) * meta.per_page + 1 : 0;
  const showingTo = rows.length ? showingFrom + rows.length - 1 : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Shipment Report</h1>
          <p className="mt-1 text-sm text-slate-600">View, filter, and navigate shipments.</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <form
          onSubmit={onApply}
          className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
        >
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sender, Receiver, AWB/Track code…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="Shipment booked">Shipment booked</option>
              <option value="Shipment received">Shipment received</option>
              <option value="Waiting for clearance">Waiting for clearance</option>
              <option value="In transit">In transit</option>
              <option value="Cleared">Cleared</option>
              <option value="Delivered">Delivered</option>
              <option value="On hold">On hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Rows</label>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {loading ? <Spinner className="h-4 w-4 text-white" /> : "Apply"}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </form>

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
                        c.key === "sender" || c.key === "receiver" ? "min-w-[12rem]" : ""
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      {columns.map((c) => (
                        <td key={c.key} className="px-4 py-3">
                          <div className="h-3 rounded bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading && err && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-rose-600">
                      {err}
                    </td>
                  </tr>
                )}

                {!loading && !err && rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                      No shipments found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !err &&
                  rows.map((r) => {
                    const cargoItems = Array.isArray(r.items) ? r.items.length : Number(r.total_pieces) || 0;
                    const weight = r.total_weight ?? r.weight ?? "—";
                    return (
                      <tr key={r.id ?? r.track_code}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{r.id ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          {formatDate(r.created_at ?? r.booking_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{r.awb_number ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{r.sender ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{r.receiver ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{r.origin_port ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{r.destination_port ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{cargoItems}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{weight}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge text={r.status ?? "—"} color={statusColor(r.status)} />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            to={`/shipments/shipmentsview/${r.id}`}
                            state={{ shipment: r }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination (server-side) */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-3 sm:flex-row">
            <div className="text-sm text-slate-600">
              Showing <span className="font-medium">{rows.length ? showingFrom : 0}</span> to{" "}
              <span className="font-medium">{rows.length ? showingTo : 0}</span> of{" "}
              <span className="font-medium">{meta.total ?? rows.length}</span> shipments
            </div>

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
          </div>
        </div>
      </main>
    </div>
  );
}
