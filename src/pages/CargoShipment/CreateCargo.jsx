
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  getActiveShipmentMethods,
} from "../../api/shipmentMethodApi"; // active=1
import {
  getPorts, // we'll call with ?status=1 (Origin) and ?status=0 (Destination)
} from "../../api/portApi";
import {
  getActiveShipmentStatuses,
} from "../../api/shipmentStatusApi"; // active=1
import {
  getActiveBranches, // used for Clearing Agent select
} from "../../api/branchApi";

import { getParties, getPartiesByCustomerType } from "../../api/partiesApi";


function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

const Spinner = ({ className = "h-4 w-4 text-indigo-600" }) => (
  <svg
    className={classNames("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// Try to show a reasonable label regardless of backend shape
const labelOf = (o, fall = "-") =>
  o?.name ?? o?.title ?? o?.label ?? o?.branch_name ?? fall;

export default function CreateCargo() {
  const { token } = useAuth();

  // Dropdown data (fetched)
  const [methods, setMethods] = useState([]);              // shipment methods (active)
  const [statuses, setStatuses] = useState([]);            // shipment statuses (active)
  const [originPorts, setOriginPorts] = useState([]);      // ports?status=1
  const [destPorts, setDestPorts] = useState([]);          // ports?status=0
  const [branches, setBranches] = useState([]);            // active branches -> clearing agents

  const [loadingOpts, setLoadingOpts] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });

  // Sender/Receiver still placeholders (you didn’t share those APIs)
const [senders, setSenders] = useState([]);
const [receivers, setReceivers] = useState([]);

  // Form state (store IDs from selects)
  const [formData, setFormData] = useState({
    shipmentId: "AUTO-123456",
    awbNumber: "",
    shipmentMethodId: "",
    shipmentStatusId: "",
    originPortId: "",
    destinationPortId: "",
    clearingAgentId: "",
    senderId: "",
    receiverId: "",
    createdOn: new Date().toISOString().split("T")[0],
    notes: "",
    remarks: "",
    uploadedDocuments: [],
  });

  const [cargoItems, setCargoItems] = useState([
    { description: "", hsnCode: "", pcs: 1, boxNumbers: "", weight: 0, invoiceValue: 0, unitPrice: 0 },
  ]);
  const [statusLog, setStatusLog] = useState([]);

  // Fetch all active options
  useEffect(() => {
    (async () => {
          let senderList = [];
    let receiverList = [];
      setLoadingOpts(true);
      setMsg({ text: "", variant: "" });
      try {
        const [
          methodList,
          statusList,
          originList,
          destList,
          branchList,
        ] = await Promise.all([
          getActiveShipmentMethods(token),              // /shipment-methods?status=1
          getActiveShipmentStatuses(token),            // /shipment-status?status=1
          getPorts({ status: 1 }, token),              // /ports?status=1  (Origin)
          getPorts({ status: 0 }, token),              // /ports?status=0  (Destination)
          getActiveBranches(),                         // branches (active only)
        ]);

        setMethods(methodList ?? []);
        setStatuses(statusList ?? []);
        setOriginPorts(originList ?? []);
        setDestPorts(destList ?? []);
        setBranches(branchList ?? []);
      }
       catch (err) {
        console.error("Failed to load dropdown data", err?.response || err);
        setMsg({
          text: err?.response?.data?.message || "Failed to load form options.",
          variant: "error",
        });
      } finally {
        setLoadingOpts(false);
      }
    })();
  }, [token]);

  // ——— calculations
  const calculateSubtotal = () =>
    cargoItems.reduce((sum, item) => sum + Number(item.pcs || 0) * Number(item.unitPrice || 0), 0);
  const calculateTotalWeight = () =>
    cargoItems.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const calculateTotalBoxes = () =>
    cargoItems.reduce((sum, item) => sum + Number(item.pcs || 0), 0);
  const tax = calculateSubtotal() * 0.05;
  const total = calculateSubtotal() + tax;

  // ——— handlers
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "uploadedDocuments") {
      setFormData((s) => ({ ...s, uploadedDocuments: [...files] }));
      return;
    }
    if (name === "shipmentStatusId") {
      setStatusLog((prev) => [
        ...prev,
        { status: value, date: new Date().toLocaleString(), updatedBy: "Admin User" },
      ]);
    }
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handleCargoChange = (idx, field, value) => {
    setCargoItems((prev) => {
      const next = [...prev];
      next[idx][field] = value;
      return next;
    });
  };

  const addCargoItem = () =>
    setCargoItems((prev) => [
      ...prev,
      { description: "", hsnCode: "", pcs: 1, boxNumbers: "", weight: 0, invoiceValue: 0, unitPrice: 0 },
    ]);

  const removeCargoItem = (index) =>
    setCargoItems((prev) => prev.filter((_, i) => i !== index));

  const handleExcelImport = () => {
    alert("Excel Import feature coming soon!");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Shipment Created:", {
      ...formData,
      cargoItems,
      total,
      totalWeight: calculateTotalWeight(),
      totalBoxCount: calculateTotalBoxes(),
      statusLog,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create Shipment</h2>
          {loadingOpts && (
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Spinner /> Loading options…
            </div>
          )}
        </div>

        {msg.text && (
          <div
            className={classNames(
              "mb-4 rounded-xl border px-3 py-2 text-sm",
              msg.variant === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            )}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AWB Number */}
            <div>
              <label className="block text-sm font-medium mb-1 w-full">AWB Number</label>
              <input
                type="text"
                name="awbNumber"
                value={formData.awbNumber}
                onChange={handleChange}
                placeholder="Enter AWB Number"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            {/* Shipment Method (active) */}
            <div>
              <label className="block text-sm font-medium mb-1">Shipment Method</label>
              <select
                name="shipmentMethodId"
                value={formData.shipmentMethodId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                disabled={loadingOpts}
              >
                <option value="">Select Shipment Method</option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {labelOf(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Shipment Status (active) */}
            <div>
              <label className="block text-sm font-medium mb-1">Shipment Status</label>
              <select
                name="shipmentStatusId"
                value={formData.shipmentStatusId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                disabled={loadingOpts}
              >
                <option value="">Select Status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {labelOf(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* Port of Origin (status=1) */}
            <div>
              <label className="block text-sm font-medium mb-1">Port of Origin</label>
              <select
                name="originPortId"
                value={formData.originPortId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                disabled={loadingOpts}
              >
                <option value="">Select Origin Port</option>
                {originPorts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code ? `${p.name} (${p.code})` : labelOf(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Port of Destination (status=0) */}
            <div>
              <label className="block text-sm font-medium mb-1">Port of Destination</label>
              <select
                name="destinationPortId"
                value={formData.destinationPortId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                disabled={loadingOpts}
              >
                <option value="">Select Destination Port</option>
                {destPorts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code ? `${p.name} (${p.code})` : labelOf(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Clearing Agent (Active Branches) */}
            <div>
              <label className="block text-sm font-medium mb-1">Clearing Agent</label>
              <select
                name="clearingAgentId"
                value={formData.clearingAgentId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                disabled={loadingOpts}
              >
                <option value="">Select Clearing Agent</option>
                {branches.map((b) => (
                  <option key={b.id ?? b.branch_id ?? labelOf(b)} value={b.id ?? b.branch_id}>
                    {labelOf(b)}
                  </option>
                ))}
              </select>
            </div>

            {/* Created On */}
            <div>
              <label className="block text-sm font-medium mb-1">Created On</label>
              <input
                type="date"
                name="createdOn"
                value={formData.createdOn}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Sender & Receiver (placeholder lists for now) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sender</label>
              <select
                name="senderId"
                value={formData.senderId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Sender</option>
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.address})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Receiver</label>
              <select
                name="receiverId"
                value={formData.receiverId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Receiver</option>
                {receivers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.address})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cargo Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Cargo Information</h3>
            <div className="hidden md:grid grid-cols-8 gap-3 mb-2 text-sm font-medium text-gray-600">
              <span>Description</span>
              <span>HSN Code</span>
              <span>No. of Pcs</span>
              <span>Box Numbers</span>
              <span>Weight (Kg)</span>
              <span>Unit Price</span>
              <span>Invoice Value</span>
              <span>Action</span>
            </div>

            {cargoItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end mb-3 border p-3 rounded-lg bg-gray-50">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleCargoChange(index, "description", e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="HSN Code"
                  value={item.hsnCode}
                  onChange={(e) => handleCargoChange(index, "hsnCode", e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Pcs"
                  value={item.pcs}
                  onChange={(e) => handleCargoChange(index, "pcs", parseInt(e.target.value || 0, 10))}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Box Numbers"
                  value={item.boxNumbers}
                  onChange={(e) => handleCargoChange(index, "boxNumbers", e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Weight"
                  value={item.weight}
                  onChange={(e) => handleCargoChange(index, "weight", parseFloat(e.target.value || 0))}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) => handleCargoChange(index, "unitPrice", parseFloat(e.target.value || 0))}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Invoice Value"
                  value={item.invoiceValue}
                  onChange={(e) => handleCargoChange(index, "invoiceValue", parseFloat(e.target.value || 0))}
                  className="border rounded-lg px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => removeCargoItem(index)}
                  className="bg-red-500 text-white rounded-lg px-3 py-2 hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={addCargoItem}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                + Add Cargo Item
              </button>
              <button
                type="button"
                onClick={handleExcelImport}
                className="mt-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
              >
                Import from Excel
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-100 p-4 rounded-lg space-y-2">
            <p className="text-sm">
              Subtotal: <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
            </p>
            <p className="text-sm">
              Tax (5%): <span className="font-semibold">${tax.toFixed(2)}</span>
            </p>
            <p className="text-sm">
              <span className="font-semibold">Total Weight:</span> {calculateTotalWeight()} Kg
            </p>
            <p className="text-sm">
              <span className="font-semibold">Total Box Count:</span> {calculateTotalBoxes()}
            </p>
            <p className="text-lg font-bold">Total: ${total.toFixed(2)}</p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium mb-1">Internal Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              rows="3"
            />
          </div>

          {/* Uploaded Documents */}
          <div>
            <label className="block text-sm font-medium mb-1">Upload Documents</label>
            <input
              type="file"
              name="uploadedDocuments"
              onChange={handleChange}
              multiple
              className="w-full border rounded-lg px-3 py-2"
            />
            {formData.uploadedDocuments.length > 0 && (
              <ul className="mt-2 text-sm text-gray-700">
                {Array.from(formData.uploadedDocuments).map((file, idx) => (
                  <li key={idx}>📄 {file.name}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Status Log */}
          {statusLog.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">Status Log</h3>
              <ul className="space-y-1 text-sm">
                {statusLog.map((log, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{log.status}</span> — {log.date} by {log.updatedBy}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit */}
          <div>
            <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700">
              Create Shipment & Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
