// src/pages/Branches/AllBranches.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as branchApi from "../../api/branchApi"; // <— detect helpers at runtime
import { FiSearch } from "react-icons/fi";
import { IoMdRefresh } from "react-icons/io";

// ---------- tiny helpers ----------
const cx = (...c) => c.filter(Boolean).join(" ");

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

const SkelRow = () => (
  <tr className="border-b">
    <td className="p-3"><Skel h={32} w={120} /></td>
    <td className="p-3"><Skel /></td>
    <td className="p-3"><Skel w={80} /></td>
    <td className="p-3"><Skel w={120} /></td>
    <td className="p-3"><Skel w={160} /></td>
    <td className="p-3"><Skel w={130} /></td>
    <td className="p-3"><Skel w={80} /></td>
    <td className="p-3"><Skel w={140} /></td>
  </tr>
);

// Normalizer so the component UI doesn’t care about API shape differences
function normalizePagedResponse(raw) {
  // getAllBranchesPaged -> { items, meta }
  if (raw && Array.isArray(raw.items) && raw.meta) {
    const { items, meta } = raw;
    return {
      items,
      meta: {
        current_page: meta.current_page ?? 1,
        per_page: meta.per_page ?? items.length,
        total: meta.total ?? items.length,
        last_page: meta.last_page ?? 1,
      },
    };
  }

  // getAllBranches({ per_page: 500 }) -> array
  if (Array.isArray(raw)) {
    return {
      items: raw,
      meta: {
        current_page: 1,
        per_page: raw.length,
        total: raw.length,
        last_page: 1,
      },
    };
  }

  // Laravel paginator
  const data = raw?.data;
  if (data?.data && Array.isArray(data.data)) {
    return {
      items: data.data,
      meta: {
        current_page: data.current_page ?? 1,
        per_page: data.per_page ?? data.data.length,
        total: data.total ?? data.data.length,
        last_page: data.last_page ?? 1,
      },
    };
  }

  return { items: [], meta: { current_page: 1, per_page: 0, total: 0, last_page: 1 } };
}

export default function AllBranches() {
  // server paging state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ui data
  const [branches, setBranches] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, total: 0, last_page: 1 });

  // ux
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  async function loadPage({ pageArg = page, perPageArg = rowsPerPage } = {}) {
    setLoading(true);
    setErr("");
    try {
      let result;

      if (typeof branchApi.getAllBranchesPaged === "function") {
        // Preferred: server pagination
        result = await branchApi.getAllBranchesPaged({ page: pageArg, per_page: perPageArg });
      } else if (typeof branchApi.getAllBranches === "function") {
        // Fallback: fetch all and page on client
        const all = await branchApi.getAllBranches({ per_page: 1000 });
        const start = (pageArg - 1) * perPageArg;
        const pageItems = (Array.isArray(all) ? all : []).slice(start, start + perPageArg);
        result = {
          items: pageItems,
          meta: {
            current_page: pageArg,
            per_page: perPageArg,
            total: Array.isArray(all) ? all.length : 0,
            last_page: Math.max(1, Math.ceil((Array.isArray(all) ? all.length : 0) / perPageArg)),
          },
        };
      } else {
        throw new Error("branchApi helper not found. Export getAllBranchesPaged or getAllBranches.");
      }

      const { items, meta } = normalizePagedResponse(result);
      setBranches(Array.isArray(items) ? items : []);
      setMeta(meta);
    } catch (e) {
      setErr(e?.message || "Failed to load branches");
      setBranches([]);
      setMeta({ current_page: 1, per_page: rowsPerPage, total: 0, last_page: 1 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage({ pageArg: page, perPageArg: rowsPerPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  // filter the CURRENT page by search (keeps server paging intact).
  const filtered = useMemo(() => {
    const t = (q || "").trim().toLowerCase();
    if (!t) return branches;
    return branches.filter((b) => {
      const hay = `${b.branch_name ?? ""} ${b.branch_code ?? ""} ${b.branch_location ?? ""} ${b.branch_email ?? ""} ${b.branch_contact_number ?? ""}`.toLowerCase();
      return hay.includes(t);
    });
  }, [q, branches]);

  const showingFrom = filtered.length ? meta.per_page * (meta.current_page - 1) + 1 : 0;
  const showingTo = meta.per_page * (meta.current_page - 1) + filtered.length;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
      <div className="w-full max-w-7xl bg-white rounded-2xl p-6 md:p-8 shadow-sm">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">All Branches</h2>
            <p className="text-sm text-gray-500">Manage your branches across regions</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); }}
                placeholder="Search branch name, code, location, email…"
                className="pl-9 pr-3 py-2 w-72 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={() => loadPage({ pageArg: page, perPageArg: rowsPerPage })}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              disabled={loading}
              title="Reload"
            >
              <IoMdRefresh />
              <span className="text-sm">Reload</span>
            </button>

            <Link
              to="/branches/create"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white hover:opacity-90"
            >
              + Add Branch
            </Link>
          </div>
        </div>

        {/* Mobile: Card list (≤ md) */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:hidden">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Skel w={48} h={48} rounded={12} />
                <div className="flex-1">
                  <Skel w="70%" h={16} />
                  <div className="mt-2"><Skel w="45%" h={12} /></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Skel h={12} />
                <Skel h={12} />
                <Skel h={12} />
                <Skel h={12} />
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="p-6 text-center text-gray-500 border rounded-xl">
              {err ? `Error: ${err}` : "No branches found on this page."}
            </div>
          )}

          {!loading && filtered.map((b) => (
            <div key={b.id} className="border rounded-xl p-4 hover:shadow-sm transition">
              <div className="flex items-center gap-3">
                {b.logo_url ? (
                  <img
                    src={b.logo_url}
                    alt={b.branch_name || "logo"}
                    className="h-12 w-12 rounded-lg object-cover border"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-gray-100 border" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{b.branch_name || "-"}</div>
                  {b.branch_name_ar ? (
                    <div className="text-xs text-gray-500 truncate">{b.branch_name_ar}</div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-24 shrink-0">Code</span>
                  <span className="font-medium">{b.branch_code || "-"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-24 shrink-0">Location</span>
                  <span className="line-clamp-2">{b.branch_location || "-"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-24 shrink-0">Email</span>
                  <span className="truncate">
                    {b.branch_email ? (
                      <a className="text-blue-600 hover:underline" href={`mailto:${b.branch_email}`}>{b.branch_email}</a>
                    ) : "-"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-24 shrink-0">Contact</span>
                  <span>{b.branch_contact_number || b.branch_alternative_number || "-"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-24 shrink-0">Status</span>
                  <span
                    className={cx(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      b.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {b.status || "—"}
                  </span>
                </div>
              </div>

              {b.created_by || b.created_by_email ? (
                <div className="mt-3 text-xs text-gray-500">
                  <span className="font-medium">Created by:</span>{" "}
                  <span className="whitespace-nowrap">{b.created_by || "-"}</span>
                  {b.created_by_email ? <> · <span>{b.created_by_email}</span></> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Desktop: Responsive table (≥ md) */}
        <div className="mt-6 hidden md:block">
          <div className="overflow-hidden border rounded-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-3 font-medium">Logo</th>
                    <th className="text-left p-3 font-medium">Branch Name</th>
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Location</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Contact</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading && (
                    <>
                      <SkelRow /><SkelRow /><SkelRow /><SkelRow /><SkelRow />
                      <SkelRow /><SkelRow /><SkelRow /><SkelRow /><SkelRow />
                    </>
                  )}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-gray-500">
                        {err ? `Error: ${err}` : "No branches found on this page."}
                      </td>
                    </tr>
                  )}

                  {!loading && filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        {b.logo_url ? (
                          <img
                            src={b.logo_url}
                            alt={b.branch_name || "logo"}
                            className="h-10 w-10 rounded-md object-cover border"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-100 border" />
                        )}
                      </td>
                      <td className="p-3 max-w-[260px]">
                        <div className="font-medium truncate" title={b.branch_name || ""}>{b.branch_name || "-"}</div>
                        {b.branch_name_ar ? (
                          <div className="text-xs text-gray-500 truncate" title={b.branch_name_ar}>{b.branch_name_ar}</div>
                        ) : null}
                      </td>
                      <td className="p-3 whitespace-nowrap">{b.branch_code || "-"}</td>
                      <td className="p-3 max-w-[280px]">
                        <div className="truncate" title={b.branch_location || ""}>{b.branch_location || "-"}</div>
                        {b.branch_address ? (
                          <div className="text-xs text-gray-500 truncate" title={b.branch_address}>{b.branch_address}</div>
                        ) : null}
                      </td>
                      <td className="p-3 max-w-[260px]">
                        {b.branch_email ? (
                          <a
                            className="text-blue-600 hover:underline truncate inline-block max-w-[240px]"
                            href={`mailto:${b.branch_email}`}
                            title={b.branch_email}
                          >
                            {b.branch_email}
                          </a>
                        ) : "-"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {b.branch_contact_number || b.branch_alternative_number || "-"}
                      </td>
                      <td className="p-3">
                        <span
                          className={cx(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            b.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {b.status || "—"}
                        </span>
                      </td>
                      <td className="p-3 max-w-[240px]">
                        <div className="whitespace-nowrap truncate" title={b.created_by || ""}>{b.created_by || "-"}</div>
                        {b.created_by_email ? (
                          <div className="text-xs text-gray-500 truncate" title={b.created_by_email}>{b.created_by_email}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer / Pagination */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{showingFrom}</span>–<span className="font-medium">{showingTo}</span> of{" "}
            <span className="font-medium">{meta.total}</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Rows per page</label>
            <select
              className="border rounded-lg px-2 py-1"
              value={rowsPerPage}
              onChange={(e) => { setPage(1); setRowsPerPage(Number(e.target.value)); }}
              disabled={loading}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <div className="ml-2 flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || meta.current_page <= 1}
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-700">
                Page <span className="font-medium">{meta.current_page}</span> / {meta.last_page}
              </span>
              <button
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(meta.last_page || 1, p + 1))}
                disabled={loading || meta.current_page >= (meta.last_page || 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
