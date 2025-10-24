import axiosInstance from "./axiosInstance";

/* ---------- small helpers ---------- */
const safeString = (v, def = "") => (v === null || v === undefined ? def : String(v));
const safeNumStr = (v, decimals = 2) => {
  const n = Number(String(v ?? 0).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n.toFixed(decimals) : Number(0).toFixed(decimals);
};
const safeWeightStr = (v) => {
  const n = Number(String(v ?? 0).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
};

function buildErrorFromAxios(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const serverMsg = data?.message || data?.msg || data?.error || null;
  let message = `Request failed${status ? ` (${status})` : ""}`;
  if (serverMsg) message += ` - ${serverMsg}`;

  if (data && typeof data === "object") {
    const errs = data.errors ?? data;
    if (errs && typeof errs === "object") {
      try {
        const flat = Object.entries(errs)
          .map(([k, v]) => (Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${JSON.stringify(v)}`))
          .slice(0, 10)
          .join(" | ");
        if (flat) message += ` — ${flat}`;
      } catch (e) {
        /* ignore */
      }
    }
  }

  const out = new Error(message);
  out.status = status;
  out.response = err?.response;
  return out;
}

/* ---------- flatten grouped boxes -> items ---------- */
function flattenBoxesToItems(boxesObj = {}) {
  if (!boxesObj || typeof boxesObj !== "object") return [];
  const items = [];
  Object.keys(boxesObj)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((boxKey) => {
      const arr = Array.isArray(boxesObj[boxKey]?.items) ? boxesObj[boxKey].items : [];
      arr.forEach((it, i) => {
        const pieces = Number(it.piece_no ?? it.pieces ?? it.qty ?? 0) || 0;
        const unit = Number(it.unit_price ?? it.unitPrice ?? it.price ?? 0) || 0;
        const weight = Number(it.weight ?? 0) || 0;
        items.push({
          name: safeString(it.name),
          piece_no: String(pieces),
          qty: String(pieces),
          pieces: String(pieces),
          unit_price: safeNumStr(unit, 2),
          unitPrice: safeNumStr(unit, 2),
          price: safeNumStr(unit, 2),
          total_price: safeNumStr(pieces * unit, 2),
          total: safeNumStr(pieces * unit, 2),
          amount: safeNumStr(pieces * unit, 2),
          weight: safeWeightStr(weight),
          box_number: safeString(it.box_number ?? boxKey),
          slno: safeString(it.slno ?? i + 1),
        });
      });
    });
  return items;
}

/* ---------- build request body ---------- */
function buildRequestBody(payload = {}) {
  const body = { ...payload };

  if (payload.boxes && Object.keys(payload.boxes).length > 0) {
    body.items = flattenBoxesToItems(payload.boxes);
  }

  if (typeof body.total_cost !== "undefined") body.total_cost = safeNumStr(body.total_cost, 2);
  if (typeof body.bill_charges !== "undefined") body.bill_charges = safeNumStr(body.bill_charges, 2);
  if (typeof body.vat_percentage !== "undefined") body.vat_percentage = safeNumStr(body.vat_percentage, 2);
  if (typeof body.vat_cost !== "undefined") body.vat_cost = safeNumStr(body.vat_cost, 2);
  if (typeof body.net_total !== "undefined") body.net_total = safeNumStr(body.net_total, 2);
  if (typeof body.total_weight !== "undefined") body.total_weight = safeWeightStr(body.total_weight);

  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  return body;
}

async function createCargo(payload = {}) {
  const body = buildRequestBody(payload);
  const endpoints = ["/cargo", "/cargos", "/public/api/cargo", "/public/api/cargos"];
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const { data } = await axiosInstance.post(ep, body, {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      });
      return data?.data ?? data ?? {};
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (status === 422) {
        throw buildErrorFromAxios(err);
      }
    }
  }
  if (lastErr) throw buildErrorFromAxios(lastErr);
  throw new Error("createCargo failed (no response)");
}

/**
 * getCargoById(id)
 * - GET /cargos/:id (tries a couple of likely endpoints)
 */
async function getCargoById(id) {
  if (!id) throw new Error("getCargoById requires id");
  const endpoints = [`/cargos/${id}`, `/cargo/${id}`, `/public/api/cargo/${id}`, `/public/api/cargos/${id}`];
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const { data } = await axiosInstance.get(ep, { timeout: 15000 });
      return data?.data ?? data ?? {};
    } catch (err) {
      lastErr = err;
      // try next
    }
  }
  if (lastErr) throw buildErrorFromAxios(lastErr);
  throw new Error("getCargoById failed (no response)");
}

/**
 * listCargos(params) - GET /cargos
 */
async function listCargos(params = {}) {
  try {
    const { data } = await axiosInstance.get("/cargos", { params, timeout: 20000 });
    return data?.data ?? data ?? {};
  } catch (err) {
    throw buildErrorFromAxios(err);
  }
}

/**
 * updateCargo(id, body) - PATCH /cargos/:id
 */
async function updateCargo(id, body = {}) {
  if (!id) throw new Error("updateCargo requires id");
  try {
    const { data } = await axiosInstance.patch(`/cargos/${id}`, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });
    return data?.data ?? data ?? {};
  } catch (err) {
    throw buildErrorFromAxios(err);
  }
}

/**
 * deleteCargo(id) - DELETE /cargos/:id
 */
async function deleteCargo(id) {
  if (!id) throw new Error("deleteCargo requires id");
  try {
    const { data } = await axiosInstance.delete(`/cargos/${id}`, { timeout: 15000 });
    return data?.data ?? data ?? {};
  } catch (err) {
    throw buildErrorFromAxios(err);
  }
}

/**
 * updateCargoStatus(payload) - PATCH /cargos/status
 */
async function updateCargoStatus(payload = {}) {
  try {
    const { data } = await axiosInstance.patch("/cargos/status", payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });
    return data?.data ?? data ?? {};
  } catch (err) {
    throw buildErrorFromAxios(err);
  }
}

function normalizeCargoToInvoice(raw) {
  const cargo = (raw && raw.cargo) ? raw.cargo : raw || {};

  const normalized = {
    id: cargo.id ?? cargo._id ?? cargo.cargo_id ?? null,
    booking_no:
      cargo.booking_no ??
      cargo.invoice_no ??
      cargo.bookingNo ??
      cargo.booking_number ??
      cargo.invoice_number ??
      "",
    track_code:
      cargo.track_code ??
      cargo.lrl_tracking_code ??
      cargo.tracking_code ??
      cargo.trackCode ??
      "",
    total_cost: cargo.total_cost ?? cargo.net_total ?? cargo.total ?? 0,
    bill_charges: cargo.bill_charges ?? cargo.bill ?? 0,
    vat_cost: cargo.vat_cost ?? cargo.tax ?? cargo.vat ?? 0,
    // Look at the root object first, then the nested `cargo` object.
    no_of_pieces: raw.no_of_pieces ?? cargo.no_of_pieces ?? cargo.charges?.no_of_pieces ?? (Array.isArray(cargo.boxes) ? cargo.boxes.length : 0),
    net_total: cargo.net_total ?? cargo.total_cost ?? cargo.total ?? 0,
    total_weight: cargo.total_weight ?? cargo.weight ?? cargo.gross_weight ?? 0,

    // payment / delivery / branch
    payment_method: cargo.payment_method ?? cargo.payment_method_id ?? cargo.paymentMethod ?? "",
    delivery_type: cargo.delivery_type ?? cargo.delivery_type_id ?? cargo.deliveryType ?? "",
    branch: cargo.branch ?? cargo.branch_name ?? cargo.branchLabel ?? "",

    // Sender (many common aliases)
    sender: cargo.sender ?? cargo.sender_name ?? cargo.shipper_name ?? cargo.shipper ?? null,
    sender_id: cargo.sender_id ?? cargo.senderId ?? cargo.shipper_id ?? cargo.shipperId ?? null,
    sender_party_id: cargo.sender_party_id ?? cargo.senderPartyId ?? null,
    sender_address: cargo.sender_address ?? cargo.shipper_address ?? cargo.senderAddress ?? cargo.shipperAddress ?? "",
    sender_phone: cargo.sender_phone ?? cargo.sender_mobile ?? cargo.shipper_phone ?? cargo.senderPhone ?? cargo.shipperPhone ?? "",
    sender_email: cargo.sender_email ?? cargo.senderEmail ?? cargo.shipper_email ?? "",

    // Receiver / Consignee (many aliases)
    receiver:
      cargo.receiver ??
      cargo.consignee_name ??
      cargo.receiver_name ??
      cargo.consignee ??
      cargo.consigneeName ??
      null,
    receiver_id: cargo.receiver_id ?? cargo.receiverId ?? cargo.consignee_id ?? cargo.consigneeId ?? null,
    receiver_party_id: cargo.receiver_party_id ?? cargo.receiverPartyId ?? null,
    receiver_address:
      cargo.receiver_address ??
      cargo.consignee_address ??
      cargo.receiverAddress ??
      cargo.consigneeAddress ??
      "",
    receiver_phone:
      cargo.receiver_phone ??
      cargo.consignee_phone ??
      cargo.receiver_mobile ??
      cargo.receiverPhone ??
      cargo.consigneePhone ??
      "",
    receiver_email:
      cargo.receiver_email ??
      cargo.consignee_email ??
      cargo.receiverEmail ??
      cargo.consigneeEmail ??
      "",
    receiver_pincode:
      cargo.receiver_pincode ??
      cargo.consignee_pincode ??
      cargo.receiver_pincode ??
      cargo.postal_code ??
      cargo.zip ??
      cargo.postalCode ??
      "",

    // keep raw original for debugging if needed
    _raw: cargo,
  };

  // convert boxes -> items (handles both object keyed boxes and array)
  const items = [];
  if (cargo.items && Array.isArray(cargo.items)) {
    // API already returned items array
    cargo.items.forEach(it => items.push(it));
  } else if (cargo.boxes && typeof cargo.boxes === "object") {
    Object.keys(cargo.boxes).forEach(boxNum => {
      const box = cargo.boxes[boxNum];
      const boxItems = (box && box.items) || [];
      boxItems.forEach(it => {
        // normalize field names used by InvoiceView
        items.push({
          description: it.name || it.description || "",
          qty: it.piece_no ?? it.pieces ?? it.qty ?? "",
          unit_price: it.unit_price ?? it.unitPrice ?? it.rate ?? "",
          total_price: it.total_price ?? it.amount ?? "",
          weight: it.weight ?? "",
          box_number: it.box_number ?? boxNum,
        });
      });
    });
  } else if (cargo.boxes && Array.isArray(cargo.boxes)) {
    cargo.boxes.forEach(box => {
      (box.items || []).forEach(it => items.push({
        description: it.name || it.description || "",
        qty: it.piece_no ?? it.pieces ?? it.qty ?? "",
        unit_price: it.unit_price ?? it.unitPrice ?? it.rate ?? "",
        total_price: it.total_price ?? it.amount ?? "",
        weight: it.weight ?? "",
        box_number: it.box_number ?? "",
      }));
    });
  }

  normalized.items = items;

  return normalized;
}

// --- Invoice helpers ---
function incrementInvoiceString(last = "") {
  // Handles: "INV-000123" -> "INV-000124", "2025/INV/99" -> "2025/INV/100", "99" -> "100"
  if (!last) return "INV-000001";
  const s = String(last).trim();

  // Try suffix-digits pattern
  const m = s.match(/^(.*?)(\d+)$/);
  if (m) {
    const [, prefix, digits] = m;
    const next = String(Number(digits) + 1).padStart(digits.length, "0");
    return `${prefix}${next}`;
  }

  // No trailing digits? start with a default suffix
  return `${s}-000001`;
}

/**
 * getNextInvoiceNo(branchId)
 * Uses GET /cargos?branch_id=... to read the most recent invoice/booking no,
 * then returns the incremented string.
 */
async function getNextInvoiceNo(branchId) {
  // ask backend for the newest one from this branch
  // (tolerant param names; your API may accept per_page/limit & sort/order)
  const params = {
    branch_id: branchId,
    per_page: 1,       // try per_page first
    limit: 1,          // some backends use 'limit'
    sort: "id",        // safest when we don't know the exact sort keys
    order: "desc",
  };

  const res = await listCargos(params); // wraps GET /cargos with params
  // Normalize a single most-recent row from common response shapes
  const row =
    (Array.isArray(res) && res[0]) ||
    (Array.isArray(res?.data) && res.data[0]) ||
    (Array.isArray(res?.items) && res.items[0]) ||
    res;

  const lastNo =
    row?.booking_no ??
    row?.invoice_no ??
    row?.bookingNo ??
    row?.invoice_number ??
    row?.invoiceNo ??
    "";

  return incrementInvoiceString(lastNo);
}

// bulk status update

const bulkUpdateCargoStatus = updateCargoStatus;

/* ---------- exports ---------- */
const defaultExport = {
  createCargo,
  getCargoById,
  listCargos,
  updateCargo,
  deleteCargo,
  updateCargoStatus,
  normalizeCargoToInvoice,
  bulkUpdateCargoStatus
};

export default defaultExport;

export {
  createCargo,
  getCargoById,
  listCargos,
  updateCargo,
  deleteCargo,
  updateCargoStatus,
  normalizeCargoToInvoice,
  bulkUpdateCargoStatus,
  getNextInvoiceNo,  
};
