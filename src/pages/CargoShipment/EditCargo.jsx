// src/pages/EditCargo.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCargoById,
  updateCargo, // PATCH
} from "../../api/createCargoApi";
import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getAllPaymentMethods } from "../../api/paymentMethod";
import { getActiveDeliveryTypes } from "../../api/deliveryType";

import { BsFillBoxSeamFill } from "react-icons/bs";
import { IoLocationSharp } from "react-icons/io5";
import { MdAddIcCall } from "react-icons/md";
import "./ShipmentStyles.css";

/* ---------------- helpers ---------------- */
const unwrap = (o) =>
  Array.isArray(o) ? o :
  Array.isArray(o?.data?.data) ? o.data.data :
  Array.isArray(o?.data) ? o.data :
  Array.isArray(o?.items) ? o.items :
  Array.isArray(o?.results) ? o.results : [];

const idOf = (o) => o?.id ?? o?.value ?? o?._id ?? null;
const nameOf = (o) =>
  o?.name ?? o?.title ?? o?.label ?? o?.method ?? o?.status ?? o?.payment ?? "-";

const num = (v, d = 0) =>
  v === null || v === undefined || v === "" ? d : Number(v);

const toHM = (t) => {
  if (!t) return "";
  const s = String(t).trim();
  // accepts "HH:mm" or "HH:mm:ss" or sloppy "H:m"
  const m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (!m) return s.slice(0, 5); // fallback
  const hh = String(Math.min(23, Number(m[1]))).padStart(2, "0");
  const mm = String(Math.min(59, Number(m[2]))).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Map a possibly-name value to an option id from a list
const pickOptionId = (opts, idOrName) => {
  if (idOrName === undefined || idOrName === null || idOrName === "") return "";
  const s = String(idOrName);
  const byId = opts.find((o) => String(idOf(o)) === s);
  if (byId) return String(idOf(byId));
  const byName = opts.find(
    (o) => String(nameOf(o)).toLowerCase() === s.toLowerCase()
  );
  return byName ? String(idOf(byName)) : "";
};

export default function EditCargo() {
  const { id } = useParams();
  const navigate = useNavigate();

  // lookups
  const [methods, setMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", variant: "" });

  // (optional) read-only labels shown from the cargo
  const [readonly, setReadonly] = useState({
    bookingNo: "",
    branchName: "",
    senderName: "",
    receiverName: "",
    senderAddress: "",
    senderPhone: "",
    receiverAddress: "",
    receiverPhone: "",
  });

  // editable form
  const [form, setForm] = useState({
    date: "",
    time: "",
    shippingMethodId: "",
    paymentMethodId: "",
    statusId: "",
    lrlTrackingCode: "",
    deliveryTypeId: "",
    specialRemarks: "",
    billCharges: 0,
    vatPercentage: 0,
    items: [{ name: "", pieces: 1, unitPrice: 0, weight: 0 }],
  });

  // derived totals
  const rowTotal = (it) =>
    Number((Number(it.pieces || 0) * Number(it.unitPrice || 0)).toFixed(2));

  const subtotal = useMemo(
    () => form.items.reduce((s, it) => s + rowTotal(it), 0),
    [form.items]
  );
  const billCharges = Number(form.billCharges || 0);
  const vatPercentage = Number(form.vatPercentage || 0);
  const vatCost = Number(((subtotal * vatPercentage) / 100).toFixed(2));
  const netTotal = Number((subtotal + billCharges + vatCost).toFixed(2));
  const totalWeight = Number(
    form.items
      .reduce(
        (sum, it) => sum + Number(it.weight || 0) * Number(it.pieces || 0),
        0
      )
      .toFixed(3)
  );

  /* ---------- initial load ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg({ text: "", variant: "" });
      try {
        // lookups
        const [m, st, pm, dt] = await Promise.all([
          getActiveShipmentMethods(),
          getActiveShipmentStatuses(),
          getAllPaymentMethods(),
          getActiveDeliveryTypes(),
        ]);
        const mArr = unwrap(m);
        const stArr = unwrap(st);
        const pmArr = unwrap(pm);
        const dtArr = unwrap(dt);
        setMethods(mArr);
        setStatuses(stArr);
        setPaymentMethods(pmArr);
        setDeliveryTypes(dtArr);

        // cargo
        const cargo = await getCargoById(id);

        setReadonly({
          bookingNo: cargo.booking_no ?? "",
          branchName: cargo.branch_name ?? "",
          senderName: cargo.sender_name ?? "",
          receiverName: cargo.receiver_name ?? "",
          senderAddress: cargo.sender?.address ?? cargo.sender_address ?? "",
          senderPhone: cargo.sender?.contact_number ?? cargo.sender_phone ?? "",
          receiverAddress: cargo.receiver?.address ?? cargo.receiver_address ?? "",
          receiverPhone: cargo.receiver?.contact_number ?? cargo.receiver_phone ?? "",
        });

        const items = Array.isArray(cargo.items)
          ? cargo.items.map((x, i) => ({
              name: x.name ?? x.description ?? "",
              pieces: num(x.piece_no ?? x.qty ?? x.quantity ?? x.pieces, 0),
              unitPrice: num(x.unit_price ?? x.unitPrice ?? x.price, 0),
              weight: num(x.weight, 0),
            }))
          : [{ name: "", pieces: 1, unitPrice: 0, weight: 0 }];

        setForm({
          date: cargo.date ?? "",
          time: toHM(cargo.time ?? ""),
          shippingMethodId: pickOptionId(
            mArr,
            cargo.shipping_method_id ?? cargo.shipping_method
          ),
          paymentMethodId: pickOptionId(
            pmArr,
            cargo.payment_method_id ?? cargo.payment_method
          ),
          statusId: pickOptionId(stArr, cargo.status_id ?? cargo.status),
          lrlTrackingCode: cargo.lrl_tracking_code ?? "",
          deliveryTypeId: pickOptionId(
            dtArr,
            cargo.delivery_type_id ?? cargo.delivery_type
          ),
          specialRemarks: cargo.special_remarks ?? "",
          billCharges: num(cargo.bill_charges, 0),
          vatPercentage: num(cargo.vat_percentage, 0),
          items,
        });
      } catch (e) {
        setMsg({
          text: e?.message || "Failed to load cargo.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ---------- items helpers ---------- */
  const setItem = (idx, key, val) => {
    setForm((prev) => {
      const next = { ...prev, items: [...prev.items] };
      const it = { ...next.items[idx] };
      if (key === "pieces") {
        const n = Number.parseInt(val || 0, 10);
        it.pieces = Number.isNaN(n) ? 0 : n;
      } else if (key === "unitPrice" || key === "weight") {
        const n = Number.parseFloat(val || 0);
        it[key] = Number.isNaN(n) ? 0 : n;
      } else {
        it[key] = val;
      }
      next.items[idx] = it;
      return next;
    });
  };
  const addRow = () =>
    setForm((p) => ({
      ...p,
      items: [...p.items, { name: "", pieces: 1, unitPrice: 0, weight: 0 }],
    }));
  const removeRow = (idx) =>
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  /* ---------- validation ---------- */
  const validate = () => {
    const missing = [];
    if (!form.statusId) missing.push("Status");
    if (!form.deliveryTypeId) missing.push("Delivery Type");
    if (!form.date) missing.push("Date");
    if (!form.lrlTrackingCode) missing.push("LRL Tracking Code");
    if (!form.items.some((it) => (it.name?.trim() || "") && Number(it.pieces || 0) > 0)) {
      missing.push("At least one item (name + pieces)");
    }
    if (form.items.some((it) => Number(it.weight || 0) <= 0)) {
      missing.push("Each item needs weight > 0");
    }
    return missing;
  };

  /* ---------- submit (PATCH) ---------- */
  const submit = async (e) => {
    e.preventDefault();
    const missing = validate();
    if (missing.length) {
      setMsg({ text: `Missing/invalid: ${missing.join(", ")}`, variant: "error" });
      return;
    }

    const payload = {
      // only fields you actually allow editing:
      shipping_method_id: form.shippingMethodId ? Number(form.shippingMethodId) : null,
      payment_method_id: form.paymentMethodId ? Number(form.paymentMethodId) : null,
      status_id: Number(form.statusId),
      date: form.date,
      time: toHM(form.time),
      lrl_tracking_code: form.lrlTrackingCode,
      delivery_type_id: Number(form.deliveryTypeId),
      special_remarks: form.specialRemarks,

      bill_charges: Number(form.billCharges || 0),
      vat_percentage: Number(form.vatPercentage || 0),
      total_cost: Number(subtotal.toFixed(2)),
      vat_cost: vatCost,
      net_total: netTotal,
      total_weight: totalWeight,

      items: form.items.map((it, i) => ({
        slno: String(i + 1),
        name: it.name || "",
        piece_no: Number(it.pieces || 0),
        unit_price: Number(it.unitPrice || 0),
        total_price: Number(
          (Number(it.pieces || 0) * Number(it.unitPrice || 0)).toFixed(2)
        ),
        weight: Number(it.weight || 0),
      })),
    };

    try {
      setSaving(true);
      await updateCargo(id, payload);
      setMsg({ text: "Cargo updated successfully.", variant: "success" });
      setTimeout(() => navigate(-1), 900);
    } catch (e2) {
      setMsg({ text: e2?.message || "Failed to update cargo.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
      <div className="w-full max-w-6xl bg-white rounded-2xl p-8">
        <h2 className="header-cargo-heading flex items-center gap-2">
          <span className="header-cargo-icon"><BsFillBoxSeamFill /></span>
          Edit Cargo
        </h2>

        {/* top banner */}
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

        {/* Booking number headline */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Booking No.</label>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-gray-100"
              value={readonly.bookingNo}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-gray-100"
              value={readonly.branchName}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sender</label>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-gray-100"
              value={readonly.senderName}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Receiver</label>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-gray-100"
              value={readonly.receiverName}
              readOnly
            />
          </div>
        </div>

        {/* sender & receiver quick details (readonly) */}
        {(readonly.senderAddress || readonly.senderPhone || readonly.receiverAddress || readonly.receiverPhone) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
            <div className="party-details w-full rounded-lg py-2">
              <p className="w-full px-3 flex items-center gap-1">
                <span className="party-details-icon"><IoLocationSharp /></span>
                {readonly.senderAddress || "—"}
              </p>
              <p className="w-full px-3 flex items-center gap-1">
                <span className="party-details-icon"><MdAddIcCall /></span>
                {readonly.senderPhone || "—"}
              </p>
            </div>
            <div className="party-details w-full rounded-lg py-2">
              <p className="w-full px-3 flex items-center gap-1">
                <span className="party-details-icon"><IoLocationSharp /></span>
                {readonly.receiverAddress || "—"}
              </p>
              <p className="w-full px-3 flex items-center gap-1">
                <span className="party-details-icon"><MdAddIcCall /></span>
                {readonly.receiverPhone || "—"}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border p-6 text-gray-500">Loading cargo…</div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            {/* Shipping / Payment / Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">Shipping Method</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.shippingMethodId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, shippingMethodId: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {methods.map((m) => (
                    <option key={String(idOf(m))} value={String(idOf(m))}>
                      {nameOf(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Payment Method</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.paymentMethodId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paymentMethodId: e.target.value }))
                  }
                >
                  <option value="">Select Payment Method</option>
                  {unwrap(paymentMethods).map((pm) => (
                    <option key={String(idOf(pm))} value={String(idOf(pm))}>
                      {nameOf(pm)}
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
                >
                  <option value="">Select</option>
                  {statuses.map((s) => (
                    <option key={String(idOf(s))} value={String(idOf(s))}>
                      {nameOf(s)}
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
                    step="60"                          // <— minutes precision
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: toHM(e.target.value) }))}
                    />
              </div>

              <div>
                <label className="block text-sm mb-1">LRL Tracking Code</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.lrlTrackingCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lrlTrackingCode: e.target.value }))
                  }
                  placeholder="LRL-XXXX"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Delivery Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.deliveryTypeId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deliveryTypeId: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {deliveryTypes.map((t) => (
                    <option key={String(idOf(t))} value={String(idOf(t))}>
                      {nameOf(t)}
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, specialRemarks: e.target.value }))
                  }
                  placeholder="Handle with care, fragile goods."
                />
              </div>

              <div className="flex flex-col justify-end text-sm">
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <b>{subtotal.toFixed(2)}</b>
                </div>
                <div className="flex justify-between">
                  <span>VAT:</span>
                  <b>{vatCost.toFixed(2)}</b>
                </div>
                <div className="flex justify-between">
                  <span>Net Total:</span>
                  <b>{netTotal.toFixed(2)}</b>
                </div>
                <div className="flex justify-between">
                  <span>Total Weight:</span>
                  <b>{totalWeight.toFixed(3)} kg</b>
                </div>
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
                    {form.items.map((it, i) => (
                      <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            className={`w-full border rounded-lg px-3 py-2 ${
                              !it.name?.trim() ? "border-rose-300" : ""
                            }`}
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
                            className={`w-full border rounded-lg px-3 py-2 text-right ${
                              Number(it.weight || 0) <= 0 ? "border-rose-300" : ""
                            }`}
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
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-white ${
                  saving ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
