import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { getPorts } from "../../api/portApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getActiveBranches } from "../../api/branchApi";
import { getParties, getPartiesByCustomerType } from "../../api/partiesApi";
import {
  createShipmentMultipart,
  FILE_SIZE_2MB,
  assertMaxFileSize,
} from "../../api/shipmentsApi";

function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

const Spinner = ({ className = "h-4 w-4 text-indigo-600" }) => (
  <svg className={classNames("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// —— helpers to read API lists ——
const labelOf = (o, fall = "-") =>
  o?.name ?? o?.title ?? o?.label ?? o?.company_name ?? o?.branch_name ?? fall;

const idOf = (o) => o?.id ?? o?.party_id ?? o?._id ?? o?.value ?? String(labelOf(o));

const toList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

// Optional party filters if your API supports them
const SENDER_CUSTOMER_TYPE_ID = null;   // e.g. 1
const RECEIVER_CUSTOMER_TYPE_ID = null; // e.g. 2

export default function CreateCargo() {
  const { token } = useAuth();

  // Dropdown data
  const [methods, setMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [ports, setPorts] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loadingOpts, setLoadingOpts] = useState(true);
  const [loadingParties, setLoadingParties] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });

  // Parties
  const [senders, setSenders] = useState([]);
  const [receivers, setReceivers] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
const [receipt, setReceipt] = useState(null); // will store submitted snapshot + tracking
const fileInputRef = useRef(null);


  const today = () => new Date().toISOString().split("T")[0];

  // Core form
  const [formData, setFormData] = useState({
    awbNumber: "",
    shipmentMethodId: "",
    shipmentStatusId: "",
    originPortId: "",
    destinationPortId: "",
    clearingAgentId: "",
    senderId: "",
    receiverId: "",
    createdOn: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    notes: "",
    remarks: "", // will be sent as internal_remarks
  });

  // Items
  const [cargoItems, setCargoItems] = useState([
    { description: "", hsnCode: "", pcs: 1, boxNumbers: "", weight: 0, invoiceValue: 0, unitPrice: 0 },
  ]);

  // Local status log (display only)
  const [statusLog, setStatusLog] = useState([]);

  // Documents: normal upload shape -> { file: File, type: string }
  const [documents, setDocuments] = useState([]); // [{file, type}, ...]

  // —— payload builder (matches your backend names) ——
  function buildShipmentPayload({ formData, cargoItems }) {
    return {
      awb_number: formData.awbNumber?.trim() || null,
      shipment_method_id: formData.shipmentMethodId ? Number(formData.shipmentMethodId) : null,
      shipment_status_id: formData.shipmentStatusId ? Number(formData.shipmentStatusId) : null,
      origin_port_id: formData.originPortId ? Number(formData.originPortId) : null,
      destination_port_id: formData.destinationPortId ? Number(formData.destinationPortId) : null,
      clearing_agent_id: formData.clearingAgentId ? Number(formData.clearingAgentId) : null,
      sender_id: formData.senderId ? Number(formData.senderId) : null,
      receiver_id: formData.receiverId ? Number(formData.receiverId) : null,
      created_date: formData.createdOn,              // server requires created_date
      notes: formData.notes || "",
      internal_remarks: formData.remarks || "",      // per your screenshot
      items: cargoItems.map((it) => ({
        description: it.description || "",
        hsn_code: it.hsnCode || "",
        no_of_pieces: Number(it.pcs || 0),
        box_number: it.boxNumbers || "",
        weight: Number(it.weight || 0),
        unit_price: Number(it.unitPrice || 0),
        invoice_value: Number(it.invoiceValue || 0),
      })),
    };
  }

  // —— fetch dropdowns ——
  useEffect(() => {
    (async () => {
      setLoadingOpts(true);
      setMsg({ text: "", variant: "" });
      try {
        const [methodList, statusList, portListActive, branchList] = await Promise.all([
          getActiveShipmentMethods(token),
          getActiveShipmentStatuses(token),
          getPorts({ status: 1 }, token),
          getActiveBranches(),
        ]);
        setMethods(toList(methodList));
        setStatuses(toList(statusList));
        setPorts(toList(portListActive));
        setBranches(toList(branchList));
      } catch (err) {
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

  // —— fetch parties ——
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingParties(true);
      try {
        const senderPromise = SENDER_CUSTOMER_TYPE_ID != null
          ? getPartiesByCustomerType(SENDER_CUSTOMER_TYPE_ID, { status: 1 })
          : getParties({ status: 1 });

        const receiverPromise = RECEIVER_CUSTOMER_TYPE_ID != null
          ? getPartiesByCustomerType(RECEIVER_CUSTOMER_TYPE_ID, { status: 1 })
          : getParties({ status: 1 });

        const [senderRes, receiverRes] = await Promise.all([senderPromise, receiverPromise]);

        if (!cancelled) {
          setSenders(toList(senderRes));
          setReceivers(toList(receiverRes));
        }
      } catch (err) {
        console.error("Failed to load parties", err?.response || err);
        if (!cancelled) {
          setMsg({
            text: err?.response?.data?.message || "Failed to load party lists.",
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) setLoadingParties(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // —— totals for display only ——
  const calculateSubtotal = () =>
    cargoItems.reduce((sum, item) => sum + Number(item.pcs || 0) * Number(item.unitPrice || 0), 0);
  const calculateTotalWeight = () =>
    cargoItems.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const calculateTotalBoxes = () =>
    cargoItems.reduce((sum, item) => sum + Number(item.pcs || 0), 0);
  const tax = calculateSubtotal() * 0.05;
  const total = calculateSubtotal() + tax;

  // —— handlers ——
  const handleChange = (e) => {
    const { name, value } = e.target;
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

  // —— documents (“normal upload”: documents[i][file] + documents[i][type]) ——
  const onDocsSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    // size guard
    try {
      selected.forEach((f) => assertMaxFileSize(f, FILE_SIZE_2MB));
    } catch (err) {
      setMsg({ text: err.message, variant: "error" });
      e.target.value = "";
      return;
    }
    const mapped = selected.map((file) => ({
      file,
      // default type — user can edit later
      type: file.type.startsWith("image/") ? "Image" : file.type === "application/pdf" ? "PDF" : "Other",
    }));
    setDocuments((prev) => [...prev, ...mapped]);
    e.target.value = "";
  };

  const removeDoc = (idx) => setDocuments((prev) => prev.filter((_, i) => i !== idx));

  const changeDocType = (idx, nextType) =>
    setDocuments((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], type: nextType };
      return copy;
    });

  // —— submit (multipart) ——
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", variant: "" });
    setFieldErrors(null);

    const missing = [];
    if (!formData.awbNumber?.trim()) missing.push("AWB Number");
    if (!formData.shipmentMethodId)   missing.push("Shipment Method");
    if (!formData.shipmentStatusId)   missing.push("Shipment Status");
    if (!formData.originPortId)       missing.push("Origin Port");
    if (!formData.destinationPortId)  missing.push("Destination Port");
    if (!formData.senderId)           missing.push("Sender");
    if (!formData.receiverId)         missing.push("Receiver");
    if (!formData.createdOn)          missing.push("Created Date");
    const hasValidItem = cargoItems.some((it) => (it.description?.trim() || "") && Number(it.pcs || 0) > 0);
    if (!hasValidItem) missing.push("At least 1 cargo item (desc + pcs)");

    if (missing.length) {
      setMsg({ text: `Missing required: ${missing.join(", ")}`, variant: "error" });
      return;
    }

    // Validate file sizes (again) before submit
    try {
      documents.forEach((d) => assertMaxFileSize(d.file, FILE_SIZE_2MB));
    } catch (err) {
      setMsg({ text: err.message || "File too large (max 2MB).", variant: "error" });
      return;
    }

    const payload = buildShipmentPayload({ formData, cargoItems });

    setSubmitting(true);
  try {
  const res = await createShipmentMultipart(payload, documents);
  const trackingCode = extractTracking(res);

  // snapshot BEFORE reset for the receipt modal
  const summary = {
    trackingCode,
    awbNumber: formData.awbNumber,
    shipmentMethod: labelById(methods, formData.shipmentMethodId),
    shipmentStatus: labelById(statuses, formData.shipmentStatusId),
    originPort: labelById(ports, formData.originPortId),
    destinationPort: labelById(ports, formData.destinationPortId),
    clearingAgent: labelById(branches, formData.clearingAgentId),
    sender: labelById(senders, formData.senderId),
    receiver: labelById(receivers, formData.receiverId),
    createdOn: formData.createdOn,
    notes: formData.notes,
    remarks: formData.remarks,
    items: [...cargoItems],
    documents: documents.map((d) => ({ name: d.file.name, size: d.file.size, type: d.type })),
  };

  // open modal
  setReceipt(summary);
  setShowReceipt(true);

  // reset all fields
  setFormData({ ...INITIAL_FORM, createdOn: today() });
  setCargoItems([ { ...EMPTY_ITEM } ]);
  setDocuments([]);
  setStatusLog([]);
  setFieldErrors(null);
  if (fileInputRef.current) fileInputRef.current.value = "";

  setMsg({ text: "✅ Shipment created successfully.", variant: "success" });
  console.log("CreateShipment response:", res);
} catch (err) {
  console.error("createShipment error:", err.server || err);
  setMsg({ text: err.message || "Failed to create shipment.", variant: "error" });
  if (err.status === 422 && err.errors) setFieldErrors(err.errors);
} finally {
  setSubmitting(false);
}
  }

  const EMPTY_ITEM = { description: "", hsnCode: "", pcs: 1, boxNumbers: "", weight: 0, invoiceValue: 0, unitPrice: 0 };
const INITIAL_FORM = {
  awbNumber: "",
  shipmentMethodId: "",
  shipmentStatusId: "",
  originPortId: "",
  destinationPortId: "",
  clearingAgentId: "",
  senderId: "",
  receiverId: "",
  createdOn: today(),
  notes: "",
  remarks: "",
};

const extractTracking = (res) =>
  res?.tracking_code || res?.tracking_no || res?.tracking ||
  res?.data?.tracking_code || res?.data?.tracking_no || res?.data?.tracking ||
  res?.reference || res?.code || null;

// label by id (for summary)
const labelById = (arr, id) => {
  if (id == null || id === "") return "-";
  const found = (arr || []).find((x) => String((x?.id ?? x?.party_id ?? x?._id ?? x?.value ?? "")) === String(id));
  return found ? (found?.name ?? found?.title ?? found?.label ?? found?.company_name ?? found?.branch_name ?? "-") : "-";
};

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create Shipment</h2>
          {(loadingOpts || loadingParties) && (
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

        {fieldErrors && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm">
            <div className="font-semibold mb-1">Validation errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(fieldErrors).map(([k, v]) => (
                <li key={k}>
                  <span className="font-medium">{k}</span>: {Array.isArray(v) ? v.join(", ") : String(v)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option key={idOf(m)} value={idOf(m)}>
                    {labelOf(m)}
                  </option>
                ))}
              </select>
            </div>

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
                  <option key={idOf(s)} value={idOf(s)}>{labelOf(s)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Origin Port</label>
              <select
                name="originPortId"
                value={formData.originPortId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                disabled={loadingOpts}
              >
                <option value="">Select Origin Port</option>
                {ports.map((p) => (
                  <option key={idOf(p)} value={idOf(p)}>
                    {p.code ? `${labelOf(p)} (${p.code})` : labelOf(p)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Destination Port</label>
              <select
                name="destinationPortId"
                value={formData.destinationPortId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                disabled={loadingOpts}
              >
                <option value="">Select Destination Port</option>
                {ports.map((p) => (
                  <option key={idOf(p)} value={idOf(p)}>
                    {p.code ? `${labelOf(p)} (${p.code})` : labelOf(p)}
                  </option>
                ))}
              </select>
            </div>

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
                  <option key={idOf(b)} value={idOf(b)}>{labelOf(b)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Created Date</label>
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
            <div>
              <label className="block text-sm font-medium mb-1">Sender</label>
              <select
                name="senderId"
                value={formData.senderId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                disabled={loadingParties}
              >
                <option value="">{loadingParties ? "Loading..." : "Select Sender"}</option>
                {senders.map((s) => (
                  <option key={idOf(s)} value={idOf(s)}>
                    {labelOf(s)}{s?.address ? ` (${s.address})` : ""}
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
                disabled={loadingParties}
              >
                <option value="">{loadingParties ? "Loading..." : "Select Receiver"}</option>
                {receivers.map((r) => (
                  <option key={idOf(r)} value={idOf(r)}>
                    {labelOf(r)}{r?.address ? ` (${r.address})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Cargo Information</h3>
            <div className="hidden md:grid grid-cols-8 gap-3 mb-2 text-sm font-medium text-gray-600">
              <span>Description</span>
              <span>HSN Code</span>
              <span>No. of Pcs</span>
              <span>Box Number</span>
              <span>Weight (Kg)</span>
              <span>Unit Price</span>
              <span>Invoice Value</span>
              <span>Action</span>
            </div>

            {cargoItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end mb-3 border p-3 rounded-lg bg-gray-50">
                <input type="text" placeholder="Description" value={item.description}
                  onChange={(e) => handleCargoChange(index, "description", e.target.value)}
                  className="border rounded-lg px-3 py-2" />
                <input type="text" placeholder="HSN Code" value={item.hsnCode}
                  onChange={(e) => handleCargoChange(index, "hsnCode", e.target.value)}
                  className="border rounded-lg px-3 py-2" />
                <input type="number" placeholder="Pcs" value={item.pcs}
                  onChange={(e) => handleCargoChange(index, "pcs", parseInt(e.target.value || 0, 10))}
                  className="border rounded-lg px-3 py-2" />
                <input type="text" placeholder="Box Number" value={item.boxNumbers}
                  onChange={(e) => handleCargoChange(index, "boxNumbers", e.target.value)}
                  className="border rounded-lg px-3 py-2" />
                <input type="number" placeholder="Weight" value={item.weight}
                  onChange={(e) => handleCargoChange(index, "weight", parseFloat(e.target.value || 0))}
                  className="border rounded-lg px-3 py-2" />
                <input type="number" placeholder="Unit Price" value={item.unitPrice}
                  onChange={(e) => handleCargoChange(index, "unitPrice", parseFloat(e.target.value || 0))}
                  className="border rounded-lg px-3 py-2" />
                <input type="number" placeholder="Invoice Value" value={item.invoiceValue}
                  onChange={(e) => handleCargoChange(index, "invoiceValue", parseFloat(e.target.value || 0))}
                  className="border rounded-lg px-3 py-2" />
                <button type="button" onClick={() => removeCargoItem(index)}
                  className="bg-red-500 text-white rounded-lg px-3 py-2 hover:bg-red-600">
                  Remove
                </button>
              </div>
            ))}

            <div className="flex gap-4">
              <button type="button" onClick={addCargoItem}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                + Add Cargo Item
              </button>
              <button type="button" onClick={() => alert("Excel Import feature coming soon!")}
                className="mt-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600">
                Import from Excel
              </button>
            </div>
          </div>

          {/* Totals (display only) */}
          <div className="bg-gray-100 p-4 rounded-lg space-y-2">
            <p className="text-sm">Subtotal: <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span></p>
            <p className="text-sm">Tax (5%): <span className="font-semibold">${tax.toFixed(2)}</span></p>
            <p className="text-sm"><span className="font-semibold">Total Weight:</span> {calculateTotalWeight()} Kg</p>
            <p className="text-sm"><span className="font-semibold">Total Box Count:</span> {calculateTotalBoxes()}</p>
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

         
      {/* Documents: NORMAL UPLOAD (documents[i][file] only; max 2MB) */}
<div>
  <label className="block text-sm font-medium mb-1">Documents</label>
  <input
    type="file"
    onChange={onDocsSelect}
    multiple
    ref={fileInputRef}
    className="w-full border rounded-lg px-3 py-2"
  />

  {documents.length > 0 && (
    <div className="mt-2 space-y-2">
      {documents.map((d, idx) => (
        <div key={idx} className="flex items-center gap-3 text-sm">
          <span className="flex-1">
            📄 {d.file.name}{" "}
            <span className="text-gray-500">
              ({Math.ceil(d.file.size / 1024)} KB)
            </span>
          </span>
          {/* No dropdown, no remove button */}
        </div>
      ))}
      <p className="text-xs text-gray-500">
        Max 2MB per file. Larger files are rejected automatically.
      </p>
    </div>
  )}
</div>


          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={submitting}
              className={classNames(
                "w-full py-3 rounded-lg",
                submitting ? "bg-green-400 cursor-not-allowed text-white" : "bg-green-600 hover:bg-green-700 text-white"
              )}
              onClick={handleSubmit}
            >
              {submitting ? "Creating…" : "Create Shipment & Generate Invoice"}
            </button>
          </div>
        </form>
      </div>

      {showReceipt && receipt && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-bold">Shipment Created</h3>
        <button
          className="text-gray-500 hover:text-black"
          onClick={() => setShowReceipt(false)}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Tracking Highlight */}
      <div className="mt-4">
        <div className="text-sm text-gray-600 mb-1">Tracking Number</div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-xl bg-yellow-100 text-yellow-900 font-extrabold text-lg tracking-wide px-3 py-1">
            {receipt.trackingCode || "—"}
          </span>
          <button
            type="button"
            onClick={() => receipt.trackingCode && navigator.clipboard.writeText(receipt.trackingCode)}
            className="text-xs px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div><div className="text-gray-500">AWB</div><div className="font-medium">{receipt.awbNumber || "-"}</div></div>
        <div><div className="text-gray-500">Status</div><div className="font-medium">{receipt.shipmentStatus}</div></div>
        <div><div className="text-gray-500">Method</div><div className="font-medium">{receipt.shipmentMethod}</div></div>
        <div><div className="text-gray-500">Created On</div><div className="font-medium">{receipt.createdOn}</div></div>
        <div><div className="text-gray-500">Origin</div><div className="font-medium">{receipt.originPort}</div></div>
        <div><div className="text-gray-500">Destination</div><div className="font-medium">{receipt.destinationPort}</div></div>
        <div><div className="text-gray-500">Clearing Agent</div><div className="font-medium">{receipt.clearingAgent}</div></div>
        <div><div className="text-gray-500">Sender → Receiver</div><div className="font-medium">{receipt.sender} → {receipt.receiver}</div></div>
      </div>

      {/* Items */}
      <div className="mt-6">
        <div className="text-sm text-gray-600 mb-2">Items ({receipt.items?.length || 0})</div>
        <div className="max-h-48 overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Description</th>
                <th className="text-right p-2">Pcs</th>
                <th className="text-right p-2">Weight</th>
                <th className="text-right p-2">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items?.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{it.description || "-"}</td>
                  <td className="p-2 text-right">{it.pcs ?? "-"}</td>
                  <td className="p-2 text-right">{it.weight ?? "-"}</td>
                  <td className="p-2 text-right">{it.invoiceValue ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Docs */}
      {!!receipt.documents?.length && (
        <div className="mt-6">
          <div className="text-sm text-gray-600 mb-2">Documents</div>
          <ul className="text-sm list-disc list-inside">
            {receipt.documents.map((d, i) => (
              <li key={i}>
                {d.name} <span className="text-gray-500">({Math.ceil(d.size / 1024)} KB, {d.type})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setShowReceipt(false)}
        >
          Done
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
