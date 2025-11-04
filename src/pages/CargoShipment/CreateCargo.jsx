import React, { useEffect, useMemo, useRef, useState, useCallback,} from 'react';
import { useImmer } from 'use-immer';
import { useSelector } from "react-redux";
import {
  unwrapArray,
  idOf,
  unwrapDrivers,
  today,
  nowHi,
  pickBranchId,
  safeDecodeJwt,
  toDec,
  getBranchName,
  phoneFromParty,
  addressFromParty,
} from "../../utils/cargoHelpers";

import {
  createCargo,
  normalizeCargoToInvoice,
  getNextInvoiceNo,
  getActiveShipmentMethods,
  getActiveShipmentStatuses,
  getBranchUsers,
  viewBranch,
  getActiveDeliveryTypes,
  getProfile,
  getActiveDrivers,
  getPartiesByCustomerType,
  getAllPaymentMethods,
  getActiveCollected,
} from "../../api/cargoApi";
import InvoiceModal from "../../components/InvoiceModal";
import "./ShipmentStyles.css";
import SenderModal from "../SenderReceiver/modals/SenderModal";
import ReceiverModal from "../SenderReceiver/modals/ReceiverModal";
import { Toaster } from "react-hot-toast";
import { PageHeader } from "./components/PageHeader";
import { SkeletonCreateCargo } from "./components/CreateCargoSkeleton";

import { CollectionDetails } from './components/CollectionDetails';
import { PartyInfo } from './components/PartyInfo';
import { ShipmentDetails } from './components/ShipmentDetails';
import { BoxesSection } from './components/BoxesSection';
import { ChargesAndSummary } from './components/ChargesAndSummary';

const DEFAULT_STATUS_ID = 13;
/* ---------- Initial Form ---------- */
const buildInitialForm = (branchId = "") => ({
  branchId: branchId ? String(branchId) : "",
  branchName: "",
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

/* ---------- Items Autosuggest options ---------- */
const itemOptions = [
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

const getNumericPart = (invoiceNo) => {
  if (!invoiceNo) return 0;
  const match = String(invoiceNo).match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
};

/* ---------------------- Component ---------------------- */
export default function CreateCargo() {
  const token = useSelector((s) => s.auth?.token);

  const [form, updateForm] = useImmer(buildInitialForm());
  const [options, setOptions] = useState({
    methods: [],
    statuses: [],
    senders: [],
    receivers: [],
    paymentMethods: [],
    deliveryTypes: [],
    collectRoles: [],
  });
  const [collectedByOptions, setCollectedByOptions] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", variant: "" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceShipment, setInvoiceShipment] = useState(null);
  const [senderOpen, setSenderOpen] = useState(false);
  const [receiverOpen, setReceiverOpen] = useState(false);
  const [boxes, updateBoxes] = useImmer([{ box_number: '1', box_weight: 0, items: [{ name: '', pieces: 1, item_weight: 0 }] }]);
  const [toast, setToast] = useState({
    visible: false,
    text: "",
    variant: "success",
  });
  const toastTimer = useRef(null);

  // --- Toast helpers ---
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

  // --- Derived weights ---
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

  const toMoney = useCallback((v) => num(v).toFixed(2), []);
  
  /* ---------- token & profile ---------- */
  const tokenClaims = useMemo(() => safeDecodeJwt(token), [token]);
  const tokenBranchId = tokenClaims?.branch_id ?? tokenClaims?.branchId ?? null;

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

  // --- Effects ---
  useEffect(() => {
    if (msg.text) showToast(msg.text, msg.variant || "success");
  }, [msg.text, msg.variant, showToast]);

  useEffect(() => {
    updateForm(draft => {
      draft.charges.no_of_pieces = boxes.length;
      if (draft.charges.total_weight) {
        draft.charges.total_weight.qty = totalWeight;
      }
    });
  }, [boxes.length, totalWeight, updateForm]);

// Cache helpers
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const getCache = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const setCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore if storage is full
  }
};

// ---------- INITIAL DATA LOADING ----------
const loadInitialData = useCallback(async () => {
  try {
    setLoading(true);

    // Check cache for essential data
    const cachedProfile = getCache('cargo_profile');
    const cachedMethods = getCache('cargo_methods');
    const cachedStatuses = getCache('cargo_statuses');
    const cachedPaymentMethods = getCache('cargo_payment_methods');

    // 🟢 STAGE 1: Fetch essential base data (use cache if available)
    const [
      profileRes,
      methodsRes,
      statusesRes,
      paymentMethodsRes
    ] = await Promise.all([
      cachedProfile ? Promise.resolve(cachedProfile) : getProfile().catch(e => (console.warn("Profile failed:", e), null)),
      cachedMethods ? Promise.resolve(cachedMethods) : getActiveShipmentMethods().catch(e => (console.warn("Methods failed:", e), [])),
      cachedStatuses ? Promise.resolve(cachedStatuses) : getActiveShipmentStatuses().catch(e => (console.warn("Statuses failed:", e), [])),
      cachedPaymentMethods ? Promise.resolve(cachedPaymentMethods) : getAllPaymentMethods().catch(e => (console.warn("Payment methods failed:", e), [])),
    ]);

    // Cache fresh data
    if (!cachedProfile && profileRes) setCache('cargo_profile', profileRes);
    if (!cachedMethods && methodsRes) setCache('cargo_methods', methodsRes);
    if (!cachedStatuses && statusesRes) setCache('cargo_statuses', statusesRes);
    if (!cachedPaymentMethods && paymentMethodsRes) setCache('cargo_payment_methods', paymentMethodsRes);

    const profile = profileRes?.data ?? profileRes ?? null;
    setUserProfile(profile);

    const preferredBranchId = tokenBranchId ?? pickBranchId(profile) ?? "";
    const branchName = getBranchName(profile);

    // 🟡 STAGE 2: Branch-dependent data
    const [branchRes, nextInvoiceRes, staffRes] = await Promise.all([
      preferredBranchId ? viewBranch(preferredBranchId).catch(() => null) : null,
      preferredBranchId ? getNextInvoiceNo(preferredBranchId).catch(() => null) : null,
      preferredBranchId ? getBranchUsers(preferredBranchId).catch(() => []) : [],
    ]);

    const branch = branchRes?.branch ?? branchRes?.data?.branch ?? branchRes;
    const methods = unwrapArray(methodsRes);
    const statuses = unwrapArray(statusesRes);
    const paymentMethods = unwrapArray(paymentMethodsRes);
    const staffList = unwrapArray(staffRes);

    // --- Compute Invoice Number
    const startNumberFromBranch = branch?.start_number
      ? `${branch.branch_code || ""}:${String(branch.start_number).padStart(6, "0")}`
      : null;

    const nextInvoiceFromApi =
      typeof nextInvoiceRes === "string" &&
      branch?.branch_code &&
      nextInvoiceRes.startsWith(branch.branch_code)
        ? nextInvoiceRes
        : null;

    let invoiceNo = startNumberFromBranch;
    if (nextInvoiceFromApi && startNumberFromBranch) {
      const apiNum = getNumericPart(nextInvoiceFromApi);
      const branchNum = getNumericPart(startNumberFromBranch);
      invoiceNo =
        branchNum >= apiNum ? startNumberFromBranch : incrementInvoiceString(nextInvoiceFromApi);
    }

    // --- Set form defaults
    updateForm(draft => {
      draft.branchId = String(preferredBranchId);
      draft.branchName = branchName;
      draft.invoiceNo = invoiceNo;

      if (methods.length > 0) draft.shippingMethodId = String(idOf(methods[0]));
      if (paymentMethods.length > 0) draft.paymentMethodId = String(idOf(paymentMethods[0]));

      const officeRole = { id: "", name: "" }; // placeholder, real roles come later
      draft.collectedByRoleId = officeRole.id;
      draft.collectedByRoleName = officeRole.name;
    });

    // --- Set stage-1 options
    setOptions(prev => ({
      ...prev,
      methods,
      statuses,
      paymentMethods
    }));
    setCollectedByOptions(staffList);

    // 🟣 STAGE 3: Background fetch for secondary lists (optimized to reduce initial load)
    Promise.all([
      getActiveCollected().catch(e => (console.warn("Roles failed:", e), [])),
    ]).then(([rolesRes]) => {
      const roles = Array.isArray(rolesRes?.data) ? rolesRes.data : unwrapArray(rolesRes);

      setOptions(prev => ({
        ...prev,
        collectRoles: roles,
      }));

      // Fill remaining form defaults once roles arrive
      updateForm(draft => {
        const officeRole = roles.find(r => r.name === "Office");
        const loggedInUserId = profile?.user?.id ?? profile?.id ?? null;
        if (officeRole && loggedInUserId) {
          draft.collectedByRoleId = String(officeRole.id);
          draft.collectedByRoleName = officeRole.name;
          draft.collectedByPersonId = String(loggedInUserId);
        }
      });
    });

    // Lazy load delivery types, senders, receivers after initial render (with cache)
    setTimeout(() => {
      const cachedDeliveryTypes = getCache('cargo_delivery_types');
      const cachedSenders = getCache('cargo_senders');
      const cachedReceivers = getCache('cargo_receivers');

      getActiveDeliveryTypes().catch(e => (console.warn("Delivery types failed:", e), [])).then(deliveryTypesRes => {
        const deliveryTypes = unwrapArray(deliveryTypesRes);
        setOptions(prev => ({ ...prev, deliveryTypes }));
        updateForm(draft => {
          if (!draft.deliveryTypeId && deliveryTypes.length > 0)
            draft.deliveryTypeId = String(idOf(deliveryTypes[0]));
        });
        if (!cachedDeliveryTypes) setCache('cargo_delivery_types', deliveryTypes);
      });

      getPartiesByCustomerType(1).catch(e => (console.warn("Senders failed:", e), [])).then(sendersRes => {
        const senders = unwrapArray(sendersRes);
        setOptions(prev => ({ ...prev, senders }));
        if (!cachedSenders) setCache('cargo_senders', senders);
      });

      getPartiesByCustomerType(2).catch(e => (console.warn("Receivers failed:", e), [])).then(receiversRes => {
        const receivers = unwrapArray(receiversRes);
        setOptions(prev => ({ ...prev, receivers }));
        if (!cachedReceivers) setCache('cargo_receivers', receivers);
      });

      // Load from cache immediately if available
      if (cachedDeliveryTypes) {
        setOptions(prev => ({ ...prev, deliveryTypes: cachedDeliveryTypes }));
        updateForm(draft => {
          if (!draft.deliveryTypeId && cachedDeliveryTypes.length > 0)
            draft.deliveryTypeId = String(idOf(cachedDeliveryTypes[0]));
        });
      }
      if (cachedSenders) setOptions(prev => ({ ...prev, senders: cachedSenders }));
      if (cachedReceivers) setOptions(prev => ({ ...prev, receivers: cachedReceivers }));
    }, 50); // Reduced delay for faster load

  } catch (err) {
    console.error("Initial data load failed:", err);
    setMsg({ text: "Failed to load initial data.", variant: "error" });
  } finally {
    setLoading(false);
  }
}, [tokenBranchId, updateForm]);

useEffect(() => {
  let alive = true;
  const fetchData = async () => {
    if (!alive) return;
    setMsg({ text: "", variant: "" });
    await loadInitialData();
  };
  fetchData();

  const handleVisibilityChange = () => {
    if (alive && document.visibilityState === "visible") {
      loadInitialData();
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => {
    alive = false;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [loadInitialData]);

  const onRoleChange = useCallback(
    async (e) => {
      const roleId = e.target.value; // This is a string
      const role = options.collectRoles.find((r) => String(r.id) === roleId);
      const roleName = role?.name || "";
      updateForm(draft => {
        draft.collectedByRoleId = roleId;
        draft.collectedByRoleName = roleName;
        draft.collectedByPersonId = '';
      });

      try {
        if (roleName === "Driver") {
          const cacheKey = `cargo_drivers_${form.branchId || tokenBranchId}`;
          const cachedDrivers = getCache(cacheKey);
          if (cachedDrivers) {
            setCollectedByOptions(cachedDrivers);
          } else {
            const res = await getActiveDrivers();
            const drivers = unwrapArray(res);
            setCollectedByOptions(drivers);
            setCache(cacheKey, drivers);
          }
        } else if (roleName === "Office") {
          const cacheKey = `cargo_staff_${form.branchId || tokenBranchId}`;
          const cachedStaff = getCache(cacheKey);
          if (cachedStaff) {
            setCollectedByOptions(cachedStaff);
            // Auto-select the current user if they are in the list
            const loggedInUserId = userProfile?.user?.id ?? userProfile?.id ?? null;
            const userInStaffList = cachedStaff.find(staff => String(staff.id) === String(loggedInUserId));
            if (userInStaffList) {
              updateForm(draft => {
                draft.collectedByPersonId = String(loggedInUserId);
              });
            }
          } else {
            const staffRes = await getBranchUsers(form.branchId || tokenBranchId);
            const staffList = unwrapArray(staffRes);
            setCollectedByOptions(staffList);
            setCache(cacheKey, staffList);

            // Auto-select the current user if they are in the list
            const loggedInUserId = userProfile?.user?.id ?? userProfile?.id ?? null;
            const userInStaffList = staffList.find(staff => String(staff.id) === String(loggedInUserId));
            if (userInStaffList) {
              updateForm(draft => {
                draft.collectedByPersonId = String(loggedInUserId);
              });
            }
          }
        } else {
          setCollectedByOptions([]);
        }
      } catch {
        setCollectedByOptions([]);
        setMsg({ text: "Failed to load list for the selected role.", variant: "error" });
      }
    },
    [options.collectRoles, updateForm, form.branchId, tokenBranchId, userProfile]
  );

  /* ---------- BOX HELPERS ---------- */
  const getNextBoxNumber = useCallback(() => {
    const nums = boxes
      .map((b) => Number(b.box_number))
      .filter((n) => Number.isFinite(n));
    return nums.length ? String(Math.max(...nums) + 1) : String(boxes.length + 1)
  }, [boxes]);

  const addBox = useCallback(() => {
    const nextNo = getNextBoxNumber();
    updateBoxes(draft => {
      draft.push({ box_number: nextNo, box_weight: 0, items: [{ name: '', pieces: 1, item_weight: 0 }] });
    });
  }, [getNextBoxNumber, updateBoxes]);

  const removeBox = useCallback((boxIndex) => {
    if (boxes.length <= 1) return;
    updateBoxes(draft => {
      draft.splice(boxIndex, 1);
    });
  }, [boxes.length, updateBoxes]);

  const setBoxWeight = useCallback((boxIndex, val) => {
    updateBoxes(draft => {
      const box = draft[boxIndex];
      if (!box) return;
      const n = Number.parseFloat(val);
      box.box_weight = Number.isFinite(n) ? Math.max(0, n) : 0;
    });
  }, [updateBoxes]);

  const addItemToBox = useCallback((boxIndex) => {
    updateBoxes(draft => {
      draft[boxIndex]?.items.push({ name: '', pieces: 1, item_weight: 0 });
    });
  }, [updateBoxes]);

  const removeItemFromBox = useCallback(
    (boxIndex, itemIndex) => {
      if (boxes[boxIndex]?.items.length <= 1) {
        showToast("At least one item per box is required", "error");
        return;
      }
      updateBoxes(draft => {
        draft[boxIndex]?.items.splice(itemIndex, 1);
      })
    },
    [boxes, showToast, updateBoxes]
  );

  const setBoxItem = useCallback((boxIdx, itemIdx, key, val) => {
    updateBoxes(draft => {
      const it = draft?.[boxIdx]?.items?.[itemIdx];
      if (!it) return;
      if (key === "pieces") {
        const n = Number.parseInt(val || 0, 10);
        it.pieces = Number.isNaN(n) ? 0 : Math.max(0, n);
      } else if (key === "name") {
        it.name = val;
      } else if (key === "item_weight") {
        const n = Number.parseFloat(val);
        it.item_weight = Number.isFinite(n) ? Math.max(0, n) : 0;
      }
    });
  }, [updateBoxes]);

  const handleItemKeyDown = useCallback(
    (e, boxIndex) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addItemToBox(boxIndex);
      }
    },
    [addItemToBox]
  );

  /* selected parties + sync to form */
  const selectedSender = useMemo(
    () => options.senders.find((s) => String(idOf(s)) === String(form.senderId)) || null,
    [options.senders, form.senderId]
  );
  const selectedReceiver = useMemo(
    () => options.receivers.find((r) => String(idOf(r)) === String(form.receiverId)) || null,
    [options.receivers, form.receiverId]
  );

  useEffect(() => {
    updateForm(draft => {
      draft.senderAddress = addressFromParty(selectedSender) || '';
      draft.senderPhone = phoneFromParty(selectedSender) || '';
      draft.receiverAddress = addressFromParty(selectedReceiver) || '';
      draft.receiverPhone = phoneFromParty(selectedReceiver) || '';
    });
  }, [selectedSender, selectedReceiver, updateForm]);

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
  const roles = options.collectRoles;
  const profile = userProfile;

  updateForm(draft => {
    const newForm = buildInitialForm(branchId);
    newForm.invoiceNo = nextInvoiceNo || 'BR:000001';
    newForm.branchId = String(branchId);
    newForm.branchName = draft.branchName; // Preserve branch name

    // Restore default 'Collected By' fields
    const officeRole = roles.find(r => r.name === 'Office');
    const loggedInUserId = profile?.user?.id ?? profile?.id ?? null;
    if (officeRole && loggedInUserId) {
      newForm.collectedByRoleId = String(officeRole.id);
      newForm.collectedByRoleName = officeRole.name;
      newForm.collectedByPersonId = String(loggedInUserId);
    }
    return newForm;
  });
  updateBoxes([{ box_number: '1', box_weight: 0, items: [{ name: '', pieces: 1, item_weight: 0 }] }]);
}, [updateForm, updateBoxes, options.collectRoles, userProfile]);

  const onResetClick = useCallback(() => {
    const nextBranchId = form.branchId || tokenBranchId || "";
    updateForm(buildInitialForm(nextBranchId));
    setCollectedByOptions([]);
    updateBoxes([{ box_number: '1', box_weight: 0, items: [{ name: '', pieces: 1, item_weight: 0 }] }]);
    setInvoiceShipment(null);
    showToast("Form reset.", "success");
  }, [form.branchId, tokenBranchId, showToast, updateForm, updateBoxes]);

  const handleChargeChange = useCallback((key, field, value) => {
    updateForm(draft => {
      if (draft.charges[key]) {
        if (field === 'qty' && key !== 'total_weight') {
          draft.charges[key].qty = Number(value || 0);
        } else if (field === 'rate') {
          draft.charges[key].rate = Number(value || 0);
        }
      }
    });
  }, [updateForm]);

const getShipmentMethodName = (methodId, methods) => {
  const method = methods.find(m => String(m.id) === String(methodId));
  return method?.name || '';
};

const buildCargoPayload = (currentForm, currentBoxes, derivedValues, shipmentMethods = []) => {
  const { subtotal, billCharges, totalAmount, rows: R } = derivedValues;
  const totalWeightVal = Number(totalWeight.toFixed(3));
  const vatPercentageVal = Number(currentForm.vatPercentage || 0);
  const vatCostVal = Number(((subtotal * vatPercentageVal) / 100).toFixed(2));

  const flatItems = [];
  currentBoxes.forEach((box, bIdx) => {
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

  const boxWeights = [...currentBoxes]
    .sort((a, b) => Number(a.box_number ?? 0) - Number(b.box_number ?? 0))
    .map((box) => {
      const w = Number(box.box_weight ?? box.weight ?? 0);
      const wn = Number.isFinite(w) ? Math.max(0, w) : 0;
      return wn.toFixed(3);
    });

  const methodName = getShipmentMethodName(currentForm.shippingMethodId, shipmentMethods);
  return {
    branch_id: Number(currentForm.branchId),
    booking_no: currentForm.invoiceNo,
    sender_id: Number(currentForm.senderId),
    receiver_id: Number(currentForm.receiverId),
    shipping_method_id: Number(currentForm.shippingMethodId),
    payment_method_id: Number(currentForm.paymentMethodId),
    status_id: Number(currentForm.statusId || DEFAULT_STATUS_ID),
    date: currentForm.date,
    time: currentForm.time,
    collected_by: currentForm.collectedByRoleName || "",
    collected_by_id: Number(currentForm.collectedByRoleId),
    name_id: Number(currentForm.collectedByPersonId),
    lrl_tracking_code: currentForm.lrlTrackingCode || null,
    delivery_type_id: Number(currentForm.deliveryTypeId),
    special_remarks: currentForm.specialRemarks || null,
    items: flatItems,
    method: methodName,
    total_cost: +subtotal.toFixed(2),
    vat_percentage: +vatPercentageVal.toFixed(2),
    vat_cost: +vatCostVal.toFixed(2),
    net_total: +totalAmount.toFixed(2),
    total_weight: totalWeightVal,
    box_weight: boxWeights,
    boxes: {}, // Simplified, as ordered was not used elsewhere
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
    total_amount: totalAmount,
    no_of_pieces: Number(currentForm.charges.no_of_pieces || 0),
  };
};

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

      const payload = buildCargoPayload(form, boxes, derived, options.methods);
      if (payload.items.length === 0) {
        setMsg({ text: "Add at least one box or item.", variant: "error" });
        return;
      }

      try {
        setLoading(true);
        // --- Enforce correct booking_no before sending ---
const branchStart = form.invoiceNo?.match(/^[A-Z]+:\d+$/)
  ? form.invoiceNo
  : `${form.branchName?.slice(0, 2).toUpperCase() || 'BR'}:${String(branch?.start_number || 1).padStart(6, '0')}`;

// Ensure the booking number increments properly from edited start_number
payload.booking_no = branchStart;


        // ✅ One API call only
        const res = await createCargo(payload);

        const normalized = normalizeCargoToInvoice({ ...payload, ...res });
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
        const nextBranchId = form.branchId || tokenBranchId || "";
        softResetForNext(nextBranchId, nextNo);

        showToast("Cargo created. Invoice ready.", "success");
      } catch (e2) {
        const details = e2?.response?.data?.errors ?? e2?.response?.data ?? e2?.details ?? e2?.message;
        console.error("Create cargo failed:", details);
        const msgText = typeof details === "string" ? details :
          Array.isArray(details) ? details.join(", ") :
          Object.entries(details || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ");
        setMsg({ text: msgText || "Failed to create cargo (422).", variant: "error" });
      } finally {
        setLoading(false);
      }
    },
    [
      form,
      validateBeforeSubmit,
      softResetForNext,
      derived,
      boxes,
      options.methods,
    ]
  );

  useEffect(() => {
    if (!invoiceOpen || !invoiceShipment?.booking_no) return;
    const prev = document.title;
    document.title = String(invoiceShipment.booking_no).replace(/[\\/:*?"<>|]/g, "-");
    const restore = () => {
      document.title = prev;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("afterprint", restore);
      document.title = prev;
    };
  }, [invoiceOpen, invoiceShipment?.booking_no]);

  const reloadParties = useCallback(async () => {
    try {
      const [allSenders, allReceivers] = await Promise.all([
        getPartiesByCustomerType(1),
        getPartiesByCustomerType(2),
      ]);
      setOptions(prev => ({
        ...prev,
        senders: unwrapArray(allSenders),
        receivers: unwrapArray(allReceivers),
      }));
    } catch {
      showToast("Failed to refresh parties", "error");
    }
  }, [showToast, setOptions]);

  const onPartyCreated = useCallback(
    async (created, role) => {
      await reloadParties();
      const newId =
        created?.id ??
        created?.data?.id ??
        created?.party?.id ??
        created?.data?.party?.id ??
        null;
      updateForm(draft => {
        if (role === 'sender' && newId) draft.senderId = String(newId);
        if (role === 'receiver' && newId) draft.receiverId = String(newId);
      });
    },
    [reloadParties, updateForm]
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
          <div>
            <div className="flex gap-6 text-right text-sm text-slate-500">
              <div>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div>{new Date().toLocaleTimeString()}</div>
            </div>
            <PageHeader title="Create Cargo" />
          </div>

          {loading ? (
            <SkeletonCreateCargo />
          ) : (
            <form
              onSubmit={submit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName.toLowerCase() !== 'textarea') {
                  e.preventDefault();
                }
              }}
              className="space-y-6">
              <CollectionDetails
                form={form}
                onRoleChange={onRoleChange}
                updateForm={updateForm}
                collectedByOptions={collectedByOptions}
                collectRoles={options.collectRoles}
              />

              <PartyInfo
                form={form}
                updateForm={updateForm}
                options={options}
                loading={loading}
                onSenderAdd={() => setSenderOpen(true)}
                onReceiverAdd={() => setReceiverOpen(true)}
                selectedSender={selectedSender}
                selectedReceiver={selectedReceiver}
              />

              <ShipmentDetails
                form={form}
                updateForm={updateForm}
                options={options}
                loading={loading}
              />

              {/* <ScheduleDetails form={form} updateForm={updateForm} /> */}

              <BoxesSection
                boxes={boxes}
                addBox={addBox}
                removeBox={removeBox}
                setBoxWeight={setBoxWeight}
                addItemToBox={addItemToBox}
                removeItemFromBox={removeItemFromBox}
                setBoxItem={setBoxItem}
                onItemKeyDown={handleItemKeyDown}
                itemOptions={itemOptions}
              />

              <ChargesAndSummary
                form={form}
                updateForm={updateForm}
                onChargeChange={handleChargeChange}
                totalWeight={totalWeight}
                derived={derived}
                subtotal={subtotal}
                billCharges={billCharges}
                vatCost={vatCost}
                netTotal={netTotal}
                toMoney={toMoney}
              />

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
                    className={`rounded-lg px-4 py-2 text-white ${loading ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"}`}
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
