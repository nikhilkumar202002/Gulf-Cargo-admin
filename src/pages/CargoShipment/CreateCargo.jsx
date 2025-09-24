// src/pages/CreateCargo.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  startTransition,
} from "react";
import ReactDOM from "react-dom";
import { useSelector } from "react-redux";
import Autosuggest from "react-autosuggest";
import { createCargo, normalizeCargoToInvoice } from "../../api/createCargoApi";
import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getBranchUsers } from "../../api/branchApi";
import { getParties } from "../../api/partiesApi";
import { getAllPaymentMethods } from "../../api/paymentMethod";
import { getActiveDeliveryTypes } from "../../api/deliveryType";
import { getActiveDrivers } from "../../api/driverApi";
import { getProfile } from "../../api/accountApi";
import { getActiveCollected } from "../../api/collectedByApi";

import InvoiceModal from "../../components/InvoiceModal";
import { IoLocationSharp } from "react-icons/io5";
import { MdAddIcCall } from "react-icons/md";
import { BsFillBoxSeamFill } from "react-icons/bs";
import { GoPlus } from "react-icons/go";
import { Link } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

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
  o?.company_name ??
  o?.full_name ??
  o?.branch_name ??
  o?.title ??
  o?.label ??
  o?.username ??
  o?.email ??
  "-";

const typeIdOf = (o) => {
  // direct numeric or numeric string
  const raw =
    o?.customer_type_id ??
    o?.customerTypeId ??
    o?.type_id ??
    o?.typeId ??
    o?.customer_type ??
    o?.type ??
    o?.role;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
    if (/sender/i.test(raw)) return 1;
    if (/receiver/i.test(raw)) return 2;
  }
  // object like { id: 1, name: 'Sender' }
  const obj = (o?.customer_type && typeof o.customer_type === "object" ? o.customer_type : null) ||
    (o?.type && typeof o.type === "object" ? o.type : null);
  if (obj) {
    const n = Number(obj.id ?? obj.value ?? obj.code);
    if (!Number.isNaN(n)) return n;
    if (/sender/i.test(String(obj.name ?? obj.title ?? obj.label ?? ""))) return 1;
    if (/receiver/i.test(String(obj.name ?? obj.title ?? obj.label ?? ""))) return 2;
  }
  return null;
};

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
  statusId: 13,
  date: today(),
  time: "09:36",
  collectedByRoleId: "",
  collectedByRoleName: "",
  collectedByPersonId: "",
  lrlTrackingCode: "",
  deliveryTypeId: "",
  specialRemarks: "",
  billCharges: 0,
  vatPercentage: 0,
});

/* ---------------- Fetch ALL parties by numeric type (1 or 2) ---------------- */
async function fetchAllPartiesByType(numericTypeId) {
  const perPage = 500;
  const maxPages = 100;
  const out = [];
  const seen = new Set();

  for (let page = 1; page <= maxPages; page++) {
    // Send multiple compatible keys: your backend can pick what it expects
    const params = {
      per_page: perPage,
      page,
      customer_type_id: numericTypeId,
      customer_type: numericTypeId,
      type_id: numericTypeId,
      // status: 'Active', // uncomment if your API needs it
    };
    const res = await getParties(params);
    const batch = unwrapArray(res);
    if (!batch.length) break;

    for (const it of batch) {
      // client-side safety filter in case API ignored the param
      if (typeIdOf(it) !== numericTypeId) continue;

      const key = String(idOf(it) ?? JSON.stringify(it));
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }

    // stop on short page
    if (batch.length < perPage) break;

    // also honor meta/links if present
    const meta = res?.meta || res?.data?.meta;
    const cur = meta?.current_page ?? meta?.currentPage;
    const last = meta?.last_page ?? meta?.lastPage;
    if (cur && last && Number(cur) >= Number(last)) break;

    const links = res?.links || res?.data?.links;
    const noNext =
      (links && (links.next === null || links.next === false)) ||
      (links && (links.next_page_url === null || links.next_page_url === undefined));
    if (noNext) break;
  }

  // stable alpha sort by label for better UX
  out.sort((a, b) =>
    (labelOf(a) || "").localeCompare(labelOf(b) || "", undefined, { sensitivity: "base" })
  );
  return out;
}

const options = [
  "Dates",
  "Almonds",
  "Cashew Nuts",
  "Walnuts",
  "Pistachios",
  "Raisins",
  "Dry Figs",
  "Peanuts",
  "Chocolates",
  "Biscuits",
  "Rice Bags",
  "Wheat Flour",
  "Sugar",
  "Cooking Oil",
  "Tea Powder",
  "Coffee Powder",
  "Spices (Cardamom, Cloves, Cinnamon)",
  "Soap",
  "Detergent Powder",
  "Shampoo Bottles",
  "Toothpaste",
  "Perfume Bottles",
  "Clothing",
  "Shoes",
  "Bags",
  "Blankets",
  "Towels",
  "Utensils",
  "Cookware",
  "Electronics (Mobile Phones, Tablets)",
  "Small Appliances (Mixers, Irons)",
  "Toys",
  "Stationery",
  "Books",
];


export default function CreateCargo() {
  const token = useSelector((s) => s.auth?.token);

  // selects
  const [methods, setMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [senders, setSenders] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [collectRoles, setCollectRoles] = useState([]); // [{id:1,name:'Driver'},{id:2,'Office'}]
  const [collectedByOptions, setCollectedByOptions] = useState([]); // drivers OR staff array

  // user/profile
  const [userProfile, setUserProfile] = useState(null);
  const [x, setX] = useState('');
  const [s, setS] = useState([]);
  const [y, setY] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // UI
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceShipment, setInvoiceShipment] = useState(null);

  const [boxes, setBoxes] = useState([{ items: [{ name: "", pieces: 1, unitPrice: 0, weight: 0 }] }]);

  // toast
  const [toast, setToast] = useState({ visible: false, text: "", variant: "success" });
  const toastTimer = useRef(null);

  const showToast = useCallback((text, variant = "success", duration = 3500) => {
    try { clearTimeout(toastTimer.current); } catch { }
    setToast({ visible: true, text, variant });
    toastTimer.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, duration);
  }, []);
  const hideToast = useCallback(() => {
    try { clearTimeout(toastTimer.current); } catch { }
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  // form & items
  const [form, setForm] = useState(buildInitialForm());
  const [items, setItems] = useState([{ name: "", pieces: 1, unitPrice: 0, weight: 0 }]);


  const onChange = (event, { newValue }) => {
    setX(newValue);
  };

  const getSuggestions = (value) => {
    return options.filter((item) =>
      item.toLowerCase().includes(value.toLowerCase())
    );
  };

  const renderSuggestion = (text) => {
    return (
      <div
        className={`px-4 py-2 cursor-pointer ${selectedIndex === options.indexOf(text) ? 'bg-blue-200' : ''}`}
        onClick={() => {
          setX(text); // Update the input value when the suggestion is clicked
          setY(false); // Hide suggestions
        }}
      >
        {text}
      </div>
    );
  };

  // totals
  const subtotal = useMemo(() => {
    let s = 0;
    for (const it of items) {
      s += Number(it.pieces || 0) * Number(it.unitPrice || 0);
    }
    return Number(s.toFixed(2));
  }, [items]);
  const billCharges = useMemo(() => Number(form.billCharges || 0), [form.billCharges]);
  const vatPercentage = useMemo(() => Number(form.vatPercentage || 0), [form.vatPercentage]);
  const totalCost = subtotal;
  const vatCost = useMemo(() => Number(((totalCost * vatPercentage) / 100).toFixed(2)), [totalCost, vatPercentage]);
  const netTotal = useMemo(() => Number((totalCost + billCharges + vatCost).toFixed(2)), [totalCost, billCharges, vatCost]);
  const totalWeight = useMemo(() => {
    let sum = 0;
    for (const it of items) sum += Number(it.weight || 0) * Number(it.pieces || 0);
    return Number(sum.toFixed(3));
  }, [items]);

  /* preferred branch from token (fallback) */
  const tokenClaims = useMemo(() => safeDecodeJwt(token), [token]);
  const tokenBranchId = tokenClaims?.branch_id ?? tokenClaims?.branchId ?? null;

  /* toast on msg change */
  useEffect(() => {
    if (msg.text) showToast(msg.text, msg.variant || "success");
  }, [msg.text, msg.variant, showToast]);

  /* ---------- initial load ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setMsg({ text: "", variant: "" });
      try {
        const [me, m, st, pm, dt, roles] = await Promise.all([
          getProfile(),
          getActiveShipmentMethods(),
          getActiveShipmentStatuses(),
          getAllPaymentMethods(),
          getActiveDeliveryTypes(),
          getActiveCollected(),
        ]);
        if (!alive) return;

        const profile = me?.data ?? me ?? null;
        setUserProfile(profile);

        setMethods(unwrapArray(m));
        setStatuses(unwrapArray(st));
        setPaymentMethods(unwrapArray(pm));
        setDeliveryTypes(unwrapArray(dt));
        setCollectRoles(Array.isArray(roles?.data) ? roles.data : []);

        const preferredBranchId = pickBranchId(profile) ?? tokenBranchId ?? "";
        setForm((f) => buildInitialForm(preferredBranchId));

        // Fetch ALL: 1=Sender, 2=Receiver
        const [allSenders, allReceivers] = await Promise.all([
          fetchAllPartiesByType(1),
          fetchAllPartiesByType(2),
        ]);
        if (!alive) return;
        setSenders(allSenders);
        setReceivers(allReceivers);
      } catch (e) {
        if (!alive) return;
        setMsg({ text: e?.details?.message || e?.message || "Failed to load options.", variant: "error" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, tokenBranchId]);

  /* keep form.branchId synced */
  useEffect(() => {
    const bidRaw = pickBranchId(userProfile) ?? tokenBranchId ?? null;
    const bid = bidRaw != null ? String(bidRaw) : "";
    if (bid && String(form.branchId) !== bid) {
      setForm((f) => ({ ...f, branchId: bid }));
    }
  }, [userProfile, tokenBranchId, form.branchId]);

  /* role change helpers */
  const loadOfficeStaff = useCallback(async () => {
    const branchId = form.branchId || pickBranchId(userProfile) || tokenBranchId;
    if (!branchId) {
      setCollectedByOptions([]);
      setMsg({ text: "Your profile has no branch; cannot load office staff.", variant: "error" });
      return;
    }
    const res = await getBranchUsers(branchId);
    setCollectedByOptions(unwrapArray(res));
  }, [form.branchId, userProfile, tokenBranchId]);

  /* when Branch or Role is 'Office', keep people list in sync */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (form.collectedByRoleName !== "Office") return;
      try {
        await loadOfficeStaff();
      } catch {
        if (!alive) return;
        setCollectedByOptions([]);
        setMsg({ text: "Failed to load office staff for the selected branch.", variant: "error" });
      }
    })();
    return () => { alive = false; };
  }, [form.branchId, form.collectedByRoleName, loadOfficeStaff]);

  /* role change -> populate collectedByOptions */
  const onRoleChange = useCallback(async (e) => {
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
        await loadOfficeStaff();
      } else {
        setCollectedByOptions([]);
      }
    } catch {
      setCollectedByOptions([]);
      setMsg({ text: "Failed to load list for the selected role.", variant: "error" });
    }
  }, [collectRoles, loadOfficeStaff]);

  /* party autofill (address/phone) */
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

  /* items helpers */
  const setItem = useCallback((idx, key, val) => {
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
  }, []);
  const addRow = useCallback(
    () => setItems((p) => [...p, { name: "", pieces: 1, unitPrice: 0, weight: 0 }]),
    []
  );
  const removeRow = useCallback((idx) => {
    setItems((p) => p.filter((_, i) => i !== idx));
  }, []);

  /* validation */
  const validateBeforeSubmit = useCallback(() => {
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
  }, [form, items]);

  /* submit */
  const resetFormAfterSubmit = useCallback(() => {
    const nextBranchId = pickBranchId(userProfile) ?? tokenBranchId ?? "";
    setForm(buildInitialForm(nextBranchId));
    setItems([{ name: "", pieces: 1, unitPrice: 0, weight: 0 }]);
    setCollectedByOptions([]);
  }, [userProfile, tokenBranchId]);

  const addBox = useCallback(() => {
    setBoxes((prevBoxes) => [
      ...prevBoxes,
      { items: [{ name: "", pieces: 1, unitPrice: 0, weight: 0 }] }
    ]);
  }, []);

  const addItemToBox = (boxIndex) => {
    const newBoxes = [...boxes];
    newBoxes[boxIndex].items.push({ name: "", pieces: 1, unitPrice: 0, weight: 0 });
    setBoxes(newBoxes);
  };

  const removeItemFromBox = (boxIndex, itemIndex) => {
    const newBoxes = [...boxes];
    newBoxes[boxIndex].items = newBoxes[boxIndex].items.filter((_, index) => index !== itemIndex);
    setBoxes(newBoxes);
  };

  const submit = useCallback(async (e) => {
    e.preventDefault();

    const missing = validateBeforeSubmit();
    if (missing.length) {
      setMsg({ text: `Missing/invalid: ${missing.join(", ")}`, variant: "error" });
      return;
    }

    const roleId = Number(form.collectedByRoleId);
    const personId = Number(form.collectedByPersonId);
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

      collected_by: form.collectedByRoleName,
      collected_by_id: roleId,
      name_id: personId,

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
      const normalized = normalizeCargoToInvoice(created);
      setInvoiceShipment(normalized);

      startTransition(() => {
        setInvoiceShipment(normalized);
        setInvoiceOpen(true);
        showToast("Cargo created. Invoice ready.", "success");
        resetFormAfterSubmit();
        setMsg({ text: "", variant: "" });
      });
    } catch (e2) {
      setMsg({ text: e2?.message || "Failed to create cargo.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [
    billCharges,
    items,
    netTotal,
    showToast,
    totalCost,
    totalWeight,
    vatCost,
    vatPercentage,
    form,
    validateBeforeSubmit,
    resetFormAfterSubmit,
  ]);

  const onResetClick = useCallback(() => {
    const nextBranchId = pickBranchId(userProfile) ?? tokenBranchId ?? "";
    setForm(buildInitialForm(nextBranchId));
    setItems([{ name: "", pieces: 1, unitPrice: 0, weight: 0 }]);
    setCollectedByOptions([]);
    showToast("Form reset.", "success");
  }, [userProfile, tokenBranchId, showToast]);

  /* title = booking_no while invoice is open */
  useEffect(() => {
    if (!invoiceOpen || !invoiceShipment?.booking_no) return;
    const prev = document.title;
    const safe = String(invoiceShipment.booking_no).replace(/[\\/:*?"<>|]/g, "-");
    const restore = () => {
      document.title = prev;
      window.removeEventListener("afterprint", restore);
    };
    document.title = safe;
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("afterprint", restore);
      document.title = prev;
    };
  }, [invoiceOpen, invoiceShipment?.booking_no]);

  /* UI derived */
  const branchNameFromProfile =
    userProfile?.user?.branch?.name ||
    userProfile?.branch?.name ||
    userProfile?.user?.branch_name ||
    userProfile?.branch_name ||
    "";

  return (
    <>
      {/* Toast */}
      <div
        className="fixed top-4 right-4 z-50"
        style={{
          transform: toast.visible ? "translateX(0)" : "translateX(120%)",
          transition: "transform 300ms ease",
        }}
      >
        <div
          className={`min-w-[260px] max-w-[360px] rounded-xl border px-4 py-3 shadow ${toast.variant === "error"
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
          <div className="add-cargo-header flex justify-between items-center">
            <h2 className="header-cargo-heading flex items-center gap-2">
              <span className="header-cargo-icon"><BsFillBoxSeamFill /></span>
              Create Cargo
            </h2>
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 hover:underline">
                    Home
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li>
                  <Link to="/cargo/allcargolist" className="text-gray-500 hover:text-gray-700 hover:underline">
                    Cargos
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li aria-current="page" className="text-gray-800 font-medium">
                  Add Cargo
                </li>
              </ol>
            </nav>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-6">
            {/* Branch + Collected By */}
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
                  <div className="flex gap-2">
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
                    <span className="add-customer border rounded-lg px-3 py-2">
                      <Link to="/customers/create"><GoPlus /></Link>
                    </span>
                  </div>
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
                  <div className="flex gap-2">
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
                    <span className="add-customer border rounded-lg px-3 py-2">
                      <Link to="/customers/create"><GoPlus /></Link>
                    </span>
                  </div>
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
                  disabled
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
            <div className="cargo-add-box-btn">
              <button
                type="button"
                onClick={addBox}
              >
                <FiPlus/>Add Box
              </button>
            </div>

            {/* Render Boxes with Items */}
            {boxes.map((box, boxIndex) => (
              <div key={boxIndex} className="border p-4 rounded-lg mb-4">
                
                <h3 className="text-lg font-semibold text-primary-color mb-4">Box {boxIndex + 1}</h3>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-sm">
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
                      {box.items.map((it, itemIndex) => (
                        <tr key={itemIndex} className={itemIndex % 2 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 text-center text-gray-500">{itemIndex + 1}</td>
                          <td className="px-3 py-2 relative overflow-visible">

<Autosuggest
  inputProps={{
    value: x,
    onChange,
    onFocus: () => setY(true),
    onBlur: () => setY(false),
    className: "w-full px-3 py-2 border rounded-md",
  }}
  suggestions={s}
  onSuggestionsFetchRequested={({ value }) => {
    const filteredSuggestions = getSuggestions(value);
    setS(filteredSuggestions);
    setSelectedIndex(0);
  }}
  onSuggestionsClearRequested={() => setS([])}
  renderSuggestion={renderSuggestion}
  getSuggestionValue={(a) => a}
  alwaysRenderSuggestions={y}
  renderSuggestionsContainer={({ containerProps, children }) => {
    // Find the currently focused input
    const input = document.activeElement;
    if (!input || input.tagName !== "INPUT") return null;

    const rect = input.getBoundingClientRect();

    return ReactDOM.createPortal(
      <div
        {...containerProps}
        className="absolute bg-white border mt-1 rounded-md shadow-lg z-[9999] max-h-60 overflow-auto"
        style={{
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        }}
      >
        {children}
      </div>,
      document.body
    );
  }}
/>

                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              className="w-full border rounded-lg px-3 py-2 text-right"
                              placeholder="0"
                              value={it.pieces}
                              onChange={(e) =>
                                setItem(boxIndex, itemIndex, "pieces", Number.parseInt(e.target.value || 0, 10) || 0)
                              }
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
                              onChange={(e) =>
                                setItem(boxIndex, itemIndex, "unitPrice", Number.parseFloat(e.target.value || 0) || 0)
                              }
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
                              onChange={(e) =>
                                setItem(boxIndex, itemIndex, "weight", Number.parseFloat(e.target.value || 0) || 0)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {(Number(it.pieces || 0) * Number(it.unitPrice || 0)).toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => removeItemFromBox(boxIndex, itemIndex)}
                                className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => addItemToBox(boxIndex)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            ))}

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
