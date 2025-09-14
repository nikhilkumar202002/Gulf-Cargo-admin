// src/pages/Port/PortView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getPorts } from "../../api/portApi";
import { Link, useLocation, useNavigate } from "react-router-dom";

function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

const Spinner = ({ className = "h-4 w-4 text-indigo-600" }) => (
  <svg className={classNames("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const PortTypeChip = ({ origin }) => (
  <span
    className={classNames(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
      origin ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
             : "bg-blue-50 text-blue-700 ring-blue-600/20"
    )}
  >
    <span className={classNames("mr-1 h-1.5 w-1.5 rounded-full", origin ? "bg-emerald-500" : "bg-blue-500")} />
    {origin ? "Origin" : "Destination"}
  </span>
);

// --- helpers ---------------------------------------------------------------
// Normalize many shapes into 1 (Origin) / 0 (Destination) / null (unknown)
const normalizeStatus = (val) => {
  if (val === true) return 1;
  if (val === false) return 0;
  const s = String(val ?? "").trim().toLowerCase();
  if (s === "1" || s === "origin") return 1;
  if (s === "0" || s === "destination") return 0;
  const n = Number(s);
  if (!Number.isNaN(n)) return n ? 1 : 0;
  return null;
};

// Look across common field names from the API row
const resolveRowOrigin = (row) => {
  const candidates = [row?.status, row?.type, row?.port_type, row?.is_origin, row?.isOrigin];
  for (const v of candidates) {
    const n = normalizeStatus(v);
    if (n === 1) return true;   // origin
    if (n === 0) return false;  // destination
  }
  return null; // unknown
};
// --------------------------------------------------------------------------

export default function PortView() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "1" (Origin) | "0" (Destination)

  const [toast, setToast] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchRows = async () => {
    setLoading(true);
    setMsg({ text: "", variant: "" });
    try {
      const params = {};
      if (statusFilter === "0" || statusFilter === "1") params.status = Number(statusFilter);
      const list = await getPorts(params, token);
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch ports", err?.response || err);
      setMsg({ text: err?.response?.data?.message || "Failed to load ports.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  // pick up toast from create page
  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r?.name ?? ""} ${r?.code ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const skeletonRows = Array.from({ length: 6 });

  return (
    <section className="mx-auto max-w-6xl p-4">
      {/* Toast */}
      {toast && (
        <div role="alert" className="fixed left-6 right-6 top-6 z-50 rounded-2xl bg-emerald-900/90 text-emerald-50 ring-1 ring-emerald-500/30 backdrop-blur-sm">
          <div className="flex items-start gap-4 p-4 sm:p-5">
            <div className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-emerald-950">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{toast.title || "Success"}</p>
              {toast.message ? <p className="mt-1 text-emerald-100/90">{toast.message}</p> : null}
              <div className="mt-3">
                <button type="button" onClick={() => setToast(null)} className="text-sm font-medium text-emerald-200 hover:text-white">
                  Dismiss
                </button>
              </div>
            </div>
            <button type="button" onClick={() => setToast(null)} className="rounded-md p-2 text-emerald-200 hover:bg-emerald-800/50 hover:text-white" aria-label="Close">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">Ports</h1>

          <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
            {/* Search */}
            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Search by name or code</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or code…"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </label>

            {/* Type filter */}
            <label className="relative">
              <span className="sr-only">Filter by type</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[11rem] appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                title="Filter by port type"
              >
                <option value="all">All Types</option>
                <option value="1">Origin</option>        {/* 1 = Origin */}
                <option value="0">Destination</option>   {/* 0 = Destination */}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
              </svg>
            </label>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchRows}
              disabled={loading}
              className={classNames(
                "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition",
                "hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/20",
                loading && "opacity-60"
              )}
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 text-white" /> Refreshing…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M12 4a8 8 0 017.446 5.032.75.75 0 01-1.392.536A6.5 6.5 0 105.5 12h1.75a.75.75 0 010 1.5H4.25A.75.75 0 013.5 12v-3a.75.75 0 011.5 0v1.26A8 8 0 0112 4zm6.75 6.5a.75.75 0 01.75.75v3a.75.75 0 01-.75.75H15a.75.75 0 010-1.5h1.76A6.5 6.5 0 1112 5.5a.75.75 0 010 1.5 5 5 0 105 5h1.75z" />
                  </svg>
                  Refresh
                </>
              )}
            </button>

            {/* Add New */}
            <Link
              to="/port/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M12 4.5a.75.75 0 01.75.75v6h6a.75.75 0 010 1.5h-6v6a.75.75 0 01-1.5 0v-6h-6a.75.75 0 010-1.5h6v-6A.75.75 0 0112 4.5z"/>
              </svg>
              Add New
            </Link>
          </div>
        </div>

        {/* Messages */}
        {msg.text ? (
          <div
            role="status"
            className={classNames(
              "m-4 rounded-xl border px-3 py-2 text-sm",
              msg.variant === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
            )}
          >
            {msg.text}
          </div>
        ) : null}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700">
              <tr className="border-b border-gray-200">
                <th className="w-16 px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="w-40 px-4 py-3 font-semibold">Code</th>
                <th className="w-40 px-4 py-3 font-semibold">Type</th>
                <th className="w-44 px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading
                ? [...Array(6)].map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      <td className="px-4 py-4"><div className="h-4 w-6 rounded bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-56 rounded bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-5 w-28 rounded-full bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-8 w-24 rounded bg-gray-200" /></td>
                    </tr>
                  ))
                : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">No ports found.</td>
                  </tr>
                ) : (
                  filtered.map((r, idx) => {
                    // If a filter is active, we *know* the type from the filter.
                    // Otherwise, resolve from the row (handles 1/0 or "origin"/"destination" or other fields).
                    const resolved = statusFilter === "all" ? resolveRowOrigin(r) : Number(statusFilter) === 1;
                    return (
                      <tr key={r?.id ?? idx} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/40 transition-colors">
                        <td className="px-4 py-4 text-gray-700">{idx + 1}</td>
                        <td className="px-4 py-4 text-gray-900">{r?.name ?? "-"}</td>
                        <td className="px-4 py-4 text-gray-700">{r?.code ?? "-"}</td>
                        <td className="px-4 py-4">
                          {resolved === null ? (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-300/60">
                              Unknown
                            </span>
                          ) : (
                            <PortTypeChip origin={resolved} />
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => alert(`Edit "${r?.name}" (id: ${r?.id})`)}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 hover:shadow focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.65-1.65a1.875 1.875 0 112.652 2.652l-11 11a4.5 4.5 0 01-1.897 1.13l-3.288.94a.375.375 0 01-.46-.46l.94-3.288a4.5 4.5 0 011.13-1.897l10.273-10.273z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
                              </svg>
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
