// CreateCargo.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import ReactDOM from "react-dom";
import { useSelector } from "react-redux";
import Autosuggest from "react-autosuggest";

import { createCargo, normalizeCargoToInvoice } from "../../api/createCargoApi";
import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getBranchUsers } from "../../api/branchApi";
// IMPORTANT: use filtered parties API
import { getPartiesByCustomerType } from "../../api/partiesApi";
import { getAllPaymentMethods } from "../../api/paymentMethod";
import { getActiveDeliveryTypes } from "../../api/deliveryType";

import { getProfile } from "../../api/accountApi";
import { getActiveCollected } from "../../api/collectedByApi";
import { getActiveDrivers } from "../../api/driverApi"; 

import InvoiceModal from "../../components/InvoiceModal";
import { IoLocationSharp } from "react-icons/io5";
import { MdAddIcCall, MdDeleteForever } from "react-icons/md";
import { BsFillBoxSeamFill } from "react-icons/bs";
import { GoPlus } from "react-icons/go";
import { Link, useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import "./ShipmentStyles.css";

/* ---------------- skeleton helpers ---------------- */
const Skel = ({ w = "100%", h = 12, className = "" }) => (
  <div
    className={`animate-pulse rounded bg-slate-200/80 ${className}`}
    style={{ width: w, height: h }}
  />
);
const SkelField = () => <Skel h={40} />;
const SkelLine = ({ w = "60%", className = "" }) => <Skel w={w} h={12} className={className} />;

const SkeletonCreateCargo = () => (
  <div className="space-y-6">
    {/* Top row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div><SkelLine w="30%" className="mb-2" /><SkelField /></div>
      <div><SkelLine w="45%" className="mb-2" /><SkelField /></div>
      <div><SkelLine w="45%" className="mb-2" /><SkelField /></div>
    </div>

    {/* Parties */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[0,1].map(i => (
        <div key={i} className="space-y-3">
          <SkelLine w="30%" />
          <div>
            <SkelLine w="40%" className="mb-2" />
            <div className="flex gap-2">
              <div className="flex-1"><SkelField /></div>
              <div className="w-[46px]"><SkelField /></div>
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <SkelLine w="90%" />
            <SkelLine w="40%" />
          </div>
        </div>
      ))}
    </div>

    {/* Shipping / Payment / Status */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div><SkelLine w="45%" className="mb-2" /><SkelField /></div>
      <div><SkelLine w="45%" className="mb-2" /><SkelField /></div>
      <div><SkelLine w="30%" className="mb-2" /><SkelField /></div>
    </div>

    {/* Date / Time / Tracking / Delivery */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[0,1,2,3].map(k => (<div key={k}><SkelLine w="50%" className="mb-2" /><SkelField /></div>))}
    </div>

    {/* Remarks + totals */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-3">
        <SkelLine w="30%" className="mb-2" />
        <SkelField />
      </div>
      <div className="space-y-2">
        <SkelLine w="100%" />
        <SkelLine w="80%" />
        <SkelLine w="90%" />
        <SkelLine w="70%" />
      </div>
    </div>

    {/* A sample box table skeleton */}
    <div className="border p-4 rounded-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <SkelLine w="35%" />
        <SkelLine w="20%" />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              {["Slno","Name","Pieces","Unit Price","Total Price","Actions"].map(h => (
                <th key={h} className="px-3 py-2"><SkelLine w="60%" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, r) => (
              <tr key={r} className={r % 2 ? "bg-white" : "bg-gray-50"}>
                {Array.from({ length: 6 }).map((__, c) => (
                  <td key={c} className="px-3 py-2">
                    <SkelLine w={c === 1 ? "90%" : "60%"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <div className="w-32"><SkelField /></div>
      </div>
    </div>

    {/* Bottom buttons */}
    <div className="flex items-center justify-between">
      <div className="w-40"><SkelField /></div>
      <div className="flex gap-3">
        <div className="w-28"><SkelField /></div>
        <div className="w-48"><SkelField /></div>
      </div>
    </div>
  </div>
);

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

  const unwrapDrivers = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.drivers)) return res.drivers;           // ← your shape
  if (Array.isArray(res?.data?.drivers)) return res.data.drivers;
  return [];
};

const prettyDriver = (d = {}) => {
  const name = d.name || "-";
  const phone = [d.phone_code, d.phone_number].filter(Boolean).join(" ");
  return phone ? `${name} (${phone})` : name;
};

const labelOf = (o) =>
  o?.name ??
  o?.driver_name ??
  o?.company_name ??
  o?.full_name ??
  o?.branch_name ??
  o?.title ??
  o?.label ??
  o?.username ??
  o?.email ??
  ([o?.first_name, o?.last_name].filter(Boolean).join(" ") ||
  [o?.mobile, o?.phone, o?.contact_number].find(Boolean)) ??
  "-";

const today = () => new Date().toISOString().split("T")[0];

const pickBranchId = (profileLike) => {
  const x = profileLike?.data ?? profileLike ?? null;
  const user = x?.user ?? x ?? null;
  return user?.branch_id ?? user?.branchId ?? user?.branch?.id ?? null;
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

/* coalesce + robust phone/address from your API fields */
const coalesce = (...vals) => {
  for (const v of vals) {
    if (v === 0) return "0";
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
};

const phoneFromParty = (p) => {
  if (!p) return "";
  return coalesce(
    p.contact_number,
    p.whatsapp_number,
    p.phone,
    p.mobile
  );
};

const addressFromParty = (p) => {
  if (!p) return "";
  const raw = coalesce(p.address, p.full_address);
  if (raw) return raw;

  const parts = [
    coalesce(p.address1, p.address_line1),
    coalesce(p.address2, p.address_line2),
    coalesce(p.city),
    coalesce(p.district),
    coalesce(p.state),
    coalesce(p.postal_code),
    coalesce(p.country),
  ].filter(Boolean);

  return parts.join(", ");
};

/* Quick item-name suggestions (static) */
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

function ItemAutosuggest({ value, onChange }) {
  const [localValue, setLocalValue] = useState(value || "");
  const [localSuggestions, setLocalSuggestions] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setLocalValue(value || ""); }, [value]);

  const fetchSuggestions = ({ value: q }) => {
    const filtered = options.filter((item) =>
      item.toLowerCase().includes((q || "").toLowerCase())
    );
    setLocalSuggestions(filtered);
  };

  return (
    <Autosuggest
      inputProps={{
        value: localValue,
        onChange: (e, { newValue }) => { setLocalValue(newValue); onChange(newValue); },
        onFocus: () => setOpen(true),
        onBlur: () => setTimeout(() => setOpen(false), 150),
        className: "w-full px-3 py-2 border rounded-md",
      }}
      suggestions={localSuggestions}
      onSuggestionsFetchRequested={fetchSuggestions}
      onSuggestionsClearRequested={() => setLocalSuggestions([])}
      renderSuggestion={(text) => (
        <div className="px-4 py-2 cursor-pointer">{text}</div>
      )}
      getSuggestionValue={(a) => a}
      onSuggestionSelected={(e, { suggestionValue }) => {
        setLocalValue(suggestionValue);
        onChange(suggestionValue);
      }}
      highlightFirstSuggestion={true}
      renderSuggestionsContainer={({ containerProps, children }) => {
        if (!open) return null;
        const input = document.activeElement;
        if (!input || input.tagName !== "INPUT") return null;
        const rect = input.getBoundingClientRect();
        return ReactDOM.createPortal(
          <div
            {...containerProps}
            className="absolute bg-white border mt-1 rounded-md shadow-lg z-[9999] max-h-60 overflow-auto"
            style={{ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width }}
          >
            {children}
          </div>,
          document.body
        );
      }}
    />
  );
}

/* ---------------------- Component ---------------------- */
export default function CreateCargo() {
  const token = useSelector((s) => s.auth?.token);
  const navigate = useNavigate();

  // selects
  const [methods, setMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [senders, setSenders] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [collectRoles, setCollectRoles] = useState([]);
  const [collectedByOptions, setCollectedByOptions] = useState([]);

  // user/profile
  const [userProfile, setUserProfile] = useState(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceShipment, setInvoiceShipment] = useState(null);

  // Boxes: each has box_number (auto), box_weight (kg), and items[]
  const [boxes, setBoxes] = useState([
    {
      box_number: "1",
      box_weight: 0,
      items: [{ name: "", pieces: 1, unitPrice: 0 }],
    },
  ]);

  // toast
  const [toast, setToast] = useState({ visible: false, text: "", variant: "success" });
  const toastTimer = useRef(null);
  const showToast = useCallback((text, variant = "success", duration = 3500) => {
    try { clearTimeout(toastTimer.current); } catch {}
    setToast({ visible: true, text, variant });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration);
  }, []);
  const hideToast = useCallback(() => {
    try { clearTimeout(toastTimer.current); } catch {}
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  // form
  const [form, setForm] = useState(buildInitialForm());

  /* totals computed from boxes so UI and payload match */
  const subtotal = useMemo(() => {
    let s = 0;
    for (const b of boxes) {
      for (const it of b.items) {
        s += Number(it.pieces || 0) * Number(it.unitPrice || 0);
      }
    }
    return Number(s.toFixed(2));
  }, [boxes]);
  const billCharges = useMemo(() => Number(form.billCharges || 0), [form.billCharges]);
  const vatPercentage = useMemo(() => Number(form.vatPercentage || 0), [form.vatPercentage]);
  const totalCost = subtotal;
  const vatCost = useMemo(() => Number(((totalCost * vatPercentage) / 100).toFixed(2)), [totalCost, vatPercentage]);
  const netTotal = useMemo(() => Number((totalCost + billCharges + vatCost).toFixed(2)), [totalCost, billCharges, vatCost]);

  // total weight = sum of box weights (entered after packing)
  const totalWeight = useMemo(() => {
    let sum = 0;
    for (const b of boxes) sum += Number(b.box_weight || 0);
    return Number(sum.toFixed(3));
  }, [boxes]);

  /* token branch */
  const tokenClaims = useMemo(() => safeDecodeJwt(token), [token]);
  const tokenBranchId = tokenClaims?.branch_id ?? tokenClaims?.branchId ?? null;

  useEffect(() => {
    if (msg.text) showToast(msg.text, msg.variant || "success");
  }, [msg.text, msg.variant, showToast]);

  /* initial load */
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

        // *** Load parties via filtered API ***
        const [allSenders, allReceivers] = await Promise.all([
          getPartiesByCustomerType(1), // Sender
          getPartiesByCustomerType(2), // Receiver
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

  useEffect(() => {
  if (form.collectedByRoleName !== "Driver") return;
  let alive = true;
  (async () => {
    try {
      const res = await getActiveDrivers();       // import from driverApi.js
      const list = unwrapDrivers(res);
      if (alive) setCollectedByOptions(list);
    } catch {
      if (alive) {
        setCollectedByOptions([]);
        setMsg({ text: "Failed to load drivers.", variant: "error" });
      }
    }
  })();
  return () => { alive = false; };
}, [form.collectedByRoleName]);


  /* keep form.branchId synced */
  useEffect(() => {
    const bidRaw = pickBranchId(userProfile) ?? tokenBranchId ?? null;
    const bid = bidRaw != null ? String(bidRaw) : "";
    if (bid && String(form.branchId) !== bid) {
      setForm((f) => ({ ...f, branchId: bid }));
    }
  }, [userProfile, tokenBranchId, form.branchId]);

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

  useEffect(() => {
    let alive = true;
    (async () => {
      if (form.collectedByRoleName === "Office") {
      try { await loadOfficeStaff(); } catch { /* toasts already handled */ }
      return;
    } if (form.collectedByRoleName === "Driver") {
      try {
        const res = await getActiveDrivers();
        if (!alive) return;
        setCollectedByOptions(unwrapArray(res));
      } catch {
        if (!alive) return;
        setCollectedByOptions([]);
        setMsg({ text: "Failed to load drivers.", variant: "error" });
      }
      return;
    }
    })();
    return () => { alive = false; };
  }, [form.branchId, form.collectedByRoleName, loadOfficeStaff]);

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

  /* ---------- BOX HELPERS ---------- */
  const getNextBoxNumber = useCallback(() => {
    const nums = boxes.map((b) => Number(b.box_number)).filter((n) => Number.isFinite(n));
    if (nums.length) return String(Math.max(...nums) + 1);
    return String(boxes.length + 1); // fallback
  }, [boxes]);

  const addBox = useCallback(() => {
    const nextNo = getNextBoxNumber();
    setBoxes((prev) => [
      ...prev,
      {
        box_number: nextNo,
        box_weight: 0, // entered after packing
        items: [{ name: "", pieces: 1, unitPrice: 0 }],
      },
    ]);
  }, [getNextBoxNumber]);

  const removeBox = useCallback((boxIndex) => {
    setBoxes((prev) => {
      if (prev.length <= 1) return prev; // keep at least one
      return prev.filter((_, i) => i !== boxIndex);
    });
  }, []);

  const setBoxWeight = useCallback((boxIndex, val) => {
    setBoxes((prev) => {
      const next = structuredClone(prev);
      const b = next[boxIndex];
      if (!b) return prev;
      const n = Number.parseFloat(val || 0);
      b.box_weight = Number.isNaN(n) ? 0 : Math.max(0, n);
      return next;
    });
  }, []);

  const addItemToBox = useCallback((boxIndex) => {
    setBoxes((prev) => {
      const next = structuredClone(prev);
      const b = next[boxIndex];
      if (!b) return prev;
      b.items.push({ name: "", pieces: 1, unitPrice: 0 });
      return next;
    });
  }, []);

  const removeItemFromBox = useCallback((boxIndex, itemIndex) => {
    setBoxes((prev) => {
      const next = structuredClone(prev);
      const b = next[boxIndex];
      if (!b || !b.items) return prev;
      if (b.items.length <= 1) {
        showToast("At least one item per box is required", "error");
        return prev;
      }
      b.items.splice(itemIndex, 1);
      return next;
    });
  }, [showToast]);

  const setBoxItem = useCallback((boxIdx, itemIdx, key, val) => {
    setBoxes((prev) => {
      const next = structuredClone(prev);
      const it = next?.[boxIdx]?.items?.[itemIdx];
      if (!it) return prev;
      if (key === "pieces") {
        const n = Number.parseInt(val || 0, 10);
        it.pieces = Number.isNaN(n) ? 0 : Math.max(0, n);
      } else if (key === "unitPrice") {
        const n = Number.parseFloat(val || 0);
        it.unitPrice = Number.isNaN(n) ? 0 : Math.max(0, n);
      } else if (key === "name") {
        it.name = val;
      }
      return next;
    });
  }, []);

  /* selected parties + sync to form */
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
      senderAddress: addressFromParty(selectedSender) || "",
      senderPhone: phoneFromParty(selectedSender) || "",
    }));
  }, [selectedSender]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      receiverAddress: addressFromParty(selectedReceiver) || "",
      receiverPhone: phoneFromParty(selectedReceiver) || "",
    }));
  }, [selectedReceiver]);

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

    // items present?
    const allItems = boxes.flatMap((b) => b.items);
    if (!allItems.some((it) => (it.name?.trim() || "") && Number(it.pieces || 0) > 0)) {
      missing.push("At least one item (name + pieces)");
    }

    // require each box to have weight > 0
    const anyZeroBox = boxes.some((b) => Number(b.box_weight || 0) <= 0);
    if (anyZeroBox) {
      missing.push("Each box needs a weight > 0");
    }

    return missing;
  }, [form, boxes]);

  const resetFormAfterSubmit = useCallback(() => {
    const nextBranchId = pickBranchId(userProfile) ?? tokenBranchId ?? "";
    setForm(buildInitialForm(nextBranchId));
    setCollectedByOptions([]);
    setBoxes([
      {
        box_number: "1",
        box_weight: 0,
        items: [{ name: "", pieces: 1, unitPrice: 0 }],
      },
    ]);
  }, [userProfile, tokenBranchId]);

  /* submit - GROUP BY box.box_number (items under each; include box_weight) */
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

    // Build boxes object grouped by box.box_number
    const grouped = {};
    boxes.forEach((box, bIdx) => {
      const bn = String(box.box_number ?? bIdx + 1);
      if (!grouped[bn]) grouped[bn] = { items: [], box_weight: Number(box.box_weight || 0).toFixed(3) };

      (box.items || []).forEach((it) => {
        grouped[bn].items.push({
          slno: String(grouped[bn].items.length + 1),
          box_number: bn,
          name: it.name || "",
          piece_no: String(Number(it.pieces || 0)),
          unit_price: Number(it.unitPrice || 0).toFixed(2),
          total_price: (Number(it.pieces || 0) * Number(it.unitPrice || 0)).toFixed(2),
        });
      });
    });

    // order keys numerically
    const ordered = {};
    Object.keys(grouped)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((k) => { ordered[k] = grouped[k]; });

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

      total_cost: totalCost.toFixed(2),
      bill_charges: Number(form.billCharges || 0).toFixed(2),
      vat_percentage: Number(form.vatPercentage || 0).toFixed(2),
      vat_cost: vatCost.toFixed(2),
      net_total: netTotal.toFixed(2),

      // total weight from boxes
      total_weight: totalWeight.toFixed(3),

      // boxes grouped by box_number, with box_weight included
      boxes: ordered,
    };

    try {
      setLoading(true);
      const created = await createCargo(payload);
      const normalized = normalizeCargoToInvoice(created);

      // ensure booking_no fallback from boxes (if absent)
      if ((!normalized.booking_no || String(normalized.booking_no).trim() === "") && normalized.boxes) {
        const keys = Object.keys(normalized.boxes).filter((k) => String(k).trim() !== "");
        if (keys.length) {
          keys.sort((a, b) => Number(a) - Number(b));
          normalized.booking_no = keys.join("-");
        }
      }

      setInvoiceShipment(normalized);
      setInvoiceOpen(true);
      showToast("Cargo created. Invoice ready.", "success");
      resetFormAfterSubmit();
    } catch (e2) {
      setMsg({ text: e2?.message || "Failed to create cargo.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [
    boxes,
    form,
    totalCost,
    vatCost,
    vatPercentage,
    billCharges,
    netTotal,
    totalWeight,
    validateBeforeSubmit,
    resetFormAfterSubmit,
    showToast,
  ]);

  const onResetClick = useCallback(() => {
    const nextBranchId = pickBranchId(userProfile) ?? tokenBranchId ?? "";
    setForm(buildInitialForm(nextBranchId));
    setCollectedByOptions([]);
    setBoxes([
      {
        box_number: "1",
        box_weight: 0,
        items: [{ name: "", pieces: 1, unitPrice: 0 }],
      },
    ]);
    showToast("Form reset.", "success");
  }, [userProfile, tokenBranchId, showToast]);

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

          {/* Skeleton vs Real Form */}
          {loading ? (
            <SkeletonCreateCargo />
          ) : (
            <form onSubmit={submit} className="space-y-6">
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
                              ? (opt?.id ?? opt?.driver_id ?? null)      // your API uses `id`
                              : (opt?.staff_id ?? opt?.user_id ?? opt?.id ?? null);
                          if (!valueId) return null;

                          const label =
                            form.collectedByRoleName === "Driver" ? prettyDriver(opt) : labelOf(opt);

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
                          <option key={String(s.id)} value={String(s.id)}>
                            {s.name}
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
                      {addressFromParty(selectedSender) || form.senderAddress || "—"}
                    </p>
                    <p className="w-full px-3 flex items-center gap-1">
                      <span className="party-details-icon"><MdAddIcCall /></span>
                      {phoneFromParty(selectedSender) || form.senderPhone || "—"}
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
                          <option key={String(r.id)} value={String(r.id)}>
                            {r.name}
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
                      {addressFromParty(selectedReceiver) || form.receiverAddress || "—"}
                    </p>
                    <p className="w-full px-3 flex items-center gap-1">
                      <span className="party-details-icon"><MdAddIcCall /></span>
                      {phoneFromParty(selectedReceiver) || form.receiverPhone || "—"}
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

              {/* Render Boxes with Items */}
              {boxes.map((box, boxIndex) => (
                <div key={boxIndex} className="border p-4 rounded-lg mb-4">
                  {/* Header: Box No + Box Weight + Remove */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-semibold text-gray-800">
                        Box No:{" "}
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 border">
                          {box.box_number}
                        </span>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Box Weight (kg):</span>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          className={`w-32 border rounded-lg px-2 py-1 text-right ${
                            Number(box.box_weight || 0) <= 0 ? "border-rose-300" : ""
                          }`}
                          value={box.box_weight}
                          onChange={(e) => setBoxWeight(boxIndex, e.target.value)}
                          placeholder="0.000"
                          title="Enter after packing"
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeBox(boxIndex)}
                        disabled={boxes.length <= 1}
                        className={`px-2 py-1 rounded-lg text-white flex gap-1 items-center cargo-delete-btn ${
                          boxes.length <= 1
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-rose-600 hover:bg-rose-700"
                        }`}
                        title={boxes.length <= 1 ? "At least one box is required" : "Remove this box"}
                      >
                        <span className="delete-btn-icon"><MdDeleteForever/></span>Remove Box
                      </button>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full text-sm">
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
                        {box.items.map((it, itemIndex) => (
                          <tr key={itemIndex} className={itemIndex % 2 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 text-center text-gray-500">{itemIndex + 1}</td>

                            <td className="px-3 py-2 relative overflow-visible">
                              <ItemAutosuggest
                                value={it.name}
                                onChange={(v) => setBoxItem(boxIndex, itemIndex, "name", v)}
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
                                  setBoxItem(
                                    boxIndex,
                                    itemIndex,
                                    "pieces",
                                    Number.parseInt(e.target.value || 0, 10) || 0
                                  )
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
                                  setBoxItem(
                                    boxIndex,
                                    itemIndex,
                                    "unitPrice",
                                    Number.parseFloat(e.target.value || 0) || 0
                                  )
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
                                  className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 items-delete-btn"
                                >
                                  <MdDeleteForever/>
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

              {/* Global Add Box */}
              <div className="cargo-add-box-btn">
                <button
                  type="button"
                  onClick={addBox}
                  title="Add a new box; box number will auto-increment"
                >
                  <span className="box-add-btn-icon"><FaPlus/></span>Add Box
                </button>
              </div>

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
          )}
        </div>
      </div>

      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        shipment={invoiceShipment}
      />
    </>
  );
}
