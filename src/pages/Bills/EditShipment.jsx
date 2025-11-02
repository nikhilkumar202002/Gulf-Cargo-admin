import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getBillShipmentById,
  updateBillShipment,
} from "../../api/billShipmentApi";
import { getPhysicalBills } from "../../api/billApi";
import { FaArrowLeft, FaSave } from "react-icons/fa";

/* --- Helpers --- */
const fmtDateInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
};

export default function EditShipment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState(null);
  const [bills, setBills] = useState([]);
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchShipment = async () => {
      setLoading(true);
      try {
        const res = await getBillShipmentById(id);
        const data = res?.data?.data || res?.data || res;
        setShipment(data);
        const attachedIds = (data?.custom_shipments || []).map((b) => b.id);
        setSelectedBillIds(attachedIds);
      } catch (e) {
        console.error("Failed to load shipment:", e);
        setError("Failed to load shipment details.");
      } finally {
        setLoading(false);
      }
    };
    fetchShipment();
  }, [id]);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await getPhysicalBills({ search }, false); // only is_shipment=0
        setBills(res || []);
      } catch (e) {
        console.warn("Failed to load available bills:", e);
      }
    };
    fetchBills();
  }, [search]);

  const handleToggleBill = (billId) => {
    setSelectedBillIds((prev) =>
      prev.includes(billId)
        ? prev.filter((x) => x !== billId)
        : [...prev, billId]
    );
  };

  const handleChange = (field, value) => {
    setShipment((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!shipment) return;
    setSaving(true);
    try {
      const payload = {
        shipment_number: shipment.shipment_number,
        origin_port_id: Number(shipment.origin_port_id || shipment.origin_port?.id),
        destination_port_id: Number(shipment.destination_port_id || shipment.destination_port?.id),
        shipping_method_id: Number(shipment.shipping_method_id || shipment.shipping_method?.id),
        awb_or_container_number: shipment.awb_or_container_number,
        created_on: shipment.created_on || new Date().toISOString(),
        branch_id: Number(shipment.branch_id),
        shipment_status_id: Number(shipment.shipment_status_id || shipment.status?.id),
        custom_shipment_ids: selectedBillIds,
      };
      await updateBillShipment(id, payload);
      navigate("/shipments");
    } catch (e) {
      console.error("Save error:", e);
      setError("Failed to update shipment.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-gray-600 text-center">Loading shipment details...</div>
    );
  if (error)
    return <div className="p-8 text-red-600 text-center">{error}</div>;
  if (!shipment)
    return <div className="p-8 text-gray-500 text-center">Shipment not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-700 hover:text-indigo-600"
        >
          <FaArrowLeft /> Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm disabled:opacity-60"
        >
          <FaSave /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Shipment Details */}
      <div className="rounded-xl border bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Edit Shipment Details</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-600">Shipment Number</label>
            <input
              type="text"
              value={shipment.shipment_number || ""}
              onChange={(e) => handleChange("shipment_number", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-600">AWB / Container Number</label>
            <input
              type="text"
              value={shipment.awb_or_container_number || ""}
              onChange={(e) =>
                handleChange("awb_or_container_number", e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-600">Origin Port ID</label>
            <input
              type="number"
              value={shipment.origin_port_id || shipment.origin_port?.id || ""}
              onChange={(e) => handleChange("origin_port_id", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-600">Destination Port ID</label>
            <input
              type="number"
              value={shipment.destination_port_id || shipment.destination_port?.id || ""}
              onChange={(e) => handleChange("destination_port_id", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-600">Shipping Method ID</label>
            <input
              type="number"
              value={shipment.shipping_method_id || shipment.shipping_method?.id || ""}
              onChange={(e) =>
                handleChange("shipping_method_id", e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-600">Branch ID</label>
            <input
              type="number"
              value={shipment.branch_id || ""}
              onChange={(e) => handleChange("branch_id", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-600">Shipment Status ID</label>
            <input
              type="number"
              value={
                shipment.shipment_status_id || shipment.status?.id || ""
              }
              onChange={(e) =>
                handleChange("shipment_status_id", e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-600">Created On</label>
            <input
              type="date"
              value={fmtDateInput(shipment.created_on)}
              onChange={(e) => handleChange("created_on", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
        </div>
      </div>

      {/* Bill Selection */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Add Bills</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bills..."
            className="border rounded-lg px-3 py-2"
          />
        </div>
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 border">Select</th>
                <th className="p-2 border">Bill No</th>
                <th className="p-2 border">Pcs</th>
                <th className="p-2 border">Weight (kg)</th>
                <th className="p-2 border">Destination</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={selectedBillIds.includes(b.id)}
                      onChange={() => handleToggleBill(b.id)}
                    />
                  </td>
                  <td className="p-2 border">{b.invoice_no || "—"}</td>
                  <td className="p-2 border">{b.pcs || "—"}</td>
                  <td className="p-2 border">{b.weight || "—"}</td>
                  <td className="p-2 border">{b.des || "—"}</td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-gray-500"
                  >
                    No available bills found (is_shipment=0).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
