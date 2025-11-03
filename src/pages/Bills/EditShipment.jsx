import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getBillShipmentById,
  updateBillShipment,
} from "../../api/billShipmentApi";
import { getPhysicalBills } from "../../api/billApi";
import { getActivePorts } from "../../api/portApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { FaArrowLeft, FaSave, FaPlus } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

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
  const [ports, setPorts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [methods, setMethods] = useState([]);
  const [bills, setBills] = useState([]);
  const [attachedBills, setAttachedBills] = useState([]);
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // pagination states
  const [selPage, setSelPage] = useState(1);
  const [availPage, setAvailPage] = useState(1);
  const pageSize = 10;

  /* --- Load dropdowns + shipment --- */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [portRes, statusRes, methodRes] = await Promise.all([
          getActivePorts(),
          getActiveShipmentStatuses(),
          getActiveShipmentMethods(),
        ]);
        setPorts(portRes);
        setStatuses(statusRes);
        setMethods(methodRes);

        const shipmentRes = await getBillShipmentById(id);
        const data = shipmentRes?.data?.data || shipmentRes?.data || shipmentRes;

        setShipment({
          ...data,
          origin_port_id: data.origin_port_id ?? data.origin_port?.id ?? "",
          destination_port_id: data.destination_port_id ?? data.destination_port?.id ?? "",
          shipping_method_id: data.shipping_method_id ?? data.shipping_method?.id ?? "",
          shipment_status_id: data.shipment_status_id ?? data.status?.id ?? "",
          branch_id: data.branch_id ?? data.branch?.id ?? "",
          branch_name: data.branch?.name || data.branch_name || "",
        });

        const attached = (data?.custom_shipments || []).map((b) => b.id);
        setSelectedBillIds(attached);

        // Fetch details for already attached bills
        if (attached.length > 0) {
          const attachedBillsRes = await getPhysicalBills({ ids: attached.join(',') });
          setAttachedBills(attachedBillsRes || []);
        }

      } catch (err) {
        console.error("Error loading data:", err);
        toast.error("Failed to load shipment or dropdown data.");
        setError("Failed to load shipment or reference data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  /* --- Fetch available bills not in shipment --- */
  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await getPhysicalBills({ is_shipment: 0, search });
        setBills(res || []);
      } catch (e) {
        console.warn("Failed to load available bills:", e);
      }
    };
    fetchBills();
  }, [search]);

  /* --- Handlers --- */
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

  const handleAddBills = () => {
    if (selectedBillIds.length === 0) {
      toast.error("Please select at least one bill to add.");
      return;
    }
    toast.success(`${selectedBillIds.length} bill(s) selected.`);
  };

  const handleSave = async () => {
    if (!shipment) return;
    setSaving(true);
    try {
      const formattedDate = new Date(shipment.created_on).toISOString();

      const payload = {
        shipment_number: String(shipment.shipment_number || "").trim(),
        origin_port_id: parseInt(shipment.origin_port_id) || undefined,
        destination_port_id: parseInt(shipment.destination_port_id) || undefined,
        shipping_method_id: parseInt(shipment.shipping_method_id) || undefined,
        awb_or_container_number: String(shipment.awb_or_container_number || "").trim(),
        created_on: formattedDate,
        branch_id: parseInt(shipment.branch_id) || undefined,
        shipment_status_id: parseInt(shipment.shipment_status_id) || undefined,
        custom_shipment_ids:
          Array.isArray(selectedBillIds) && selectedBillIds.length > 0
            ? selectedBillIds
            : undefined,
      };
      await updateBillShipment(id, payload);

      toast.success("Shipment updated successfully!");
      setTimeout(() => navigate("/bills-shipments/list"), 1000);
    } catch (e) {
      console.error("Save error:", e.response?.data || e);
      toast.error(
        e.response?.data?.message ||
          "Failed to update shipment. Check console for details."
      );
      setError("Failed to update shipment.");
    } finally {
      setSaving(false);
    }
  };

  /* --- Derived pagination data --- */
  const totalSelPages = Math.max(1, Math.ceil(attachedBills.length / pageSize));
  const pagedSelected = attachedBills.slice(
    (selPage - 1) * pageSize,
    selPage * pageSize
  );

  const totalAvailPages = Math.max(1, Math.ceil(bills.length / pageSize));
  const pagedAvail = bills.slice(
    (availPage - 1) * pageSize,
    availPage * pageSize
  );

  /* --- UI --- */
  if (loading)
    return (
      <div className="p-8 text-gray-600 text-center">
        Loading shipment details...
      </div>
    );

  if (!shipment)
    return (
      <div className="p-8 text-gray-500 text-center">Shipment not found.</div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <Toaster position="top-right" reverseOrder={false} />

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
        <h2 className="text-lg font-semibold text-gray-800">
          Edit Shipment Details
        </h2>
        <div className="grid sm:grid-cols-2 gap-5 text-sm">
          {/* Shipment No */}
          <div>
            <label className="block text-gray-600">Shipment Number</label>
            <input
              type="text"
              value={shipment.shipment_number || ""}
              onChange={(e) => handleChange("shipment_number", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          {/* AWB */}
          <div>
            <label className="block text-gray-600">
              AWB / Container Number
            </label>
            <input
              type="text"
              value={shipment.awb_or_container_number || ""}
              onChange={(e) =>
                handleChange("awb_or_container_number", e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          {/* Origin Port */}
          <div>
            <label className="block text-gray-600">Origin Port</label>
            <select
              value={shipment.origin_port_id || ""}
              onChange={(e) => handleChange("origin_port_id", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Select Origin Port</option>
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Port */}
          <div>
            <label className="block text-gray-600">Destination Port</label>
            <select
              value={shipment.destination_port_id || ""}
              onChange={(e) =>
                handleChange("destination_port_id", e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Select Destination Port</option>
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shipping Method */}
          <div>
            <label className="block text-gray-600">Shipping Method</label>
            <select
              value={shipment.shipping_method_id || ""}
              onChange={(e) =>
                handleChange("shipping_method_id", e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Select Shipping Method</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-gray-600">Branch</label>
            <input
              type="text"
              value={shipment.branch_name || "—"}
              readOnly
              className="border rounded-lg px-3 py-2 w-full bg-gray-50 text-gray-600"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-600">Shipment Status</label>
            <select
              value={shipment.shipment_status_id || ""}
              onChange={(e) =>
                handleChange("shipment_status_id", e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Select Status</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Created */}
          <div>
            <label className="block text-gray-600">Created On</label>
            <input
              type="date"
              value={fmtDateInput(shipment.created_at)}
              onChange={(e) => handleChange("created_at", e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
        </div>
      </div>

      {/* Selected Bills */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Selected Bills ({attachedBills.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-2 border">SL No</th>
                <th className="p-2 border">Bill No</th>
                <th className="p-2 border">Pcs</th>
                <th className="p-2 border">Weight (kg)</th>
                <th className="p-2 border">Destination</th>
              </tr>
            </thead>
            <tbody>
              {pagedSelected.map((b, i) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    {(selPage - 1) * pageSize + i + 1}
                  </td>
                  <td className="p-2 border">{b.invoice_no || "—"}</td>
                  <td className="p-2 border">{b.pcs || "—"}</td>
                  <td className="p-2 border">{b.weight || "—"}</td>
                  <td className="p-2 border">{b.des || "—"}</td>
                </tr>
              ))}
              {pagedSelected.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No bills selected for this shipment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Bills */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Available Bills (Not in Shipment)
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bills..."
              className="border rounded-lg px-3 py-2"
            />
            <button
              onClick={handleAddBills}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
            >
              <FaPlus /> Add Selected
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
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
              {pagedAvail.map((b) => (
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
              {pagedAvail.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No available bills found.
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
