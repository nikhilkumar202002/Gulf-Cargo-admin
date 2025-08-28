import React, { useState } from "react";

function CreateCargo() {
  // Dummy sender/receiver data (later replace with API)
  const senders = [
    { id: 1, name: "ABC Exports", address: "Delhi, India" },
    { id: 2, name: "Global Traders", address: "Mumbai, India" },
  ];

  const receivers = [
    { id: 1, name: "XYZ Imports", address: "Dubai, UAE" },
    { id: 2, name: "Skyline Retail", address: "London, UK" },
  ];

  // Dummy dropdown data (to be replaced with API later)
  const shipmentTypes = ["IND Air", "IND Sea", "Export Air", "Export Sea"];
  const portsOfOrigin = ["Delhi", "Mumbai", "Chennai", "Kolkata"];
  const portsOfDestination = ["Dubai", "London", "Singapore", "New York"];
  const clearingAgents = [
    "ABC Clearing Co.",
    "Global Freight Ltd.",
    "FastClear Logistics",
  ];
  const shipmentStatuses = [
    "Booked",
    "Forwarded",
    "In Transit",
    "Received",
    "Delivered",
    "Cancelled",
  ];

  const [formData, setFormData] = useState({
    shipmentId: "AUTO-123456",
    awbNumber: "",
    shipmentType: "",
    portOfOrigin: "",
    portOfDestination: "",
    clearingAgent: "",
    senderId: "",
    receiverId: "",
    status: "Booked", // default status
    createdOn: new Date().toISOString().split("T")[0],
    notes: "",
    remarks: "",
    uploadedDocuments: [],
  });

  const [cargoItems, setCargoItems] = useState([
    {
      description: "",
      hsnCode: "",
      pcs: 1,
      boxNumbers: "",
      weight: 0,
      invoiceValue: 0,
      unitPrice: 0,
    },
  ]);

  const [statusLog, setStatusLog] = useState([]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "uploadedDocuments") {
      setFormData({ ...formData, uploadedDocuments: [...files] });
    } else if (name === "status") {
      // Add to status log when status changes
      setStatusLog((prev) => [
        ...prev,
        {
          status: value,
          date: new Date().toLocaleString(),
          updatedBy: "Admin User", // Replace with logged-in user later
        },
      ]);
      setFormData({ ...formData, status: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCargoChange = (index, field, value) => {
    const updated = [...cargoItems];
    updated[index][field] = value;
    setCargoItems(updated);
  };

  const addCargoItem = () => {
    setCargoItems([
      ...cargoItems,
      {
        description: "",
        hsnCode: "",
        pcs: 1,
        boxNumbers: "",
        weight: 0,
        invoiceValue: 0,
        unitPrice: 0,
      },
    ]);
  };

  const removeCargoItem = (index) => {
    setCargoItems(cargoItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return cargoItems.reduce((sum, item) => sum + item.pcs * item.unitPrice, 0);
  };

  const calculateTotalWeight = () => {
    return cargoItems.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  };

  const calculateTotalBoxes = () => {
    return cargoItems.reduce((sum, item) => sum + Number(item.pcs || 0), 0);
  };

  const tax = calculateSubtotal() * 0.05;
  const total = calculateSubtotal() + tax;

  const handleExcelImport = () => {
    alert("Excel Import feature coming soon!");
    // Later, implement Excel parsing & bulk cargo item addition
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
        <h2 className="text-2xl font-bold mb-6">Create Shipment</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipment ID */}
            <div>
              <label className="block text-sm font-medium mb-1">Shipment ID</label>
              <input
                type="text"
                value={formData.shipmentId}
                readOnly
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
              />
            </div>

            {/* AWB Number */}
            <div>
              <label className="block text-sm font-medium mb-1">AWB Number</label>
              <input
                type="text"
                name="awbNumber"
                value={formData.awbNumber}
                onChange={handleChange}
                placeholder="Enter AWB Number"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            {/* Shipment Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Shipment Type</label>
              <select
                name="shipmentType"
                value={formData.shipmentType}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Shipment Type</option>
                {shipmentTypes.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Shipment Status */}
            <div>
              <label className="block text-sm font-medium mb-1">Shipment Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                {shipmentStatuses.map((status, idx) => (
                  <option key={idx} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Port of Origin */}
            <div>
              <label className="block text-sm font-medium mb-1">Port of Origin</label>
              <select
                name="portOfOrigin"
                value={formData.portOfOrigin}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Origin Port</option>
                {portsOfOrigin.map((port, idx) => (
                  <option key={idx} value={port}>
                    {port}
                  </option>
                ))}
              </select>
            </div>

            {/* Port of Destination */}
            <div>
              <label className="block text-sm font-medium mb-1">Port of Destination</label>
              <select
                name="portOfDestination"
                value={formData.portOfDestination}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Destination Port</option>
                {portsOfDestination.map((port, idx) => (
                  <option key={idx} value={port}>
                    {port}
                  </option>
                ))}
              </select>
            </div>

            {/* Clearing Agent */}
            <div>
              <label className="block text-sm font-medium mb-1">Clearing Agent</label>
              <select
                name="clearingAgent"
                value={formData.clearingAgent}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Clearing Agent</option>
                {clearingAgents.map((agent, idx) => (
                  <option key={idx} value={agent}>
                    {agent}
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

          {/* Sender & Receiver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sender */}
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

            {/* Receiver */}
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
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end mb-3 border p-3 rounded-lg bg-gray-50"
              >
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    handleCargoChange(index, "description", e.target.value)
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="HSN Code"
                  value={item.hsnCode}
                  onChange={(e) =>
                    handleCargoChange(index, "hsnCode", e.target.value)
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Pcs"
                  value={item.pcs}
                  onChange={(e) =>
                    handleCargoChange(index, "pcs", parseInt(e.target.value))
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Box Numbers"
                  value={item.boxNumbers}
                  onChange={(e) =>
                    handleCargoChange(index, "boxNumbers", e.target.value)
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Weight"
                  value={item.weight}
                  onChange={(e) =>
                    handleCargoChange(index, "weight", parseFloat(e.target.value))
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleCargoChange(index, "unitPrice", parseFloat(e.target.value))
                  }
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Invoice Value"
                  value={item.invoiceValue}
                  onChange={(e) =>
                    handleCargoChange(index, "invoiceValue", parseFloat(e.target.value))
                  }
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
              Subtotal:{" "}
              <span className="font-semibold">
                ${calculateSubtotal().toFixed(2)}
              </span>
            </p>
            <p className="text-sm">
              Tax (5%): <span className="font-semibold">${tax.toFixed(2)}</span>
            </p>
            <p className="text-sm">
              <span className="font-semibold">Total Weight:</span>{" "}
              {calculateTotalWeight()} Kg
            </p>
            <p className="text-sm">
              <span className="font-semibold">Total Box Count:</span>{" "}
              {calculateTotalBoxes()}
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
                    <span className="font-medium">{log.status}</span> —{" "}
                    {log.date} by {log.updatedBy}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit */}
          <div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
            >
              Create Shipment & Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCargo;