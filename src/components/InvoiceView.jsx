// src/pages/InvoiceView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { normalizeCargoToInvoice, getCargoById } from "../api/createCargoApi";
import { getPartyById, getParties /* optional: getPartiesByCustomerType */ } from "../api/partiesApi";
import InvoiceLogo from "../assets/Logo.png";
import "./invoice.css";

const MONEY_LOCALE = 'en-SA';
const DEFAULT_CURRENCY = 'SAR';

/* ---------- utils ---------- */
const cx = (...c) => c.filter(Boolean).join(" ");
const toNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);

const fmtMoney = (n, currency = DEFAULT_CURRENCY) => {
  if (n === null || n === undefined || n === "") return "—";
  try {
    return new Intl.NumberFormat(MONEY_LOCALE, { style: "currency", currency }).format(Number(n) || 0);
  } catch {
    return String(n);
  }
};

const pick = (obj, keys, fallback = "—") => {
  for (const k of keys) {
    // allow dotted paths like "origin_port.name"
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

const flattenBoxesToItems = (boxes) => {
  const keys = Object.keys(boxes || {});
  // sort numerically so "1","2","10" are in the right order
  const ordered = keys.sort((a, b) => Number(a) - Number(b));
  const labelByKey = Object.fromEntries(ordered.map((k, i) => [k, `B${i + 1}`]));

  const out = [];
  let runningIndex = 1;

  for (const k of ordered) {
    const box = boxes[k];
    const list = Array.isArray(box?.items) ? box.items : [];
    const inferredItemWeight = list?.length ? (list[0]?.weight ?? list[0]?.weight_kg ?? "") : "";
    const boxWeight = box?.weight ?? box?.box_weight ?? box?.weight_kg ?? inferredItemWeight;
    for (const it of list) {
      const rawBox = it?.box_number ?? it?.box_no ?? k; // fallback to key if item doesn’t have it
      const qty = it?.piece_no ?? it?.qty ?? it?.quantity ?? it?.pieces ?? "";

      out.push({
        idx: runningIndex++,
        name: it?.name ?? it?.description ?? "Item",
        qty,
        weight: it?.weight ?? it?.weight_kg ?? "",
        boxWeight,
        unitPrice: it?.unit_price ?? it?.price ?? it?.rate ?? "",
        amount:
          it?.total_price ??
          it?.amount ??
          (Number(it?.unit_price ?? it?.price ?? it?.rate ?? 0) * Number(qty || 0)),
        // what we’ll render in the “Box No.” column:
        boxLabel: labelByKey[String(rawBox)] ?? `B${Number(rawBox) || String(rawBox)}`,
      });
    }
  }
  return out;
};


/* ---------- Company header (keep yours) ---------- */
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

/* ---------- Party helpers ---------- */
const parsePartyList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.parties)) return res.parties;
  if (Array.isArray(res?.data?.parties)) return res.data.parties;
  return [];
};

// replace joinAddress
const joinAddress = (p) => {
  const parts = [
    p?.address, p?.address_line1, p?.address_line2,
    p?.street, p?.locality, p?.area, p?.district, p?.city, p?.state,
    p?.country, p?.postal_code ?? p?.pincode ?? p?.zip,
  ].filter(Boolean);
  // collapse to comma-separated once; sanitizeAddress will drop duplicates later
  return parts.join(", ");
};


const sanitizeAddress = (addr, side, shipment) => {
  if (!addr) return "";
  const ban = [
    // nested on side
    (shipment?.[side]?.country),
    (shipment?.[side]?.state),
    (shipment?.[side]?.district),
    (shipment?.[side]?.city),
    // flat variants we often see
    ...(side === "sender"
      ? [shipment?.sender_country, shipment?.sender_state, shipment?.sender_district, shipment?.sender_city]
      : [shipment?.receiver_country, shipment?.receiver_state, shipment?.receiver_district, shipment?.receiver_city]
    ),
  ]
    .filter(Boolean)
    .map(String)
    .map(s => s.trim().toLowerCase());

  if (ban.length === 0) return addr;

  // Drop any comma-separated token that exactly equals a banned token (case-insensitive)
  return addr
    .split(",")
    .map(s => s.trim())
    .filter(part => part && !ban.includes(part.toLowerCase()))
    .join(", ");
};

// replace formatPhones
const formatPhones = (p) => {
  const vals = [
    p?.contact_number, p?.phone, p?.mobile, p?.mobile_number, p?.contact,
  ].filter(Boolean);
  const whats = p?.whatsapp_number ?? p?.whatsapp ?? null;
  const a = [];
  if (vals.length) a.push(`Call: ${vals.join(" / ")}`);
  if (whats) a.push(`WhatsApp: ${whats}`);
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
  const track = shipment?.track_code || shipment?.tracking_no || "";
  const box   = shipment?.box_no || shipment?.booking_no || shipment?.invoice_no || "";
  const params = new URLSearchParams();

  if (track) params.set("code", track);       // adjust param name if your page expects something else
  if (box)   params.set("box", String(box));  // optional
  params.set("src", "qr");

  // If you want a clean URL when there are no params:
  return params.toString() ? `${base}?${params.toString()}` : base;
};


/* ---------- QR helper ---------- */
const buildQrUrl = (url, size = 160) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

export default function InvoiceView({ shipment: injected = null, modal = false }) {
  const { id } = useParams();
  const location = useLocation();

  // allow passing via route state; support both { cargo } and { shipment } shapes
  const hydratedFromState = location.state?.cargo || location.state?.shipment || null;

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(!!id && !injected && !hydratedFromState);
  const [err, setErr] = useState("");

  const [senderParty, setSenderParty] = useState(null);
  const [receiverParty, setReceiverParty] = useState(null);
  const [partyLoading, setPartyLoading] = useState(false);

  const trackUrl = buildTrackUrl(shipment);

  // boot: prefer prop → route state → fetch by id
  useEffect(() => {
    (async () => {
      try {
        if (injected) {
          setShipment(normalizeCargoToInvoice(injected)); // handles {success,cargo} OR plain cargo
          return;
        }
        if (hydratedFromState) {
          setShipment(normalizeCargoToInvoice(hydratedFromState));
          return;
        }
        if (id) {
          setLoading(true);
          const cargo = await getCargoById(id); // returns cargo object
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
      // inside fetchParty('receiver') ID candidates:
      const idCandidates = [shipment.receiver_id, shipment.consignee_id, shipment.receiver_party_id, shipment.consignee_party_id];

      const name = isSender
        ? shipment.sender?.name || shipment.sender || shipment.shipper_name
        : shipment.receiver?.name || shipment.receiver || shipment.consignee_name;

      // 1) by ID
      for (const pid of idCandidates) {
        if (!pid) continue;
        try {
          const res = await getPartyById(pid);
          const data = res?.party || res?.data || res;
          if (data?.id) return extractParty(data);
        } catch (_) { }
      }

      // 2) by name (broad search), then filter by role when possible
      if (name) {
        try {
          const res = await getParties({ search: name });
          const list = parsePartyList(res);

          // Prefer role-filtered match if present:
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
        } catch (_) { }
      }

      // 3) ultimate fallback: use whatever is on shipment
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
      setPartyLoading(true);
      try {
        const [sp, rp] = await Promise.all([fetchParty("sender"), fetchParty("receiver")]);
        setSenderParty(sp);
        setReceiverParty(rp);
      } finally {
        setPartyLoading(false);
      }
    })();
  }, [shipment]);

  /* ---------- normalized basics ---------- */
  const currency = DEFAULT_CURRENCY;

const items = useMemo(() => {
  // If API gave nested boxes, flatten and return with B1/B2 labels
  if (shipment?.boxes && Object.keys(shipment.boxes).length) {
    return flattenBoxesToItems(shipment.boxes);
  }

  // Fallback: legacy flat items shape
  const raw = Array.isArray(shipment?.items) ? shipment.items : [];

return raw.map((it, i) => {
  const qty =
    it?.qty ?? it?.no_of_pieces ?? it?.quantity ?? it?.pieces ?? it?.count ?? it?.piece_no ?? "";
  const rawBox = it?.box_number ?? it?.box_no ?? it?.box ?? it?.package_no ?? "";
  const boxLabel = rawBox ? `B${Number(rawBox) || String(rawBox)}` : "";

  return {
    idx: i + 1,
    name: pick(it, ["description", "name", "item_name", "cargo_name", "title", "item"], "Item"),
    qty,
    weight: pick(it, ["weight", "weight_kg", "kg"], ""),
    boxWeight: "",              // <— add this line
    unitPrice: pick(it, ["unit_price", "price", "rate"], ""),
    amount:
      it?.total_price ??
      it?.amount ??
      it?.line_total ??
      (Number(it?.unit_price ?? it?.price ?? it?.rate ?? 0) * Number(qty || 0)),
    boxLabel,
  };
});
}, [shipment]);

  const getName = (p, side, shipment) =>
    p?.name ||
    shipment?.[side]?.name ||
    shipment?.[side] ||
    shipment?.[side === "sender" ? "shipper_name" : "consignee_name"] ||
    "";
  const getAddress = (p, side, shipment, pick) =>
    p?.address ||
    pick?.(shipment?.[side], ["address"], "") ||
    pick?.(
      shipment,
      side === "sender"
        ? ["sender_address", "shipper_address", "sender_addr"]
        : ["receiver_address", "consignee_address", "receiver_addr"],
      ""
    );

  const getPhone = (p, side, shipment, pick) =>
    p?.phones ||
    pick?.(shipment?.[side], ["contact_number", "whatsapp_number"], "") ||
    pick?.(
      shipment,
      side === "sender"
        ? ["sender_phone", "shipper_phone", "sender_mobile"]
        : ["receiver_phone", "consignee_phone", "receiver_mobile"],
      ""
    );

  const getPincode = (p, side, shipment, pick) =>
    p?.pincode ||
    pick?.(shipment?.[side], ["pincode", "pin", "zip", "zipcode", "postal_code"], "") ||
    pick?.(
      shipment,
      side === "sender"
        ? [
          "sender_pincode",
        ]
        : [
          "receiver_pincode",
        ],
      ""
    );

  const ROWS_PER_COL = 15;

  const computedSubtotal = items.reduce((s, it) => s + toNum(it.amount), 0);
  const apiSubtotalNum = toNum(shipment?.subtotal);
  const subtotal = apiSubtotalNum > 0 ? apiSubtotalNum : computedSubtotal;

  const tax = toNum(shipment?.tax ?? shipment?.tax_amount ?? shipment?.vat_cost ?? 0);
  const bill = toNum(shipment?.bill_charges ?? shipment?.bill ?? 0);

  const total = toNum(
    shipment?.total_cost ??
    shipment?.net_total ??
    (subtotal + bill + tax)
  );

  // Split items into two columns and pad with blanks so both columns align
  const colA = items.slice(0, ROWS_PER_COL);
  const colB = items.slice(ROWS_PER_COL, ROWS_PER_COL * 2);
  while (colA.length < ROWS_PER_COL) colA.push(null);
  while (colB.length < ROWS_PER_COL) colB.push(null);

  // if there are more than 2*ROWS_PER_COL items, note it (we keep space for T&C)
  const overflowCount = Math.max(0, items.length - ROWS_PER_COL * 2);

  const qrText = `INV|${shipment?.track_code || ""}|BOOK:${shipment?.booking_no || shipment?.invoice_no || ""}|TOTAL:${total}`;

  if (loading) {
    return <div className="p-6 text-slate-600">Loading invoice…</div>;
  }
  if (err) {
    return <div className="p-6 text-rose-700">{err}</div>;
  }
  if (!shipment) {
    return <div className="p-6 text-rose-700">No cargo found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* PRINT: only the invoice card */}
      <style>{`
  @media print {
    @page { size: A4; margin: 12mm; }

    /* Keep colors and gradients */
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* Show only the invoice sheet */
    body * { visibility: hidden !important; }
    #invoice-sheet, #invoice-sheet * { visibility: visible !important; }

    /* Stable A4 content width (210mm - 2*12mm margin = 186mm) */
    #invoice-sheet {
      width: 186mm;
      margin: 0 auto !important;
      position: static !important;  /* don't absolutely position; avoids weird shifts */
      box-shadow: none !important;
      border: 0 !important;
    }

    /* Force grids to multi-column on print */
    .print-grid-6 { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
    .print-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }

    /* Avoid page breaks inside these blocks */
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }

    /* Help table headers behave nicely on page breaks */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr, td, th { break-inside: avoid; page-break-inside: avoid; }
  }
`}</style>

      {/* Top bar (won't print) */}
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

      {/* Invoice card */}
      <main className="mx-auto max-w-5xl p-4">
        <div id="invoice-sheet" className="rounded-2xl border border-slate-200 bg-white shadow-sm uppercase">
          {/* ======= COMPANY HEADER ======= */}
          <div className="px-1 pt-1">
            <div className="grid grid-cols-3 items-start ">
              {/* Logo */}
              <div className="invoice-logo">
                <img src={InvoiceLogo} alt="Gulf Cargo" className="h-16 object-contain" />
                <div className="header-invoice-address mt-1 text-slate-700">
                    {pick(
                  shipment,
                  ["branch", "branch_name", "branch_label", "branch.name", "origin_branch_name", "origin_branch"],
                  "—"
                )}
                </div>
              </div>

              {/* QR */}
              <div className="invoice-qrcode flex items-center justify-center">
                <img
                  src={buildQrUrl(trackUrl, 160)}
                  alt="Invoice QR (Track this package)"
                  className="h-36 w-36 rounded bg-white p-1 ring-1 ring-slate-200"
                />
              </div>

              {/* Company text */}
              <div className="text-center sm:text-right">
                <div className="text-[11px] font-semibold leading-tight text-indigo-900">
                  <div>{COMPANY.arHeadingLine1}</div>
                  <div>{COMPANY.arHeadingLine2}</div>
                </div>
                <div className="text-[11px] header-invoice-heading mt-1 font-semibold text-rose-700">
                  {COMPANY.nameEn}
                </div>

                <p className="text-[11px] header-invoice-address text-xs mt-1 font-medium text-slate-800">
                  {COMPANY.phones}
                </p>
                <p className="text-[11px] header-invoice-address text-xs text-slate-700">
                  {COMPANY.email}
                </p>
              </div>
            </div>


            {/* Red ribbon */}
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
                <div className="invoice-top-header">
                    {pick(
                  shipment,
                  ["branch", "branch_name", "branch_label", "branch.name", "origin_branch_name", "origin_branch"],
                  "—"
                )}
                </div>
                <div className="invoice-top-header">
                      <span className="inline-flex items-center gap-1 rounded-md bg-black px-2 py-1 text-white font-semibold tracking-wide">
                        <span className="invoice-number-text opacity-80">INV No. :</span>
                        <span className="invoice-number-text">
                          {shipment?.booking_no || shipment?.invoice_no || "—"}
                        </span>
                      </span>
                    </div>
                                                                       
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 border-b border-slate-200 px-2 py-3 sm:grid-cols-5 lg:grid-cols-5">
            <div>
              <div className="tracking-invoice-heading">Track No.</div>
              <div className="tracking-invoice-content-track-no">
                {shipment?.track_code || "—"}
              </div>
            </div>
            <div>
              <div className="tracking-invoice-heading">Box No.</div>
              <div className="tracking-invoice-content">
                {shipment?.booking_no || shipment?.invoice_no || "—"}
              </div>
            </div>
            <div>
              <div className="tracking-invoice-heading">Branch</div>
              <div className="tracking-invoice-content">
                {pick(
                  shipment,
                  ["branch", "branch_name", "branch_label", "branch.name", "origin_branch_name", "origin_branch"],
                  "—"
                )}
              </div>
            </div>
            {/* <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Status</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {shipment?.status?.name ?? shipment?.status ?? "—"}
              </div>
            </div> */}
            <div>
              <div className="tracking-invoice-heading">Delivery Type</div>
              <div className="tracking-invoice-content">{shipment?.delivery_type || "—"}</div>
            </div>
            <div>
              <div className="tracking-invoice-heading">Payment Method</div>
              <div className="tracking-invoice-content">{shipment?.payment_method || "—"}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 border-b border-slate-200 px-2 py-2 sm:grid-cols-2">
            {/* SHIPPER */}
            <div>
              <div className="invoice-parties-header text-xs font-medium uppercase tracking-wide text-slate-500">
                Shipper
              </div>
              <div className="mt-1 invoice-parties-content grid grid-cols-[100px_1fr] text-sm">
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

            {/* CONSIGNEE */}
            <div>
              <div className="invoice-parties-header text-xs font-medium tracking-wide text-slate-500">
                Consignee
              </div>
              <div className="mt-1 invoice-parties-content grid grid-cols-[100px_1fr] text-sm">
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
          </div>

          {/* ======= ITEMS (two columns like your PDF) ======= */}
          <div className="px-1 py-1">
            <div className="flex justify-between">
              <div className="invoice-cargo-heading mb-3">Cargo Items</div>
              {/* Weight highlight badge */}
              <div className="invoice-weight-text">
                Total Weight: {Math.trunc(parseFloat(pick(shipment, ["total_weight", "weight", "gross_weight"], 0)) || 0)} kg
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2  py-2 sm:grid-cols-2 lg:grid-cols-2 print-grid-2">
              {/* Column A */}
              <div className="lg:col-span-1">
                <table className="min-w-full border-separate border-spacing-0 avoid-break">
                 <thead className="invoice-table-header">
  <tr>
    <th className="w-12 border border-slate-200 px-1 py-1 text-left uppercase tracking-wider">Sl.No</th>
    <th className="border-t border-b border-slate-200 px-1 py-1 text-left uppercase tracking-wider">Items</th>
    <th className="border border-slate-200 px-1 py-1 text-right text-[11px] font-semibold uppercase tracking-wider">Box No.</th>
    <th className="border border-slate-200 px-1 py-1 text-right uppercase tracking-wider">Qty</th>
    {/* NEW */}
    <th className="border border-slate-200 px-1 py-1 text-right uppercase tracking-wider">Weight (kg)</th>
  </tr>
</thead>

                  <tbody className="invoice-table-content">
  {colA.map((it, idx) => (
    <tr key={`A-${idx}`} className="align-top">
      <td className="border-x border-b border-slate-200 px-1 py-1">{it ? it.idx : ""}</td>
      <td className="border-b border-slate-200 px-1 py-1 ">{it ? (it.name || "—") : <span className="opacity-0">pad</span>}</td>
      <td className="border-x border-b border-slate-200 px-1 py-1 text-right text-sm text-slate-900">{it ? (it.boxLabel || "—") : ""}</td>
      <td className="border-x border-b border-slate-200 px-1 py-1 text-right text-sm text-slate-900">{it ? it.qty || "—" : ""}</td>
      {/* NEW */}
      <td className="border-x border-b border-slate-200 px-1 py-1 text-right text-sm text-slate-900">
        {it ? (it.boxWeight || it.weight || "—") : ""}
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
    <th className="w-12 border px-1 py-1 text-left uppercase tracking-wider ">S.No</th>
    <th className="border-t border-b border-slate-200 px-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wider ">Items</th>
    <th className="border border-slate-200 px-1 py-1 text-right text-[11px] font-semibold uppercase tracking-wider ">Box No.</th>
    <th className="border border-slate-200 px-1 py-1 text-right text-[11px] font-semibold uppercase tracking-wider ">Qty</th>
    {/* NEW */}
    <th className="border border-slate-200 px-1 py-1 text-right text-[11px] font-semibold uppercase tracking-wider ">Weight (kg)</th>
  </tr>
</thead>

               <tbody className="invoice-table-content">
  {colB.map((it, idx) => (
    <tr key={`B-${idx}`} className="align-top">
      <td className="border-x border-b border-slate-200 px-1 py-1">{it ? it.idx : ""}</td>
      <td className="border-b border-slate-200 ppx-1 py-1">{it ? (it.name || "—") : <span className="opacity-0">pad</span>}</td>
      <td className="border-x border-b border-slate-200 px-1 py-1.5 text-right">{it ? (it.boxLabel || "—") : ""}</td>
      <td className="border-x border-b border-slate-200 px-1 py-1.5 text-right ">{it ? it.qty || "—" : ""}</td>
      {/* NEW */}
      <td className="border-x border-b border-slate-200 px-1 py-1.5 text-right ">
        {it ? (it.boxWeight || it.weight || "—") : ""}
      </td>
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

              {/* Totals card */}
              <div className="lg:col-span-1 avoid-break">
                <div className="mx-auto w-full rounded-xl border-slate-200 p-1 ">
                  <div className="total-card-list flex justify-between text-sm text-slate-700">
                    <div className="invoice-bill-content">Subtotal</div>
                    <div className="font-medium text-slate-900">{fmtMoney(subtotal, currency)}</div>
                  </div>
                  <div className="total-card-list flex justify-between text-sm text-slate-700">
                    <div className="invoice-bill-content">Bill Charges</div>
                    <div className="total-card-list font-medium text-slate-900">{fmtMoney(bill, currency)}</div>
                  </div>
                  <div className=" flex justify-between text-sm text-slate-700">
                    <div className="invoice-bill-content">Vat%</div>
                    <div className="total-card-list text-slate-900">{fmtMoney(tax, currency)}</div>
                  </div>
                  <div className="total-card-money mt-1 flex justify-between border-t border-slate-200 pt-1 text-base font-semibold text-slate-900">
                    <div className="invoice-bill-total">Net Total</div>
                    <div>{fmtMoney(shipment?.total_cost ?? shipment?.net_total ?? total, currency)}</div>
                  </div>

                  {/* Extra weight emphasis near totals */}
                  {/* <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <span>Weight</span>
                    <span>{pick(shipment, ["total_weight", "weight", "gross_weight"], "0")} kg</span>
                  </div> */}
                </div>
              </div>
            </div>
          </div>

          {/* ======= FOOTER ======= */}
          <div className="border-t border-slate-200 px-1 py-2">
            <div className="invoice-footer-header flex justify-between px-10 py-2 invoice-terms-conditions-header">
              <div>TERMS AND CONDITIONS </div>
              <div>Thank you for your business.</div>
            </div>

            <div className="invoice-terms-conditions-content">
              <h2>Accept the goods only after checking and confirming them on delivery.</h2>
              <p lassName="mt-1">
                NO GUARANTEE FOR GLASS/BREAKABLE ITEMS. COMPANY NOT RESPONSIBLE FOR ITEMS RECEIVED IN DAMAGED CONDITION.
                COMPLAINTS WILL NOT BE ACCEPTED AFTER 2 DAYS FROM THE DATE OF DELIVERY. COMPANY NOT RESPONSIBLE FOR OCTROI
                CHARGES OR ANY OTHER CHARGES LEVIED LOCALLY. IN CASE OF CLAIM (LOSS), PROOF OF DOCUMENTS SHOULD BE PRODUCED.
                SETTLEMENT WILL BE MADE (20 SAR/KGS) PER COMPANY RULES. COMPANY WILL NOT TAKE RESPONSIBILITY FOR NATURAL
                CALAMITY AND DELAY IN CUSTOMS CLEARANCE.
              </p>
              <p className="mt-1">الشروط: 1. لا توجد مطالب ضد الشركة الناشئة للخسائر الناتجة عن الحوادث الطبيعية أو تأخير التخليص الجمركي. 2. لا تتحمل الشركة مسؤولية أي خسارة ناتجة عن سوء الاستخدام أو الأضرار غير المسؤولة أو المسؤوليات المترتبة على أي رسوم ومعاملات تفرض من قبل السلطات الجمركية. 3. الشركة غير مسؤولة عن أي مسؤوليات قانونية ناشئة عن المستندات المفقودة أو التالفة. 4. يتحمل المستلم أو المشتري جميع الرسوم الإضافية، بما في ذلك رسوم التخزين والغرامات المفروضة من قبل الجمارك.</p>
              <p lassName="mt-1">ഡെലിവറി ചെയ്യുമ്പോൾ സാധനങ്ങൾ പരിശോധിച്ച് ഉറപ്പ് വരുത്തിയതിന് ശേഷം മാത്രം സ്വീകരിക്കുക.</p>
              {/* <p lassName="mt-1">हिन्दी में समय समय पर कम्पनी नियमों के अनुसार भुगतान किया जायेगा। कम्पनी प्राकृतिक आपदा तथा कस्टम्स क्लियरेंस में देरी के लिए जिम्मेदार नहीं होगी। कम्पनी किसी भी नुकसान या हानि के लिए जिम्मेदार नहीं होगी जो असावधानी या अनुचित उपयोग के कारण हुआ हो। कस्टम्स द्वारा लगाए गए किसी भी अतिरिक्त शुल्क या दंड का भुगतान ग्राहक द्वारा किया जाएगा।</p> */}
              <h2 lassName="mt-1">I AGREE TO THE ABOVE TERMS & CONDITIONS
                أوافق على الشروط والأحكام المذكورة أعلاه</h2>
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
