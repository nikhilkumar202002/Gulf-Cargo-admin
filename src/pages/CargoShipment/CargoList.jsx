// src/pages/AllCargoList.jsx
import React, { useEffect, useMemo, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { Menu, Transition } from "@headlessui/react";
import * as XLSX from "xlsx";
import { CiMenuKebab } from "react-icons/ci";
import { GiCargoCrate } from "react-icons/gi";

import { getCargos, bulkUpdateCargoStatus } from "../../api/createCargoApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import "./ShipmentStyles.css";

/* ---------------- helpers ---------------- */
const unwrapArray = (o) =>
  Array.isArray(o) ? o :
  Array.isArray(o?.data?.data) ? o.data.data :
  Array.isArray(o?.data) ? o.data :
  Array.isArray(o?.items) ? o.items :
  Array.isArray(o?.results) ? o.results : [];

const statusClass = (s) => {
  const v = String(s || "").toLowerCase();
  if (!v || v === "pending") return "bg-amber-100 text-amber-800";
  if (v.includes("received") || v.includes("delivered")) return "bg-emerald-100 text-emerald-800";
  if (v.includes("cancel")) return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-800";
};

/* ---------------- component ---------------- */
const initialFilter = {
  sender: "",
  receiver: "",
  fromDate: "",
  tillDate: "",
  status: "", // status_id
};

function AllCargoList() {
  // data
  const [allCargos, setAllCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [filter, setFilter] = useState(initialFilter);
  const [statuses, setStatuses] = useState([]);

  // bulk status update
  const [selectedIds, setSelectedIds] = useState([]); // row selection
  const [bulkStatusId, setBulkStatusId] = useState("");

  // pagination (client-side)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  /* ---------- fetch statuses once ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await getActiveShipmentStatuses();
        setStatuses(unwrapArray(res));
      } catch (e) {
        console.error("getActiveShipmentStatuses failed:", e);
        setStatuses([]);
      }
    })();
  }, []);

  /* ---------- fetch cargos (server-side date/status filtering) ---------- */
  const fetchCargos = async () => {
    setLoading(true);
    setError("");
    setSelectedIds([]);
    try {
      const rows = await getCargos({
        from_date: filter.fromDate || undefined,
        to_date: filter.tillDate || undefined,
        status_id: filter.status || undefined,
        // (optional) if backend supports pagination, pass page/per_page here and render meta
        // page, per_page: perPage,
      });
      const arr = Array.isArray(rows?.data) ? rows.data : Array.isArray(rows) ? rows : [];
      setAllCargos(arr);
      setPage(1); // reset to first page on new fetch
    } catch (e) {
      console.error("getCargos failed:", e);
      setError(e?.message || "Failed to load cargos.");
      setAllCargos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCargos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- local filtering for sender/receiver text ---------- */
  const locallyFiltered = useMemo(() => {
    const { sender, receiver } = filter;
    if (!sender && !receiver) return allCargos;

    return allCargos.filter((c) => {
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

      return senderMatch && receiverMatch;
    });
  }, [allCargos, filter.sender, filter.receiver]);

  /* ---------- pagination (client-side) ---------- */
  const total = locallyFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return locallyFiltered.slice(start, start + perPage);
  }, [locallyFiltered, page, perPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  /* ---------- filters handlers ---------- */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((f) => ({ ...f, [name]: value }));
  };

  const applyServerFilters = () => {
    fetchCargos();
  };

  const resetFilters = () => {
    setFilter(initialFilter);
    setBulkStatusId("");
    fetchCargos();
  };

  /* ---------- selection ---------- */
  const currentPageIds = useMemo(() => paged.map((c) => c.id), [paged]);
  const allChecked = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (allChecked) {
        // unselect all from current page
        return prev.filter((id) => !currentPageIds.includes(id));
      }
      // add all from current page
      const set = new Set(prev);
      currentPageIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /* ---------- export ---------- */
  const handleExcelExport = () => {
    const toRows = locallyFiltered.map((c) => ({
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
    const ws = XLSX.utils.json_to_sheet(toRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cargos");
    XLSX.writeFile(wb, `cargos_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.xlsx`);
  };

  /* ---------- bulk status update ---------- */
  const doBulkUpdate = async () => {
    if (!bulkStatusId) {
      alert("Choose a status to set.");
      return;
    }
    if (selectedIds.length === 0) {
      alert("Select at least one cargo.");
      return;
    }
    try {
      await bulkUpdateCargoStatus({ status_id: Number(bulkStatusId), cargo_ids: selectedIds });
      await fetchCargos();
      setSelectedIds([]);
      setBulkStatusId("");
    } catch (e) {
      alert(e?.message || "Failed to update status.");
    }
  };

  return (
    <section className="bg-gray-50 p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-indigo-600 flex items-center gap-2">
            <GiCargoCrate className="text-2xl" />
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
        </div>

        {/* Filters & bulk update toolbar */}
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-8">
          <input
            type="text"
            name="sender"
            value={filter.sender}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
            placeholder="Filter by Sender (client-side)"
          />
          <input
            type="text"
            name="receiver"
            value={filter.receiver}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
            placeholder="Filter by Receiver (client-side)"
          />
          <select
            name="status"
            value={filter.status}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
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
            onClick={applyServerFilters}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Apply
          </button>

     

          {/* Bulk status update */}
          <div className="col-span-1 xl:col-span-2 flex items-center gap-2">
            <select
              className="border p-2 rounded-lg w-full"
              value={bulkStatusId}
              onChange={(e) => setBulkStatusId(e.target.value)}
            >
              <option value="">Bulk: choose status…</option>
              {statuses.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={doBulkUpdate}
              disabled={!bulkStatusId || selectedIds.length === 0}
              className={`px-4 py-2 rounded-lg text-white ${
                !bulkStatusId || selectedIds.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              title={
                !bulkStatusId
                  ? "Pick a status"
                  : selectedIds.length === 0
                  ? "Select at least one cargo"
                  : "Update status for selected"
              }
            >
              Update Status
            </button>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="w-full rounded-lg border bg-white p-6 text-center text-gray-500">
            Loading cargos…
          </div>
        )}
        {!loading && error && (
          <div className="w-full rounded-lg border bg-rose-50 p-4 text-rose-800">{error}</div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="relative overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-200 text-sm text-gray-700 border-b border-gray-300">
                <tr>
                  <th className="py-2 px-4 border">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  </th>
                  <th className="py-2 px-4 border">ID</th>
                  <th className="py-2 px-4 border">Booking No.</th>
                  <th className="py-2 px-4 border">Branch</th>
                  <th className="py-2 px-4 border">Sender</th>
                  <th className="py-2 px-4 border">Receiver</th>
                  <th className="py-2 px-4 border">Date</th>
                  <th className="py-2 px-4 border">Time</th>
                  <th className="py-2 px-4 border">Method</th>
                  <th className="py-2 px-4 border">Payment</th>
                  <th className="py-2 px-4 border">Weight (kg)</th>
                  <th className="py-2 px-4 border">Status</th>
                  <th className="py-2 px-4 border">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-600">
                {paged.length === 0 && (
                  <tr>
                    <td className="py-6 px-4 text-center text-gray-500" colSpan={13}>
                      No cargos found.
                    </td>
                  </tr>
                )}

                {paged.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleOne(c.id)}
                      />
                    </td>
                    <td className="py-2 px-4 border">{c.id}</td>
                    <td className="py-2 px-4 border">{c.booking_no}</td>
                    <td className="py-2 px-4 border">{c.branch_name || "—"}</td>
                    <td className="py-2 px-4 border">{c.sender_name || "—"}</td>
                    <td className="py-2 px-4 border">{c.receiver_name || "—"}</td>
                    <td className="py-2 px-4 border">{c.date || "—"}</td>
                    <td className="py-2 px-4 border">{c.time || "—"}</td>
                    <td className="py-2 px-4 border">{c.shipping_method || "—"}</td>
                    <td className="py-2 px-4 border">{c.payment_method || "—"}</td>
                    <td className="py-2 px-4 border">{c.total_weight ?? "—"}</td>
                    <td className="py-2 px-4 border">
                      <span className={`px-2 py-1 text-xs rounded-lg ${statusClass(c.status?.name || c.status)}`}>
                        {c.status?.name || c.status || "—"}
                      </span>
                    </td>
                    <td className="py-2 px-4 border">
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
                          <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                            <div className="py-1">
                              <Menu.Item>
                                {({ active }) => (
                                  <Link
                                    to={`/cargo/${c.id}`}
                                    className={`block w-full text-left px-4 py-2 text-sm ${
                                      active ? "bg-gray-50 text-gray-900" : "text-gray-700"
                                    }`}
                                  >
                                    Edit
                                  </Link>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <Link
                                    to={`/cargo/view/${c.id}`}
                                    className={`block w-full text-left px-4 py-2 text-sm ${
                                      active ? "bg-gray-50 text-gray-900" : "text-gray-700"
                                    }`}
                                  >
                                    View
                                  </Link>
                                )}
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
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: pagination controls */}
        {!loading && !error && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <b>
                {total === 0 ? 0 : (page - 1) * perPage + 1}–
                {Math.min(page * perPage, total)}
              </b>{" "}
              of <b>{total}</b>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-600">Rows:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3 py-1 rounded border ${
                    page === 1 ? "text-gray-400 border-gray-200" : "hover:bg-gray-50"
                  }`}
                >
                  Prev
                </button>
                <span className="text-sm text-gray-700">
                  Page <b>{page}</b> / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-3 py-1 rounded border ${
                    page === totalPages ? "text-gray-400 border-gray-200" : "hover:bg-gray-50"
                  }`}
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
