// src/api/createCargoApi.js
import axiosInstance from "./axiosInstance";

/** Surface backend validation clearly */
function parseAxiosError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const serverMsg = data?.message || data?.error;
  const fieldErrors = data?.errors && typeof data.errors === "object" ? data.errors : null;

  let msg = serverMsg || err?.message || `Request failed${status ? ` (${status})` : ""}`;
  if (fieldErrors) {
    const flat = Object.entries(fieldErrors).map(
      ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`
    );
    msg += ` — ${flat.join(" | ")}`;
  }
  const e = new Error(msg);
  e.status = status;
  e.details = data;
  throw e;
}

const qs = (obj = {}) =>
  new URLSearchParams(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
  ).toString();


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
    const query = qs({
      // support both snake_case and camelCase
      from_date: params.from_date ?? params.fromDate,
      to_date: params.to_date ?? params.toDate,
      page: params.page,
      per_page: params.per_page ?? params.perPage ?? params.limit,
      status_id: params.status_id ?? params.statusId,
      search: params.search,
    });
    const url = `/cargos${query ? `?${query}` : ""}`;

    const { data } = await axiosInstance.get(url, { timeout: 20000 });
    // API may return { data: [...], meta: {...} } or plain array
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

/* ---------- you probably already have this ---------- */
export async function getCargoById(id) {
  try {
    const { data } = await axiosInstance.get(`/cargo/${id}`, { timeout: 15000 });
    return data?.cargo ?? data?.data ?? data ?? {};
  } catch (err) {
    parseAxiosError(err);
  }
}

/* ---------- PATCH /cargo/:id with smart fallback ---------- */
export async function updateCargo(id, payload, { retryWithoutItems = true } = {}) {
  // Drop only undefined (keep null/0/"")
  const compact = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));

  // helpful logs when debugging 422
  // eslint-disable-next-line no-console
  console.debug("PATCH /cargo/%s payload:", id, compact);

  try {
    const { data } = await axiosInstance.patch(`/cargo/${id}`, compact, { timeout: 20000 });
    return data?.cargo ?? data?.data ?? data ?? {};
  } catch (err) {
    const status = err?.response?.status;

    // If the API rejects 'items' on this endpoint, try once without items.
    if (
      status === 422 &&
      retryWithoutItems &&
      "items" in compact &&
      Array.isArray(compact.items)
    ) {
      // eslint-disable-next-line no-console
      console.warn("422 on PATCH /cargo/%s — retrying without 'items'…", id, err?.response?.data);
      const { items, ...rest } = compact;
      try {
        const { data } = await axiosInstance.patch(`/cargo/${id}`, rest, { timeout: 20000 });
        return data?.cargo ?? data?.data ?? data ?? {};
      } catch (err2) {
        parseAxiosError(err2);
      }
    }

    // surface server validation (field) errors
    parseAxiosError(err);
  }
}

export async function bulkUpdateCargoStatus({ status_id, cargo_ids }) {
  try {
    const payload = {
      status_id: Number(status_id),
      cargo_ids: Array.isArray(cargo_ids) ? cargo_ids.map((x) => Number(x)) : [],
    };
    const { data } = await axiosInstance.post(`/cargos/status`, payload, { timeout: 20000 });
    return data?.data ?? data ?? {};
  } catch (err) {
    parseAxiosError(err);
  }
}