// src/pages/ShipmentManifest.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCargoShipment } from "../../api/shipmentCargo";
import { getPartyById } from "../../api/partiesApi";

// ===== DEBUG helpers =====
const DEBUG = true;
const log = (...a) => DEBUG && console.log("[ShipmentManifest]", ...a);
const info = (...a) => DEBUG && console.info("[ShipmentManifest]", ...a);
const warn = (...a) => DEBUG && console.warn("[ShipmentManifest]", ...a);
const errL = (...a) => DEBUG && console.error("[ShipmentManifest]", ...a);

// ===== generic helpers =====
const fmt = (v) => (v === 0 || v ? String(v) : "—");
const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
};

// Prefer items from c.items; else flatten c.boxes[*].items
const extractItems = (c = {}) => {
  if (Array.isArray(c?.items)) return c.items;
  if (c?.boxes && typeof c.boxes === "object") {
    try {
      return Object.values(c.boxes).flatMap((b) =>
        Array.isArray(b?.items) ? b.items : []
      );
    } catch {
      return [];
    }
  }
  return [];
};

const sumPieces = (items = []) =>
  items.reduce(
    (s, it) => s + Number(it?.piece_no ?? it?.pieces ?? it?.qty ?? 0),
    0
  );

const sumWeight = (items = []) =>
  items.reduce((s, it) => s + Number(it?.weight ?? it?.weight_kg ?? 0), 0);

const descOfGoods = (items = []) =>
  items
    .map(
      (it) =>
        `${it?.name ?? it?.item_name ?? "Item"} (${
          it?.piece_no ?? it?.pieces ?? it?.qty ?? 0
        })`
    )
    .join(", ");

// party object -> "addr, district, state, country, postal"
const joinPartyAddress = (p = {}) =>
  [
    p.address ?? [p.address_line1, p.address_line2].filter(Boolean).join(", "),
    p.district ?? p.city ?? p.taluk,
    p.state,
    p.country,
    p.postal_code ?? p.pincode,
  ]
    .filter(Boolean)
    .join(", ");

// cargo row -> address using prefixed fields (sender_/receiver_)
const addrFromCargo = (pfx, obj = {}) => {
  const o = obj || {};
  return [
    o[`${pfx}_address`],
    o[`${pfx}_district`],
    o[`${pfx}_state`],
    o[`${pfx}_country`],
    o[`${pfx}_postal_code`] ?? o[`${pfx}_pincode`],
  ]
    .filter(Boolean)
    .join(", ");
};

// gather phones incl. WhatsApp (party-like object OR cargo+prefix)
const phonesFrom = (pfxOrObj, maybeObj) => {
  if (typeof pfxOrObj === "string") {
    const pfx = pfxOrObj;
    const o = maybeObj || {};
    const nums = [
      o[`${pfx}_contact_number`],
      o[`${pfx}_phone`],
      o[`${pfx}_mobile`],
      o?.contact_number,
      o?.phone,
      o?.mobile,
    ].filter(Boolean);
    const wa = o[`${pfx}_whatsapp_number`] ?? o?.whatsapp_number;
    return { phones: Array.from(new Set(nums)), whatsapp: wa || "" };
  } else {
    const p = pfxOrObj || {};
    const nums = [p.contact_number, p.phone, p.mobile].filter(Boolean);
    const wa = p.whatsapp_number;
    return { phones: Array.from(new Set(nums)), whatsapp: wa || "" };
  }
};

// ===== robust ID discovery (handles multiple casings) =====
const getSenderId = (c = {}) =>
  c?.sender_party_id ??
  c?.senderPartyId ??
  c?.sender_id ??
  c?.shipper_id ??
  c?.shipperId ??
  c?.sender?.id ??
  c?.sender?.party_id ??
  c?.sender?.partyId ??
  c?.shipper?.id ??
  c?.shipper?.party_id ??
  c?.shipper?.partyId ??
  null;

const getReceiverId = (c = {}) =>
  c?.receiver_party_id ??
  c?.receiverPartyId ??
  c?.receiver_id ??
  c?.consignee_id ??
  c?.consigneeId ??
  c?.receiver?.id ??
  c?.receiver?.party_id ??
  c?.receiver?.partyId ??
  c?.consignee?.id ??
  c?.consignee?.party_id ??
  c?.consignee?.partyId ??
  null;

// normalize various API shapes from getPartyById
const normalizeParty = (res) =>
  res?.data?.data?.party ?? // {data:{data:{party}}}
  res?.data?.party ?? // {data:{party}}
  res?.party ?? // {party}
  res?.data ?? // {data:{...partyFields}}
  res ?? null;

export default function ShipmentManifest() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // party cache: id -> party object
  const [partyMap, setPartyMap] = useState({});
  const [partyLoading, setPartyLoading] = useState(false);

  // ===== Fetch shipment =====
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      info("Fetching shipment...", { shipmentId: id });
      try {
        const res = await getCargoShipment(id);
        const rec = res?.data ?? res;
        if (!alive) return;
        setData(rec || null);
        const cargosCount = Array.isArray(rec?.cargos) ? rec.cargos.length : 0;
        log("Shipment fetched successfully.", { cargosCount, shipmentId: id });
      } catch (e) {
        if (!alive) return;
        const msg = e?.message || "Failed to load shipment";
        setErr(msg);
        errL("Shipment fetch failed.", msg);
      } finally {
        if (!alive) return;
        setLoading(false);
        info("Shipment fetch finished.", { shipmentId: id });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const cargos = useMemo(
    () => (Array.isArray(data?.cargos) ? data.cargos : []),
    [data]
  );

  // Debug the real cargo shape (optional)
  useEffect(() => {
    if (!cargos?.length) return;
    console.groupCollapsed("[Manifest] Cargo sample");
    console.log("cargo[0]:", cargos[0]);
    console.log("senderId:", getSenderId(cargos[0]));
    console.log("receiverId:", getReceiverId(cargos[0]));
    console.groupEnd();
  }, [cargos]);

  // ===== Fetch parties by present IDs only =====
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cargos.length) {
        setPartyMap({});
        return;
      }

      const missingIds = new Set();
      cargos.forEach((c) => {
        const sId = getSenderId(c);
        const rId = getReceiverId(c);
        if (sId != null && !partyMap[String(sId)]) missingIds.add(String(sId));
        if (rId != null && !partyMap[String(rId)]) missingIds.add(String(rId));
      });

      // If no IDs found in any cargo, don't attempt fetching
      if (missingIds.size === 0) {
        if (DEBUG) info("No party IDs present in cargos. Skipping party fetch.");
        return;
      }

      setPartyLoading(true);
      try {
        const lookups = await Promise.all(
          Array.from(missingIds).map(async (pid) => {
            try {
              const res = await getPartyById(Number(pid)); // be forgiving if backend expects number
              const party = normalizeParty(res);
              return [pid, party ?? null];
            } catch (e) {
              warn("Party fetch failed for id:", pid, e?.message);
              return [pid, null];
            }
          })
        );
        if (!alive) return;

        setPartyMap((prev) => {
          const next = { ...prev };
          lookups.forEach(([pid, party]) => {
            if (party) next[pid] = party;
          });
          return next;
        });
      } finally {
        if (alive) setPartyLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargos]);

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">
            {loading ? "Loading Manifest…" : "Custom Manifest"}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Print
            </button>
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-black"
            >
              Back
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3">Sl No</th>
                <th className="px-4 py-3">Booking Number</th>
                <th className="px-4 py-3">No. of Pieces</th>
                <th className="px-4 py-3">Weight (kg)</th>
                <th className="px-4 py-3">Shipper Details</th>
                <th className="px-4 py-3">Consignee Address</th>
                <th className="px-4 py-3">Consignee Pincode</th>
                <th className="px-4 py-3">Description of Goods (with Qty)</th>
                <th className="px-4 py-3">Invoice Value *</th>
                <th className="px-4 py-3">GSTIN Type *</th>
                <th className="px-4 py-3">GSTIN No *</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : err ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-rose-700">
                    {err}
                  </td>
                </tr>
              ) : cargos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-slate-600">
                    No cargos found for this shipment.
                  </td>
                </tr>
              ) : (
                cargos.map((c, idx) => {
                  // items/pieces/weight
                  const items = extractItems(c);
                  const pieces = sumPieces(items);
                  const weight = Number(c?.total_weight) || sumWeight(items);

                  // sender/receiver ID presence
                  const sId = getSenderId(c);
                  const rId = getReceiverId(c);

                  // resolve cached parties if we have IDs
                  const senderParty = sId != null ? partyMap[String(sId)] : null;
                  const receiverParty = rId != null ? partyMap[String(rId)] : null;

                  // embedded objects (if any in other payloads)
                  const senderEmbedded =
                    typeof c?.sender === "object" && c.sender ? c.sender : null;
                  const receiverEmbedded =
                    typeof c?.receiver === "object" && c.receiver ? c.receiver : null;

                  const senderLike = senderParty ?? senderEmbedded ?? null;
                  const receiverLike = receiverParty ?? receiverEmbedded ?? null;

                  // show "Loading…" only if an ID exists and we haven't resolved it yet
                  const waitingSender = partyLoading && !!sId && !senderParty;
                  const waitingReceiver = partyLoading && !!rId && !receiverParty;

                  // ---- SHIPPER (SENDER)
                  const shipperName =
                    senderLike?.name ?? c?.sender_name ?? c?.shipper_name ?? "—";

                  const shipperAddr =
                    (senderLike && joinPartyAddress(senderLike)) ||
                    addrFromCargo("sender", c) ||
                    "—";

                  const { phones: senderPhonesArr, whatsapp: senderWA } =
                    senderLike ? phonesFrom(senderLike) : phonesFrom("sender", c);

                  const senderPhones = senderPhonesArr.join(" / ");
                  const shipperPhoneLine = [senderPhones || "", senderWA ? `WhatsApp: ${senderWA}` : ""]
                    .filter(Boolean)
                    .join(" | ");

                  const shipperDetails = [shipperName, shipperAddr, shipperPhoneLine]
                    .filter(Boolean)
                    .join(" | ");

                  // ---- CONSIGNEE (RECEIVER)
                  const consigneeAddr =
                    (receiverLike && joinPartyAddress(receiverLike)) ||
                    addrFromCargo("receiver", c) ||
                    "—";

                  const consigneePin =
                    receiverLike?.postal_code ??
                    receiverLike?.pincode ??
                    c?.receiver_postal_code ??
                    c?.receiver_pincode ??
                    "—";

                  // ---- Goods / GST
                  const goods = descOfGoods(items) || "—";
                  const invoiceValue = c?.invoice_value ?? c?.net_total ?? c?.total_cost ?? "";
                  const gstinType = c?.gstin_type ?? c?.gst_type ?? "";
                  const gstinNo = c?.gstin_no ?? c?.gst_no ?? "";

                  const reqText = (v, fmtFn = (x) => x) =>
                    v || v === 0 ? fmtFn(v) : <span className="text-rose-600">Required</span>;

                  return (
                    <tr key={c.id ?? `${idx}-${sId ?? ""}-${rId ?? ""}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono">{fmt(c?.booking_no ?? c?.id)}</td>
                      <td className="px-4 py-3">{fmt(pieces)}</td>
                      <td className="px-4 py-3">
                        {fmt(Number.isFinite(Number(weight)) ? Number(weight).toFixed(3) : weight)}
                      </td>
                      <td className="px-4 py-3">
                        {waitingSender ? "Loading…" : fmt(shipperDetails)}
                      </td>
                      <td className="px-4 py-3">
                        {waitingReceiver ? "Loading…" : fmt(consigneeAddr)}
                      </td>
                      <td className="px-4 py-3">
                        {waitingReceiver ? "Loading…" : fmt(consigneePin)}
                      </td>
                      <td className="px-4 py-3">{fmt(goods)}</td>
                      <td className="px-4 py-3">{reqText(invoiceValue, money)}</td>
                      <td className="px-4 py-3">{reqText(gstinType)}</td>
                      <td className="px-4 py-3">{reqText(gstinNo)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          * Columns marked mandatory must be filled before export/print for compliance.
        </p>
      </div>
    </section>
  );
}
