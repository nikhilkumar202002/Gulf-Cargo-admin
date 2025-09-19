import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

// ✅ adjust the relative path if your project structure differs
import { createCargo, normalizeCargoToInvoice } from "../../api/createCargoApi";
import InvoiceModal from "../../components/InvoiceModal";

import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getActiveBranches, getBranchUsers } from "../../api/branchApi";
import { getParties } from "../../api/partiesApi";
import { getAllPaymentMethods } from "../../api/paymentMethod";
import { getActiveDeliveryTypes } from "../../api/deliveryType";
import { getActiveDrivers } from "../../api/driverApi";
import { getProfile } from "../../api/accountApi";

import { IoLocationSharp } from "react-icons/io5";
import { MdAddIcCall } from "react-icons/md";
import { BsFillBoxSeamFill } from "react-icons/bs";
import "./ShipmentStyles.css";

/* ---------- Helpers ---------- */
const idOf = (o) =>
  o?.id ?? o?.party_id ?? o?._id ?? o?.value ?? String(o?.name ?? o?.title ?? "");
const labelOf = (o) =>
  o?.name ?? o?.title ?? o?.label ?? o?.company_name ?? o?.branch_name ?? "-";
const toList = (res) =>
  Array.isArray(res) ? res :
    Array.isArray(res?.data?.data) ? res.data.data :
      Array.isArray(res?.data) ? res.data :
        Array.isArray(res?.items) ? res.items :
          Array.isArray(res?.results) ? res.results : [];

const today = () => new Date().toISOString().split("T")[0];

// tiny pickers for current user auto-selects
const pickUserId = (u) => u?.id ?? u?.user_id ?? u?.driver_id ?? null;
const pickUserName = (u) => u?.name ?? u?.username ?? u?.full_name ?? "";
const pickBranchId = (u) => u?.branch_id ?? u?.branchId ?? null;

const getDriverId = (d) => d?.id ?? d?.driver_id ?? null;        // from /drivers
const getStaffId = (u) => u?.id ?? u?.user_id ?? u?.staff_id ?? null; // from /branch users
const getPersonName = (p) =>
  p?.name ?? p?.full_name ?? p?.username ?? p?.title ?? p?.email ?? "User";


export default function CreateCargo() {
  const token = useSelector((s) => s.auth?.token);

  // Select options
  const [branches, setBranches] = useState([]);
  const [methods, setMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [senders, setSenders] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [collectedByOptions, setCollectedByOptions] = useState([]);

  // User/profile/context
  const [userProfile, setUserProfile] = useState(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceShipment, setInvoiceShipment] = useState(null);

  const [collectedById, setCollectedById] = useState("");

  // Form
  const [form, setForm] = useState({
    bookingNo: "",
    branchId: "",
    senderId: "",
    senderAddress: "",
    senderPhone: "",
    receiverId: "",
    receiverAddress: "",
    receiverPhone: "",
    shippingMethodId: "",     // number (required)
    paymentMethodId: "",      // number (required)
    paymentMethod: "",        // optional label, we’ll auto-fill
    statusId: "",             // number (required)
    date: today(),            // required
    userType: "",             // "driver" | "office" -> we map to role text below
    collectedBy: "",          // person id (used for UI only)
    staffName: "",
    lrlTrackingCode: "",      // required
    deliveryTypeId: "",       // number (required)
    deliveryType: "",         // optional label, we’ll auto-fill
    time: "09:36",
    billCharges: 0,           // required
    vatPercentage: 0,         // required
    valueOfGoods: 0,          // derived from items subtotal
    specialRemarks: "",       // required -> goes to special_remarks
  });

  // Items (ensure weight present)
  const [items, setItems] = useState([{ name: "", pieces: 1, unitPrice: 0, weight: 0 }]);

  // Derived totals
  const rowTotal = (it) =>
    Number((Number(it.pieces || 0) * Number(it.unitPrice || 0)).toFixed(2));
  const subtotal = items.reduce((s, it) => s + rowTotal(it), 0);

  /* ---------- initial load ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg({ text: "", variant: "" });
      try {
        const [me, b, m, st, pm, dt] = await Promise.all([
          getProfile(),
          getActiveBranches(),
          getActiveShipmentMethods(),
          getActiveShipmentStatuses(),
          getAllPaymentMethods(),
          getActiveDeliveryTypes(),
        ]);

        setUserProfile(me?.data ?? me ?? null);
        setBranches(toList(b));
        setMethods(toList(m));
        setStatuses(toList(st));
        setPaymentMethods(toList(pm));
        setDeliveryTypes(toList(dt));

        // pre-load parties (coarse search)
        const [snd, rcv] = await Promise.all([
          getParties({ customer_type: "Sender" }),
          getParties({ customer_type: "Receiver" }),
        ]);
        setSenders(toList(snd));
        setReceivers(toList(rcv));
      } catch (e) {
        console.error(e);
        setMsg({
          text: e?.response?.data?.message || "Failed to load options.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // auto-select current user's branch
  useEffect(() => {
    if (!userProfile || !branches.length) return;
    const userBranchId = pickBranchId(userProfile);
    if (!userBranchId) return;
    const matching = branches.find((br) => String(idOf(br)) === String(userBranchId));
    if (matching) {
      setForm((f) =>
        f.branchId && f.branchId === String(idOf(matching))
          ? f
          : { ...f, branchId: String(idOf(matching)) }
      );
    }
  }, [userProfile, branches]);

  // dependent collectedBy list (driver vs office)
  useEffect(() => {
    if (!form.userType) {
      setCollectedByOptions([]);
      setForm((f) => ({ ...f, collectedBy: "", staffName: "" })); // clear on role change
      return;
    }
    (async () => {
      setLoading(true);
      try {
        if (form.userType === "driver") {
          const res = await getActiveDrivers();
          const list = toList(res);
          setCollectedByOptions(list);
          // Do NOT auto-pick current user for drivers; usually not a driver
          setForm((f) => ({ ...f, collectedBy: "", staffName: "" }));
        } else if (form.userType === "office") {
          const branchId = form.branchId || pickBranchId(userProfile);
          if (!branchId) {
            setMsg({ text: "Select a branch first to load office staff.", variant: "error" });
            setCollectedByOptions([]);
            return;
          }
          const res = await getBranchUsers(branchId);
          const list = toList(res);
          setCollectedByOptions(list);

          // If the logged-in user is in this branch list, preselect them
          const me = list.find((u) => String(getStaffId(u)) === String(pickUserId(userProfile)));
          if (me) {
            setForm((f) => ({
              ...f,
              collectedBy: String(getStaffId(me)),
              staffName: getPersonName(me),
            }));
          } else {
            setForm((f) => ({ ...f, collectedBy: "", staffName: "" }));
          }
        }
      } catch (e) {
        console.error(e);
        setCollectedByOptions([]);
        setMsg({ text: "Failed to load list for the selected type.", variant: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [form.userType, form.branchId, userProfile]);

  // selected sender/receiver derived (for address/phone autofill)
  const selectedSender = useMemo(
    () => senders.find((s) => String(idOf(s)) === String(form.senderId)) || null,
    [senders, form.senderId]
  );
  const selectedReceiver = useMemo(
    () => receivers.find((r) => String(idOf(r)) === String(form.receiverId)) || null,
    [receivers, form.receiverId]
  );

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

  // keep "Value of Goods" synced with items subtotal
  useEffect(() => {
    setForm((f) => ({ ...f, valueOfGoods: Number(subtotal.toFixed(2)) }));
  }, [subtotal]);

  /* ---------- handlers ---------- */
  const onForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "userType") {
        next.collectedBy = "";
        next.staffName = "";
      }
      return next;
    });
  };

  const setItem = (idx, key, val) => {
    setItems((prev) => {
      const next = [...prev];
      if (key === "pieces") {
        const n = Number.parseInt(val || 0, 10);
        next[idx][key] = Number.isNaN(n) ? 0 : n;
      } else if (key === "unitPrice" || key === "weight") {
        const n = Number.parseFloat(val || 0);
        next[idx][key] = Number.isNaN(n) ? 0 : n;
      } else {
        next[idx][key] = val;
      }
      return next;
    });
  };

  const billCharges = Number(form.billCharges || 0);
  const vatPercentage = Number(form.vatPercentage || 0);

  const totalCost = Number(subtotal.toFixed(2)); // items sum
  const vatCost = Number(((totalCost * vatPercentage) / 100).toFixed(2)); // VAT on totalCost
  const netTotal = Number((totalCost + billCharges + vatCost).toFixed(2));

  const totalWeight = Number(
    items.reduce((sum, it) => sum + Number(it.weight || 0) * Number(it.pieces || 0), 0).toFixed(3)
  );

  const addRow = () => setItems((p) => [...p, { name: "", pieces: 1, unitPrice: 0, weight: 0 }]);
  const removeRow = (idx) => setItems((p) => p.filter((_, i) => i !== idx));
  const clearRows = () => setItems([{ name: "", pieces: 1, unitPrice: 0, weight: 0 }]);

  /* ---------- SUBMIT ---------- */
 const submit = async (e) => {
  e.preventDefault();

  // sanity checks
  const missing = [];
  if (!form.branchId) missing.push("Branch");
  if (!form.senderId) missing.push("Sender");
  if (!form.receiverId) missing.push("Receiver");
  if (!form.shippingMethodId) missing.push("Shipping Method");
  if (!form.paymentMethodId) missing.push("Payment Method");
  if (!form.statusId) missing.push("Status");
  if (!form.deliveryTypeId) missing.push("Delivery Type");
  if (!form.date) missing.push("Date");
  if (!form.collectedBy) missing.push("Collected By (Person)");
  if (!form.lrlTrackingCode) missing.push("LRL Tracking Code");
  if (!form.specialRemarks) missing.push("Special Remarks");
  if (Number.isNaN(billCharges)) missing.push("Bill Charges");
  if (Number.isNaN(vatPercentage)) missing.push("VAT %");

  if (!items.some(it => (it.name?.trim() || "") && Number(it.pieces || 0) > 0)) {
    missing.push("At least one item (name + pieces)");
  }
  if (items.some(it => Number(it.weight || 0) <= 0)) {
    missing.push("Each item needs weight > 0");
  }
  if (missing.length) {
    setMsg({ text: `Missing/invalid: ${missing.join(", ")}`, variant: "error" });
    return;
  }

  // ✅ define once here
  const collectedByIdNum = Number(form.collectedBy || 0);
let idExists = false;

if (form.userType === "driver") {
  const driverIdOf = (d) => d?.driver_id ?? d?.id ?? null;
  idExists = collectedByOptions.some(d => Number(driverIdOf(d)) === collectedByIdNum);
} else if (form.userType === "office") {
  const staffIdOf = (u) => u?.staff_id ?? u?.user_id ?? u?.id ?? null;
  idExists = collectedByOptions.some(u => Number(staffIdOf(u)) === collectedByIdNum);
} else {
  setMsg({ text: "Choose a role for ‘Collected By’ (Driver/Office).", variant: "error" });
  return;
}

if (!idExists) {
  setMsg({ text: `Selected person doesn’t belong to the ${form.userType} list. Re-select.`, variant: "error" });
  return;
}

  // role text
  const roleText = form.userType === "driver" ? "Driver" : "Office";

  // ✅ payload
  const payload = {
    branch_id: Number(form.branchId),
    sender_id: Number(form.senderId),
    sender_address: form.senderAddress || "",
    sender_phone: form.senderPhone || "",
    receiver_id: Number(form.receiverId),
    receiver_address: form.receiverAddress || "",
    receiver_phone: form.receiverPhone || "",

    shipping_method_id: Number(form.shippingMethodId),
    payment_method_id: Number(form.paymentMethodId),
    status_id: Number(form.statusId),
    date: form.date,
    time: form.time,

   collected_by: form.userType === "driver" ? "Driver" : "Office",
collected_by_id: collectedByIdNum,
name_id: collectedByIdNum, // keep if your backend expects it

    lrl_tracking_code: form.lrlTrackingCode,
    delivery_type_id: Number(form.deliveryTypeId),
    special_remarks: form.specialRemarks,

    total_cost: totalCost,
    bill_charges: billCharges,
    vat_percentage: vatPercentage,
    vat_cost: vatCost,
    net_total: netTotal,
    total_weight: totalWeight,

    items: items.map((it, i) => ({
      slno: i + 1,
      name: it.name || "",
      piece_no: Number(it.pieces || 0),
      weight: Number(it.weight || 0),
      unit_price: Number(it.unitPrice || 0),
      total_price: Number((Number(it.pieces || 0) * Number(it.unitPrice || 0)).toFixed(2)),
    })),
  };

  console.log("Payload before submit:", payload);

  try {
    setLoading(true);
    const created = await createCargo(payload);
    const shipment = normalizeCargoToInvoice(created);
    shipment.invoice_no = shipment.booking_no;
    setInvoiceShipment(shipment);
    setInvoiceOpen(true);
    setMsg({ text: "Cargo created. Invoice ready.", variant: "success" });
  } catch (e) {
    console.error("Create cargo failed:", e);
    setMsg({
      text: e?.response?.data?.message || e?.message || "Failed to create cargo.",
      variant: "error",
    });
  } finally {
    setLoading(false);
  }
};


  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
        <div className="w-full max-w-6xl bg-white rounded-2xl p-8">
          <h2 className="header-cargo-heading flex items-center gap-2">
            <span className="header-cargo-icon"><BsFillBoxSeamFill /></span>
            Create Cargo
          </h2>

          {msg.text && (
            <div
              className={`mb-4 rounded-xl border px-3 py-2 text-sm ${msg.variant === "error"
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
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  name="branchId"
                  value={form.branchId}
                  onChange={onForm}
                  disabled={loading}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={String(idOf(b))} value={String(idOf(b))}>
                      {labelOf(b)}
                    </option>
                  ))}
                </select>
              </div>

            <div>
                    <label className="block text-sm font-medium mb-1">Collected By (Role)</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      name="userType"
                      value={form.userType}
                      onChange={onForm}
                    >
                      <option value="">Select role</option>
                      <option value="driver">Driver</option>
                      <option value="office">Office</option>
                    </select>
                  </div>

           <div>
  <label className="block text-sm font-medium mb-1">Collected By (Person)</label>
  <select
    className="w-full border rounded-lg px-3 py-2"
    name="collectedBy"
    value={form.collectedBy}
    onChange={(e) => {
      const idStr = e.target.value;
      const idNum = Number(idStr || 0);

      let person = null;
      if (form.userType === "driver") {
        person = collectedByOptions.find(d => Number((d?.driver_id ?? d?.id)) === idNum);
      } else if (form.userType === "office") {
        const staffIdOf = (u) => u?.staff_id ?? u?.user_id ?? u?.id ?? null;
        person = collectedByOptions.find(u => Number(staffIdOf(u)) === idNum);
      }

      setForm(f => ({
        ...f,
        collectedBy: idStr,
        staffName: person ? (person.name ?? person.full_name ?? person.username ?? "") : ""
      }));
    }}
  >
    <option value="">Select person</option>
    {collectedByOptions.map((opt, i) => {
      const valueId =
        form.userType === "driver"
          ? (opt?.driver_id ?? opt?.id ?? null)
          : (opt?.staff_id ?? opt?.user_id ?? opt?.id ?? null);

      if (!valueId) return null; // skip entries without a valid id for this role
      const label = opt?.name ?? opt?.full_name ?? opt?.username ?? opt?.email ?? `User ${i + 1}`;
      return (
        <option key={`${form.userType}-${valueId}-${i}`} value={String(valueId)}>
          {label}
        </option>
      );
    })}
  </select>
</div>


            </div>

            {/* Parties */}
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
                      <option key={String(idOf(s))} value={String(idOf(s))}>
                        {labelOf(s)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="party-details w-full rounded-lg py-2">
                  <p className="w-full px-3 flex items-center gap-1">
                    <span className="party-details-icon"><IoLocationSharp /></span>
                    {form.senderAddress || "—"}
                  </p>
                  <p className="w-full px-3 flex items-center gap-1">
                    <span className="party-details-icon"><MdAddIcCall /></span>
                    {form.senderPhone || "—"}
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
                      <option key={String(idOf(r))} value={String(idOf(r))}>
                        {labelOf(r)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="party-details w-full rounded-lg py-2">
                  <p className="w-full px-3 flex items-center gap-1">
                    <span className="party-details-icon"><IoLocationSharp /></span>
                    {form.receiverAddress || "—"}
                  </p>
                  <p className="w-full px-3 flex items-center gap-1">
                    <span className="party-details-icon"><MdAddIcCall /></span>
                    {form.receiverPhone || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Shipping / Payment / Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">Shipping Method</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  name="shippingMethodId"
                  value={form.shippingMethodId}
                  onChange={onForm}
                  disabled={loading}
                >
                  <option value="">Select</option>
                  {methods.map((m) => (
                    <option key={String(idOf(m))} value={String(idOf(m))}>
                      {labelOf(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Payment Method</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  name="paymentMethodId"
                  value={form.paymentMethodId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const obj = paymentMethods.find(pm => String(pm.id) === String(id));
                    setForm(f => ({ ...f, paymentMethodId: id, paymentMethod: obj?.name || "" }));
                  }}
                >
                  <option value="">Select Payment Method</option>
                  {paymentMethods.map(pm => (
                    <option key={String(pm.id)} value={String(pm.id)}>{pm.name}</option>
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
                    <option key={String(idOf(s))} value={String(idOf(s))}>
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
                  name="deliveryTypeId"
                  value={form.deliveryTypeId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const obj = deliveryTypes.find(t => String(t.id) === String(id));
                    setForm(f => ({ ...f, deliveryTypeId: id, deliveryType: obj?.name || "" }));
                  }}
                >
                  <option value="">Select</option>
                  {deliveryTypes.map(t => (
                    <option key={String(t.id)} value={String(t.id)}>{t.name}</option>
                  ))}
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

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Items</h3>
                <div className="flex gap-2">
                  <button type="button" onClick={addRow} className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">
                    + Add Row
                  </button>
                  <button type="button" onClick={clearRows} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">
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
                      <th className="px-3 py-2 w-32 text-right">Weight (kg)</th>
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
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            className="w-full border rounded-lg px-3 py-2 text-right"
                            placeholder="0.000"
                            value={it.weight}
                            onChange={(e) => setItem(i, "weight", e.target.value)}
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
                        <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                          No items. Click <b>+ Add Row</b> to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  <tfoot className="bg-gray-100">
                    <tr>
                      {/* label spans first 5 columns, subtotal shown in column 6, empty column 7 */}
                      <td className="px-3 py-2 text-right text-gray-500" colSpan={5}>
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm mb-1">Bill Charges</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2"
                  name="billCharges"
                  value={form.billCharges}
                  onChange={onForm}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">VAT %</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2"
                  name="vatPercentage"
                  value={form.vatPercentage}
                  onChange={onForm}
                />
              </div>

              <div className="flex flex-col justify-end text-sm">
                <div className="flex justify-between"><span>Total Cost:</span><b>{totalCost.toFixed(2)}</b></div>
                <div className="flex justify-between"><span>VAT:</span><b>{vatCost.toFixed(2)}</b></div>
                <div className="flex justify-between"><span>Net Total:</span><b>{netTotal.toFixed(2)}</b></div>
                <div className="flex justify-between"><span>Total Weight:</span><b>{totalWeight.toFixed(3)} kg</b></div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
            >
              {loading ? "Saving..." : "Save & Generate Invoice"}
            </button>
          </form>
        </div>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        shipment={invoiceShipment}
      />
    </>
  );
}
