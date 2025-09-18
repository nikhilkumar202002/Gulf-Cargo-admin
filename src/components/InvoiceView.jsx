// src/pages/InvoiceView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getShipment } from "../api/shipmentsApi";
import { getPartyById, getParties } from "../api/partiesApi";
import InvoiceLogo from "../assets/Logo.png";
import "./invoice.css";

const cx = (...c) => c.filter(Boolean).join(" ");
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtMoney = (n, currency = "INR") => {
  if (n === null || n === undefined || n === "") return "—";
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(n) || 0); }
  catch { return String(n); }
};

const Spinner = ({ className = "h-5 w-5 text-indigo-600" }) => (
  <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const pick = (obj, keys, fallback = "—") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

/* ---------- Company header content ---------- */
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

const joinAddress = (p) =>
  [p?.address, p?.city, p?.district, p?.state, p?.country, p?.postal_code].filter(Boolean).join(", ");

const formatPhones = (p) => {
  const a = [];
  if (p?.contact_number) a.push(`Call: ${p.contact_number}`);
  if (p?.whatsapp_number) a.push(`WhatsApp: ${p.whatsapp_number}`);
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

/* QR helper */
const buildQrUrl = (data, size = 160) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

export default function InvoiceView({ shipment: injectedShipment = null, modal = false }) {
  const { id } = useParams();
  const location = useLocation();
  const hydrated = location.state?.shipment || null;

  const [shipment, setShipment] = useState(injectedShipment || hydrated || null);
  const [loading, setLoading] = useState(!injectedShipment && !hydrated && !!id);
  const [err, setErr] = useState("");

  const [senderParty, setSenderParty] = useState(null);
  const [receiverParty, setReceiverParty] = useState(null);
  const [partyLoading, setPartyLoading] = useState(false);

  // allow hot-prop updates (modal path)
  useEffect(() => {
    if (injectedShipment) setShipment(injectedShipment);
  }, [injectedShipment]);

  // load shipment if only URL param is present
  useEffect(() => {
    if (!id || injectedShipment || hydrated) return;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const s = await getShipment(id);
        setShipment(s || null);
      } catch (e) {
        setErr(e?.message || "Failed to load shipment");
        setShipment(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, hydrated, injectedShipment]);

  // load parties once shipment is ready (ID first; then name fallback)
  useEffect(() => {
    if (!shipment) return;

    const fetchParty = async (role) => {
      const isSender = role === "sender";
      const idCandidates = isSender
        ? [shipment.sender_id, shipment.shipper_id, shipment.sender_party_id]
        : [shipment.receiver_id, shipment.consignee_id, shipment.receiver_party_id];

      const name = isSender ? (shipment.sender?.name || shipment.sender || shipment.shipper_name)
                            : (shipment.receiver?.name || shipment.receiver || shipment.consignee_name);

      // by ID
      for (const pid of idCandidates) {
        if (!pid) continue;
        try {
          const res = await getPartyById(pid);
          const data = res?.party || res?.data || res;
          if (data?.id) return extractParty(data);
        } catch (_) {}
      }

      // by name + role (Sender/Receiver)
      const variants = [
        { name, customer_type: isSender ? "Sender" : "Receiver" },
        { q: name, customer_type: isSender ? "Sender" : "Receiver" },
        { search: name, customer_type: isSender ? "Sender" : "Receiver" },
        { name }, { q: name }, { search: name },
      ];
      for (const params of variants) {
        if (!name) break;
        try {
          const res = await getParties(params);
          const list = parsePartyList(res);
          const found = matchByName(name, list) || list[0];
          if (found) return extractParty(found);
        } catch (_) {}
      }

      // fallback from shipment
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

  const currency = pick(shipment, ["currency", "currency_code"], "INR");

  // normalize items for table
  const items = useMemo(() => {
    const raw = Array.isArray(shipment?.items) ? shipment.items : [];
    return raw.map((it, i) => ({
      idx: i + 1,
      name: pick(it, ["description", "name", "item_name", "cargo_name", "title", "item"], "Item"),
      qty: pick(it, ["no_of_pieces", "quantity", "qty", "pieces", "count"], ""),
      weight: pick(it, ["weight", "weight_kg", "kg"], ""),
      unitPrice: pick(it, ["unit_price", "price", "rate"], ""),
      amount: (() => {
        const up = Number(it?.unit_price ?? it?.price ?? it?.rate ?? 0);
        const q = Number(it?.no_of_pieces ?? it?.quantity ?? it?.qty ?? it?.pieces ?? 0);
        return up && q ? up * q : (it?.amount ?? it?.line_total ?? "");
      })(),
    }));
  }, [shipment]);

  const subtotal = shipment?.subtotal ?? items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const tax = shipment?.tax ?? shipment?.tax_amount ?? 0;
  const total = shipment?.total_amount ?? shipment?.grand_total ?? (Number(subtotal) + Number(tax));

  const qrText = `INV|${shipment?.track_code || ""}|AWB:${shipment?.awb_number || ""}|TOTAL:${total}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* PRINT: only the invoice card */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden !important; }
          #invoice-sheet, #invoice-sheet * { visibility: visible !important; }
          #invoice-sheet { position: absolute; inset: 0; margin: 0 !important; box-shadow: none !important; border: 0 !important; }
        }
      `}</style>

      {/* Top bar (won't print) */}
      {!modal && (
        <div className="sticky top-0 z-10 border-b bg-white print:hidden">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2">
            <button onClick={() => window.history.back()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
              ← Back
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice card */}
      <main className="mx-auto max-w-5xl p-4">
        <div id="invoice-sheet" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* ======= COMPANY HEADER ======= */}
          <div className="px-6 pt-6">
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
              {/* Logo */}
              <div className="flex items-center sm:justify-start justify-center">
                <img src={InvoiceLogo} alt="Gulf Cargo" className="h-16 object-contain" />
              </div>

              {/* QR */}
              <div className="flex items-center justify-center">
                <img
                  src={buildQrUrl(qrText, 160)}
                  alt="Invoice QR"
                  className="h-36 w-36 rounded bg-white p-1 ring-1 ring-slate-200"
                />
              </div>

              {/* Company text */}
              <div className="text-center sm:text-right">
                <div className="text-[18px] font-semibold leading-tight text-indigo-900">
                  <div>{COMPANY.arHeadingLine1}</div>
                  <div>{COMPANY.arHeadingLine2}</div>
                </div>
                <div className="mt-1 text-[18px] font-semibold text-rose-700">{COMPANY.nameEn}</div>
                <div className="mt-1 text-xs text-slate-700">{COMPANY.addr}</div>
                <div className="text-xs font-medium text-slate-800">{COMPANY.phones}</div>
                <div className="text-xs text-slate-700">{COMPANY.email}</div>
              </div>
            </div>

            {/* Red ribbon */}
            <div className="mt-3 grid grid-cols-1 items-center gap-2 rounded bg-rose-600 px-3 py-2 text-white sm:grid-cols-3">
              <div className="text-xs">
                <div className="font-semibold">VAT NO. : {COMPANY.vatNo}</div>
                <div>SHIPMENT TYPE: {shipment?.method || COMPANY.defaultShipmentType}</div>
              </div>
              <div className="text-center">
                <div className="text-[15px] font-semibold">فاتورة ضريبة مبسطة</div>
                <div className="text-xs tracking-wide">SIMPLIFIED TAX INVOICE</div>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold">{COMPANY.branchLabel}</div>
                <div className="mt-1 inline-block rounded bg-black px-2 py-0.5 font-semibold">SL: {COMPANY.slCode}</div>
              </div>
            </div>
          </div>
          {/* ======= END COMPANY HEADER ======= */}

          {/* Meta strip */}
          <div className="grid grid-cols-1 gap-4 border-b border-slate-200 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Track No.</div>
              <div className="mt-1 inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-1 font-mono text-xs font-semibold text-white">
                {shipment?.track_code ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">AWB</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{shipment?.awb_number ?? "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Route</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {(shipment?.origin_port?.name ?? shipment?.origin_port ?? "—")} → {(shipment?.destination_port?.name ?? shipment?.destination_port ?? "—")}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Status</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{shipment?.status?.name ?? shipment?.status ?? "—"}</div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 gap-6 border-b border-slate-200 px-6 py-6 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Shipper</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {senderParty?.name || shipment?.sender?.name || shipment?.sender || shipment?.shipper_name || "—"}
              </div>
              <div className="whitespace-pre-wrap text-sm text-slate-700">
                {senderParty?.address ||
                  pick(shipment?.sender, ["address"], "") ||
                  pick(shipment, ["sender_address", "shipper_address", "sender_addr"], "")}
              </div>
              <div className="text-sm text-slate-700">
                {senderParty?.phones || pick(shipment?.sender, ["contact_number", "whatsapp_number"], "") ||
                  pick(shipment, ["sender_phone", "shipper_phone", "sender_mobile"], "")}
              </div>
              <div className="text-sm text-slate-700">
                {senderParty?.email || pick(shipment?.sender, ["email"], "") || pick(shipment, ["sender_email", "shipper_email"], "")}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Consignee</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {receiverParty?.name || shipment?.receiver?.name || shipment?.receiver || shipment?.consignee_name || "—"}
              </div>
              <div className="whitespace-pre-wrap text-sm text-slate-700">
                {receiverParty?.address ||
                  pick(shipment?.receiver, ["address"], "") ||
                  pick(shipment, ["receiver_address", "consignee_address", "receiver_addr"], "")}
              </div>
              <div className="text-sm text-slate-700">
                {receiverParty?.phones || pick(shipment?.receiver, ["contact_number", "whatsapp_number"], "") ||
                  pick(shipment, ["receiver_phone", "consignee_phone", "receiver_mobile"], "")}
              </div>
              <div className="text-sm text-slate-700">
                {receiverParty?.email || pick(shipment?.receiver, ["email"], "") || pick(shipment, ["receiver_email", "consignee_email"], "")}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="px-6 py-6">
            <div className="mb-3 text-sm font-semibold text-slate-900">Cargo Items</div>
            {loading || partyLoading ? (
              <div className="flex items-center gap-2 text-slate-600"><Spinner /><span>Loading…</span></div>
            ) : err ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>
            ) : !items.length ? (
              <div className="text-sm text-slate-600">No items found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Weight (kg)</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Unit Price</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((it) => (
                      <tr key={it.idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-sm text-slate-700">{it.idx}</td>
                        <td className="px-3 py-2 text-sm text-slate-800">{it.name}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{it.qty || "—"}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{it.weight || "—"}</td>
                        <td className="px-3 py-2 text-right text-sm text-slate-700">{it.unitPrice ? fmtMoney(it.unitPrice, currency) : "—"}</td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-slate-900">
                          {it.amount ? fmtMoney(it.amount, currency) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="mt-6 flex flex-col items-end">
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-sm text-slate-700">
                  <div>Subtotal</div>
                  <div className="font-medium text-slate-900">{fmtMoney(subtotal, currency)}</div>
                </div>
                <div className="mt-1 flex justify-between text-sm text-slate-700">
                  <div>Tax</div>
                  <div className="font-medium text-slate-900">{fmtMoney(tax, currency)}</div>
                </div>
                <div className="mt-2 border-t border-slate-200 pt-2 flex justify-between text-base font-semibold text-slate-900">
                  <div>Total</div>
                  <div>{fmtMoney(total, currency)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
            Thank you for your business.
          </div>
        </div>
      </main>
    </div>
  );
}
