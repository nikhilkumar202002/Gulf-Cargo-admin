// src/pages/CreateCargo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { createCargo, normalizeCargoToInvoice } from "../../api/createCargoApi";
import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getBranchUsers } from "../../api/branchApi";
import { getParties } from "../../api/partiesApi";
import { getAllPaymentMethods } from "../../api/paymentMethod";
import { getActiveDeliveryTypes } from "../../api/deliveryType";
import { getActiveDrivers } from "../../api/driverApi";
import { getProfile } from "../../api/accountApi";
import { getActiveCollected } from "../../api/collectedByApi"; // Driver / Office

import InvoiceModal from "../../components/InvoiceModal";
import { IoLocationSharp } from "react-icons/io5";
import { MdAddIcCall } from "react-icons/md";
import { BsFillBoxSeamFill } from "react-icons/bs";

import "./ShipmentStyles.css";

/* ---------------- helpers ---------------- */
const unwrapArray = (o) => {
  if (!o) return [];
  if (Array.isArray(o)) return o;
  if (Array.isArray(o?.data?.data)) return o.data.data;
  if (Array.isArray(o?.data)) return o.data;
  if (Array.isArray(o?.items)) return o.items;
  if (Array.isArray(o?.results)) return o.results;
  return [];
};

const idOf = (o) =>
  o?.id ??
  o?.branch_id ??
  o?.branchId ??
  o?.value ??
  o?._id ??
  null;

const labelOf = (o) =>
  o?.name ??
  o?.branch_name ??
  o?.title ??
  o?.label ??
  o?.company_name ??
  o?.full_name ??
  o?.username ??
  o?.email ??
  "-";

const today = () => new Date().toISOString().split("T")[0];

/** Robust branch id picker across common API shapes */
const pickBranchId = (profileLike) => {
  const x = profileLike?.data ?? profileLike ?? null;
  const user = x?.user ?? x ?? null;
  return (
    user?.branch_id ??
    user?.branchId ??
    user?.branch?.id ??
    null
  );
};

const safeDecodeJwt = (jwt) => {
  if (!jwt || typeof jwt !== "string" || !jwt.includes(".")) return null;
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return payload || null;
  } catch {
    return null;
  }
};

/* Build initial form with an optional default branch id */
const buildInitialForm = (branchId = "") => ({
  branchId: branchId ? String(branchId) : "",
  senderId: "",
  senderAddress: "",
  senderPhone: "",
  receiverId: "",
  receiverAddress: "",
  receiverPhone: "",
  shippingMethodId: "",
  paymentMethodId: "",
  statusId: "",
  date: today(),
  time: "09:36",
  collectedByRoleId: "",     // 1 | 2 from /collected
  collectedByRoleName: "",   // 'Driver' | 'Office'
  collectedByPersonId: "",   // numeric person id
  lrlTrackingCode: "",
  deliveryTypeId: "",
  specialRemarks: "",
  billCharges: 0,
  vatPercentage: 0,
});

export default function CreateCargo() {
  const token = useSelector((s) => s.auth?.token);

  // selects
  const [methods, setMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [senders, setSenders] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [collectRoles, setCollectRoles] = useState([]); // [{id:1,name:'Driver'},{id:2,name:'Office'}]
  const [collectedByOptions, setCollectedByOptions] = useState([]); // drivers OR staff array

  // user/profile
  const [userProfile, setUserProfile] = useState(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" }); // still used as the single source of truth
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceShipment, setInvoiceShipment] = useState(null);

  // toast (top-right slide in)
  const [toast, setToast] = useState({ visible: false, text: "", variant: "success" });
  const toastTimer = useRef(null);
  const showToast = (text, variant = "success", duration = 3500) => {
    try { clearTimeout(toastTimer.current); } catch {}
    setToast({ visible: true, text, variant });
    toastTimer.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, duration);
  };
  const hideToast = () => {
    try { clearTimeout(toastTimer.current); } catch {}
    setToast((t) => ({ ...t, visible: false }));
  };

  // form
  const [form, setForm] = useState(buildInitialForm());

  // items
  const [items, setItems] = useState([{ name: "", pieces: 1, unitPrice: 0, weight: 0 }]);
  const rowTotal = (it) =>
    Number((Number(it.pieces || 0) * Number(it.unitPrice || 0)).toFixed(2));
  const subtotal = items.reduce((s, it) => s + rowTotal(it), 0);

  // totals
  const billCharges = Number(form.billCharges || 0);
  const vatPercentage = Number(form.vatPercentage || 0);
  const totalCost = Number(subtotal.toFixed(2));
  const vatCost = Number(((totalCost * vatPercentage) / 100).toFixed(2));
  const netTotal = Number((totalCost + billCharges + vatCost).toFixed(2));
  const totalWeight = Number(
    items
      .reduce((sum, it) => sum + Number(it.weight || 0) * Number(it.pieces || 0), 0)
      .toFixed(3)
  );

  /* ---------- preferred branch from token (fallback) ---------- */
  const tokenClaims = useMemo(() => safeDecodeJwt(token), [token]);
  const tokenBranchId = tokenClaims?.branch_id ?? tokenClaims?.branchId ?? null;

  /* Toast on any msg change */
  useEffect(() => {
    if (msg.text) showToast(msg.text, msg.variant || "success");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg.text, msg.variant]);

  /* ---------- initial load ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg({ text: "", variant: "" });
      try {
        const [me, m, st, pm, dt, roles] = await Promise.all([
          getProfile(),                // must return user with branch info
          getActiveShipmentMethods(),
          getActiveShipmentStatuses(),
          getAllPaymentMethods(),
          getActiveDeliveryTypes(),
          getActiveCollected(),        // { success, data: [ {id, name} ] }
        ]);

        const profile = me?.data ?? me ?? null;
        setUserProfile(profile);

        setMethods(unwrapArray(m));
        setStatuses(unwrapArray(st));
        setPaymentMethods(unwrapArray(pm));
        setDeliveryTypes(unwrapArray(dt));
        setCollectRoles(Array.isArray(roles?.data) ? roles.data : []);

        // set branchId from profile (fallback to token)
        const preferredBranchId = pickBranchId(profile) ?? tokenBranchId ?? "";
        setForm((f) => buildInitialForm(preferredBranchId));

        const [snd, rcv] = await Promise.all([
          getParties({ customer_type: "Sender" }),
          getParties({ customer_type: "Receiver" }),
        ]);
        setSenders(unwrapArray(snd));
        setReceivers(unwrapArray(rcv));
      } catch (e) {
        setMsg({
          text: e?.details?.message || e?.message || "Failed to load options.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [token, tokenBranchId]);

  /* ---------- keep form.branchId synced with profile/token ---------- */
  useEffect(() => {
    const bidRaw = pickBranchId(userProfile) ?? tokenBranchId ?? null;
    const bid = bidRaw != null ? String(bidRaw) : "";
    if (bid && String(form.branchId) !== bid) {
      setForm((f) => ({ ...f, branchId: bid }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, tokenBranchId]);

  /* ---------- when Branch or Role is 'Office', keep people list in sync ---------- */
  useEffect(() => {
    const load = async () => {
      if (form.collectedByRoleName !== "Office") return;
      const branchId = form.branchId || pickBranchId(userProfile) || tokenBranchId;
      if (!branchId) {
        setCollectedByOptions([]);
        setMsg({ text: "Your profile has no branch; cannot load office staff.", variant: "error" });
        return;
      }
      try {
        const res = await getBranchUsers(branchId);
        setCollectedByOptions(unwrapArray(res));
      } catch {
        setCollectedByOptions([]);
        setMsg({ text: "Failed to load office staff for the selected branch.", variant: "error" });
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branchId, form.collectedByRoleName]);

  /* ---------- role change -> populate collectedByOptions ---------- */
  const onRoleChange = async (e) => {
    const roleId = e.target.value;
    const role = collectRoles.find((r) => String(r.id) === String(roleId));
    const roleName = role?.name || "";

    setForm((f) => ({
      ...f,
      collectedByRoleId: roleId,
      collectedByRoleName: roleName,
      collectedByPersonId: "",
    }));

    try {
      if (roleName === "Driver") {
        const res = await getActiveDrivers();
        setCollectedByOptions(unwrapArray(res));
      } else if (roleName === "Office") {
        const branchId = form.branchId || pickBranchId(userProfile) || tokenBranchId;
        if (!branchId) {
          setCollectedByOptions([]);
          setMsg({ text: "Your profile has no branch; cannot load office staff.", variant: "error" });
          return;
        }
        const res = await getBranchUsers(branchId);
        setCollectedByOptions(unwrapArray(res));
      } else {
        setCollectedByOptions([]);
      }
    } catch {
      setCollectedByOptions([]);
      setMsg({ text: "Failed to load list for the selected role.", variant: "error" });
    }
  };

  /* ---------- party autofill (address/phone) ---------- */
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

  /* ---------- items helpers ---------- */
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
  const addRow = () => setItems((p) => [...p, { name: "", pieces: 1, unitPrice: 0, weight: 0 }]);
  const removeRow = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  /* ---------- validation ---------- */
  const validateBeforeSubmit = () => {
    const missing = [];
    if (!form.branchId) missing.push("Branch");
    if (!form.senderId) missing.push("Sender");
    if (!form.receiverId) missing.push("Receiver");
    if (!form.shippingMethodId) missing.push("Shipping Method");
    if (!form.paymentMethodId) missing.push("Payment Method");
    if (!form.statusId) missing.push("Status");
    if (!form.deliveryTypeId) missing.push("Delivery Type");
    if (!form.date) missing.push("Date");
    if (!form.collectedByRoleId || !form.collectedByRoleName) missing.push("Collected By (Role)");
    if (!form.collectedByPersonId) missing.push("Collected By (Person)");
    if (!form.lrlTrackingCode) missing.push("LRL Tracking Code");
    if (!form.specialRemarks) missing.push("Special Remarks");

    if (!items.some((it) => (it.name?.trim() || "") && Number(it.pieces || 0) > 0)) {
      missing.push("At least one item (name + pieces)");
    }
    if (items.some((it) => Number(it.weight || 0) <= 0)) {
      missing.push("Each item needs weight > 0");
    }
    return missing;
  };

  /* ---------- submit ---------- */
  const resetFormAfterSubmit = () => {
    const nextBranchId = pickBranchId(userProfile) ?? tokenBranchId ?? "";
    setForm(buildInitialForm(nextBranchId));
    setItems([{ name: "", pieces: 1, unitPrice: 0, weight: 0 }]);
    setCollectedByOptions([]);
  };

  const submit = async (e) => {
    e.preventDefault();

    const missing = validateBeforeSubmit();
    if (missing.length) {
      setMsg({ text: `Missing/invalid: ${missing.join(", ")}`, variant: "error" });
      return;
    }

    const roleId = Number(form.collectedByRoleId);     // 1 (Driver) | 2 (Office)
    const personId = Number(form.collectedByPersonId); // driver_id OR staff_id/user_id
    if (!Number.isFinite(roleId) || roleId <= 0) {
      setMsg({ text: "Choose a valid ‘Collected By’ role.", variant: "error" });
      return;
    }
    if (!Number.isFinite(personId) || personId <= 0) {
      setMsg({ text: "Choose a valid ‘Collected By’ person.", variant: "error" });
      return;
    }

    const payload = {
      branch_id: Number(form.branchId),
      sender_id: Number(form.senderId),
      receiver_id: Number(form.receiverId),

      shipping_method_id: Number(form.shippingMethodId),
      payment_method_id: Number(form.paymentMethodId),
      status_id: Number(form.statusId),

      date: form.date,
      time: form.time,

      collected_by: form.collectedByRoleName, // 'Driver' | 'Office'
      collected_by_id: roleId,                // 1|2 (ROLE id)
      name_id: personId,                      // PERSON id

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
        slno: String(i + 1),
        name: it.name || "",
        piece_no: Number(it.pieces || 0),
        unit_price: Number(it.unitPrice || 0),
        total_price: Number((Number(it.pieces || 0) * Number(it.unitPrice || 0)).toFixed(2)),
        weight: Number(it.weight || 0),
      })),
    };

    try {
      setLoading(true);
      const created = await createCargo(payload);
      const shipment = normalizeCargoToInvoice(created);
      setInvoiceShipment(shipment);
      setInvoiceOpen(true);

      // toast + reset form
      showToast("Cargo created. Invoice ready.", "success");
      resetFormAfterSubmit();
      setMsg({ text: "", variant: "" }); // clear msg so it doesn't retrigger
    } catch (e2) {
      setMsg({
        text: e2?.message || "Failed to create cargo.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const onResetClick = () => {
    const nextBranchId = pickBranchId(userProfile) ?? tokenBranchId ?? "";
    setForm(buildInitialForm(nextBranchId));
    setItems([{ name: "", pieces: 1, unitPrice: 0, weight: 0 }]);
    setCollectedByOptions([]);
    showToast("Form reset.", "success");
  };

  /* ---------- UI ---------- */
  const branchNameFromProfile =
    userProfile?.user?.branch?.name ||
    userProfile?.branch?.name ||
    userProfile?.user?.branch_name ||
    userProfile?.branch_name ||
    "";

  return (
    <>
      {/* Top-right Toast */}
      <div
        className="fixed top-4 right-4 z-50"
        style={{
          transform: toast.visible ? "translateX(0)" : "translateX(120%)",
          transition: "transform 300ms ease",
        }}
      >
        <div
          className={`min-w-[260px] max-w-[360px] rounded-xl border px-4 py-3 shadow ${
            toast.variant === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm">{toast.text}</div>
            <button
              type="button"
              onClick={hideToast}
              className="ml-2 text-xs opacity-70 hover:opacity-100"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
        <div className="w-full max-w-6xl bg-white rounded-2xl p-8">
          <h2 className="header-cargo-heading flex items-center gap-2">
            <span className="header-cargo-icon"><BsFillBoxSeamFill /></span>
            Create Cargo
          </h2>

          {/* inline banner removed; we use the toast above */}

          <form onSubmit={submit} className="space-y-6">
            {/* Branch (readonly NAME) + Collected By */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-700"
                  value={branchNameFromProfile || ""}
                  readOnly
                  placeholder="No branch in profile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Collected By (Role)</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.collectedByRoleId}
                  onChange={onRoleChange}
                >
                  <option value="">Select role</option>
                  {collectRoles.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Collected By (Person)</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.collectedByPersonId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, collectedByPersonId: e.target.value }))
                  }
                  disabled={!form.collectedByRoleName}
                >
                  <option value="">Select person</option>
                  {collectedByOptions.map((opt, i) => {
                    const valueId =
                      form.collectedByRoleName === "Driver"
                        ? opt?.driver_id ?? opt?.id ?? null
                        : opt?.staff_id ?? opt?.user_id ?? opt?.id ?? null;
                    if (!valueId) return null;
                    const label = labelOf(opt);
                    return (
                      <option key={`${valueId}-${i}`} value={String(valueId)}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Sender Info</h3>
                <div>
                  <label className="block text-sm mb-1">Sender/Customer</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.senderId}
                    onChange={(e) => setForm((f) => ({ ...f, senderId: e.target.value }))}
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

              <div className="space-y-3">
                <h3 className="font-semibold">Receiver Info</h3>
                <div>
                  <label className="block text-sm mb-1">Receiver/Customer</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.receiverId}
                    onChange={(e) => setForm((f) => ({ ...f, receiverId: e.target.value }))}
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
                  value={form.shippingMethodId}
                  onChange={(e) => setForm((f) => ({ ...f, shippingMethodId: e.target.value }))}
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
                  value={form.paymentMethodId}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethodId: e.target.value }))}
                >
                  <option value="">Select Payment Method</option>
                  {paymentMethods.map((pm) => (
                    <option key={String(pm.id)} value={String(pm.id)}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.statusId}
                  onChange={(e) => setForm((f) => ({ ...f, statusId: e.target.value }))}
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

            {/* Date / Tracking / Delivery / Remarks & Totals */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Time</label>
                <input
                  type="time"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">LRL Tracking Code</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.lrlTrackingCode}
                  onChange={(e) => setForm((f) => ({ ...f, lrlTrackingCode: e.target.value }))}
                  placeholder="LRL-XXXX"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Delivery Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.deliveryTypeId}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryTypeId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {deliveryTypes.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Special remarks</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.specialRemarks}
                  onChange={(e) => setForm((f) => ({ ...f, specialRemarks: e.target.value }))}
                  placeholder="Handle with care, fragile goods."
                />
              </div>

              <div className="flex flex-col justify-end text-sm">
                <div className="flex justify-between"><span>Total Cost:</span><b>{totalCost.toFixed(2)}</b></div>
                <div className="flex justify-between"><span>VAT:</span><b>{vatCost.toFixed(2)}</b></div>
                <div className="flex justify-between"><span>Net Total:</span><b>{netTotal.toFixed(2)}</b></div>
                <div className="flex justify-between"><span>Total Weight:</span><b>{totalWeight.toFixed(3)} kg</b></div>
              </div>
            </div>

            {/* Items */}
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
                            className={`w-full border rounded-lg px-3 py-2 ${!it.name?.trim() ? "border-rose-300" : ""}`}
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
                            className={`w-full border rounded-lg px-3 py-2 text-right ${Number(it.weight || 0) <= 0 ? "border-rose-300" : ""}`}
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
                  </tbody>

                  <tfoot className="bg-gray-100">
                    <tr>
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

            {/* Controls */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onResetClick}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-white ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
              >
                Save & Generate Invoice
              </button>
            </div>
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
