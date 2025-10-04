import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi";
import { LuPlus } from "react-icons/lu";
import { Link } from "react-router-dom";
import DropdownMenu from "../../components/DropdownMenu";
import api from "../../api/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import "../styles.css";
import "./BranchStyles.css";

/* --------- skeleton helpers --------- */
const Skel = ({ w = 100, h = 14, rounded = 8, className = "" }) => (
  <span
    className={`skel ${className}`}
    style={{
      display: "inline-block",
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: rounded,
    }}
    aria-hidden="true"
  />
);

const SkelRow = () => (
  <tr>
    <td className="py-3 px-4"><Skel w={24} /></td>
    <td className="py-3 px-4"><Skel w="70%" /></td>
    <td className="py-3 px-4"><Skel w="50%" /></td>
    <td className="py-3 px-4"><Skel w="60%" /></td>
    <td className="py-3 px-4">
      <div className="space-y-1">
        <Skel w="70%" />
        <Skel w="40%" />
      </div>
    </td>
    <td className="py-3 px-4"><Skel w="70%" /></td>
    <td className="py-3 px-4"><Skel w={68} h={22} rounded={999} /></td>
    <td className="py-3 px-4 text-right"><Skel w={28} h={28} rounded={6} /></td>
  </tr>
);

const AllBranches = () => {
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSkel, setShowSkel] = useState(false);

  useEffect(() => {
    let t;
    if (loading) t = setTimeout(() => setShowSkel(true), 120); // only show if >120ms
    else setShowSkel(false);
    return () => t && clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    let didStart = false; // strict mode / accidental reruns guard
    const ctrl = new AbortController();

    (async () => {
      if (didStart) return;
      didStart = true;

      try {
        setLoading(true);
        setError("");
        const res = await api.get("/branches", { signal: ctrl.signal });
        const payload = res.data;
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];
        if (!cancelled) setBranches(items);
      } catch (err) {
        if (!cancelled && err?.name !== "CanceledError") {
          const msg = err?.response?.data?.message || "Failed to load branches.";
          setError(msg);
          toast.error(msg);
          setBranches([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  const filteredBranches = branches.filter((b) =>
    [b.branch_name, b.branch_code, b.branch_location]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination
  const totalPages = Math.ceil(filteredBranches.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentBranches = filteredBranches.slice(startIndex, startIndex + rowsPerPage);

  const handleDelete = async (branch) => {
    if (!window.confirm(`Delete "${branch.branch_name}"?`)) return;

    try {
      await toast.promise(
        api.delete(`/branch/${branch.id}`),
        {
          loading: "Deleting branch…",
          success: `"${branch.branch_name}" deleted.`,
          error: (e) =>
            e?.response?.data?.message || e?.message || "Delete failed.",
        }
      );
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
    } catch (_) {
      // toast.promise already handled the error toast
    }
  };

  return (
    <>
      {/* HEADER */}
      <div className="ipx-head ipx-head-bar max-w-6xl mx-auto">
        <div className="ipx-brand">
          <h2 className="ipx-title">Branch List</h2>
          <p className="ipx-sub">Manage branches, contacts and status.</p>
        </div>

        <div className="ipx-toolbar">
          {/* Search */}
          <div className="ipx-field grow relative">
            {loading ? (
              <Skel w="100%" h={44} />
            ) : (
              <>
                <input
                  className="ipx-input ipx-input-lg ipx-searchpad"
                  type="search"
                  placeholder="Search by name, code or location…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <FaSearch className="ipx-search-icon" />
              </>
            )}
          </div>

          {/* Rows per page */}
          <div className="ipx-field">
            <label className="ipx-label small">Rows</label>
            {loading ? (
              <Skel w={88} h={36} />
            ) : (
              <select
                className="ipx-input"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
              </select>
            )}
          </div>

          {/* Add new */}
          <Link to="/branches/add" className="ipx-btn primary ipx-btn-cta flex items-center gap-2">
            <LuPlus /> Add Branch
          </Link>
        </div>
      </div>

      {/* CARD */}
      <div className="ipx-card p-0 max-w-6xl mx-auto" aria-busy={loading}>
        {/* Error banner */}
        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="ipx-table-wrap ipx-table-elevated" aria-busy={loading}>
          <table className="ipx-table ipx-table-compact ipx-table-hover ipx-table-sticky">
            <thead>
              <tr>
                <th className="w-64">#</th>
                <th>Name</th>
                <th className="w-160 ipx-col-hide-sm">Code</th>
                <th className="w-220">Location</th>
                <th className="w-240 ipx-col-hide-md">Contacts</th>
                <th className="w-220 ipx-col-hide-md">Email</th>
                <th className="w-120">Status</th>
                <th className="w-80 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkelRow key={`sk-${i}`} />)
              ) : currentBranches.length > 0 ? (
                currentBranches.map((branch, index) => (
                  <tr key={branch.id}>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {startIndex + index + 1}
                    </td>
                    <td className="py-3 px-4">{branch.branch_name || "-"}</td>
                    <td className="py-3 px-4 ipx-col-hide-sm">{branch.branch_code || "-"}</td>
                    <td className="py-3 px-4">{branch.branch_location || "-"}</td>
                    <td className="py-3 px-4 ipx-col-hide-md">
                      {branch.branch_contact_number && <p>{branch.branch_contact_number}</p>}
                      {branch.branch_alternative_number && <p>{branch.branch_alternative_number}</p>}
                    </td>
                    <td className="py-3 px-4 ipx-col-hide-md">{branch.branch_email || "-"}</td>
                    <td className="py-3 px-4">
                      {(branch.status === "Active" || branch.status === 1) ? (
                        <span className="ipx-pill ok">Active</span>
                      ) : (
                        <span className="ipx-pill muted">Inactive</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        disabled={loading}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setOpenMenuIndex(index);
                          setMenuPosition({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX - 100,
                          });
                        }}
                        className="ipx-more-btn"
                        title="More"
                      >
                        <FiMoreVertical size={18} />
                      </button>

                      {openMenuIndex === index && (
                        <DropdownMenu
                          branch={branch}
                          handleDelete={handleDelete}
                          position={menuPosition}
                          onClose={() => setOpenMenuIndex(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-5 px-4 text-center text-slate-500">
                    No branches found.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan={8}>
                  <div className="ipx-pagination">
                    <div className="ipx-results-count">
                      {loading ? (
                        <Skel w={200} />
                      ) : (
                        <>
                          Showing {filteredBranches.length === 0 ? 0 : startIndex + 1} –{" "}
                          {Math.min(startIndex + rowsPerPage, filteredBranches.length)} of{" "}
                          {filteredBranches.length}
                        </>
                      )}
                    </div>
                    <div className="ipx-pager">
                      <button
                        className="ipx-btn ghost sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loading}
                      >
                        ← Prev
                      </button>
                      <span className="ipx-page-indicator">Page {currentPage} / {totalPages}</span>
                      <button
                        className="ipx-btn ghost sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || loading}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Toaster (you can move this to App root once) */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: "#111827", color: "#fff" }, // slate-900
            success: { iconTheme: { primary: "#10B981", secondary: "#111827" } }, // emerald
            error: { iconTheme: { primary: "#EF4444", secondary: "#111827" } }, // red
          }}
        />
      </div>

      {/* tiny shimmer CSS (keep) */}
      <style>{`
        .skel { background:#e5e7eb; position:relative; overflow:hidden; }
        .skel::after { content:""; position:absolute; inset:0; transform:translateX(-100%);
          background:linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(255,255,255,.75) 50%, rgba(229,231,235,0) 100%);
          animation: skel-shimmer 1.2s infinite;
        }
        @keyframes skel-shimmer { 100% { transform: translateX(100%); } }
      `}</style>
    </>
  );
};

export default AllBranches;
