// src/pages/InvoiceView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { normalizeCargoToInvoice, getCargoById } from "../api/createCargoApi";
import { getPartyById, getParties } from "../api/partiesApi";
import { getBranchByIdSmart } from "../api/branchApi";
import InvoiceLogo from "../assets/Logo.png";
import "./invoice.css";

const MONEY_LOCALE = "en-SA";
const DEFAULT_CURRENCY = "SAR";

/* ---------------- utils ---------------- */
const toNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);

const fmtMoney = (n, currency = DEFAULT_CURRENCY) => {
  if (n === null || n === undefined || n === "") return "—";
  try {
    return new Intl.NumberFormat(MONEY_LOCALE, { style: "currency", currency }).format(Number(n) || 0);
  } catch {
    return String(n);
  }
};

const s = (v, d = "—") => (v === null || v === undefined || String(v).trim() === "" ? d : v);
const pickPhoneFromBranch = (b) => {
  if (!b) return "—";
  return [b.branch_contact_number, b.branch_alternative_number].filter(Boolean).join(" / ");
};

// Safe numeric picker from multiple paths (no "—" fallback)
const pickNum = (obj, paths) => {
  for (const p of paths) {
    const segs = String(p).split(".");
    let cur = obj;
    let ok = true;
    for (const s of segs) {
      if (cur == null || cur[s] == null || cur[s] === "") { ok = false; break; }
      cur = cur[s];
    }
    if (ok) {
      const n = Number(String(cur).replace(/,/g, "").trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
};

const getTrackCode = (s) =>
  s?.track_code ?? s?.tracking_code ?? s?.tracking_no ?? s?.trackingNumber ?? "";

const pick = (obj, keys, fallback = "—") => {
  for (const k of keys) {
    const path = String(k).split(".");
    let cur = obj;
    let ok = true;
    for (const p of path) {
      if (cur == null || cur[p] == null || String(cur[p]).trim() === "") {
        ok = false;
        break;
      }
      cur = cur[p];
    }
    if (ok && cur !== undefined && cur !== null && String(cur).trim() !== "") return cur;
  }
  return fallback;
};

const toFixed3 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
};

/** Parse many possible shapes of `box_weight` into a numeric array in **index order** (1-based keys allowed) */
const parseBoxWeights = (raw) => {
  if (raw == null || raw === "" || raw === "null" || raw === "undefined") return [];
  try {
    // JSON string?
    if (typeof raw === "string") {
      // CSV like "10, 20, 30"
      if (raw.includes(",") && !raw.trim().startsWith("{") && !raw.trim().startsWith("[")) {
        return raw
          .split(",")
          .map((s) => Number(String(s).trim()))
          .map((n) => (Number.isFinite(n) ? n : 0));
      }
      const parsed = JSON.parse(raw);
      return parseBoxWeights(parsed);
    }
  } catch {
    /* fall through */
  }
  // Already an array
  if (Array.isArray(raw)) {
    return raw.map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0));
  }
  // Object with numeric-ish keys: { "1": 10, "2": 20 }
  if (raw && typeof raw === "object") {
    const keys = Object.keys(raw).sort((a, b) => Number(a) - Number(b));
    return keys.map((k) => (Number.isFinite(Number(raw[k])) ? Number(raw[k]) : 0));
  }
  // Fallback single number
  const n = Number(raw);
  return Number.isFinite(n) ? [n] : [];
};

/** Make `shipment.boxes` consistent: accepts object, array, JSON string, or { boxes: [...] } */
const coerceBoxes = (raw) => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return coerceBoxes(JSON.parse(raw)); } catch { return {}; }
  }
  if (Array.isArray(raw)) {
    const out = {};
    raw.forEach((b, i) => { out[String(i + 1)] = b || {}; });
    return out;
  }
  if (raw && typeof raw === "object" && raw.boxes) return coerceBoxes(raw.boxes);
  return raw && typeof raw === "object" ? raw : {};
};

/** If no boxes, group flat items by their box number to "simulate" boxes */
const groupItemsIntoBoxes = (items = []) => {
  const map = {};
  items.forEach((it) => {
    const rawBox = it?.box_number ?? it?.box_no ?? it?.box ?? it?.package_no ?? "";
    const key = rawBox ? String(rawBox) : "1";
    if (!map[key]) map[key] = { items: [] };
    map[key].items.push(it);
  });
  return map;
};

/** Sum item weights (handles string/number, weight_kg, etc.) */
const sumItemWeights = (arr = []) =>
  arr.reduce((s, it) => {
    const n = Number(it?.weight ?? it?.weight_kg ?? 0);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

/* ---------------- Company header (only VAT/type used) ---------------- */
const COMPANY = {
  nameEn: "GULF CARGO AGENCY",
  vatNo: "310434479300003",
  defaultShipmentType: "IND AIR",
};

/* ---------------- Party helpers ---------------- */
const parsePartyList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.parties)) return res.parties;
  if (Array.isArray(res?.data?.parties)) return res.data.parties;
  return [];
};

const joinAddress = (p) => p?.address || "";

const formatPhones = (p) => {
  const vals = [p?.contact_number, p?.phone, p?.mobile, p?.mobile_number, p?.contact].filter(Boolean);
  const whats = p?.whatsapp_number ?? p?.whatsapp ?? null;
  const a = [];
  if (vals.length) a.push(vals.join(" / "));
  if (whats && !vals.includes(whats)) a.push(whats);
  return a.join("  •  ");
};

const extractParty = (p) => ({
  id: p?.id ?? null,
  name: p?.name || "—",
  email: p?.email || "",
  document_type: p?.document_type || "",
  document_id: p?.document_id || "",
  tel: p?.contact_number || p?.whatsapp_number || "",
  address_line: p?.address || "",
  post: p?.city || "",            
  pin: p?.postal_code || "",
  dist: p?.district || "",
  state: p?.state || "",
  address: joinAddress(p),
  phones: formatPhones(p),
  raw: p,
});

const matchByName = (name, list) => {
  if (!name) return null;
  const low = name.toLowerCase();
  const getName = (x) => (x?.name || "").toLowerCase();
  return list.find((x) => getName(x) === low) || list.find((x) => getName(x).includes(low)) || null;
};

const buildTrackUrl = (shipment) => {
  const base = "https://gulfcargoksa.com/trackorder/";
  const track = getTrackCode(shipment);
  const box = shipment?.box_no || shipment?.booking_no || shipment?.invoice_no || "";
  const params = new URLSearchParams();
  if (track) params.set("code", track);
  if (box) params.set("box", String(box));
  params.set("src", "qr");
  return params.toString() ? `${base}?${params.toString()}` : base;
};

const buildQrUrl = (url, size = 160) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

/* ---------- Read logged-in user from localStorage (for branch.id fallback) ---------- */
const getLoggedInUser = () => {
  try {
    const keys = ["auth", "user", "authUser", "profile", "currentUser"];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") return obj.user || obj;
    }
  } catch {}
  return null;
};

/** Try to read pieces from common fields; else sum item qty */
const computePieces = (sh) => {
  if (!sh) return 0;
  // This now correctly reads the box count passed directly from the CreateCargo component.
  const pieces = pick(sh, ["no_of_pieces"], 0);
  return Number(pieces) || 0;
};

/** Pick a reasonable shipment date (booking/shipment/created) */
const pickShipmentDate = (sh) => {
  const candidates = [
    sh?.booking_date, sh?.shipment_date, sh?.invoice_date,
    sh?.created_at, sh?.createdAt, sh?.date,
  ].filter(Boolean);
  const raw = candidates[0];
  const d = raw ? new Date(raw) : new Date(); // Default to today's date
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
};

/* ---------------- Component ---------------- */
export default function InvoiceView({ shipment: injected = null, modal = false }) {
  const { id } = useParams();
  const location = useLocation();

  const hydratedFromState = location.state?.cargo || location.state?.shipment || null;

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(!!id && !injected && !hydratedFromState);
  const [err, setErr] = useState("");

  const [senderParty, setSenderParty] = useState(null);
  const [receiverParty, setReceiverParty] = useState(null);
  const [branch, setBranch] = useState(null);

  const loggedInUser = useMemo(() => getLoggedInUser(), []);
  const trackUrl = buildTrackUrl(shipment);

  // boot: prefer prop → route state → fetch by id
  useEffect(() => {
    (async () => {
      try {
        if (injected) {
          setShipment(normalizeCargoToInvoice(injected));
          return;
        }
        if (hydratedFromState) {
          setShipment(normalizeCargoToInvoice(hydratedFromState));
          return;
        }
        if (id) {
          setLoading(true);
          const cargo = await getCargoById(id);
          setShipment(normalizeCargoToInvoice({ cargo }));
        }
      } catch (e) {
        setErr(e?.message || "Failed to load cargo");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, injected, hydratedFromState]);

  /* ------------- Fetch branch (shipment ids first, then user's branch id) ------------- */
  useEffect(() => {
    if (!shipment && !loggedInUser) return;

    // Collect plausible branch IDs
    const idCandidates = [
      shipment?.branch_id,
      shipment?.branch?.id,
      shipment?.origin_branch_id,
      loggedInUser?.branch?.id,
      loggedInUser?.branch_id,
    ]
      .map((v) => (v == null ? null : String(v).trim()))
      .filter(Boolean);

    if (!idCandidates.length) return;

    let alive = true;
    (async () => {
      for (const bid of idCandidates) {
        try {
          const b = await getBranchByIdSmart(bid);
          if (b && alive) {
            setBranch(b);
            return;
          }
        } catch {
          // try next candidate
        }
      }
      if (alive) setBranch(null);
    })();

    return () => { alive = false; };
  }, [shipment, loggedInUser]);

  // fetch Sender/Receiver party once we have shipment basics
  useEffect(() => {
    if (!shipment) return;

    const fetchParty = async (role) => {
      const isSender = role === "sender";

      const idCandidates = isSender
        ? [shipment.sender_id, shipment.shipper_id, shipment.sender_party_id, shipment.shipper_party_id]
        : [shipment.receiver_id, shipment.consignee_id, shipment.receiver_party_id, shipment.consignee_party_id];

      const name = isSender
        ? shipment.sender?.name || shipment.sender || shipment.shipper_name
        : shipment.receiver?.name || shipment.receiver || shipment.consignee_name;

      for (const pid of idCandidates) {
        if (!pid) continue;
        try {
          const res = await getPartyById(pid);
          const data = res?.party || res?.data || res;
          if (data?.id) return extractParty(data);
        } catch {}
      }

      if (name) {
        try {
          const res = await getParties({ search: name });
          const list = parsePartyList(res);
          const roleFiltered = list.filter((p) => {
            const typeId = Number(p.customer_type_id);
            const typeName = String(p.customer_type || "").toLowerCase();
            return isSender ? typeId === 1 || typeName.includes("sender") : typeId === 2 || typeName.includes("receiver");
          });

          const chosen =
            matchByName(name, roleFiltered) ||
            matchByName(name, list) ||
            roleFiltered[0] ||
            list[0] ||
            null;

          if (chosen) return extractParty(chosen);
        } catch {}
      }

     const address = isSender
  ? pick(shipment, ["sender_address", "shipper_address", "sender_addr"], "")
  : pick(shipment, ["receiver_address", "consignee_address", "receiver_addr"], "");

const phone = isSender
  ? pick(shipment, ["sender_phone", "shipper_phone", "sender_mobile"], "")
  : pick(shipment, ["receiver_phone", "consignee_phone", "receiver_mobile"], "");

const email = isSender
  ? pick(shipment, ["sender_email", "shipper_email"], "")
  : pick(shipment, ["receiver_email", "consignee_email"], "");

// pull possible doc ids from the shipment for the fallback
const docId = isSender
  ? pick(shipment, ["sender_document_id", "shipper_document_id", "document_id"], "")
  : pick(shipment, ["receiver_document_id", "consignee_document_id", "document_id"], "");

      return extractParty({
  id: null,
  name: name || "—",
  email,
  contact_number: phone,    // -> becomes .tel via extractParty
  address,                  // -> address_line + address
  // keep city/pin/dist/state empty so Consignee address remains only 'address'
  city: "",
  postal_code: "",
  district: "",
  state: "",
  document_id: docId,
});
    };

    (async () => {
      const [sp, rp] = await Promise.all([fetchParty("sender"), fetchParty("receiver")]);
      setSenderParty(sp);
      setReceiverParty(rp);
    })();
  }, [shipment]);

  /* --------------- normalized basics --------------- */
  const currency = DEFAULT_CURRENCY;

  const billNo = useMemo(
    () =>
      shipment?.booking_no ??
      shipment?.bookingNo ??
      shipment?.booking_number ??
      shipment?.invoice_no ??
      "—",
    [shipment]
  );

  /** Build Box Rows (robust) */
  const boxRows = useMemo(() => {
    if (!shipment) return [];

    // Prefer boxes from shipment; otherwise infer from items
    let boxes = coerceBoxes(shipment.boxes);
    const hasBoxes = Object.keys(boxes).length > 0;

    if (!hasBoxes) {
      const items = Array.isArray(shipment?.items) ? shipment.items : [];
      if (items.length) boxes = groupItemsIntoBoxes(items);
    }

    const keys = Object.keys(boxes).sort((a, b) => Number(a) - Number(b));
    const labelByKey = Object.fromEntries(keys.map((k, i) => [k, `B${i + 1}`]));

    // parse possible box_weight formats
    const topWeights = parseBoxWeights(shipment?.box_weight); // array like [10, 12, ...]
    const rowCount = Math.max(keys.length, topWeights.length, 0);

    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      const k = keys[i];                // "1", "2", ...
      const box = k ? (boxes[k] || {}) : {};
      const items = Array.isArray(box?.items) ? box.items : [];

      // Fallback derivations
      const boxLevelWeight =
        Number(box?.box_weight ?? box?.weight ?? 0) || 0;

      // Sum inside items if needed
      const inferredWeightFromItems = sumItemWeights(items);

      // Priority: global array weight → explicit box weight → sum of item weights → 0
      const weightCandidate =
        (Number.isFinite(topWeights[i]) ? topWeights[i] : null) ??
        (boxLevelWeight || null) ??
        (inferredWeightFromItems || null) ??
        0;

      rows.push({
        sl: i + 1,                                 // Sl No = 1,2,3...
        boxNo: labelByKey[k] ?? `B${i + 1}`,       // Proper B1/B2...
        weight: toFixed3(weightCandidate),
      });
    }
    return rows;
  }, [shipment]);

  /** Items grid (kept same as your build) */
  const items = useMemo(() => {
    // If API gave nested boxes, flatten to items for the two-column table
    const hasBoxes = shipment?.boxes && Object.keys(coerceBoxes(shipment.boxes)).length > 0;
    if (hasBoxes) {
      const bx = coerceBoxes(shipment.boxes);
      const keys = Object.keys(bx).sort((a, b) => Number(a) - Number(b));
      const labelByKey = Object.fromEntries(keys.map((k, i) => [k, `B${i + 1}`]));
      const out = [];
      let runningIndex = 1;
      for (const k of keys) {
        const box = bx[k] || {};
        const list = Array.isArray(box?.items) ? box.items : [];
        for (const it of list) {
          const qty = it?.piece_no ?? it?.qty ?? it?.quantity ?? it?.pieces ?? "";
          out.push({
            idx: runningIndex++,
            name: it?.name ?? it?.description ?? "Item",
            qty,
            boxLabel: labelByKey[String(it?.box_number ?? it?.box_no ?? k)] ?? `B${Number(k) || String(k)}`,
          });
        }
      }
      return out;
    }

    // Legacy flat items
    const raw = Array.isArray(shipment?.items) ? shipment.items : [];
    return raw.map((it, i) => {
      const qty = it?.qty ?? it?.no_of_pieces ?? it?.quantity ?? it?.pieces ?? it?.count ?? it?.piece_no ?? "";
      const rawBox = it?.box_number ?? it?.box_no ?? it?.box ?? it?.package_no ?? "";
      const boxLabel = rawBox ? `B${Number(rawBox) || String(rawBox)}` : "";
      return {
        idx: i + 1,
        name: pick(it, ["description", "name", "item_name", "cargo_name", "title", "item"], "Item"),
        qty,
        boxLabel,
      };
    });
  }, [shipment]);

  const getName = (p, side, sh) =>
    p?.name ||
    sh?.[side]?.name ||
    sh?.[side] ||
    sh?.[side === "sender" ? "shipper_name" : "consignee_name"] ||
    "";

  const getAddress = (p, side, sh, pickFn) =>
    p?.address ||
    pickFn?.(sh?.[side], ["address"], "") ||
    pickFn?.(
      sh,
      side === "sender"
        ? ["sender_address", "shipper_address", "sender_addr"]
        : ["receiver_address", "consignee_address", "receiver_addr"],
      ""
    );

  const getPhone = (p, side, sh, pickFn) =>
    p?.phones ||
    pickFn?.(sh?.[side], ["contact_number", "whatsapp_number"], "") ||
    [
      pickFn?.(
        sh,
        side === "sender"
          ? ["sender_phone", "shipper_phone", "sender_mobile"]
          : ["receiver_phone", "consignee_phone", "receiver_mobile"],
        ""
      ),
      pickFn?.(sh, side === "sender" ? ["sender_whatsapp_number"] : ["receiver_whatsapp_number"], ""),
    ]
      .filter(Boolean).join(" / ");

  const getPincode = (p, side, sh, pickFn) =>
    p?.pincode ||
    pickFn?.(sh?.[side], ["pincode", "pin", "zip", "zipcode", "postal_code"], "") ||
    pickFn?.(sh, side === "sender" ? ["sender_pincode"] : ["receiver_pincode"], "");

  const ROWS_PER_COL = 15;

  // --- DIRECT from API fields (robust, no math here) ---
  const num = (v) =>
    v === null || v === undefined || v === "" ? 0 : Number(String(v).replace(/,/g, "")) || 0;

  const subtotal = num(
    pickNum(shipment, [
      "amount_total_weight",
      "charges.amount_total_weight",
      "total_cost",                 // sent from CreateCargo
      "subtotal",                   // any backend alias
      "summary.subtotal",           // nested alias (defensive)
    ])
  );

  // Bill charges, VAT, and final total — read directly, but with aliases
  const bill  = num(pickNum(shipment, ["bill_charges", "summary.bill_charges", "charges.bill"]));
  const tax   = num(pickNum(shipment, ["vat_cost", "vat_amount", "summary.vat_cost"]));
  const total = num(
    pickNum(shipment, [
      "total_amount",               // preferred final
      "net_total",                  // alt
      "grand_total",                // alias
      "summary.total",
    ])
  );

  const colA = items.slice(0, ROWS_PER_COL);
  const colB = items.slice(ROWS_PER_COL, ROWS_PER_COL * 2);
  while (colA.length < ROWS_PER_COL) colA.push(null);
  while (colB.length < ROWS_PER_COL) colB.push(null);
  const overflowCount = Math.max(0, items.length - ROWS_PER_COL * 2);

  if (loading) return <div className="p-6 text-slate-600">Loading invoice…</div>;
  if (err) return <div className="p-6 text-rose-700">{err}</div>;
  if (!shipment) return <div className="p-6 text-rose-700">No cargo found.</div>;

  const totalWeightDisplay = toFixed3(
    pick(shipment, ["total_weight", "weight", "gross_weight"], 0)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #invoice-sheet, #invoice-sheet * { visibility: visible !important; }
          #invoice-sheet {
            width: 186mm;
            margin: 0 auto !important;
            position: static !important;
            box-shadow: none !important;
            border: 0 !important;
          }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr, td, th { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {!modal && (
        <div className="sticky top-0 z-10 border-b bg-white print:hidden">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2">
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              ← Back
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex justify-center items-center mx-auto max-w-5xl p-4 invoice-main-section">
        <div id="invoice-sheet" className="rounded-2xl border border-slate-200 bg-white shadow-sm uppercase">
          {/* Header */}
          <div className="px-1 pt-1">
            <div className="grid grid-cols-3 items-start">
              {/* LEFT: Logo + Branch + Address */}
              <div className="invoice-logo">
                <img
                  src={branch?.logo_url || InvoiceLogo}
                  alt={branch?.branch_name || "Gulf Cargo"}
                  className="h-12 object-contain"
                />
                {/* <div className="header-invoice-address mt-1 text-slate-700">
                  BRANCH: {branch?.branch_name ||
                    pick(shipment, ["branch", "branch_name", "branch_label", "branch.name", "origin_branch_name", "origin_branch"], "—")}
                </div> */}
                {/* Address (optional small line) */}
                <div className="header-invoice-address mt-0.5 text-[11px] text-slate-600 normal-case">
                  {s(branch?.branch_address, "")}
                </div>
              </div>

              {/* MIDDLE: QR */}
              <div className="invoice-qrcode flex items-center justify-center">
                <img
                  src={buildQrUrl(trackUrl, 120)}
                  alt="Invoice QR (Track this package)"
                  className="h-28 w-28 rounded bg-white p-1 ring-1 ring-slate-200"
                />
              </div>

              {/* RIGHT: Arabic name + Phone + Email */}
              <div className="text-center sm:text-right">
                <div className="text-[11px] font-semibold leading-tight text-indigo-900">
                   <div className="header-invoice-branch-name mt-1 text-slate-700">
                  {branch?.branch_name ||
                    pick(shipment, ["branch", "branch_name", "branch_label", "branch.name", "origin_branch_name", "origin_branch"], "—")}
                </div>
                </div>
                <div className="header-invoice-branch-arname">
                  {s(branch?.branch_name_ar, "شركة سواحل الخليج للنقل البحري")}
                </div>
                <p className="header-invoice-branch-contact mt-1 font-medium text-slate-800">
                  {pickPhoneFromBranch(branch)}
                </p>
                {/* <p className="header-invoice-branch-contact text-slate-700">
                  {s(branch?.branch_email, "—")}
                </p> */}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 items-center gap-2 rounded bg-rose-600 px-2 py-1 text-white sm:grid-cols-3">
              <div className="text-xs">
                <div className="invoice-top-header">VAT NO. : {COMPANY.vatNo}</div>
                <div className="invoice-top-header">
                 SHIPMENT TYPE: {pick(shipment, ["shipping_method", "method"], COMPANY.defaultShipmentType)}
                </div>
              </div>
              <div className="text-center">
                <div className="invoice-top-header">فاتورة ضريبة مبسطة</div>
                <div className="invoice-top-header">SIMPLIFIED TAX INVOICE</div>
              </div>
              <div className="text-right text-xs">
                <div className="invoice-top-header">
                  <div className="tracking-invoice-content-track-no">{getTrackCode(shipment) || "—"}</div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-black px-2 py-1 text-white font-semibold tracking-wide">
                    <span className="invoice-number-text">{billNo}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Meta */}
          {/* <div className="grid grid-cols-5 gap-4  px-2 py-1.5 sm:grid-cols-5">
            <div>
              <div className="tracking-invoice-heading">Track No.</div>
              <div className="tracking-invoice-content-track-no">{getTrackCode(shipment) || "—"}</div>
            </div>
            <div>
              <div className="tracking-invoice-heading">Box No.</div>
              <div className="tracking-invoice-content">{billNo}</div>
            </div>
            <div>
              <div className="tracking-invoice-heading">Branch</div>
              <div className="tracking-invoice-content">
                {branch?.branch_name ||
                  pick(shipment, ["branch", "branch_name", "branch_label", "branch.name", "origin_branch_name", "origin_branch"], "—")}
              </div>
            </div>
            <div>
              <div className="tracking-invoice-heading">Delivery Type</div>
              <div className="tracking-invoice-content">{shipment?.delivery_type || "—"}</div>
            </div>
            <div>
              <div className="tracking-invoice-heading">Payment Method</div>
              <div className="tracking-invoice-content">{shipment?.payment_method || "—"}</div>
            </div>
          </div> */}

        <div
  className="
    section-three-bg
    grid gap-4 border-slate-200 px-2 py-2
    [grid-template-columns:1fr]
    md:[grid-template-columns:1fr_2fr_1fr]
  "
>
  {/* SHIPPER (2fr) */}
  <div className="relative rounded-lg border border-slate-200 p-3 pt-6">
    <div className="absolute -top-3 left-3 rounded-tr-2xl rounded-bl-2xl bg-rose-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
      Shipper
    </div>

    <div className=" text-[11px]">
      <div className="flex items-start">
        <div className="invoice-parties-label w-20 shrink-0 text-slate-700">Name</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text font-semibold text-slate-900">
          {getName(senderParty, "sender", shipment) || "—"}
        </div>
      </div>

      <div className="flex items-start">
        <div className="invoice-parties-label w-20 shrink-0 text-slate-700">ID No</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text">
         {senderParty?.document_id || pick(shipment, ["sender_document_id","shipper_document_id"], "—")}

        </div>
      </div>

      <div className="flex items-start">
        <div className="invoice-parties-label w-20 shrink-0 text-slate-700">Tel</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text">{getPhone(senderParty, "sender", shipment, pick) || "—"}</div>
      </div>

      <div className="flex items-start">
        <div className="invoice-parties-label w-20 shrink-0 text-slate-700">No. of Pcs</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text">{computePieces(shipment)}</div>
      </div>

      <div className="flex items-start">
        <div className="invoice-parties-label w-20 shrink-0 text-slate-700">Weight</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text">{totalWeightDisplay} kg</div>
      </div>

      <div className="flex items-start">
        <div className="invoice-parties-label w-20 shrink-0 text-slate-700">Date</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text">{pickShipmentDate(shipment) || "—"}</div>
      </div>
    </div>
  </div>

  {/* CONSIGNEE (2fr) */}
  <div className="relative rounded-lg border border-slate-200 p-3 pt-6">
    <div className="absolute -top-3 left-3 rounded-tr-2xl rounded-bl-2xl bg-rose-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
      Consignee
    </div>

    <div className="text-[11px]">
      <div className="flex items-start">
        <div className="invoice-parties-label w-15 shrink-0 text-slate-700">Name</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text font-semibold text-slate-900">
          {getName(receiverParty, "receiver", shipment) || "—"}
        </div>
      </div>

      <div className="flex">
        <div className="invoice-parties-label w-15 shrink-0 text-slate-700">Adress</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text whitespace-pre-wrap">
          {receiverParty?.address_line || getAddress(receiverParty, "receiver", shipment, pick) || "—"}
        </div>
      </div>

      {/* <div className="flex items-start">
        <div className="w-15 shrink-0 text-slate-700">Village</div>
        <div className="mx-1">:</div>
        <div>{receiverParty?.raw?.village || ""}</div>
      </div> */}

      {/* Post + PIN on one line */}
      <div className="flex items-start">
        <div className="invoice-parties-label w-15 shrink-0 text-slate-700">Post</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text flex flex-wrap items-baseline gap-4">
          <span>{receiverParty?.post || pick(receiverParty?.raw || {}, ["city"], "—")}</span>
          <span className="text-slate-700">PIN:</span>
          <span>{receiverParty?.pin || pick(receiverParty?.raw || {}, ["postal_code", "pincode", "zip"], "—")}</span>
        </div>
      </div>

      {/* Dist + State on one line */}
      <div className="flex items-start">
        <div className="invoice-parties-label w-15 shrink-0 text-slate-700">Dist</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text flex flex-wrap items-baseline gap-4">
          <span>{receiverParty?.dist || pick(receiverParty?.raw || {}, ["district"], "—")}</span>
          <span className="text-slate-700">State :</span>
          <span>{receiverParty?.state || pick(receiverParty?.raw || {}, ["state"], "—")}</span>
        </div>
      </div>

      <div className="flex items-start">
        <div className="invoice-parties-label w-15 shrink-0 text-slate-700">Tel</div>
        <div className="mx-1">:</div>
        <div className="invoice-parties-text">{getPhone(receiverParty, "receiver", shipment, pick) || "—"}</div>
      </div>
    </div>
  </div>

  {/* BOX SUMMARY (1fr) */}
  <div className="self-start">
    <div className="mt-2 ml-auto w-[150px] overflow-hidden ">
      <table className="text-[11px] ">
        <thead className="box-weight-table-header">
          <tr className="text-center">
            <th className="border border-slate-800 px-2 py-1 w-[30px]">S.No</th>
            <th className="border border-slate-800 px-2 py-1">Box No.</th>
            <th className="border border-slate-800 px-2 py-1 w-[65px]">Weight</th>
          </tr>
        </thead>
        <tbody className="box-weight-table-body">
          {boxRows.length > 0 ? (
            boxRows.map((row, idx) => (
              <tr key={idx} className="text-center">
                <td className="border border-slate-800 px-2 py-1">{row.sl}</td>
                <td className="border border-slate-800 px-2 py-1">{billNo}</td>
                <td className="border border-slate-800 px-2 py-1">{row.weight}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="border border-slate-800 px-2 py-2 text-center text-slate-500" colSpan={3}>
                No box weights
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
</div>

<section className="px-1 py-1">
  <div className="flex justify-between items-center my-1">
    <div className="invoice-cargo-heading">Cargo Items</div>
    <div className="invoice-weight-text">Total Weight: {totalWeightDisplay} kg</div>
  </div>

  <div className="grid grid-cols-2 gap-3">
    {/* LEFT TABLE */}
    <div className="print-avoid">
      <table className="items-table h-full w-full table-fixed border-collapse text-[11px]">
        <colgroup>
          <col style={{ width: "44px" }} />
          <col />
          <col style={{ width: "70px" }} />
          <col style={{ width: "50px" }} />
        </colgroup>
        <thead>
          <tr className="text-center">
            <th className="border border-slate-800">SL NO.</th>
            <th className="border border-slate-800 text-left">ITEMS</th>
            <th className="border border-slate-800">BOX NO.</th>
            <th className="border border-slate-800">QTY</th>
          </tr>
        </thead>
        <tbody>
          {colA.map((it, idx) => (
            <tr key={`A-${idx}`} className="align-top">
              <td className="border border-slate-800 text-center">{it ? it.idx : ""}</td>
              <td className="border border-slate-800 uppercase">{it ? (it.name || "—") : ""}</td>
              <td className="border border-slate-800 text-center">{it ? (it.boxLabel || "—") : ""}</td>
              <td className="border border-slate-800 text-center">{it ? (it.qty || "—") : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* RIGHT TABLE */}
  {/* RIGHT TABLE — continuous, totals in tfoot, fillers keep totals at bottom */}
<div className="print-avoid">
  {(() => {
    const MAX_ROWS = ROWS_PER_COL; // you already use 15; keep it consistent
    const rightRows = colB.slice(0, MAX_ROWS);
    const fillerCount = Math.max(0, MAX_ROWS - rightRows.length);
    const fillers = Array.from({ length: fillerCount });

    return (
      <table className="items-table w-full table-fixed border-collapse text-[11px]">
        <colgroup>
          <col style={{ width: "44px" }} />
          <col />
          <col style={{ width: "70px" }} />
          <col style={{ width: "50px" }} />
        </colgroup>

        <thead>
          <tr className="text-center">
            <th className="border border-slate-800">S. NO</th>
            <th className="border border-slate-800 text-left">ITEMS</th>
            <th className="border border-slate-800">BOX NO.</th>
            <th className="border border-slate-800">QTY</th>
          </tr>
        </thead>

        <tbody>
          {/* actual rows */}
          {rightRows.map((it, idx) => (
            <tr key={`B-${idx}`} className="align-top">
              <td className="border border-slate-800 text-center">{it ? it.idx : ""}</td>
              <td className="border border-slate-800 uppercase">{it ? (it.name || "—") : ""}</td>
              <td className="border border-slate-800 text-center">{it ? (it.boxLabel || "—") : ""}</td>
              <td className="border border-slate-800 text-center">{it ? (it.qty || "—") : ""}</td>
            </tr>
          ))}

          {/* filler rows to push totals to bottom */}
          {fillers.map((_, i) => (
            <tr key={`B-fill-${i}`}>
              <td className="border border-slate-800 text-center">&nbsp;</td>
              <td className="border border-slate-800">&nbsp;</td>
              <td className="border border-slate-800 text-center">&nbsp;</td>
              <td className="border border-slate-800 text-center">&nbsp;</td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td className="border border-slate-800 text-right font-medium" colSpan={3}>
              <div className="flex justify-between">
                <span className="uppercase">Total</span>
                <span className="ml-2 text-right">المجموع</span>
              </div>
            </td>
            <td className="border border-slate-800 text-right">
              {fmtMoney(subtotal, currency).replace(/[A-Z]{3}\s?/, "").trim()}
            </td>
          </tr>

          <tr>
            <td className="border border-slate-800 text-right font-medium" colSpan={3}>
              <div className="flex justify-between">
                <span className="uppercase">Bill Charges</span>
                <span className="ml-2 text-right">رسوم الفاتورة</span>
              </div>
            </td>
            <td className="border border-slate-800 text-right">
              {fmtMoney(bill, currency).replace(/[A-Z]{3}\s?/, "").trim()}
            </td>
          </tr>

          <tr>
            <td className="border border-slate-800 text-right font-medium" colSpan={3}>
              <div className="flex justify-between">
                <span className="uppercase">VAT %</span>
                <span className="ml-2 text-right">ضريبة القيمة المضافة %</span>
              </div>
            </td>
            <td className="border border-slate-800 text-right">
              {fmtMoney(tax, currency).replace(/[A-Z]{3}\s?/, "").trim()}
            </td>
          </tr>

          <tr className="font-semibold">
            <td className="border border-slate-800 text-right uppercase" colSpan={3}>
              <div className="flex justify-between">
                <span>Net Total</span>
                <span className="ml-2 text-right">المجموع الصافي</span>
              </div>
            </td>
            <td className="border border-slate-800 text-right">
              {fmtMoney(total, currency).replace(/[A-Z]{3}\s?/, "").trim()}
            </td>
          </tr>
        </tfoot>
      </table>
    );
  })()}
</div>

  </div>
</section>

          {/* Footer */}
          <div className="border-t border-slate-200 px-1 py-2">
            <div className="invoice-footer-header flex justify-between px-10 py-2 invoice-terms-conditions-header">
              <div>TERMS AND CONDITIONS </div>
              <div>Thank you for your business.</div>
            </div>

            <div className="invoice-terms-conditions-content">
              <h2>Accept the goods only after checking and confirming them on delivery.</h2>
              <p className="mt-1">
                NO GUARANTEE FOR GLASS/BREAKABLE ITEMS. COMPANY NOT RESPONSIBLE FOR ITEMS RECEIVED IN DAMAGED CONDITION.
                COMPLAINTS WILL NOT BE ACCEPTED AFTER 2 DAYS FROM THE DATE OF DELIVERY. COMPANY NOT RESPONSIBLE FOR OCTROI
                CHARGES OR ANY OTHER CHARGES LEVIED LOCALLY. IN CASE OF CLAIM (LOSS), PROOF OF DOCUMENTS SHOULD BE PRODUCED.
                SETTLEMENT WILL BE MADE (20 SAR/KGS) PER COMPANY RULES. COMPANY WILL NOT TAKE RESPONSIBILITY FOR NATURAL
                CALAMITY AND DELAY IN CUSTOMS CLEARANCE.
              </p>
              <p className="mt-1">
                الشروط: 1. لا توجد مطالب ضد الشركة الناشئة للخسائر الناتجة عن الحوادث الطبيعية أو تأخير التخليص الجمركي. 2. لا
                تتحمل الشركة مسؤولية أي خسارة ناتجة عن سوء الاستخدام أو الأضرار غير المسؤولة أو المسؤوليات المترتبة على أي رسوم ومعاملات
                تفرض من قبل السلطات الجمركية. 3. الشركة غير مسؤولة عن أي مسؤوليات قانونية ناشئة عن المستندات المفقودة أو التالفة. 4.
                يتحمل المستلم أو المشتري جميع الرسوم الإضافية، بما في ذلك رسوم التخزين والغرامات المفروضة من قبل الجمارك.
              </p>
              <p className="mt-1">ഡെലിവറി ചെയ്യുമ്പോൾ സാധനങ്ങൾ പരിശോധിച്ച് ഉറപ്പ് വരുത്തിയതിന് ശേഷം മാത്രം സ്വീകരിക്കുക.</p>
            </div>

            <div className="flex justify-around py-2 invoice-terms-conditions-footer">
              <div>Shipper Signature</div>
              <div>Consignee Signature</div>
              <div>Manager Signature</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
