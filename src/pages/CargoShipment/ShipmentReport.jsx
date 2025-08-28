import React, { useState } from "react";
import { MdOutlinePendingActions } from "react-icons/md";
import "../Styles.css";
import * as XLSX from "xlsx";

function ShipmentReport() {
  const [filters, setFilters] = useState({
    dateRange: { from: "", to: "" },
    status: "",
    paymentStatus: "",
    cargoType: "",
    origin: "",
    destination: "",
    invoiceNo: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      dateRange: { ...prev.dateRange, [name]: value },
    }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({
      dateRange: { from: "", to: "" },
      status: "",
      paymentStatus: "",
      cargoType: "",
      origin: "",
      destination: "",
      invoiceNo: "",
    });
    setCurrentPage(1);
  };

  // Dummy data
  const shipments = Array.from({ length: 55 }, (_, i) => ({
    shipmentId: `SHP2025-${i + 1}`,
    invoiceNo: `INV-${89765 + i}`,
    bookingDate: "2025-08-20",
    shipperName: "John Logistics",
    consigneeName: "ABC Enterprises",
    origin: "Mumbai, India",
    destination: "Dubai, UAE",
    cargoType: i % 2 === 0 ? "Air Cargo" : "Sea Cargo",
    packageCount: 15,
    weight: "120 KG",
    status: i % 3 === 0 ? "In Transit" : i % 2 === 0 ? "Delivered" : "Booked",
    mode: "Air",
    eta: "2025-08-25",
    deliveryDate: "2025-08-28",
    paymentStatus: i % 2 === 0 ? "Paid" : "Pending",
    createdBy: "Admin User",
    createdDate: "2025-08-20",
    updatedAt: "2025-08-23",
  }));

  // Filtering logic
  const filteredShipments = shipments.filter((s) => {
    const from = filters.dateRange.from ? new Date(filters.dateRange.from) : null;
    const to = filters.dateRange.to ? new Date(filters.dateRange.to) : null;
    const booking = new Date(s.bookingDate);

    return (
      (!from || booking >= from) &&
      (!to || booking <= to) &&
      (!filters.status || s.status === filters.status) &&
      (!filters.paymentStatus || s.paymentStatus === filters.paymentStatus) &&
      (!filters.cargoType || s.cargoType === filters.cargoType) &&
      (!filters.origin || s.origin.toLowerCase().includes(filters.origin.toLowerCase())) &&
      (!filters.destination || s.destination.toLowerCase().includes(filters.destination.toLowerCase())) &&
      (!filters.invoiceNo || s.invoiceNo.includes(filters.invoiceNo))
    );
  });

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredShipments.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredShipments.length / rowsPerPage);

  const handlePageChange = (page) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page);
  };

  // Counts for summary cards
  const counts = {
    pending: shipments.filter((s) => s.status === "Booked").length,
    transit: shipments.filter((s) => s.status === "In Transit").length,
    delivered: shipments.filter((s) => s.status === "Delivered").length,
    unpaid: shipments.filter((s) => s.paymentStatus === "Pending").length,
  };

   // Upload Excel
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setShipments(jsonData); // Replace with uploaded data
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Download Excel
  const handleDownload = () => {
    const worksheet = XLSX.utils.json_to_sheet(shipments);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shipments");
    XLSX.writeFile(workbook, "ShipmentReport.xlsx");
  };
  
  return (
    <section className="shipment-report">
      <div className="shipment-report-container max-w-6xl mx-auto">
        <div className="shipment-report-header mb-6">
          <h1 className="shipment-report-heading text-2xl font-bold">Shipment Report</h1>

          {/* Summary Cards */}
          <div className="shipment-report-keys grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="shipment-report-key-card flex items-center gap-3">
              <span className="shipment-report-key-icon"><MdOutlinePendingActions /></span>
              <div><h1>{counts.pending}</h1><p>Booked</p></div>
            </div>
            <div className="shipment-report-key-card flex items-center gap-3">
              <span className="shipment-report-key-icon"><MdOutlinePendingActions /></span>
              <div><h1>{counts.transit}</h1><p>In Transit</p></div>
            </div>
            <div className="shipment-report-key-card flex items-center gap-3">
              <span className="shipment-report-key-icon"><MdOutlinePendingActions /></span>
              <div><h1>{counts.delivered}</h1><p>Delivered</p></div>
            </div>
            <div className="shipment-report-key-card flex items-center gap-3">
              <span className="shipment-report-key-icon"><MdOutlinePendingActions /></span>
              <div><h1>{counts.unpaid}</h1><p>Unpaid</p></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6  shipment-report-filter-box">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">

                <input type="date" name="from" value={filters.dateRange.from} onChange={handleDateChange} className="border p-2 rounded" />
          <input type="date" name="to" value={filters.dateRange.to} onChange={handleDateChange} className="border p-2 rounded" />
          
          <select name="status" value={filters.status} onChange={handleChange} className="border p-2 rounded">
            <option value="">All Status</option>
            <option value="Booked">Booked</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
          </select>

          <select name="paymentStatus" value={filters.paymentStatus} onChange={handleChange} className="border p-2 rounded">
            <option value="">All Payments</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>

          <select name="cargoType" value={filters.cargoType} onChange={handleChange} className="border p-2 rounded">
            <option value="">All Cargo</option>
            <option value="Air Cargo">Air Cargo</option>
            <option value="Sea Cargo">Sea Cargo</option>
          </select>

          <input type="text" name="origin" placeholder="Origin" value={filters.origin} onChange={handleChange} className="border p-2 rounded" />
          <input type="text" name="destination" placeholder="Destination" value={filters.destination} onChange={handleChange} className="border p-2 rounded" />
          <input type="text" name="invoiceNo" placeholder="Invoice No." value={filters.invoiceNo} onChange={handleChange} className="border p-2 rounded" />

            </div>
          <div className="flex gap-2 shipment-report-filter-btn">
            <button
              onClick={handleReset}
              className="bg-gray-200 px-4 py-2 rounded-lg shadow hover:bg-gray-300 "
            >
              Reset Filter
            </button>

            <label className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow cursor-pointer hover:bg-blue-600">
              Upload Excel
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={handleDownload}
              className="bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600"
            >
              Download Excel
            </button>
          </div>
        </div>
         

        {/* Table */}
        <div className="overflow-hidden rounded-lg bg-white overflow-x-auto">
          <table className="min-w-max border-collapse ">
            <thead>
              <tr className="text-grey text-sm text-left border-b">
                <th className="py-3 px-4">Shipment ID</th>
                <th className="py-3 px-4">Invoice No.</th>
                <th className="py-3 px-4">Booking Date</th>
                <th className="py-3 px-4">Shipper Name</th>
                <th className="py-3 px-4">Consignee Name</th>
                <th className="py-3 px-4">Origin</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Cargo Type</th>
                <th className="py-3 px-4">Packages</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">ETA</th>
                <th className="py-3 px-4">Delivery Date</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Last Updated</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm">
              {currentRows.length > 0 ? (
                currentRows.map((shipment, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-semibold   text-[#262262]">{shipment.shipmentId}</td>
                    <td className="py-3 px-4">{shipment.invoiceNo}</td>
                    <td className="py-3 px-4">{shipment.bookingDate}</td>
                    <td className="py-3 px-4">{shipment.shipperName}</td>
                    <td className="py-3 px-4">{shipment.consigneeName}</td>
                    <td className="py-3 px-4">{shipment.origin}</td>
                    <td className="py-3 px-4">{shipment.destination}</td>
                    <td className="py-3 px-4">{shipment.cargoType}</td>
                    <td className="py-3 px-4 text-center">{shipment.packageCount}</td>
                    <td className="py-3 px-4">{shipment.weight}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          shipment.status === "Delivered"
                            ? "bg-green-100 text-green-700"
                            : shipment.status === "In Transit"
                            ? "bg-yellow-100 text-yellow-700"
                            : shipment.status === "Booked"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {shipment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{shipment.mode}</td>
                    <td className="py-3 px-4">{shipment.eta}</td>
                    <td className="py-3 px-4">{shipment.deliveryDate}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          shipment.paymentStatus === "Paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {shipment.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">{shipment.createdBy}</td>
                    <td className="py-3 px-4">{shipment.createdDate}</td>
                    <td className="py-3 px-4">{shipment.updatedAt}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="18" className="text-center py-6 text-gray-500">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

export default ShipmentReport;
