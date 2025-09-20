// src/pages/ShipmentReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listCargoShipments } from "../../api/shipmentCargo";

const cx = (...c) => c.filter(Boolean).join(" ");
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

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const load = async (overrides = {}) => {
    setLoading(true);
    setErr("");
    try {
      const p = overrides.page ?? page;
      const pp = overrides.perPage ?? perPage;

      const resp = await listCargoShipments({ page: p, per_page: pp });
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

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
    { key: "id", label: "ID" },
    { key: "created_on", label: "Shipment Date" },
    { key: "awb_or_container_number", label: "AWB / Container" },
    { key: "origin_port", label: "Origin" },
    { key: "destination_port", label: "Destination" },
    { key: "branch", label: "Branch" },
    { key: "created_by", label: "Created By" },
    { key: "no_of_cargos", label: "No. of Cargos" }, // <<--- only the count
    { key: "status", label: "Status" },
    { key: "view", label: "View" },
  ];

  const showingFrom = filtered.length ? (meta.current_page - 1) * meta.per_page + 1 : 0;
  const showingTo = filtered.length ? showingFrom + filtered.length - 1 : 0;

  return (
    <div className="min-h-screen">
      <header>
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Shipment Report</h1>
          <p className="mt-1 text-sm text-slate-600">All shipments fetched from the API.</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl py-6">
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search AWB, ports, branch, user, status…"
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
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => load({ page: 1 })}
              className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {loading ? <Spinner className="h-4 w-4 text-white" /> : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPerPage(10);
                setPage(1);
                load({ page: 1, perPage: 10 });
              }}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
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

                {!loading && !err && filtered.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                      No shipments found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !err &&
                  filtered.map((r) => {
                    // <<< ONLY COUNT OF CARGOS >>>
                    const noOfCargos = Array.isArray(r.cargos)
                      ? r.cargos.length
                      : Number(r.no_of_cargos || r.total_cargos || r.cargo_count || 0);

                    const statusText = r.shipment_status || r.status || "";
                    return (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                          {r.id ?? "—"}
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
                        <td className="px-4 py-3 text-sm">
                          <Link
                            to={`/shipments/shipmentsview/${r.id}`}
                            state={{ shipment: r }}
                            className="inline-flex items-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            title="View"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-3 sm:flex-row">
            <div className="text-sm text-slate-600">
              Showing <span className="font-medium">{filtered.length ? showingFrom : 0}</span> to{" "}
              <span className="font-medium">{filtered.length ? showingTo : 0}</span> of{" "}
              <span className="font-medium">{meta.total ?? filtered.length}</span> shipments
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
