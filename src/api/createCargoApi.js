// src/api/createCargoApi.js
import axiosInstance from "./axiosInstance";

/** Surface backend validation clearly */
function parseAxiosError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const msg =
    data?.message ||
    data?.error ||
    err?.message ||
    `Request failed${status ? ` (${status})` : ""}`;

  const errors = data?.errors && typeof data.errors === "object" ? data.errors : null;
  let details = "";
  if (errors) {
    const flat = Object.entries(errors).map(
      ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`
    );
    details = ` — ${flat.join(" | ")}`;
  }
  const e = new Error(msg + details);
  e.status = status;
  e.details = data;
  throw e;
}

/** POST /cargo – create a cargo */
export async function createCargo(payload) {
  try {
    const { data } = await axiosInstance.post("/cargo", payload, { timeout: 15000 });
    // API returns { success: true, cargo: {...} }
    if (data?.success && data?.cargo) {
      return { data: data.cargo }; // normalize shape for downstream use
    }
    return data?.data ?? data ?? {};
  } catch (err) {
    parseAxiosError(err);
  }
}

/** Optional: GET /cargos – list helper */
export async function getCargos(params = {}) {
  try {
    const { data } = await axiosInstance.get("/cargos", { params, timeout: 15000 });
    return data?.data ?? data ?? [];
  } catch (err) {
    parseAxiosError(err);
  }
}

/** Normalize {success, cargo} to a consistent invoice-friendly object */
export function normalizeCargoToInvoice(raw) {
  const src = raw?.data ?? raw?.cargo ?? raw ?? {};
  const num = (v, d = 0) => (v === null || v === undefined || v === "" ? d : Number(v));

  const items = Array.isArray(src.items)
    ? src.items.map((it, i) => ({
        slno: it.slno ?? String(i + 1),
        description: it.description ?? it.name ?? "",
        name: it.name ?? it.description ?? "",
        qty: num(it.qty ?? it.quantity ?? it.piece_no ?? it.pieces, 0),
        unit_price: num(it.unit_price ?? it.unitPrice ?? it.price, 0),
        total_price: num(it.total_price ?? it.amount ?? it.total, 0),
        weight: it.weight ?? "",
      }))
    : [];

  const shipment = {
    id: src.id,
    invoice_no: src.booking_no,
    booking_no: src.booking_no,
    track_code: src.lrl_tracking_code ?? src.tracking_code ?? src.track_code ?? "",
    awb_number: src.booking_no ?? "",
    method: src.shipping_method ?? src.method ?? src.shipment_method ?? "",
    status: src.status?.name ?? src.status ?? "",
    branch: src.branch_name ?? "",
    date: src.date ?? "",
    time: src.time ?? "",
    sender_id: src.sender_id ?? null,
    receiver_id: src.receiver_id ?? null,
    sender: src.sender ?? src.sender_name ?? src.shipper_name ?? "",
    receiver: src.receiver ?? src.receiver_name ?? src.consignee_name ?? "",
    payment_method: src.payment_method ?? "",
    delivery_type: src.delivery_type ?? "",
    remarks: src.special_remarks ?? src.remarks ?? "",
    items,
    subtotal: num(src.total_cost),
    bill_charges: num(src.bill_charges),
    tax_percentage: num(src.vat_percentage),
    tax: num(src.vat_cost),
    total_weight: src.total_weight ?? "",
    grand_total: num(src.net_total),
  };

  if (shipment.date || shipment.time) {
    const t = shipment.time || "00:00:00";
    shipment.created_at = `${shipment.date}T${t}`;
  }
  return shipment;
}
