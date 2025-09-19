
import React, { useEffect, useMemo, useState, Fragment, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import * as XLSX from "xlsx";
import { CiMenuKebab } from "react-icons/ci";
import { GiCargoCrate } from "react-icons/gi";
import { getCargos } from "../../api/createCargoApi";
import { Link } from "react-router-dom";
import "./ShipmentStyles.css";

const initialFilter = {
  sender: "",
  receiver: "",
  fromDate: "",
  tillDate: "",
  status: "",
};

function AllCargoList() {
  const [allCargos, setAllCargos] = useState([]);
  const [filteredCargos, setFilteredCargos] = useState([]);
  const [filter, setFilter] = useState(initialFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // selection
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const headerCbRef = useRef(null);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10, 20, 50

  const fetchCargos = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCargos();
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setAllCargos(arr);
      setFilteredCargos(arr);

      // keep existing selections that still exist in new data
      const validIds = new Set(arr.map((x) => x.id));
      setSelectedIds((prev) => {
        const next = new Set();
        prev.forEach((id) => validIds.has(id) && next.add(id));
        return next;
      });
      setPage(1);
    } catch (e) {
      console.error("getCargos failed:", e);
      setError(e?.message || "Failed to load cargos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCargos();
  }, []);

  // filtering
  const applyFilter = () => {
    const { sender, receiver, fromDate, tillDate, status } = filter;
    const inRange = (d) => {
      if (!d) return true;
      const dt = new Date(d);
      if (fromDate && dt < new Date(fromDate)) return false;
      if (tillDate && dt > new Date(tillDate)) return false;
      return true;
    };

    const next = allCargos.filter((c) => {
      const senderMatch = sender
        ? String(c.sender_name || c.sender || "")
            .toLowerCase()
            .includes(sender.toLowerCase())
        : true;

      const receiverMatch = receiver
        ? String(c.receiver_name || c.receiver || "")
            .toLowerCase()
            .includes(receiver.toLowerCase())
        : true;

      const statusMatch = status
        ? String(c.status?.name || c.status || "").toLowerCase() === status.toLowerCase()
        : true;

      const dateStr = c.date || "";
      return senderMatch && receiverMatch && statusMatch && inRange(dateStr);
    });

    setFilteredCargos(next);
  };

  useEffect(() => {
    applyFilter();
    setPage(1); // reset to first page when filters or data change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, allCargos]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((f) => ({ ...f, [name]: value }));
  };

  const resetFilters = () => setFilter(initialFilter);

  // pagination derived
  const total = filteredCargos.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const pageRows = filteredCargos.slice(pageStart, pageEnd);

  const goto = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  // selection on CURRENT PAGE ONLY for "select all"
  const visibleIds = useMemo(
    () => pageRows.map((c) => c.id).filter((id) => id != null),
    [pageRows]
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    if (headerCbRef.current) {
      headerCbRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // export (uses filtered set, not just page)
  const handleExcelExport = () => {
    const rows = filteredCargos.map((c) => ({
      ID: c.id,
      "Booking No": c.booking_no,
      Branch: c.branch_name,
      Sender: c.sender_name,
      Receiver: c.receiver_name,
      Date: c.date,
      Time: c.time,
      "Shipping Method": c.shipping_method,
      "Payment Method": c.payment_method,
      Status: c.status?.name || c.status || "",
      "Delivery Type": c.delivery_type,
      "Total Weight (kg)": c.total_weight,
      "Total Cost": c.total_cost,
      "Bill Charges": c.bill_charges,
      "VAT %": c.vat_percentage,
      "VAT Cost": c.vat_cost,
      "Net Total": c.net_total,
      "Track Code": c.lrl_tracking_code,
      Remarks: c.special_remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cargos");
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    XLSX.writeFile(wb, `cargos_${stamp}.xlsx`);
  };

  const uniqueStatuses = useMemo(() => {
    const set = new Set(
      allCargos.map((c) => String(c.status?.name || c.status || "")).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allCargos]);

  const statusClass = (s) => {
    const v = String(s || "").toLowerCase();
    if (!v || v === "pending") return "bg-amber-100 text-amber-800";
    if (v.includes("received") || v.includes("delivered")) return "bg-emerald-100 text-emerald-800";
    if (v.includes("cancel")) return "bg-rose-100 text-rose-800";
    return "bg-slate-100 text-slate-800";
  };

  return (
    <section className="bg-gray-50 p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className=" text-2xl font-semibold flex items-center gap-2">
            <GiCargoCrate className="text-2xl all-cargo-list-icon" />
            All Cargo List
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCargos}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Refresh
            </button>
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Back
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-7">
          <input
            type="text"
            name="sender"
            value={filter.sender}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
            placeholder="Filter by Sender"
          />
          <input
            type="text"
            name="receiver"
            value={filter.receiver}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
            placeholder="Filter by Receiver"
          />
          <select
            name="status"
            value={filter.status}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="fromDate"
            value={filter.fromDate}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
          />
          <input
            type="date"
            name="tillDate"
            value={filter.tillDate}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
          />
          <button
            onClick={applyFilter}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Apply
          </button>
          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 w-full"
            >
              Reset
            </button>
            <button
              onClick={handleExcelExport}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 w-full"
            >
              Export
            </button>
          </div>
        </div>

        {/* Selection bar */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            <span>
              Selected: <b>{selectedIds.size}</b>
            </span>
            <button
              onClick={clearSelection}
              className="text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
            >
              Clear
            </button>
          </div>
        )}

        {/* Loading / Error */}
        {loading && (
          <div className="w-full rounded-lg border bg-white p-6 text-center text-gray-500">
            Loading cargos…
          </div>
        )}
        {!loading && error && (
          <div className="w-full rounded-lg border bg-rose-50 p-4 text-rose-800">
            {error}
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100 text-sm text-gray-700 border-y border-gray-300">
                <tr className="divide-x divide-gray-200">
                  {/* Select-all (current page) */}
                  <th className="py-2 px-3 w-10 text-center">
                    <input
                      ref={headerCbRef}
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-600"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all rows in this page"
                    />
                  </th>
                  <th className="py-2 px-4">ID</th>
                  <th className="py-2 px-4">Booking No.</th>
                  <th className="py-2 px-4">Branch</th>
                  <th className="py-2 px-4">Sender</th>
                  <th className="py-2 px-4">Receiver</th>
                  <th className="py-2 px-4">Date</th>
                  <th className="py-2 px-4">Time</th>
                  <th className="py-2 px-4">Method</th>
                  <th className="py-2 px-4">Payment</th>
                  <th className="py-2 px-4">Weight (kg)</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-600">
                {pageRows.length === 0 && (
                  <tr>
                    <td className="py-6 px-4 text-center text-gray-500" colSpan={13}>
                      No cargos match your filters.
                    </td>
                  </tr>
                )}

                {pageRows.map((c) => {
                  const checked = selectedIds.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-gray-50 border-b border-gray-100 ${checked ? "bg-indigo-50/60" : ""}`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-indigo-600"
                          checked={checked}
                          onChange={() => toggleRow(c.id)}
                          aria-label={`Select row ${c.id}`}
                        />
                      </td>

                      <td className="py-2 px-4">{c.id}</td>
                      <td className="py-2 px-4">{c.booking_no}</td>
                      <td className="py-2 px-4">{c.branch_name || "—"}</td>
                      <td className="py-2 px-4">{c.sender_name || "—"}</td>
                      <td className="py-2 px-4">{c.receiver_name || "—"}</td>
                      <td className="py-2 px-4">{c.date || "—"}</td>
                      <td className="py-2 px-4">{c.time || "—"}</td>
                      <td className="py-2 px-4">{c.shipping_method || "—"}</td>
                      <td className="py-2 px-4">{c.payment_method || "—"}</td>
                      <td className="py-2 px-4">{c.total_weight ?? "—"}</td>
                      <td className="py-2 px-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-lg ${statusClass(
                            c.status?.name || c.status
                          )}`}
                        >
                          {c.status?.name || c.status || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <Menu as="div" className="relative inline-block text-left">
                          <Menu.Button className="bg-gray-100 text-black px-2 py-1 rounded-md hover:bg-gray-200">
                            <CiMenuKebab />
                          </Menu.Button>

                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                              <div className="py-1">
                                <Menu.Item>
                                    {({ active }) => (
                                      <Link
                                        to={`/cargo/${c.id}`}
                                        className={`block w-full text-left px-4 py-2 text-sm text-gray-700 ${active ? "bg-gray-50" : ""}`}
                                      >
                                        Edit
                                      </Link>
                                    )}
                                  </Menu.Item>
                                <Menu.Item>
                                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700">
                                    View
                                  </button>
                                </Menu.Item>
                                <Menu.Item>
                                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700">
                                    Invoice
                                  </button>
                                </Menu.Item>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!loading && !error && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Showing <b>{total === 0 ? 0 : pageStart + 1}</b>–<b>{pageEnd}</b> of <b>{total}</b>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700">
                Rows per page:{" "}
                <select
                  className="ml-2 rounded border px-2 py-1 text-sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>

              <div className="flex items-center gap-1">
                <button
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                  onClick={() => goto(page - 1)}
                  disabled={page <= 1}
                >
                  Prev
                </button>

                {/* page numbers (compact) */}
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  // simple windowing: show first, last, current±1
                  const show =
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - page) <= 1 ||
                    (page <= 3 && p <= 4) ||
                    (page >= totalPages - 2 && p >= totalPages - 3);

                  if (!show) {
                    // collapse with ellipsis (render only when necessary)
                    if (
                      (p === 2 && page > 4) ||
                      (p === totalPages - 1 && page < totalPages - 3)
                    ) {
                      return (
                        <span key={p} className="px-2 text-gray-400 select-none">
                          …
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={p}
                      onClick={() => goto(p)}
                      className={`px-3 py-1 rounded border text-sm ${
                        p === page ? "bg-indigo-600 text-white border-indigo-600" : ""
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                  onClick={() => goto(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default AllCargoList;
