import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getActiveBranches } from "../../api/branchApi";
import { getParties } from "../../api/partiesApi";
import { getAllPaymentMethods } from "../../api/paymentMethod"; 
import { getActiveDeliveryTypes } from "../../api/deliveryType";
import { IoLocationSharp } from "react-icons/io5";
import { MdAddIcCall } from "react-icons/md";
import "./ShipmentStyles.css";

// Helpers
const idOf = (o) => o?.id ?? o?.party_id ?? o?._id ?? o?.value ?? String(o?.name ?? o?.title ?? "");
const labelOf = (o) => o?.name ?? o?.title ?? o?.label ?? o?.company_name ?? o?.branch_name ?? "-";
const toList = (res) =>
  Array.isArray(res) ? res :
  Array.isArray(res?.data?.data) ? res.data.data :
  Array.isArray(res?.data) ? res.data :
  Array.isArray(res?.items) ? res.items :
  Array.isArray(res?.results) ? res.results : [];

const today = () => new Date().toISOString().split("T")[0];

export default function CreateCargo() {
  const token = useSelector((s) => s.auth?.token);

  // Select options
  const [branches, setBranches] = useState([]);
  const [methods, setMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [senders, setSenders] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]); // Add state for payment methods

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });

  const [deliveryTypes, setDeliveryTypes] = useState([]);

  // Form fields shown in the screenshot
  const [form, setForm] = useState({
    bookingNo: "",                      // Basic Info
    branchId: "",

    senderId: "",                       // Sender Info
    senderAddress: "",
    senderPhone: "",

    receiverId: "",                     // Receiver Info
    receiverAddress: "",
    receiverPhone: "",

    shippingMethodId: "",               // Shipping Info
    paymentMethod: "Cash Payment",
    statusId: "",

    date: today(),
    collectedBy: "",
    staffName: "",
    lrlTrackingCode: "",

    deliveryType: "Door To Door",
    time: "09:36",
    valueOfGoods: 0,                    // auto from items subtotal
    specialRemarks: "",
  });

  // Items: Slno, Name, Pieces, Unit Price, Total Price
  const [items, setItems] = useState([{ name: "", pieces: 1, unitPrice: 0 }]);

  // Derived subtotals
  const rowTotal = (it) => Number((Number(it.pieces || 0) * Number(it.unitPrice || 0)).toFixed(2));
  const subtotal = items.reduce((s, it) => s + rowTotal(it), 0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [b, m, s, partiesRaw, paymentMethodsRaw] = await Promise.all([
          getActiveBranches(),
          getActiveShipmentMethods(token),
          getActiveShipmentStatuses(token),
          getParties({ status: 1 }),
          getAllPaymentMethods() // Fetch payment methods
        ]);

        setBranches(toList(b));
        setMethods(toList(m));
        setStatuses(toList(s));
        setPaymentMethods(toList(paymentMethodsRaw)); // Set the payment methods

        const parties = Array.isArray(partiesRaw) ? partiesRaw : partiesRaw?.data ?? [];
        const sendersList = parties.filter((p) => String(p.customer_type_id) === "1");
        const receiversList = parties.filter((p) => String(p.customer_type_id) === "2");
        setSenders(sendersList);
        setReceivers(receiversList);
      } catch (e) {
        setMsg({ text: e?.response?.data?.message || "Failed to load options.", variant: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const response = await getActiveDeliveryTypes(); // Fetch active delivery types
      setDeliveryTypes(response.data); // Set delivery types to state
    } catch (e) {
      console.error("Failed to fetch delivery types:", e);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  // Keep Value of Goods synced with items subtotal (readonly in UI)
  useEffect(() => {
    setForm((f) => ({ ...f, valueOfGoods: Number(subtotal.toFixed(2)) }));
  }, [subtotal]);

  const onForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // helper: find by id in a list
  const findById = (list, id) => list.find((p) => String(idOf(p)) === String(id));
  const selectedSender   = useMemo(() => findById(senders,   form.senderId),   [senders, form.senderId]);
  const selectedReceiver = useMemo(() => findById(receivers, form.receiverId), [receivers, form.receiverId]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      senderAddress: selectedSender?.address ?? "",
      senderPhone: selectedSender?.contact_number ?? "",
    }));
  }, [selectedSender]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      receiverAddress: selectedReceiver?.address ?? "",
      receiverPhone: selectedReceiver?.contact_number ?? "",
    }));
  }, [selectedReceiver]);


  const setItem = (idx, key, val) => {
    setItems((prev) => {
      const next = [...prev];
      if (key === "pieces") {
        next[idx][key] = Number.parseInt(val || 0, 10);
        if (Number.isNaN(next[idx][key])) next[idx][key] = 0;
      } else if (key === "unitPrice") {
        next[idx][key] = Number.parseFloat(val || 0);
        if (Number.isNaN(next[idx][key])) next[idx][key] = 0;
      } else {
        next[idx][key] = val;
      }
      return next;
    });
  };

  const addRow = () => setItems((p) => [...p, { name: "", pieces: 1, unitPrice: 0 }]);
  const removeRow = (idx) => setItems((p) => p.filter((_, i) => i !== idx));
  const clearRows = () => setItems([{ name: "", pieces: 1, unitPrice: 0 }]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", variant: "" });

    // Basic front-end checks
    const missing = [];
    if (!form.bookingNo) missing.push("Booking No");
    if (!form.branchId) missing.push("Branch");
    if (!form.senderId) missing.push("Sender");
    if (!form.receiverId) missing.push("Receiver");
    if (!form.shippingMethodId) missing.push("Shipping Method");
    if (!form.statusId) missing.push("Status");
    if (!form.date) missing.push("Date");

    const validItem = items.some((it) => (it.name?.trim() || "") && Number(it.pieces || 0) > 0);
    if (!validItem) missing.push("At least one item (name + pieces)");

    if (missing.length) {
      setMsg({ text: `Missing: ${missing.join(", ")}`, variant: "error" });
      return;
    }

    // Build minimal payload you can post to your backend
    const payload = {

      branch_id: form.branchId ? Number(form.branchId) : null,
      sender_id: form.senderId ? Number(form.senderId) : null,
      sender_address: form.senderAddress || "",
      sender_phone: form.senderPhone || "",
      receiver_id: form.receiverId ? Number(form.receiverId) : null,
      receiver_address: form.receiverAddress || "",
      receiver_phone: form.receiverPhone || "",
      shipment_method_id: form.shippingMethodId ? Number(form.shippingMethodId) : null,
      payment_method: form.paymentMethod,
      shipment_status_id: form.statusId ? Number(form.statusId) : null,
      created_date: form.date,
      collected_by: form.collectedBy || "",
      staff_name: form.staffName || "",
      lrl_tracking_code: form.lrlTrackingCode || "",
      delivery_type: form.deliveryType,
      time: form.time,
      value_of_goods: Number(form.valueOfGoods || 0),
      remarks: form.specialRemarks || "",

      items: items.map((it, i) => ({
        slno: i + 1,
        name: it.name || "",
        pieces: Number(it.pieces || 0),
        unit_price: Number(it.unitPrice || 0),
        total_price: rowTotal(it),
      })),
      // You can add totals here if your API needs them
      subtotal: Number(subtotal.toFixed(2)),
    };

    // TODO: POST `payload` to your API here.
    console.log("Create Cargo (minimal) payload ->", payload);
    setMsg({ text: "Form prepared. Wire the payload to your API.", variant: "success" });
  };
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-4">Create Shipment</h2>

        {msg.text && (
          <div
            className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
              msg.variant === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={submit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
            <div>
              <label className="block text-sm font-medium mb-1">Branch List</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                name="branchId"
                value={form.branchId}
                onChange={onForm}
                disabled={loading}
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={idOf(b)} value={idOf(b)}>
                    {labelOf(b)}
                  </option>
                ))}
              </select>
            </div>

             <div>
              <label className="block text-sm mb-1">Collected By</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                name="collectedBy"
                value={form.collectedBy}
                onChange={onForm}
                placeholder="Select / Type"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Select Name</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                name="staffName"
                value={form.staffName}
                onChange={onForm}
                placeholder="Select / Type"
              />
            </div>

          </div>

          {/* Sender & Receiver */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Sender */}
  <div className="space-y-3">
    <h3 className="font-semibold">Sender Info</h3>
    <div>
      <label className="block text-sm mb-1">Sender/Customer</label>
      <select
        className="w-full border rounded-lg px-3 py-2"
        name="senderId"
        value={form.senderId}
        onChange={onForm}
        disabled={loading}
      >
        <option value="">Select a sender</option>
        {senders.map((s) => (
          <option key={idOf(s)} value={idOf(s)}>
            {labelOf(s)}
          </option>
        ))}
      </select>
    </div>

    <div className="party-details w-full rounded-lg py-2">
      {/* <label className="block text-sm mb-1">Sender Address</label> */}
      <p className="w-full px-3 flex items-center gap-1">
        <span className="party-details-icon"><IoLocationSharp/></span>{form.senderAddress || "—"}
      </p>
        <p className="w-full px-3 flex items-center gap-1">
        <span className="party-details-icon"><MdAddIcCall/></span>{form.senderPhone || "—"}
      </p>
    </div>
  </div>

  {/* Receiver */}
  <div className="space-y-3">
    <h3 className="font-semibold">Receiver Info</h3>
    <div>
      <label className="block text-sm mb-1">Receiver/Customer</label>
      <select
        className="w-full border rounded-lg px-3 py-2"
        name="receiverId"
        value={form.receiverId}
        onChange={onForm}
        disabled={loading}
      >
        <option value="">Select a receiver</option>
        {receivers.map((r) => (
          <option key={idOf(r)} value={idOf(r)}>
            {labelOf(r)}
          </option>
        ))}
      </select>
    </div>

   <div className="party-details w-full  rounded-lg py-2">
      {/* <label className="block text-sm mb-1">Sender Address</label> */}
      <p className="w-full px-3 flex items-center gap-1">
        <span className="party-details-icon"><IoLocationSharp/></span>{form.receiverAddress || "—"}
      </p>
        <p className="w-full px-3 flex items-center gap-1">
        <span className="party-details-icon"><MdAddIcCall/></span>{form.receiverPhone || "—"}
      </p>
    </div>
  </div>
</div>

          {/* Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Shipping Methods</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                name="shippingMethodId"
                value={form.shippingMethodId}
                onChange={onForm}
                disabled={loading}
              >
                <option value="">Select</option>
                {methods.map((m) => (
                  <option key={idOf(m)} value={idOf(m)}>
                    {labelOf(m)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Payment Method</label>
            <select
                className="w-full border rounded-lg px-3 py-2"
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={onForm}
              >
                <option value="">Select Payment Method</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.name}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Status</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                name="statusId"
                value={form.statusId}
                onChange={onForm}
                disabled={loading}
              >
                <option value="">Select</option>
                {statuses.map((s) => (
                  <option key={idOf(s)} value={idOf(s)}>
                    {labelOf(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row of misc fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Date</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                name="date"
                value={form.date}
                onChange={onForm}
              />
            </div>
           
            <div>
              <label className="block text-sm mb-1">LRL Tracking Code</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                name="lrlTrackingCode"
                value={form.lrlTrackingCode}
                onChange={onForm}
                placeholder="LRL-XXXX"
              />
            </div>
          </div>

          {/* Delivery/time/value/remarks */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
          <label className="block text-sm mb-1">Delivery Type</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            name="deliveryType"
            value={form.deliveryType}
            onChange={onForm}
          >
            {loading ? (
              <option>Loading...</option>
            ) : (
              deliveryTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))
            )}
          </select>
        </div>


            <div>
              <label className="block text-sm mb-1">Time</label>
              <input
                type="time"
                className="w-full border rounded-lg px-3 py-2"
                name="time"
                value={form.time}
                onChange={onForm}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Value of Goods</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                name="valueOfGoods"
                value={form.valueOfGoods}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Special remarks</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                name="specialRemarks"
                value={form.specialRemarks}
                onChange={onForm}
                placeholder="Special remarks"
              />
            </div>
          </div>

          {/* ITEMS: Slno, Name, Pieces, Unit Price, Total Price */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Items</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  + Add Row
                </button>
                <button
                  type="button"
                  onClick={clearRows}
                  className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-[780px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2 w-12 text-center">Slno</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2 w-32 text-right">Pieces</th>
                    <th className="px-3 py-2 w-36 text-right">Unit Price</th>
                    <th className="px-3 py-2 w-36 text-right">Total Price</th>
                    <th className="px-3 py-2 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full border rounded-lg px-3 py-2"
                          placeholder="Item name"
                          value={it.name}
                          onChange={(e) => setItem(i, "name", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-full border rounded-lg px-3 py-2 text-right"
                          placeholder="0"
                          value={it.pieces}
                          onChange={(e) => setItem(i, "pieces", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full border rounded-lg px-3 py-2 text-right"
                          placeholder="0.00"
                          value={it.unitPrice}
                          onChange={(e) => setItem(i, "unitPrice", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {rowTotal(it).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                        No items. Click <b>+ Add Row</b> to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-3 py-2 text-right text-gray-500" colSpan={4}>
                      Subtotal:
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {subtotal.toFixed(2)}
                    </td>
                    <td className="px-3 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg text-white bg-green-600 hover:bg-green-700"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
