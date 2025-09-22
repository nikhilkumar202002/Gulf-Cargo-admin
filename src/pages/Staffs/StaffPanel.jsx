import React, { useEffect, useMemo, useState } from "react";
// import { FiMoreVertical } from "react-icons/fi";
import { FaUsers } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { MdClose } from "react-icons/md";
import "../Styles.css";
import { listStaffs } from "../../api/accountApi";

const PAGE_SIZE = 10;

const safeLower = (v) => (typeof v === "string" ? v.toLowerCase() : "");
const cn = (...parts) => parts.filter(Boolean).join(" ");

const StaffPanel = () => {
  const [filter, setFilter] = useState({ name: "", email: "", status: "" });
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dropdownId, setDropdownId] = useState(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  // map any backend shape to UI-safe fields
  const mapStaff = (s, idx) => {
    const statusRaw =
      s.status ??
      s.is_active ??
      s.active ??
      (typeof s.status === "string" ? s.status : undefined);

    const isActive =
      statusRaw === 1 ||
      statusRaw === true ||
      safeLower(String(statusRaw)) === "active";

    return {
      id: s.id ?? s.staff_id ?? s._id ?? idx,
      name:
        s.name ||
        [s.first_name, s.last_name].filter(Boolean).join(" ") ||
        s.username ||
        "—",
      email: s.email || s.user_email || "—",
      role:
        (s.role && (s.role.name || s.role.title)) ||
        s.role_name ||
        s.role ||
        s.role_id ||
        "—",
      status: isActive ? "Active" : "Inactive",
    };
  };

  // Fetch once
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const raw = await listStaffs();
        const normalized = (Array.isArray(raw) ? raw : []).map(mapStaff);
        setStaff(normalized);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Failed to load staff.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-wrapper")) setDropdownId(null);
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setDropdownId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const filteredStaff = useMemo(() => {
    const n = safeLower(filter.name);
    const e = safeLower(filter.email);
    return staff.filter((u) => {
      const nameOk = n ? safeLower(u.name).includes(n) : true;
      const emailOk = e ? safeLower(u.email).includes(e) : true;
      const statusOk = filter.status ? u.status === filter.status : true;
      return nameOk && emailOk && statusOk;
    });
  }, [staff, filter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const total = filteredStaff.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const startIdx = (pageSafe - 1) * PAGE_SIZE;
  const endIdx = Math.min(total, startIdx + PAGE_SIZE);
  const pageRows = filteredStaff.slice(startIdx, endIdx);

  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  // Build compact numeric buttons around the current page
  const visiblePages = useMemo(() => {
    const span = 2; // current ±2
    const out = [];
    const from = Math.max(1, pageSafe - span);
    const to = Math.min(totalPages, pageSafe + span);
    for (let i = from; i <= to; i++) out.push(i);
    // Ensure first/last shown with ellipses if far
    if (!out.includes(1)) out.unshift(1);
    if (!out.includes(totalPages)) out.push(totalPages);
    return out;
  }, [pageSafe, totalPages]);

  const handleClear = () => setFilter({ name: "", email: "", status: "" });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="staff-panel-heading flex items-center gap-3">
          <span className="staff-panel-heading-icon">
            <FaUsers />
          </span>
          All Staff Members
        </h2>
        <button
          onClick={() => navigate("/hr&staff/createstaffs")}
          className="rounded-lg bg-green-600 px-5 py-2 text-white shadow transition hover:bg-green-700"
        >
          + Create Staff
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg bg-white p-4">
        <input
          type="text"
          placeholder="Filter by Name"
          value={filter.name}
          onChange={(e) => setFilter((p) => ({ ...p, name: e.target.value }))}
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Filter by Email"
          value={filter.email}
          onChange={(e) => setFilter((p) => ({ ...p, email: e.target.value }))}
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={filter.status}
          onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
          className="w-44 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 rounded-lg bg-[#ED2624] px-4 py-2 text-white transition hover:bg-[#d32724]"
        >
          <MdClose /> Clear
        </button>
      </div>

      {/* Table / States */}
      {isLoading && (
        <div className="rounded-lg bg-white p-6 text-gray-600">Loading staff…</div>
      )}
      {error && !isLoading && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="overflow-hidden rounded-lg bg-white">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full text-left">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-xs uppercase text-gray-600">
                  <th className="px-6 py-3 font-semibold">#</th>
                  <th className="px-6 py-3 font-semibold">Details</th>
                  <th className="px-6 py-3 font-semibold">Role</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  {/* <th className="px-6 py-3 text-center font-semibold">Actions</th> */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((user, idx) => (
                    <tr key={user.id} className="hover:bg-gray-50/60">
                      <td className="px-6 py-4 text-gray-800">
                        {startIdx + idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{user.role}</td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium",
                            user.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          )}
                        >
                          {user.status}
                        </span>
                      </td>
                      {/* <td className="relative px-6 py-4 text-center">
                        <div className="dropdown-wrapper inline-block">
                          <FiMoreVertical
                            className="cursor-pointer text-gray-500 hover:text-gray-700"
                            size={20}
                            onClick={() =>
                              setDropdownId((prev) => (prev === user.id ? null : user.id))
                            }
                            aria-label="More actions"
                          />
                          {dropdownId === user.id && (
                            <div className="absolute right-6 mt-2 w-36 rounded-md border border-gray-200 bg-white shadow-lg z-50">
                              <button
                                onClick={() => {
                                  setDropdownId(null);
                                  navigate(`/staff/${user.id}`);
                                }}
                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              >
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setDropdownId(null);
                                  alert(`Editing ${user.name}`);
                                }}
                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDropdownId(null);
                                  alert(`Deleting ${user.name}`);
                                }}
                                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer: pagination summary + controls */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 p-4 md:flex-row">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{total === 0 ? 0 : startIdx + 1}</span>–
              <span className="font-medium">{endIdx}</span> of{" "}
              <span className="font-medium">{total}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={goFirst}
                disabled={pageSafe === 1}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  pageSafe === 1
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
                aria-label="First page"
              >
                « First
              </button>
              <button
                onClick={goPrev}
                disabled={pageSafe === 1}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  pageSafe === 1
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
                aria-label="Previous page"
              >
                ‹ Prev
              </button>

              {visiblePages.map((p, i) => {
                const isCurrent = p === pageSafe;
                const prevP = visiblePages[i - 1];
                const needsEllipsis = prevP && p - prevP > 1;
                return (
                  <React.Fragment key={p}>
                    {needsEllipsis && (
                      <span className="px-1 text-gray-400">…</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={cn(
                        "min-w-[2.2rem] rounded-md border px-3 py-1.5 text-sm",
                        isCurrent
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      )}
                      aria-current={isCurrent ? "page" : undefined}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

              <button
                onClick={goNext}
                disabled={pageSafe === totalPages}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  pageSafe === totalPages
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
                aria-label="Next page"
              >
                Next ›
              </button>
              <button
                onClick={goLast}
                disabled={pageSafe === totalPages}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  pageSafe === totalPages
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
                aria-label="Last page"
              >
                Last »
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPanel;
