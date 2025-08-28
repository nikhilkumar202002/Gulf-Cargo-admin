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

  const [formData, setFormData] = useState({
    shipmentId: "AUTO-123456", // placeholder, replace with backend ID later
    senderId: "",
    receiverId: "",
    status: "Pending",
    notes: "",
  });

  const [cargoItems, setCargoItems] = useState([
    { description: "", quantity: 1, weight: 0, unitPrice: 0 },
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCargoChange = (index, field, value) => {
    const updated = [...cargoItems];
    updated[index][field] = value;
    setCargoItems(updated);
  };

  const addCargoItem = () => {
    setCargoItems([
      ...cargoItems,
      { description: "", quantity: 1, weight: 0, unitPrice: 0 },
    ]);
  };

  const removeCargoItem = (index) => {
    setCargoItems(cargoItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return cargoItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  };

  const tax = calculateSubtotal() * 0.05; // 5% tax
  const total = calculateSubtotal() + tax;

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Shipment Created:", {
      ...formData,
      cargoItems,
      total,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Create Shipment</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Shipment ID
              </label>
              <input
                type="text"
                value={formData.shipmentId}
                readOnly
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option>Pending</option>
                <option>In Transit</option>
                <option>Delivered</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>

          {/* Sender & Receiver */}
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
              <label className="block text-sm font-medium mb-1">
                Receiver
              </label>
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

            {/* Column Headers */}
            <div className="hidden md:grid grid-cols-5 gap-3 mb-2 text-sm font-medium text-gray-600">
              <span className="col-span-2">Description</span>
              <span>Quantity</span>
              <span>Unit Price</span>
            </div>

            {cargoItems.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end mb-3 border p-3 rounded-lg bg-gray-50"
              >
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    handleCargoChange(index, "description", e.target.value)
                  }
                  className="border rounded-lg px-3 py-2 col-span-2"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) =>
                    handleCargoChange(index, "quantity", parseInt(e.target.value))
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
                <button
                  type="button"
                  onClick={() => removeCargoItem(index)}
                  className="bg-red-500 text-white rounded-lg px-3 py-2 hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addCargoItem}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              + Add Cargo Item
            </button>
          </div>


          {/* Totals */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm">
              Subtotal:{" "}
              <span className="font-semibold">
                ${calculateSubtotal().toFixed(2)}
              </span>
            </p>
            <p className="text-sm">
              Tax (5%): <span className="font-semibold">${tax.toFixed(2)}</span>
            </p>
            <p className="text-lg font-bold">Total: ${total.toFixed(2)}</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              rows="3"
            />
          </div>

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
