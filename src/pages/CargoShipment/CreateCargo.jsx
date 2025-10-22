import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useSelector } from "react-redux";
import { createCargo, normalizeCargoToInvoice, getNextInvoiceNo } from "../../api/createCargoApi";
import {
  unwrapArray,
  idOf,
  labelOf,
  unwrapDrivers,
  prettyDriver,
  today,
  nowHi,
  pickBranchId,
  safeDecodeJwt,
  toDec,
  phoneFromParty,
  addressFromParty,
} from "../../utils/cargoHelpers";
import { getActiveShipmentMethods } from "../../api/shipmentMethodApi";
import { getActiveShipmentStatuses } from "../../api/shipmentStatusApi";
import { getBranchUsers, viewBranch } from "../../api/branchApi";
import { getPartiesByCustomerType } from "../../api/partiesApi";
import { getAllPaymentMethods } from "../../api/paymentMethod";
import { getActiveDeliveryTypes } from "../../api/deliveryType";
import { getProfile } from "../../api/accountApi";
import { getActiveCollected } from "../../api/collectedByApi";
import { getActiveDrivers } from "../../api/driverApi";
import InvoiceModal from "../../components/InvoiceModal";
import { BsFillBoxSeamFill } from "react-icons/bs";
import { Link } from "react-router-dom";
import ItemAutosuggest from "./components/ItemAutosuggest";
import "./ShipmentStyles.css";
import SenderModal from "../SenderReceiver/modals/SenderModal";
import ReceiverModal from "../SenderReceiver/modals/ReceiverModal";
import { Toaster } from "react-hot-toast";

const DEFAULT_STATUS_ID = 13;

/* ---------- Small presentational skeletons ---------- */
const Skel = ({ w = "100%", h = 12, className = "" }) => (
  <div
    className={`animate-pulse rounded bg-slate-200/80 ${className}`}
    style={{ width: w, height: h }}
  />
);
const SkelField = () => <Skel h={40} />;
const SkelLine = ({ w = "60%", className = "" }) => (
  <Skel w={w} h={12} className={className} />
);

const SkeletonCreateCargo = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <SkelLine w="30%" className="mb-2" />
        <SkelField />
      </div>
      <div>
        <SkelLine w="45%" className="mb-2" />
        <SkelField />
      </div>
      <div>
        <SkelLine w="45%" className="mb-2" />
        <SkelField />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3">
          <SkelLine w="30%" />
          <div>
            <SkelLine w="40%" className="mb-2" />
            <div className="flex gap-2">
              <div className="flex-1">
                <SkelField />
              </div>
              <div className="w-[46px]">
                <SkelField />
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <SkelLine w="90%" />
            <SkelLine w="40%" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <SkelLine w="45%" className="mb-2" />
        <SkelField />
      </div>
      <div>
        <SkelLine w="45%" className="mb-2" />
        <SkelField />
      </div>
      <div>
        <SkelLine w="30%" className="mb-2" />
        <SkelField />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((k) => (
        <div key={k}>
          <SkelLine w="50%" className="mb-2" />
          <SkelField />
        </div>
      ))}
    </div>
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
    <div className="border p-4 rounded-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <SkelLine w="35%" />
        <SkelLine w="20%" />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              {["Slno", "Name", "Pieces", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2">
                  <SkelLine w="60%" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, r) => (
              <tr key={r} className={r % 2 ? "bg-white" : "bg-gray-50"}>
                {Array.from({ length: 4 }).map((__, c) => (
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
        <div className="w-32">
          <SkelField />
        </div>
      </div>
    </div>
    <div className="flex items-center justify-between">
      <div className="w-40">
        <SkelField />
      </div>
      <div className="flex gap-3">
        <div className="w-28">
          <SkelField />
        </div>
        <div className="w-48">
          <SkelField />
        </div>
      </div>
    </div>
  </div>
);
/* ---------- Initial Form ---------- */
const buildInitialForm = (branchId = "") => ({
  branchId: branchId ? String(branchId) : "",
  invoiceNo: "",
  senderId: "",
  senderAddress: "",
  senderPhone: "",
  receiverId: "",
  receiverAddress: "",
  receiverPhone: "",
  shippingMethodId: "",
  paymentMethodId: "",
  statusId: DEFAULT_STATUS_ID,
  date: today(),
  time: nowHi(),
  collectedByRoleId: "",
  collectedByRoleName: "",
  collectedByPersonId: "",
  lrlTrackingCode: "",
  deliveryTypeId: "",
  specialRemarks: "",
  vatPercentage: 0,
  charges: {
    total_weight: { qty: 0, rate: 0 },
    duty: { qty: 0, rate: 0 },
    packing_charge: { qty: 0, rate: 0 },
    additional_packing_charge: { qty: 0, rate: 0 },
    insurance: { qty: 0, rate: 0 },
    awb_fee: { qty: 0, rate: 0 },
    vat_amount: { qty: 0, rate: 0 },
    volume_weight: { qty: 0, rate: 0 },
    discount: { qty: 0, rate: 0 },
    other_charges: { qty: 0, rate: 0 },
    no_of_pieces: 0,
  },
});

// rows
const CHARGE_ROWS = [
  ["total_weight", "Total Weight"],
  ["duty", "Duty"],
  ["packing_charge", "Packing charge"],
  ["additional_packing_charge", "Additional Packing charge"],
  ["insurance", "Insurance"],
  ["awb_fee", "AWB Fee"],
  ["vat_amount", "VAT Amount"],
  ["volume_weight", "Volume weight"],
  ["other_charges", "Other charges"],
  ["discount", "Discount"],
];

/* ---------- Items Autosuggest options ---------- */
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

const incrementInvoiceString = (last = "") => {
  if (!last) return "BR:000001";
  const m = String(last).trim().match(/^(.*?)(\d+)$/);
  if (!m) return `${last}-000001`;
  const [, prefix, digits] = m;
  const next = String(Number(digits) + 1).padStart(digits.length, "0");
  return `${prefix}${next}`;
};

/* ---------------------- Component ---------------------- */
export default function CreateCargo() {
  const token = useSelector((s) => s.auth?.token);

  // form FIRST
  const [form, setForm] = useState(buildInitialForm());
  const [methods, setMethods] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [senders, setSenders] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [collectRoles, setCollectRoles] = useState([]);
  const [collectedByOptions, setCollectedByOptions] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceShipment, setInvoiceShipment] = useState(null);
  const [senderOpen, setSenderOpen] = useState(false);
  const [receiverOpen, setReceiverOpen] = useState(false);
  const [boxes, setBoxes] = useState([
    { box_number: "1", box_weight: 0, items: [{ name: "", pieces: 1 }] },
  ]);
  const [toast, setToast] = useState({
    visible: false,
    text: "",
    variant: "success",
  });
  const toastTimer = useRef(null);

  const showToast = useCallback((text, variant = "success", duration = 3500) => {
    try {
      clearTimeout(toastTimer.current);
    } catch { }
    setToast({ visible: true, text, variant });
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      duration
    );
  }, []);
  const hideToast = useCallback(() => {
    try {
      clearTimeout(toastTimer.current);
    } catch { }
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  /* ---------- derived weights ---------- */
  const totalWeight = useMemo(() => {
    let sum = 0;
    for (const b of boxes) {
      const w = b.box_weight ?? b.weight ?? 0;
      sum += Number(w) || 0;
    }
    return Number(sum.toFixed(3));
  }, [boxes]);

  // --- money helpers ---
  const num = (v) =>
    v === null || v === undefined || v === "" ? 0 : Number(String(v).replace(/,/g, "")) || 0;

  const toMoney = (v) => num(v).toFixed(2);

  /* ---------- Pure derived calculator for charges ---------- */
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

  // IMPORTANT: compute `derived` *before* using it anywhere else.
  const derived = useMemo(() => {
    const getRow = (key) => {
      const row = form?.charges?.[key] || { qty: 0, rate: 0 };
      const qty = key === "total_weight" ? Number(totalWeight || 0) : Number(row.qty || 0);
      const rate = Number(row.rate || 0);
      const amount = Number((qty * rate).toFixed(2));
      return { qty, rate, amount };
    };

    const rows = {};
    let totalAmount = 0;
    for (const k of CHARGE_KEYS) {
      rows[k] = getRow(k);
      totalAmount += k === "discount" ? -rows[k].amount : rows[k].amount;
    }

    // Subtotal comes strictly from total_weight
    const subtotal = rows.total_weight.amount;

    // Full bill charges (sum of all billable lines EXCEPT total_weight; discount subtracts)
    const billCharges =
      rows.duty.amount +
      rows.packing_charge.amount +
      rows.additional_packing_charge.amount +
      rows.insurance.amount +
      rows.awb_fee.amount +
      rows.vat_amount.amount +
      rows.volume_weight.amount +
      rows.other_charges.amount -
      rows.discount.amount;

    return {
      rows,
      subtotal: Number(subtotal.toFixed(2)),
      billCharges: Number(billCharges.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    };
  }, [form?.charges, totalWeight]);

  // Values that depend on `derived` (no early access issues)
  const subtotal = derived.subtotal;
  const billCharges = derived.billCharges;
  const vatPercentage = Number(form.vatPercentage || 0);
  const vatCost = Number(((subtotal * vatPercentage) / 100).toFixed(2));
  const netTotal = derived.totalAmount;

  /* ---------- token & profile ---------- */
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

        const [allSenders, allReceivers] = await Promise.all([
          getPartiesByCustomerType(1),
          getPartiesByCustomerType(2),
        ]);
        if (!alive) return;
        setSenders(unwrapArray(allSenders));
        setReceivers(unwrapArray(allReceivers));
      } catch (e) {
        if (!alive) return;
        setMsg({
          text: e?.details?.message || e?.message || "Failed to load options.",
          variant: "error",
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, tokenBranchId]);

  
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const profile = await getProfile();
        const userBranchId =
          profile?.user?.branch?.id ||
          profile?.data?.branch?.id ||
          null;

        if (!userBranchId) return;

        const branchResponse = await viewBranch(userBranchId);
        const branch =
          branchResponse?.branch ||
          branchResponse?.data?.branch ||
          branchResponse;

        const branchCode = branch?.branch_code || "BR";
        const startNumber = branch?.start_number || "000001";
        const invoiceValue = `${branchCode}:${startNumber}`;

        // ✅ use functional update to merge safely
        if (alive) {
          setForm((prev) => ({
            ...prev,
            branchId: String(userBranchId),
            invoiceNo: invoiceValue,
          }));
        }
      } catch {
        if (alive) {
          setForm((prev) => ({
            ...prev,
            invoiceNo: "BR:000001",
          }));
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []); // ✅ run once on mount


  /* collected by */
  useEffect(() => {
    if (form.collectedByRoleName !== "Driver") return;
    let alive = true;
    (async () => {
      try {
        const res = await getActiveDrivers();
        const list = unwrapDrivers(res);
        if (alive) setCollectedByOptions(list);
      } catch {
        if (alive) {
          setCollectedByOptions([]);
          setMsg({ text: "Failed to load drivers.", variant: "error" });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [form.collectedByRoleName]);

  useEffect(() => {
    const bidRaw = pickBranchId(userProfile) ?? tokenBranchId ?? null;
    const bid = bidRaw != null ? String(bidRaw) : "";
    if (bid && String(form.branchId) !== bid)
      setForm((f) => ({ ...f, branchId: bid }));
  }, [userProfile, tokenBranchId, form.branchId]);

  const loadOfficeStaff = useCallback(async () => {
    const branchId = form.branchId || pickBranchId(userProfile) || tokenBranchId;
    if (!branchId) {
      setCollectedByOptions([]);
      setMsg({
        text: "Your profile has no branch; cannot load office staff.",
        variant: "error",
      });
      return;
    }
    const res = await getBranchUsers(branchId);
    setCollectedByOptions(unwrapArray(res));
  }, [form.branchId, userProfile, tokenBranchId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const bidRaw = pickBranchId(userProfile) ?? tokenBranchId ?? null;
      const bid = bidRaw != null ? String(bidRaw) : "";
      if (!bid) return;

      // Prefill next invoice number from /cargos?branch_id=...
      try {
        const next = await getNextInvoiceNo(bid);
        if (!alive) return;

        // ✅ if API didn’t return a valid number, fallback to branch start number
        let invoiceNo = next && String(next).trim()
          ? next
          : `${userProfile?.branch?.branch_code || "RD"}:${userProfile?.branch?.start_number || "000001"}`;

        setForm((f) => ({ ...f, branchId: bid, invoiceNo }));
      } catch {
        if (!alive) return;

        // ✅ final fallback — if both API and branch data fail
        const fallbackNo = `INV-${userProfile?.branch?.start_number || "000001"}`;
        setForm((f) => ({ ...f, branchId: bid, invoiceNo: fallbackNo }));
      }
    })();
    return () => { alive = false; };
  }, [userProfile, tokenBranchId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (form.collectedByRoleName === "Office") {
        try {
          await loadOfficeStaff();
        } catch { }
        return;
      }
      if (form.collectedByRoleName === "Driver") {
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
    return () => {
      alive = false;
    };
  }, [form.branchId, form.collectedByRoleName, loadOfficeStaff]);

  const onRoleChange = useCallback(
    async (e) => {
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
        setMsg({
          text: "Failed to load list for the selected role.",
          variant: "error",
        });
      }
    },
    [collectRoles, loadOfficeStaff]
  );

  /* ---------- BOX HELPERS ---------- */
  const getNextBoxNumber = useCallback(() => {
    const nums = boxes
      .map((b) => Number(b.box_number))
      .filter((n) => Number.isFinite(n));
    return nums.length ? String(Math.max(...nums) + 1) : String(boxes.length + 1);
  }, [boxes]);

  const addBox = useCallback(() => {
    const nextNo = getNextBoxNumber();
    setBoxes((prev) => [
      ...prev,
      { box_number: nextNo, box_weight: 0, items: [{ name: "", pieces: 1 }] },
    ]);
  }, [getNextBoxNumber]);

  const removeBox = useCallback((boxIndex) => {
    setBoxes((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== boxIndex)
    );
  }, []);

  const setBoxWeight = useCallback((boxIndex, val) => {
    setBoxes((prev) => {
      const next = structuredClone(prev);
      const b = next[boxIndex];
      if (!b) return prev;
      const n = Number.parseFloat(val);
      b.box_weight = Number.isFinite(n) ? Math.max(0, n) : 0;
      return next;
    });
  }, []);

  const addItemToBox = useCallback((boxIndex) => {
    setBoxes((prev) => {
      const next = structuredClone(prev);
      const b = next[boxIndex];
      if (!b) return prev;
      b.items.push({ name: "", pieces: 1 });
      return next;
    });
  }, []);

  const removeItemFromBox = useCallback(
    (boxIndex, itemIndex) => {
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
    },
    [showToast]
  );

  const setBoxItem = useCallback((boxIdx, itemIdx, key, val) => {
    setBoxes((prev) => {
      const next = structuredClone(prev);
      const it = next?.[boxIdx]?.items?.[itemIdx];
      if (!it) return prev;
      if (key === "pieces") {
        const n = Number.parseInt(val || 0, 10);
        it.pieces = Number.isNaN(n) ? 0 : Math.max(0, n);
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

  // Unified handleChange – no extra recompute here (derived handles it)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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
    if (!form.time) missing.push("Time");
    if (!form.collectedByRoleId || !form.collectedByRoleName)
      missing.push("Collected By (Role)");
    if (!form.collectedByPersonId) missing.push("Collected By (Person)");
    const anyInvalid = boxes.some((b) => {
      const n = Number(b.box_weight ?? b.weight ?? 0);
      return !Number.isFinite(n) || n < 0;
    });
    if (anyInvalid) missing.push("Each box weight must be a number (≥ 0)");
    return missing;
  }, [form, boxes]);

const softResetForNext = useCallback((branchId, nextInvoiceNo) => {
  setForm((prev) => ({
    ...buildInitialForm(branchId),
    branchId: String(branchId || ""),
    invoiceNo:
      nextInvoiceNo ||
      prev.invoiceNo || // ✅ keep already fetched invoice if it exists
      "INV-000001",
  }));
  setCollectedByOptions([]);
  setBoxes([
    { box_number: "1", box_weight: 0, items: [{ name: "", pieces: 1 }] },
  ]);
}, []);


  const onResetClick = useCallback(() => {
    const nextBranchId = pickBranchId(userProfile) ?? tokenBranchId ?? "";
    setForm(buildInitialForm(nextBranchId));
    setCollectedByOptions([]);
    setBoxes([{ box_number: "1", box_weight: 0, items: [{ name: "", pieces: 1 }] }]);
    setInvoiceShipment(null);
    showToast("Form reset.", "success");
  }, [userProfile, tokenBranchId, showToast]);

  const resetFormAfterSubmit = useCallback(() => {
    const nextBranchId = pickBranchId(userProfile) ?? tokenBranchId ?? "";
    setForm(buildInitialForm(nextBranchId));
    setCollectedByOptions([]);
    setBoxes([
      { box_number: "1", box_weight: 0, items: [{ name: "", pieces: 1 }] },
    ]);
  }, [userProfile, tokenBranchId]);

  const submit = useCallback(
    async (e) => {
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

      // ---- build payload (unchanged) ----
      const grouped = {};
      boxes.forEach((box, bIdx) => {
        const bn = String(box.box_number ?? bIdx + 1);
        const numericWeight = Number(box.box_weight ?? box.weight ?? 0);
        const boxWeightNum = Number.isFinite(numericWeight) ? Math.max(0, numericWeight) : 0;
        if (!grouped[bn]) grouped[bn] = { items: [] };
        let putWeightOnFirstItem = true;
        (box.items || []).forEach((it) => {
          const pieces = Number(it.pieces || 0);
          const itemWeight = putWeightOnFirstItem ? boxWeightNum : 0;
          putWeightOnFirstItem = false;
          grouped[bn].items.push({
            slno: String(grouped[bn].items.length + 1),
            box_number: bn,
            name: it.name || "",
            piece_no: String(pieces),
            unit_price: toDec(0, 2),
            total_price: toDec(0, 2),
            weight: toDec(itemWeight, 3),
          });
        });
      });
      const ordered = {};
      Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).forEach((k) => (ordered[k] = grouped[k]));

      const flatItems = [];
      boxes.forEach((box, bIdx) => {
        const bn = String(box.box_number ?? bIdx + 1);
        const boxW = Number(box.box_weight ?? box.weight ?? 0) || 0;
        const list = Array.isArray(box.items) && box.items.length ? box.items : [{ name: "", pieces: 0 }];
        let putWeightOnFirst = true;
        list.forEach((it, i) => {
          const name = (it.name && String(it.name).trim()) || `Box ${bn} contents`;
          const pcs = Number.isFinite(Number(it.pieces)) ? Number(it.pieces) : 0;
          flatItems.push({
            slno: String(i + 1),
            box_number: bn,
            name,
            piece_no: String(pcs),
            unit_price: "0.00",
            total_price: "0.00",
            weight: (putWeightOnFirst ? boxW : 0).toFixed(3),
          });
          putWeightOnFirst = false;
        });
      });
      if (flatItems.length === 0) {
        setMsg({ text: "Add at least one box or item.", variant: "error" });
        return;
      }

      const boxWeights = boxes
        .sort((a, b) => Number(a.box_number ?? 0) - Number(b.box_number ?? 0))
        .map((box) => {
          const w = Number(box.box_weight ?? box.weight ?? 0);
          const wn = Number.isFinite(w) ? Math.max(0, w) : 0;
          return wn.toFixed(3);
        });

      const R = derived.rows;
      const payload = {
        branch_id: Number(form.branchId),
        booking_no: form.invoiceNo, // we send what we have; backend may override
        sender_id: Number(form.senderId),
        receiver_id: Number(form.receiverId),
        shipping_method_id: Number(form.shippingMethodId),
        payment_method_id: Number(form.paymentMethodId),
        status_id: Number(form.statusId || DEFAULT_STATUS_ID),
        date: form.date,
        time: form.time,
        collected_by: form.collectedByRoleName || "",
        collected_by_id: Number(form.collectedByRoleId),
        name_id: Number(form.collectedByPersonId),
        lrl_tracking_code: form.lrlTrackingCode || null,
        delivery_type_id: Number(form.deliveryTypeId),
        special_remarks: form.specialRemarks || null,
        items: flatItems,
        total_cost: +subtotal.toFixed(2),
        vat_percentage: +vatPercentage.toFixed(2),
        vat_cost: +vatCost.toFixed(2),
        net_total: +derived.totalAmount.toFixed(2),
        total_weight: Number(totalWeight.toFixed(3)),
        box_weight: boxWeights,
        boxes: ordered,
        quantity_total_weight: R.total_weight.qty,
        unit_rate_total_weight: R.total_weight.rate,
        amount_total_weight: R.total_weight.amount,
        quantity_duty: R.duty.qty,
        unit_rate_duty: R.duty.rate,
        amount_duty: R.duty.amount,
        quantity_packing_charge: R.packing_charge.qty,
        unit_rate_packing_charge: R.packing_charge.rate,
        amount_packing_charge: R.packing_charge.amount,
        quantity_additional_packing_charge: R.additional_packing_charge.qty,
        unit_rate_additional_packing_charge: R.additional_packing_charge.rate,
        amount_additional_packing_charge: R.additional_packing_charge.amount,
        quantity_insurance: R.insurance.qty,
        unit_rate_insurance: R.insurance.rate,
        amount_insurance: R.insurance.amount,
        quantity_awb_fee: R.awb_fee.qty,
        unit_rate_awb_fee: R.awb_fee.rate,
        amount_awb_fee: R.awb_fee.amount,
        quantity_vat_amount: R.vat_amount.qty,
        unit_rate_vat_amount: R.vat_amount.rate,
        amount_vat_amount: R.vat_amount.amount,
        quantity_volume_weight: R.volume_weight.qty,
        unit_rate_volume_weight: R.volume_weight.rate,
        amount_volume_weight: R.volume_weight.amount,
        quantity_other_charges: R.other_charges.qty,
        unit_rate_other_charges: R.other_charges.rate,
        amount_other_charges: R.other_charges.amount,
        quantity_discount: R.discount.qty,
        unit_rate_discount: R.discount.rate,
        amount_discount: R.discount.amount,
        bill_charges: +billCharges.toFixed(2),
        total_amount: derived.totalAmount,
        no_of_pieces: Number(form.charges.no_of_pieces || 0),
      };

      try {
        setLoading(true);

        // ✅ One API call only
        const res = await createCargo(payload);

        // Normalize for invoice modal
        const normalized = normalizeCargoToInvoice(res);
        if ((!normalized.booking_no || String(normalized.booking_no).trim() === "") && normalized.boxes) {
          const keys = Object.keys(normalized.boxes).filter((k) => String(k).trim() !== "");
          if (keys.length) {
            keys.sort((a, b) => Number(a) - Number(b));
            normalized.booking_no = keys.join("-");
          }
        }
        setInvoiceShipment(normalized);
        setInvoiceOpen(true);

        // Figure out what number backend actually used
        const saved = res?.data ?? res ?? {};
        const savedNo =
          saved.booking_no ??
          saved.invoice_no ??
          saved.bookingNo ??
          saved.invoiceNo ??
          form.invoiceNo;

        // Compute NEXT and show it instantly
        const nextNo = incrementInvoiceString(savedNo);
        const nextBranchId = pickBranchId(userProfile) ?? tokenBranchId ?? form.branchId ?? "";
        softResetForNext(nextBranchId, nextNo);

        showToast("Cargo created. Invoice ready.", "success");
      } catch (e2) {
        const details =
          e2?.response?.data?.errors ??
          e2?.response?.data ??
          e2?.details ??
          e2?.message;
        console.error("Create cargo failed:", details);
        const msgText =
          typeof details === "string"
            ? details
            : Array.isArray(details)
              ? details.join(", ")
              : Object.entries(details || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ");
        setMsg({ text: msgText || "Failed to create cargo (422).", variant: "error" });
      } finally {
        setLoading(false);
      }
    },
    [
      boxes,
      form,
      subtotal,
      billCharges,
      vatCost,
      totalWeight,
      validateBeforeSubmit,
      showToast,
      derived.totalAmount,
      derived.rows,
      vatPercentage,
      userProfile,
      tokenBranchId,
      softResetForNext,
    ]
  );

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

  const reloadParties = useCallback(async () => {
    try {
      const [allSenders, allReceivers] = await Promise.all([
        getPartiesByCustomerType(1),
        getPartiesByCustomerType(2),
      ]);
      setSenders(unwrapArray(allSenders));
      setReceivers(unwrapArray(allReceivers));
    } catch {
      showToast("Failed to refresh parties", "error");
    }
  }, [showToast]);

  const onPartyCreated = useCallback(
    async (created, role) => {
      await reloadParties();
      const newId =
        created?.id ??
        created?.data?.id ??
        created?.party?.id ??
        created?.data?.party?.id ??
        null;
      if (role === "sender" && newId)
        setForm((f) => ({ ...f, senderId: String(newId) }));
      if (role === "receiver" && newId)
        setForm((f) => ({ ...f, receiverId: String(newId) }));
    },
    [reloadParties]
  );

  /* ---------------------- UI ---------------------- */
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
              <span className="header-cargo-icon">
                <BsFillBoxSeamFill />
              </span>
              Create Cargo
            </h2>
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link
                    to="/dashboard"
                    className="text-gray-500 hover:text-gray-700 hover:underline"
                  >
                    Home
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li>
                  <Link
                    to="/cargo/allcargolist"
                    className="text-gray-500 hover:text-gray-700 hover:underline"
                  >
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

          {loading ? (
            <SkeletonCreateCargo />
          ) : (
            <form onSubmit={submit} onChange={handleChange} className="space-y-6">
              {/* Collection Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-end py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-wide text-slate-700">
                      Collection Details
                    </h3>
                  </div>

                  <div className="flex gap-5 w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Invoice No</span>
                      <span className="inline-flex items-center gap-2 rounded-md bg-gray-50 px-4 py-1.5 text-base font-semibold text-gray-900 tracking-wide border border-gray-200 shadow-sm">
                        {form.invoiceNo || "BR:000001"}
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(form.invoiceNo || "")}
                          className="ml-2 rounded-md bg-white border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100 transition"
                          title="Copy invoice number"
                        >
                          Copy
                        </button>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Branch</span>
                      <span className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm border border-slate-200">
                        {branchNameFromProfile || "--"}
                      </span>
                    </div>

                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end py-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Collected By (Role)
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
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
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Collected By (Person)
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.collectedByPersonId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          collectedByPersonId: e.target.value,
                        }))
                      }
                      disabled={!form.collectedByRoleName}
                    >
                      <option value="">Select person</option>
                      {collectedByOptions.map((opt, i) => {
                        const valueId =
                          form.collectedByRoleName === "Driver"
                            ? opt?.id ?? opt?.driver_id ?? null
                            : opt?.staff_id ?? opt?.user_id ?? opt?.id ?? null;
                        if (!valueId) return null;
                        const label =
                          form.collectedByRoleName === "Driver"
                            ? prettyDriver(opt)
                            : labelOf(opt);
                        return (
                          <option
                            key={`${valueId}-${i}`}
                            value={String(valueId)}
                          >
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-wide text-slate-700">
                      Sender Info
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSenderOpen(true);
                      }}
                      className="party-add-btn rounded-lg border px-3 py-1.5"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Sender/Customer
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={form.senderId}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, senderId: e.target.value }))
                        }
                        disabled={loading}
                      >
                        <option value="">Select a sender</option>
                        {senders.map((s) => (
                          <option key={String(s.id)} value={String(s.id)}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
                      <span className="text-slate-500">Address</span>
                      <span className="rounded-lg bg-slate-50 px-3 py-2">
                        {addressFromParty(selectedSender) ||
                          form.senderAddress ||
                          "—"}
                      </span>
                      <span className="text-slate-500">Phone</span>
                      <span className="rounded-lg bg-slate-50 px-3 py-2">
                        {phoneFromParty(selectedSender) ||
                          form.senderPhone ||
                          "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-wide text-slate-700">
                      Receiver Info
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setReceiverOpen(true);
                      }}
                      className="party-add-btn rounded-lg border px-3 py-1.5 "
                    >
                      + Add
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Receiver/Customer
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={form.receiverId}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, receiverId: e.target.value }))
                        }
                        disabled={loading}
                      >
                        <option value="">Select a receiver</option>
                        {receivers.map((r) => (
                          <option key={String(r.id)} value={String(r.id)}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
                      <span className="text-slate-500">Address</span>
                      <span className="rounded-lg bg-slate-50 px-3 py-2">
                        {addressFromParty(selectedReceiver) ||
                          form.receiverAddress ||
                          "—"}
                      </span>
                      <span className="text-slate-500">Phone</span>
                      <span className="rounded-lg bg-slate-50 px-3 py-2">
                        {phoneFromParty(selectedReceiver) ||
                          form.receiverPhone ||
                          "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipment & Payment */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold tracking-wide text-slate-700">
                    Shipment & Payment
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Shipping Method
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.shippingMethodId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          shippingMethodId: e.target.value,
                        }))
                      }
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
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Payment Method
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.paymentMethodId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          paymentMethodId: e.target.value,
                        }))
                      }
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
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Delivery Type
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.deliveryTypeId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, deliveryTypeId: e.target.value }))
                      }
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
              </div>

              {/* Schedule & Tracking */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold tracking-wide text-slate-700">
                    Schedule & Tracking
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.time}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, time: e.target.value }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      LRL Tracking Code
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.lrlTrackingCode}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          lrlTrackingCode: e.target.value,
                        }))
                      }
                      placeholder="LRL-XXXX (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Boxes & Items */}
              <div className="space-y-4">
                {boxes.map((box, boxIndex) => (
                  <div
                    key={boxIndex}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-sm font-semibold text-slate-800">
                          Box No:{" "}
                          <span className="ml-2 inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-2 py-0.5">
                            {box.box_number}
                          </span>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <span className="text-slate-600">Box Weight (kg)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            title="Enter after packing"
                            className={`w-32 rounded-lg border px-2 py-1 text-right ${Number(box.box_weight || 0) <= 0
                              ? "border-rose-300"
                              : "border-slate-300"
                              }`}
                            value={box.box_weight ?? 0}
                            onChange={(e) => setBoxWeight(boxIndex, e.target.value)}
                            placeholder="0.000"
                          />
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => removeBox(boxIndex)}
                          disabled={boxes.length <= 1}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-white ${boxes.length <= 1
                            ? "bg-slate-300 cursor-not-allowed"
                            : "bg-rose-600 hover:bg-rose-700"
                            }`}
                          title={
                            boxes.length <= 1
                              ? "At least one box is required"
                              : "Remove this box"
                          }
                        >
                          Remove Box
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr className="text-left">
                            <th className="px-3 py-2 w-12 text-center">Sl.</th>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2 w-28 text-right">Pieces</th>
                            <th className="px-3 py-2 w-24 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {box.items.map((it, itemIndex) => (
                            <tr
                              key={itemIndex}
                              className={
                                itemIndex % 2 ? "bg-white" : "bg-slate-50/50"
                              }
                            >
                              <td className="px-3 py-2 text-center text-slate-500">
                                {itemIndex + 1}
                              </td>
                              <td className="px-3 py-2">
                                <ItemAutosuggest
                                  value={it.name}
                                  onChange={(v) =>
                                    setBoxItem(boxIndex, itemIndex, "name", v)
                                  }
                                  options={options}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                                  placeholder="0"
                                  value={it.pieces}
                                  onChange={(e) =>
                                    setBoxItem(
                                      boxIndex,
                                      itemIndex,
                                      "pieces",
                                      Number.parseInt(e.target.value || 0, 10) ||
                                      0
                                    )
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeItemFromBox(boxIndex, itemIndex)
                                  }
                                  className="inline-flex rounded-lg bg-rose-500 px-2 py-1 text-white hover:bg-rose-600"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => addItemToBox(boxIndex)}
                        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Remarks & Charges + Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-700">
                    Remarks & Charges
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Special remarks
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={form.specialRemarks}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, specialRemarks: e.target.value }))
                        }
                        placeholder="(optional) Handle with care, fragile goods."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        VAT %
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                        placeholder="0.00"
                        value={form.vatPercentage}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            vatPercentage: Number.parseFloat(e.target.value || 0) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Charges Matrix */}
                  <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 grid grid-cols-[200px_120px_120px_120px] gap-3">
                      <div>Charges</div>
                      <div>Quantity</div>
                      <div>Unit Rate</div>
                      <div>Amount</div>
                    </div>
                    <div className="p-4">
                      {CHARGE_ROWS.map(([key, label]) => {
                        const row = form.charges[key] || { qty: 0, rate: 0 };
                        const qtyValue = key === "total_weight" ? totalWeight : row.qty;
                        const amountValue = derived.rows[key]?.amount ?? 0;
                        return (

                          <div
                            key={key}
                            className="flex flex-wrap md:flex-nowrap items-center gap-3 mb-2"
                          >
                            {/* Label */}
                            <div className="text-sm text-slate-700 w-full ">
                              {label}
                            </div>

                            {/* Qty */}
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2"
                              value={qtyValue}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  charges: {
                                    ...f.charges,
                                    [key]: {
                                      ...(f.charges[key] || { qty: 0, rate: 0 }),
                                      qty: key === "total_weight" ? totalWeight : Number(e.target.value || 0),
                                    },
                                  },
                                }))
                              }
                              readOnly={key === "total_weight"}
                            />

                            {/* Unit Rate */}
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2"
                              value={row.rate}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  charges: {
                                    ...f.charges,
                                    [key]: {
                                      ...(f.charges[key] || { qty: 0, rate: 0 }),
                                      rate: Number(e.target.value || 0),
                                    },
                                  },
                                }))
                              }
                            />

                            {/* Amount */}
                            <input
                              readOnly
                              className="w-full md:basis-[120px] md:shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right"
                              value={amountValue.toFixed(2)}
                            />
                          </div>

                        );
                      })}

                      <div className="mt-4 grid grid-cols-[200px_1fr] items-center gap-3">
                        <div className="text-sm text-slate-700">No. of Pcs</div>
                        <input
                          type="number"
                          min="0"
                          className="rounded-lg border border-slate-300 px-3 py-2"
                          value={form.charges.no_of_pieces}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              charges: {
                                ...f.charges,
                                no_of_pieces: Number(e.target.value || 0),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-[200px_1fr] items-center gap-3">
                        <div className="text-sm font-medium text-slate-800">
                          Total Amount
                        </div>
                        <input
                          readOnly
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right"
                          value={derived.totalAmount.toFixed(2)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="lg:col-span-1">
                  <div className="lg:sticky lg:top-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-700">
                      Summary
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-slate-700">
                        <span>Subtotal</span>
                        <b>{subtotal.toFixed(2)}</b>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Bill Charges</span>
                        <b>{toMoney(billCharges)}</b>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>VAT</span>
                        <b>{vatCost.toFixed(2)}</b>
                      </div>
                      <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                        <span>Total (Net)</span>
                        <span>{netTotal.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-slate-600">
                        <span>Total Weight</span>
                        <span>{totalWeight.toFixed(3)} kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Box + Actions */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="cargo-add-box-btn">
                  <button
                    type="button"
                    onClick={addBox}
                    title="Add a new box; box number will auto-increment"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
                  >
                    + Add Box
                  </button>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onResetClick}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-slate-800 hover:bg-slate-200"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`rounded-lg px-4 py-2 text-white ${loading ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                  >
                    Save &amp; Generate Invoice
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
      <Toaster position="top-right" />
      <SenderModal
        open={senderOpen}
        onClose={() => setSenderOpen(false)}
        onCreated={(data) => onPartyCreated(data, "sender")}
      />
      <ReceiverModal
        open={receiverOpen}
        onClose={() => setReceiverOpen(false)}
        onCreated={(data) => onPartyCreated(data, "receiver")}
      />
      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        shipment={invoiceShipment}
      />
    </>
  );
}
