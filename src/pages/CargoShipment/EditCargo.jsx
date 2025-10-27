// src/pages/Cargo/EditCargo.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";

/* APIs from your project */
import { getPartyById, getParties } from "../../api/partiesApi";
import { getUserById } from "../../api/accountApi";
import { getCargoById, updateCargo, normalizeCargoToInvoice } from "../../api/createCargoApi";
import BillModal from "./components/BillModal";

/** Charge keys we handle (aligns with your response) */
const CHARGE_KEYS = [
  "total_weight",
  "duty",
  "packing_charge",
  "additional_packing_charge",
  "insurance",
  "awb_fee",
  "vat_amount",
  "volume_weight",
  "other_charges",
  "discount",
];

const initialState = {
  loading: true,
  saving: false,
  error: null,
  sender: null,
  receiver: null,
  collectedBy: null,
  detailsLoading: true,
  originalCargo: null,
  form: {
    // READ-ONLY (from API)
    invoice_number: "", // booking_no
    branch_label: "",
    collected_by_role: "",
    collected_by_person: "",
    sender_id: null,
    sender_name: "",
    receiver_id: "",
    receiver_name: "",
    shipping_method_name: "",
    payment_method_name: "",
    status_name: "",
    delivery_type_name: "",
    date: "",
    time: "",
    tracking_code: "",
    lrl_tracking_code: "",
    special_remarks: "",

    // Editable
    bill_charges: 0,
    vat_percentage: 0,

    // Charge line triplets (qty/unit/amount)
    quantity_total_weight: 0, unit_rate_total_weight: 0, amount_total_weight: 0,
    quantity_duty: 0, unit_rate_duty: 0, amount_duty: 0,
    quantity_packing_charge: 0, unit_rate_packing_charge: 0, amount_packing_charge: 0,
    quantity_additional_packing_charge: 0, unit_rate_additional_packing_charge: 0, amount_additional_packing_charge: 0,
    quantity_insurance: 0, unit_rate_insurance: 0, amount_insurance: 0,
    quantity_awb_fee: 0, unit_rate_awb_fee: 0, amount_awb_fee: 0,
    quantity_vat_amount: 0, unit_rate_vat_amount: 0, amount_vat_amount: 0,
    quantity_volume_weight: 0, unit_rate_volume_weight: 0, amount_volume_weight: 0,
    quantity_other_charges: 0, unit_rate_other_charges: 0, amount_other_charges: 0,
    quantity_discount: 0, unit_rate_discount: 0, amount_discount: 0,

    // Totals
    total_cost: 0,
    vat_cost: 0,
    total_amount: 0,
    net_total: 0,
    total_weight: 0,
    no_of_pieces: 0,
    // Nested structure for UI
    box_weight: {}, // {"1": 30.000}
    items: [],      // [{slno, box_number, name, piece_no, unit_price, total_price, weight}]
  },
};

export default function EditCargo({ cargoId: propCargoId, onSaved, onCancel, isModal = false }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState(initialState);

  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const { sender, receiver, collectedBy, detailsLoading } = state;


  // Resolve id from :id / :cargoId / :cargo_id / ?id=
  const paramId = params?.id ?? params?.cargoId ?? params?.cargo_id ?? null;
  const searchId = (() => {
    try { return new URLSearchParams(location.search).get("id"); } catch { return null; }
  })();
  const id = propCargoId || paramId || searchId;

  const n = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);

  // --- Parse API → form shape ---
  const parseIncoming = (api) => {
    const c = api?.data?.cargo || api?.cargo || api || {};
    const f = { ...initialState.form };

    // Read-only fields
    f.invoice_number = c.booking_no || "";
    f.branch_label = c.branch_name || "";
    f.collected_by_role = c.collected_by || "";
    f.collected_by_person_id = c.name_id || c.collected_by_person_id || null;
    f.collected_by_person = c.collected_by_person || ""; // Add this line
    f.sender_id = String(c.sender_id || "");
    f.sender_name = c.sender_name || "";
    f.receiver_id = String(c.receiver_id || "");
    f.receiver_name = c.receiver_name || "";
    f.shipping_method_name = c.shipping_method || "";
    f.payment_method_name = c.payment_method || "";
    f.status_name = c.status || "";
    f.delivery_type_name = c.delivery_type || "";
    f.date = c.date || "";
    f.time = (c.time || "").slice(0, 5); // "10:59:00" -> "10:59"
    f.tracking_code = c.tracking_code || "";
    f.lrl_tracking_code = c.lrl_tracking_code || "";
    f.special_remarks = c.special_remarks || "";

    // Editable charges & totals
    f.bill_charges = n(c.bill_charges);
    f.vat_percentage = n(c.vat_percentage);
    CHARGE_KEYS.forEach((k) => {
      f[`quantity_${k}`] = n(c[`quantity_${k}`]);
      f[`unit_rate_${k}`] = n(c[`unit_rate_${k}`]);
      f[`amount_${k}`] = n(c[`amount_${k}`]);
    });

    f.total_cost = n(c.total_cost);
    f.vat_cost = n(c.vat_cost);
    f.total_amount = n(c.total_amount);
    f.net_total = n(c.net_total);
    f.total_weight = n(c.total_weight);
    f.no_of_pieces = n(c.no_of_pieces);

    // box_weight: can be array or object, normalize to object keyed by box number
    const bw = c.box_weight;
    const boxWeightsMap = Array.isArray(bw) ? bw.reduce((acc, w, i) => ({ ...acc, [i + 1]: n(w) }), {}) : (typeof bw === 'object' && bw !== null ? bw : {});
    f.box_weight = boxWeightsMap;

// items inside boxes object
const itemsByBox = new Map();
if (c.boxes && typeof c.boxes === "object") {
  Object.entries(c.boxes).forEach(([boxNo, boxData]) => {
    const boxWeight = f.box_weight[boxNo] || n(c.total_weight) || 0;
    const items = Array.isArray(boxData.items) ? boxData.items : [];
    itemsByBox.set(String(boxNo), {
      box_number: boxNo,
      box_weight: boxWeight,
      items: items.map((it) => ({
        name: it.name || "",
        pieces: n(it.piece_no),
        item_weight: n(it.weight || 0),
      })),
    });
  });
}

    // If there were weights but no items, create empty boxes for them
Object.keys(f.box_weight).forEach((boxNo) => {
  if (!itemsByBox.has(String(boxNo))) {
    itemsByBox.set(boxNo, {
      box_number: boxNo,
      box_weight: f.box_weight[boxNo],
      items: [{ name: "", pieces: 1, item_weight: 0 }],
    });
  }
});

f.items = Array.from(itemsByBox.values()).sort((a, b) => n(a.box_number) - n(b.box_number));
if (f.items.length === 0) {
  f.items = [{ box_number: "1", box_weight: 0, items: [{ name: "", pieces: 1, item_weight: 0 }] }];
}

    console.log("📦 Parsed items loaded into form:", f.items);

    return f;
  };

  // --- Form → API payload ---
  const formatForApi = (f, originalCargo) => {
    const box_weight_array = [];
    const boxes_obj = {};
    const flat_items = [];
  
    (f.items || []).forEach((box, i) => {
      const boxNo = String(box.box_number || i + 1);
      const boxWeight = n(box.box_weight);
      box_weight_array.push(String(boxWeight.toFixed(3)));
  
      const currentBoxItems = (box.items || []).map((it, itemIdx) => ({
        slno: String(itemIdx + 1),
        box_number: boxNo,
        name: it.name || `Box ${boxNo} contents`,
        piece_no: String(it.pieces || 0),
        unit_price: "0.00",
        total_price: "0.00",
        // Assign full box weight to the first item in the box
        weight: itemIdx === 0 ? String(boxWeight.toFixed(3)) : "0.000",
      }));
  
      boxes_obj[boxNo] = { items: currentBoxItems };
      flat_items.push(...currentBoxItems);
    });
  
    const subtotal = n(f.amount_total_weight);
    const bill_charges = CHARGE_KEYS.reduce((acc, k) => {
      if (k === 'total_weight') return acc;
      const amount = n(f[`amount_${k}`]);
      return acc + (k === "discount" ? -amount : amount);
    }, 0);
  
    const vat_cost = (subtotal * n(f.vat_percentage)) / 100;
    const total_amount = subtotal + bill_charges + vat_cost;
    const total_weight = (f.items || []).reduce(
      (sum, box) => sum + n(box.box_weight),
      0
    );
  
    const payload = {
      ...originalCargo, // Keep original fields not being edited
      booking_no: f.invoice_number,
      lrl_tracking_code: f.lrl_tracking_code || null,
      date: f.date,
      time: f.time,
      special_remarks: f.special_remarks || null,
      bill_charges: String(bill_charges.toFixed(2)),
      vat_percentage: String(n(f.vat_percentage).toFixed(2)),
  
      ...Object.fromEntries(
        CHARGE_KEYS.flatMap((k) => [
          [`quantity_${k}`, String(n(f[`quantity_${k}`]))],
          [`unit_rate_${k}`, String(n(f[`unit_rate_${k}`]))],
          [`amount_${k}`, String(n(f[`amount_${k}`]).toFixed(2))],
        ])
      ),
  
      total_cost: String(subtotal.toFixed(2)),
      vat_cost: String(vat_cost.toFixed(2)),
      total_amount: String(total_amount.toFixed(2)),
      net_total: String(total_amount.toFixed(2)),
      total_weight: String(total_weight.toFixed(3)),
      no_of_pieces: String((f.items || []).length),
      box_weight: box_weight_array,
      boxes: boxes_obj,
      items: flat_items, // Some APIs expect a flat list of items
    };

    // Clean up fields that might have been part of originalCargo but shouldn't be in an update payload
    delete payload.sender;
    delete payload.receiver;
    delete payload.status;
    delete payload.branch;

    return payload;
  };


  // --- Data load ---
  const fetchData = async () => {
    if (!id) {
      setState(s => ({ ...s, loading: false, error: "Missing cargo ID." }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const res = await getCargoById(id);
      const original = res?.data?.cargo || res?.cargo || res;
      setState(s => ({
        ...s,
        form: parseIncoming(res),
        originalCargo: original,
        loading: false,
      }));
    } catch (e) {
      console.error(e);
      setState(s => ({ ...s, loading: false, error: "Failed to load cargo." }));
      toast.error("Failed to load cargo.");
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // --- Details load (sender, receiver, collected by) ---
  useEffect(() => {
    if (!state.form?.sender_id && !state.form?.receiver_id && !state.form?.collected_by_person_id) {
      setState(s => ({ ...s, detailsLoading: false }));
      return;
    }

    let alive = true;
    (async () => {
      setState(s => ({ ...s, detailsLoading: true }));
      try {
        const [senderRes, receiverRes, collectedByRes] = await Promise.allSettled([
          state.form.sender_id ? getPartyById(state.form.sender_id) : Promise.resolve(null),
          state.form.receiver_id ? getPartyById(state.form.receiver_id) : Promise.resolve(null),
          state.form.collected_by_person_id ? getUserById(state.form.collected_by_person_id) : Promise.resolve(null),
        ]);

        if (!alive) return;

        const senderData = senderRes.status === 'fulfilled' ? (senderRes.value?.party || senderRes.value?.data || senderRes.value) : null;
        const receiverData = receiverRes.status === 'fulfilled' ? (receiverRes.value?.party || receiverRes.value?.data || receiverRes.value) : null;
        const collectedByData = collectedByRes.status === 'fulfilled' ? (collectedByRes.value?.user || collectedByRes.value?.data || collectedByRes.value) : null;

        setState(s => ({ ...s, sender: senderData, receiver: receiverData, collectedBy: collectedByData, detailsLoading: false }));

      } catch (e) {
        console.error("Failed to load party details", e);
        if (alive) setState(s => ({ ...s, detailsLoading: false }));
      }
    })();

    return () => { alive = false; };
  }, [state.form?.sender_id, state.form?.receiver_id, state.form?.collected_by_person_id]);


  const setForm = useCallback((updater) => {
    setState(s => {
      const newForm = typeof updater === 'function' ? updater(s.form) : { ...s.form, ...updater };
      // Ensure we always return a new object for the top-level state
      return { ...s, form: newForm };
    });
  }, [setState]);

  // --- Derived totals for UI ---
  const totals = useMemo(() => {
    const f = state.form;
    const subtotal = CHARGE_KEYS.reduce((acc, k) => {
      const qty = n(f[`quantity_${k}`]);
      const rate = n(f[`unit_rate_${k}`]);
      const explicit = f[`amount_${k}`];
      const amount =
        Number.isFinite(explicit) && explicit !== 0 ? n(explicit) : qty * rate;
      return acc + (k === "discount" ? -amount : amount);
    }, 0);
    const vat = (subtotal * n(f.vat_percentage)) / 100;
    return { subtotal, vat, grand: subtotal + vat };
  }, [state.form]);

  // --- Auto-calculate total weight from boxes ---
  useEffect(() => {
    const totalWeightFromBoxes = (state.form.items || []).reduce(
      (sum, box) => sum + n(box.box_weight),
      0
    );
    setForm(f => ({
      ...f,
      quantity_total_weight: totalWeightFromBoxes,
    }));
  }, [state.form.items, setForm, n]);

  // --- UI helpers ---
  const ReadonlyField = ({ label, value }) => (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        value={value ?? "—"}
        readOnly
        disabled
        className="w-full border rounded-md px-3 py-2 bg-gray-50 text-gray-700"
      />
    </div>
  );

  // --- Box / Item editors ---
  const addBox = () =>
    setForm(f => {
      const nextBoxNum = (f.items || []).reduce((max, b) => Math.max(max, n(b.box_number)), 0) + 1;
      const newItems = [...(f.items || []), {
        box_number: String(nextBoxNum), box_weight: 0, items: [{ name: '', pieces: 1, item_weight: 0 }]
      }];
      return { ...f, items: newItems };
    });

  const removeBox = (boxIndex) =>
    setForm(f => {
      if (f.items.length <= 1) return f;
      const newItems = f.items.filter((_, i) => i !== boxIndex);
      return { ...f, items: newItems };
    });

  const addItem = (boxIndex) =>
    setForm(f => {
      const newItems = JSON.parse(JSON.stringify(f.items));
      newItems[boxIndex].items.push({ name: '', pieces: 1, item_weight: 0 });
      return { ...f, items: newItems };
    });

  const removeItem = (boxIndex, itemIndex) =>
    setForm(f => {
      if (f.items?.[boxIndex]?.items.length <= 1) return f;
      const newItems = JSON.parse(JSON.stringify(f.items));
      newItems[boxIndex].items.splice(itemIndex, 1);
      return { ...f, items: newItems };
    });

  const setBoxValue = (boxIndex, key, value) => {
    setForm(f => {
      const newItems = JSON.parse(JSON.stringify(f.items));
      const box = newItems[boxIndex];
      if (box) {
        if (key === 'box_weight') box.box_weight = n(value);
        else if (key === 'box_number') box.box_number = String(value);
      }
      return { ...f, items: newItems };
    });
  };

  const setItemValue = (boxIndex, itemIndex, key, value) => {
    setForm(f => {
      const newItems = JSON.parse(JSON.stringify(f.items));
      const item = newItems?.[boxIndex]?.items?.[itemIndex];
      if (item) {
        item[key] = value;
      }
      return { ...f, items: newItems };
    });
  };

  const handleChargeChange = useCallback((chargeKey, field, value) => {
    setForm(f => {
      const newForm = { ...f };
      const val = n(value);

      if (field === 'qty') newForm[`quantity_${chargeKey}`] = val;
      if (field === 'rate') newForm[`unit_rate_${chargeKey}`] = val;

      const qty = n(newForm[`quantity_${chargeKey}`]);
      const rate = n(newForm[`unit_rate_${chargeKey}`]);
      newForm[`amount_${chargeKey}`] = qty * rate;

      return newForm;
    });
  }, [setForm, n]);

  const handlePrint = () => {
    const payload = formatForApi(state.form, state.originalCargo);

    // The invoice component needs sender/receiver names, which might not be in the payload.
    // We'll merge them from the form state and the fetched details to ensure they appear on the invoice.
    const dataForInvoice = {
      ...payload,
      sender: sender, // Use the full sender object
      receiver: receiver, // Use the full receiver object
      sender_name: sender?.name || state.form.sender_name,
      receiver_name: receiver?.name || state.form.receiver_name,
      branch_name: state.form.branch_label,
      shipping_method: state.form.shipping_method_name,
      payment_method: state.form.payment_method_name,
    };

    setInvoiceData(dataForInvoice);
    setInvoiceModalOpen(true);
  };

// --- Submit ---
const onSubmit = async (e) => {
  e.preventDefault();

  const f = state.form;
  const originalCargo = state.originalCargo;
  const finalId = f?.id || originalCargo?.id || id;

  if (!finalId) {
    toast.error("Missing cargo ID to update");
    return;
  }

  setState((s) => ({ ...s, saving: true }));
  try {
    const payload = formatForApi(f, originalCargo);
    console.log("🔄 Updating cargo:", finalId, payload);

    await toast.promise(updateCargo(finalId, payload), {
      loading: "Saving…",
      success: "Updated successfully",
      error: "Failed to update",
    });

    if (onSaved) onSaved();
    else navigate(-1);
  } catch (e1) {
    console.error("❌ Update error", e1);
    toast.error("Save failed");
  } finally {
    setState((s) => ({ ...s, saving: false }));
  }
};

  // --- UI: Skeleton Loader ---
  const Skel = ({ w = "100%", h = 12, className = "" }) => (
    <div
      className={`animate-pulse rounded bg-slate-200/80 ${className}`}
      style={{ width: w, height: h }}
    />
  );
  const SkelField = ({ h = 38 }) => <Skel h={h} />;
  const SkelLine = ({ w = "40%", className = "mb-1" }) => <Skel w={w} h={10} className={className} />;

  const SkeletonEditCargo = () => (
    <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <Skel w="200px" h={24} />
        <div className="text-right space-y-1">
          <Skel w="150px" h={14} />
          <Skel w="120px" h={14} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i}><SkelLine /><SkelField /></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <SkelLine w="30%" />
              <SkelField />
              <div className="grid grid-cols-2 gap-4 mt-3"><SkelField /> <SkelField /></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i}><SkelLine /><SkelField /></div>)}
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4"><Skel h={38} w="200px" /><Skel h={38} w="200px" /></div>
          <Skel h={28} w="100px" />
        </div>
        <Skel h={120} />
      </div>
    </div>
  );

  // --- Render ---
  if (!id) {
    return (
      <div className="p-6">
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 text-amber-900 p-3">
          Missing cargo id. Open this page as <code>/cargo/edit/:id</code> or
          add <code>?id=&lt;cargoId&gt;</code>.
        </div>
      </div>
    );
  }

  if (state.loading) return <div className="p-6"><SkeletonEditCargo /></div>;

  const resolveInvoice = (form) => {
    return form.invoice_number || form.booking_no || form.bookingNo || '—';
  };


  const f = state.form;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />
      {state.error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
          {state.error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-sm space-y-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit Cargo</h2>
          <div className="text-right text-sm text-gray-600 space-y-0.5">
            <div>Invoice: <span className="font-medium">{(()=>{const v=resolveInvoice(state.form); return v ? String(v) : '—';})()}</span></div>
            {/* <div>LRL: <span className="font-medium">{state.form?.lrl_tracking_code || '—'}</span></div> */}
          </div>
        </div>

        {/* ===== READ-ONLY BLOCK (first screenshot) ===== */}
        <div className="space-y-6">
          {/* Collection Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ReadonlyField label="Invoice No" value={f.invoice_number} />
            <ReadonlyField label="Branch" value={f.branch_label} />
            <ReadonlyField
              label="Collected By (Role)"
              value={collectedBy?.role?.name || f.collected_by_role || "—"}
            />
            <ReadonlyField
              label="Collected By (Person)"
              value={collectedBy?.full_name || collectedBy?.staff_name || collectedBy?.name || f.collected_by_person || "—"}
            />
          </div>

          {/* Sender / Receiver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <div className="font-semibold mb-2">Sender Info</div>
              {detailsLoading ? (
                <div className="space-y-2"><Skel w="80%" h={38} /><Skel w="90%" h={14} /><Skel w="70%" h={14} /></div>
              ) : (
                <>
                  <ReadonlyField label="Sender/Customer" value={sender?.name || f.sender_name} />
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <ReadonlyField label="Address" value={sender?.address_line || sender?.address || "—"} />
                    <ReadonlyField label="Phone" value={sender?.contact_number || "—"} />
                  </div>
                </>
              )}
            </div>
            <div className="border rounded-lg p-4">
              <div className="font-semibold mb-2">Receiver Info</div>
              {detailsLoading ? (
                <div className="space-y-2"><Skel w="80%" h={38} /><Skel w="90%" h={14} /><Skel w="70%" h={14} /></div>
              ) : (
                <>
                  <ReadonlyField
                    label="Receiver/Customer"
                    value={receiver?.name || f.receiver_name}
                  />
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <ReadonlyField label="Address" value={receiver?.address || "—"} />
                    <ReadonlyField label="Phone" value={receiver?.contact_number || "—"} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Shipment & Payment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReadonlyField
              label="Shipping Method"
              value={f.shipping_method_name}
            />
            <ReadonlyField
              label="Payment Method"
              value={f.payment_method_name}
            />
            <ReadonlyField
              label="Delivery Type"
              value={f.delivery_type_name}
            />
          </div>

          {/* Schedule & Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ReadonlyField label="Date" value={f.date} />
            <ReadonlyField label="Time" value={f.time} />
            <ReadonlyField label="Tracking Code" value={f.tracking_code} />
            <ReadonlyField
              label="LRL Tracking Code"
              value={f.lrl_tracking_code || "—"}
            />
          </div>
        </div>
        {/* ===== END READ-ONLY BLOCK ===== */}

        {/* ===== EDITABLE BLOCK (second screenshot) ===== */}
        {/* Boxes & Items */}
        <div className="space-y-4">
          {(f.items || []).map((box, boxIndex) => (
            <div key={boxIndex} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">Box #</span>
                    <input
                      value={box.box_number}
                      onChange={(e) => setBoxValue(boxIndex, 'box_number', e.target.value)}
                      className="w-20 border rounded-md px-2 py-1"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">Weight (kg)</span>
                    <input
                      type="number"
                      step="0.001"
                      value={box.box_weight}
                      onChange={(e) => setBoxValue(boxIndex, 'box_weight', e.target.value)}
                      className="w-28 border rounded-md px-2 py-1"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeBox(boxIndex)}
                  disabled={f.items.length <= 1}
                  className="text-red-600 text-sm disabled:opacity-50"
                >
                  Remove Box
                </button>
              </div>

              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border px-3 py-2 text-left">Item</th>
                    <th className="border px-3 py-2 text-left w-24">Pieces</th>
                    <th className="border px-3 py-2 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(box.items || []).map((item, itemIndex) => (
                    <tr key={itemIndex}>
                      <td className="border px-3 py-2">
                        <input
                          value={item.name}
                          onChange={(e) => setItemValue(boxIndex, itemIndex, 'name', e.target.value)}
                          className="w-full border rounded-md px-2 py-1"
                        />
                      </td>
                      <td className="border px-3 py-2">
                        <input
                          type="number"
                          value={item.pieces}
                          onChange={(e) => setItemValue(boxIndex, itemIndex, 'pieces', n(e.target.value))}
                          className="w-full border rounded-md px-2 py-1"
                        />
                      </td>
                      <td className="border px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(boxIndex, itemIndex)}
                          disabled={box.items.length <= 1}
                          className="text-red-600 text-sm disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => addItem(boxIndex)}
                  className="px-3 py-1.5 rounded-md bg-gray-800 text-white text-xs"
                >
                  + Add Item
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addBox}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-600 hover:bg-gray-50"
          >
            + Add Another Box
          </button>
        </div>

        {/* Charges */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Remarks & Charges</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium">Special remarks</label>
              <textarea
                value={f.special_remarks ?? ""}
                onChange={(e) => setForm((ff) => (ff.special_remarks = e.target.value))}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">VAT %</label>
              <input
                type="number"
                value={f.vat_percentage ?? ''}
                onChange={(e) =>
                  setForm(form => ({...form, vat_percentage: n(e.target.value)}))
                }
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-3 py-2 text-left">Charge</th>
                <th className="border px-3 py-2 w-32">Qty</th>
                <th className="border px-3 py-2 w-32">Unit Rate</th>
                <th className="border px-3 py-2 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {CHARGE_KEYS.map((k) => (
                <tr key={k}>
                  <td className="border px-3 py-2 capitalize">
                    {k.replace(/_/g, " ")}
                  </td>
                  <td className="border px-3 py-2">
                    <input
                      type="text"
                      value={f[`quantity_${k}`] ?? ''}
                      onChange={(e) => handleChargeChange(k, 'qty', e.target.value)}
                      readOnly={k === 'total_weight'}
                      className="w-full border rounded-md px-2 py-1"
                    />
                  </td>
                  <td className="border px-3 py-2">
                    <input
                      type="text"
                      value={f[`unit_rate_${k}`] ?? ''}
                      onChange={(e) => handleChargeChange(k, 'rate', e.target.value)}
                      className="w-full border rounded-md px-2 py-1"
                    />
                  </td>
                  <td className="border px-3 py-2">
                    <input
                      type="text"
                      value={
                        (n(f[`quantity_${k}`]) * n(f[`unit_rate_${k}`])).toFixed(2)
                      }
                      readOnly
                      disabled
                      className="w-full border rounded-md px-2 py-1 bg-gray-50 text-gray-700"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium">Bill Charges</label>
              <input
                type="text"
                value={f.bill_charges ?? ''}
                onChange={(e) =>
                  setForm(form => ({...form, bill_charges: n(e.target.value)}))
                }
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">No. of Boxes</label>
              <input
                value={(f.items || []).length}
                readOnly
                disabled
                className="w-full border rounded-md px-3 py-2 bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-sm">Subtotal: ₹{totals.subtotal.toFixed(2)}</div>
          <div className="text-sm">VAT: ₹{totals.vat.toFixed(2)}</div>
          <div className="text-lg font-semibold">
            Grand Total: ₹{totals.grand.toFixed(2)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handlePrint}
            className="mr-auto border px-4 py-2 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100"
          >
            Print Invoice
          </button>
          <button
            type="button"
            onClick={onCancel || (() => navigate(-1))}
            className="border px-4 py-2 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={state.saving}
            className={`px-5 py-2 rounded-md text-white ${
              state.saving ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {state.saving ? "Saving…" : "Update Cargo"}
          </button>
        </div>
      </form>

      <BillModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        shipment={invoiceData}
      />
    </div>
  );
}
