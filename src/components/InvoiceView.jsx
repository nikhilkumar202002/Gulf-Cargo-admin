  // src/pages/InvoiceView.jsx
  import React, { useEffect, useMemo, useState } from "react";
  import { useParams, useLocation } from "react-router-dom";
  import { normalizeCargoToInvoice, getCargoById } from "../api/createCargoApi";
  import { getPartyById, getParties } from "../api/partiesApi";
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

  /* ---------------- Company header ---------------- */
  const COMPANY = {
    arHeadingLine1: "شركة سواحل الخليج للنقل",
    arHeadingLine2: "البحري",
    nameEn: "GULF CARGO AGENCY",
    addr: "NEAR VFS GLOBAL KINGKHALID ROAD-HAIL",
    phones: "0503433723-0568778615,",
    email: "gulfcargoksahail@gmail.com",
    vatNo: "310434479300003",
    branchLabel: "GULF CARGO KSA HAIL",
    slCode: "HL401667",
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

  const joinAddress = (p) => {
    const parts = [
      p?.address, p?.address_line1, p?.address_line2, p?.street, p?.locality, p?.area, p?.district,
      p?.city, p?.state, p?.country, p?.postal_code ?? p?.pincode ?? p?.zip,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const formatPhones = (p) => {
    const vals = [p?.contact_number, p?.phone, p?.mobile, p?.mobile_number, p?.contact].filter(Boolean);
    const whats = p?.whatsapp_number ?? p?.whatsapp ?? null;
    const a = [];
    if (vals.length) a.push(`${vals.join(" / ")}`);
    if (whats) a.push(` ${whats}`);
    return a.join("  •  ");
  };

  const extractParty = (p) => ({
    id: p?.id ?? null,
    name: p?.name || "—",
    email: p?.email || "",
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

        return { id: null, name: name || "—", email, address, phones: phone };
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
      pickFn?.(
        sh,
        side === "sender"
          ? ["sender_phone", "shipper_phone", "sender_mobile"]
          : ["receiver_phone", "consignee_phone", "receiver_mobile"],
        ""
      );

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

        <main className="mx-auto max-w-5xl p-4 flex justify-center items-center">
          <div id="invoice-sheet" className="rounded-2xl border border-slate-200 bg-white shadow-sm uppercase">
            {/* Header */}
            <div className="px-1 pt-1">
              <div className="grid grid-cols-3 items-start">
                <div className="invoice-logo">
                  <img src={InvoiceLogo} alt="Gulf Cargo" className="h-16 object-contain" />
                  <div className="header-invoice-address mt-1 text-slate-700">
                    BRANCH: {pick(shipment, ["branch", "branch_name", "branch_label", "branch.name", "origin_branch_name", "origin_branch"], "—")}
                  </div>
                </div>

                <div className="invoice-qrcode flex items-center justify-center">
                  <img
                    src={buildQrUrl(trackUrl, 160)}
                    alt="Invoice QR (Track this package)"
                    className="h-36 w-36 rounded bg-white p-1 ring-1 ring-slate-200"
                  />
                </div>

                <div className="text-center sm:text-right">
                  <div className="text-[11px] font-semibold leading-tight text-indigo-900">
                    <div>{COMPANY.arHeadingLine1}{COMPANY.arHeadingLine2}</div>
                  </div>
                  <div className="text-[11px] header-invoice-heading mt-1 font-semibold text-rose-700">{COMPANY.nameEn}</div>
                  <p className="text-[11px] header-invoice-address text-xs mt-1 font-medium text-slate-800">{COMPANY.phones}</p>
                  <p className="text-[11px] header-invoice-address text-xs text-slate-700">{COMPANY.email}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 items-center gap-2 rounded bg-rose-600 px-2 py-1 text-white sm:grid-cols-3">
                <div className="text-xs">
                  <div className="invoice-top-header">VAT NO. : {COMPANY.vatNo}</div>
                  <div className="invoice-top-header">SHIPMENT TYPE: {shipment?.method || COMPANY.defaultShipmentType}</div>
                </div>
                <div className="text-center">
                  <div className="invoice-top-header">فاتورة ضريبة مبسطة</div>
                  <div className="invoice-top-header">SIMPLIFIED TAX INVOICE</div>
                </div>
                <div className="text-right text-xs">
                  {/* <div className="invoice-top-header">
                    {pick(shipment, ["branch", "branch_name", "branch_label", "branch.name", "origin_branch_name", "origin_branch"], "—")}
                  </div> */}
                  <div className="invoice-top-header">
                    <span className="inline-flex items-center gap-1 rounded-md bg-black px-2 py-1 text-white font-semibold tracking-wide">
                      <span className="invoice-number-text opacity-80">INV No. :</span>
                      <span className="invoice-number-text">{shipment?.booking_no || shipment?.invoice_no || "—"}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-5 gap-4  px-2 py-1.5 sm:grid-cols-5">
              <div>
                <div className="tracking-invoice-heading">Track No.</div>
                <div className="tracking-invoice-content-track-no">{getTrackCode(shipment) || "—"}</div>
              </div>
              <div>
                <div className="tracking-invoice-heading">Box No.</div>
                <div className="tracking-invoice-content">{shipment?.booking_no || shipment?.invoice_no || "—"}</div>
              </div>
              <div>
                <div className="tracking-invoice-heading">Branch</div>
                <div className="tracking-invoice-content">
                  {pick(shipment, ["branch", "branch_name", "branch_label", "branch.name", "origin_branch_name", "origin_branch"], "—")}
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
            </div>

            {/* Parties + Box summary */}
            <div className="section-three-bg grid grid-cols-1 gap-6 border-slate-200 px-2 py-2
                  sm:[grid-template-columns:1fr_1fr_1fr]">
  
              <div>
                <div className="invoice-parties-header text-xs font-medium uppercase tracking-wide text-slate-500">Shipper</div>
                <div className="mt-1 invoice-parties-content grid grid-cols-[60px_1fr] text-sm">
                  <span className="invoice-parties-label text-slate-500">Name:</span>
                  <span className="invoice-parties-text">{getName(senderParty, "sender", shipment)}</span>

                  <span className="invoice-parties-label text-slate-500">Address:</span>
                  <span className="invoice-parties-text whitespace-pre-wrap">
                    {getAddress(senderParty, "sender", shipment, pick)}
                  </span>

                  <span className="invoice-parties-label text-slate-500">Pin code:</span>
                  <span className="invoice-parties-text">{getPincode(senderParty, "sender", shipment, pick)}</span>

                  <span className="invoice-parties-label text-slate-500">Phone:</span>
                  <span className="invoice-parties-text">{getPhone(senderParty, "sender", shipment, pick)}</span>
                </div>
              </div>

              {/* Consignee */}
              <div>
                <div className="invoice-parties-header text-xs font-medium tracking-wide text-slate-500">Consignee</div>
                <div className="mt-1 invoice-parties-content grid grid-cols-[60px_1fr] text-sm">
                  <span className="invoice-parties-label text-slate-500">Name:</span>
                  <span className="invoice-parties-text">{getName(receiverParty, "receiver", shipment)}</span>

                  <span className="invoice-parties-label text-slate-500">Address:</span>
                  <span className="invoice-parties-text whitespace-pre-wrap">
                    {getAddress(receiverParty, "receiver", shipment, pick)}
                  </span>

                  <span className="invoice-parties-label text-slate-500">Pincode:</span>
                  <span className="invoice-parties-text">{getPincode(receiverParty, "receiver", shipment, pick)}</span>

                  <span className="invoice-parties-label text-slate-500">Phone:</span>
                  <span className="invoice-parties-text">{getPhone(receiverParty, "receiver", shipment, pick)}</span>
                </div>
              </div>

              {/* Box Summary */}
              <div>
                {/* <div className="invoice-parties-header text-xs font-medium uppercase tracking-wide text-slate-500">Boxes</div> */}

                <div className="mt-2 overflow-hidden border border-slate-200">
                  <table className="box-summary-table min-w-full text-sm">
                    <thead className="box-weight-table-header text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Sl No</th>
                        <th className="px-3 py-2 text-left">Box No</th>
                        <th className="px-3 py-2 text-right">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="box-weight-table-body">
                      {boxRows.length > 0 ? (
                        boxRows.map((row, idx) => (
                          <tr key={idx} className={idx % 2 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="px-3 py-2">{row.boxNo}</td>
                            <td className="px-3 py-2">{shipment?.booking_no || shipment?.invoice_no || "—"}</td>
                            <td className="px-3 py-2 text-right">{row.weight} kg</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-3 py-3 text-slate-500" colSpan={3}>
                            No box weights
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Items (two columns) */}
            <div className="px-1 py-1">
              <div className="flex justify-between my-1">
                <div className="invoice-cargo-heading">Cargo Items</div>
                <div className="invoice-weight-text">Total Weight: {totalWeightDisplay} kg</div>
              </div>

              <div className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-2 lg:grid-cols-2">
                {/* Column A */}
                <div className="lg:col-span-1">
                  <table className="min-w-full border-separate border-spacing-0 avoid-break">
                    <thead className="invoice-table-header">
                      <tr>
                        <th className="w-12 border border-slate-200 px-1 py-1 text-left uppercase tracking-wider">Sl.No</th>
                        <th className="border-t border-b border-slate-200 px-1 py-1 text-left uppercase tracking-wider">Items</th>
                        <th className="border border-slate-200 px-1 py-1 text-right text-[11px] font-semibold uppercase tracking-wider">Box No.</th>
                        <th className="border border-slate-200 px-1 py-1 text-right uppercase tracking-wider">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="invoice-table-content">
                      {colA.map((it, idx) => (
                        <tr key={`A-${idx}`} className="align-top">
                          <td className="border-x border-b border-slate-200 px-1 py-1">{it ? it.idx : ""}</td>
                          <td className="border-b border-slate-200 px-1 py-1 ">{it ? it.name || "—" : <span className="opacity-0">pad</span>}</td>
                          <td className="border-x border-b border-slate-200 px-1 py-1 text-right text-sm text-slate-900">
                            {it ? it.boxLabel || "—" : ""}
                          </td>
                          <td className="border-x border-b border-slate-200 px-1 py-1 text-right text-sm text-slate-900">
                            {it ? it.qty || "—" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Column B */}
                <div className="lg:col-span-1">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="invoice-table-header">
                      <tr>
                        <th className="w-12 border px-1 py-1 text-left uppercase tracking-wider">S.No</th>
                        <th className="border-t border-b border-slate-200 px-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wider">Items</th>
                        <th className="border border-slate-200 px-1 py-1 text-right text-[11px] font-semibold uppercase tracking-wider">Box No.</th>
                        <th className="border border-slate-200 px-1 py-1 text-right text-[11px] font-semibold uppercase tracking-wider">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="invoice-table-content">
                      {colB.map((it, idx) => (
                        <tr key={`B-${idx}`} className="align-top">
                          <td className="border-x border-b border-slate-200 px-1 py-1">{it ? it.idx : ""}</td>
                          <td className="border-b border-slate-200 px-1 py-1">{it ? it.name || "—" : <span className="opacity-0">pad</span>}</td>
                          <td className="border-x border-b border-slate-200 px-1 py-1.5 text-right">{it ? it.boxLabel || "—" : ""}</td>
                          <td className="border-x border-b border-slate-200 px-1 py-1.5 text-right ">{it ? it.qty || "—" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {overflowCount > 0 && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      +{overflowCount} more item{overflowCount > 1 ? "s" : ""} (not shown to preserve space for terms)
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="lg:col-span-1 avoid-break">
                  <div className="mx-auto w-full rounded-xl border-slate-200 p-1 ">
<div className="total-card-list flex justify-between text-sm text-slate-700">
  <div>SUBTOTAL</div>
  <div className="font-medium text-slate-900">{fmtMoney(subtotal, currency)}</div>
</div>

<div className="total-card-list flex justify-between text-sm text-slate-700">
  <div>BILL CHARGES</div>
  <div className="font-medium text-slate-900">{fmtMoney(bill, currency)}</div>
</div>
<div className="total-card-list flex justify-between text-sm text-slate-700">
  <div>VAT</div>
  <div className="text-slate-900">{fmtMoney(tax, currency)}</div>
</div>
<div className=" total-card-list mt-1 flex justify-between border-t border-slate-200 pt-1 text-sm font-semibold text-slate-900">
  <div>NET TOTAL</div>
  <div>{fmtMoney(total, currency)}</div>
</div>

                  </div>
                </div>
              </div>
            </div>

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
