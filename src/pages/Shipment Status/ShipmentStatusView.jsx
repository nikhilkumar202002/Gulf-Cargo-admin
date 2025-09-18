import React, { useEffect, useState } from "react";
import { getShipmentStatuses } from "../../api/shipmentStatusApi"; // Keep the data fetching function
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

const StatusBadge = ({ active }) => (
  <span
    className={classNames(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
      active
        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
        : "bg-gray-100 text-gray-700 ring-gray-400/20"
    )}
  >
    <span className={classNames("mr-1 h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-gray-400")} />
    {active ? "Active" : "Inactive"}
  </span>
);

// Define isActiveFrom function here
const isActiveFrom = (val) => {
  if (val === true) return true;
  if (val === false) return false;
  const s = String(val ?? "").trim().toLowerCase();
  if (s === "1" || s === "active") return true;
  if (s === "0" || s === "inactive") return false;
  const n = Number(s);
  if (!Number.isNaN(n)) return !!n;
  return false; // default
};

// fetchRows function now accepts state setters as arguments
const fetchRows = async (setLoading, setRows, setMsg) => {
  setLoading(true);
  setMsg({ text: "", variant: "" });
  try {
    const list = await getShipmentStatuses(); // Make sure this is a valid API request
    console.log("API Response: ", list); // Log the API response for debugging
    setRows(Array.isArray(list) ? list : []);
  } catch (err) {
    console.error("Failed to fetch shipment statuses", err?.response || err);
    setMsg({
      text: err?.response?.data?.message || "Failed to load shipment statuses.",
      variant: "error",
    });
  } finally {
    setLoading(false);
  }
};

export default function ShipmentStatusView() {
  const [rows, setRows] = useState([]); // Ensure initial state is an empty array
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [toast, setToast] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRows(setLoading, setRows, setMsg); // Pass state setters to the fetch function
  }, []);

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

  const skeletonRows = Array.from({ length: 6 });

  return (
    <section className="mx-auto max-w-6xl p-4">
      {/* Toast */}
      {toast && (
        <div
          role="alert"
          className="fixed left-6 right-6 top-6 z-50 rounded-2xl bg-emerald-900/90 text-emerald-50 ring-1 ring-emerald-500/30 backdrop-blur-sm"
        >
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
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="text-sm font-medium text-emerald-200 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-md p-2 text-emerald-200 hover:bg-emerald-800/50 hover:text-white"
              aria-label="Close"
            >
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
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">Shipment Statuses</h1>

          <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchRows(setLoading, setRows, setMsg)} // Use the function with state setters
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
              to="/shipmentstatus/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M12 4.5a.75.75 0 01.75.75v6h6a.75.75 0 010 1.5h-6v6a.75.75 0 01-1.5 0v-6h-6a.75.75 0 010-1.5h6v-6A.75.75 0 0112 4.5z" />
              </svg>
              Add New
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700">
              <tr className="border-b border-gray-200">
                <th className="w-16 px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="w-40 px-4 py-3 font-semibold">Status</th>
                <th className="w-44 px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading
                ? skeletonRows.map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      <td className="px-4 py-4"><div className="h-4 w-6 rounded bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-56 rounded bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-5 w-24 rounded-full bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-8 w-24 rounded bg-gray-200" /></td>
                    </tr>
                  ))
                : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                      No shipment statuses found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const active = isActiveFrom(r?.status ?? r?.is_active);
                    return (
                      <tr
                        key={r?.id ?? idx}
                        className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/40 transition-colors"
                      >
                        <td className="px-4 py-4 text-gray-700">{idx + 1}</td>
                        <td className="px-4 py-4 text-gray-900">{r?.name ?? "-"}</td>
                        <td className="px-4 py-4">
                          <StatusBadge active={active} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => alert(`Edit "${r?.name}" (id: ${r?.id})`)}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 hover:shadow focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                                   viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"
                                   className="h-4 w-4" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="M16.862 4.487l1.65-1.65a1.875 1.875 0 112.652 2.652l-11 11a4.5 4.5 0 01-1.897 1.13l-3.288.94a.375.375 0 01-.46-.46l.94-3.288a4.5 4.5 0 011.13-1.897l10.273-10.273z" />
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
