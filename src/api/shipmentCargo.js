// src/api/shipmentCargo.js
import axiosInstance from "./axiosInstance";

/**
 * Cargo Shipment API
 *
 * Endpoints:
 *  - POST   /cargo-shipment                     (create a shipment)
 *  - GET    /cargo-shipments                    (list)
 *  - GET    /cargo-shipments?shipment_status_id=2
 *  - GET    /cargo-shipments?branch_id=1
 *  - GET    /cargo-shipments?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
 *  - GET    /cargo-shipment/:id                 (single view)
 */

/* ---------- shared error helper ---------- */
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
  e.details = data;       // <-- important: details contains already_used_ids
  throw e;
}

/* ---------- tiny querystring helper ---------- */
const qs = (obj = {}) =>
  new URLSearchParams(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
  ).toString();

/* ============================================================================================
 * GET /cargo-shipments  (server-side filtering supported)
 * ========================================================================================== */
export async function listCargoShipments(params = {}) {
  try {
    const { data } = await axiosInstance.get("/cargo-shipments", { params });
    return data;
  } catch (err) {
    throw parseAxiosError(err);
  }
}

/* ============================================================================================
 * GET /cargo-shipment/:id
 * ========================================================================================== */
export async function getCargoShipment(id) {
  try {
    const { data } = await axiosInstance.get(`/cargo-shipment/${id}`);
    return data;
  } catch (err) {
    throw parseAxiosError(err);
  }
}

/* ============================================================================================
 * POST /cargo-shipment  (create)
 * Body can be passed in either backend field names or UI field names; we normalize here.
 * Returns: created shipment object (shape depends on backend)
 * ========================================================================================== */
export async function createCargoShipment(raw) {
  const payload = {
    // required
    origin_port_id:
      raw?.origin_port_id ?? raw?.portOfOrigin ?? raw?.port_origin_id ?? null,
    destination_port_id:
      raw?.destination_port_id ?? raw?.portOfDestination ?? raw?.port_destination_id ?? null,
    awb_or_container_number:
      raw?.awb_or_container_number ?? raw?.awbNo ?? raw?.awb_no ?? "",
    created_on:
      raw?.created_on ?? raw?.shipment_date ?? raw?.date ?? raw?.createdOn ?? "",
    branch_id: Number(raw?.branch_id),
    created_by_id: Number(raw?.created_by_id),

    // required in your flow
    shipment_status_id:
      raw?.shipment_status_id != null ? Number(raw.shipment_status_id) : undefined,
    cargo_ids: Array.isArray(raw?.cargo_ids) ? raw.cargo_ids.map(Number) : [],

    // optional
    shipment_number: raw?.shipment_number || undefined,
    license_details: raw?.license_details || undefined,
    exchange_rate:
      raw?.exchange_rate != null && raw.exchange_rate !== ""
        ? Number(raw.exchange_rate)
        : undefined,
    shipping_method_id: raw?.shipping_method_id || raw?.shippingMethod || undefined,
    clearing_agent_id: raw?.clearing_agent_id || raw?.clearingAgent || undefined,
    remarks: raw?.remarks || raw?.shipmentDetails || undefined,
  };

  if (payload.origin_port_id != null) payload.origin_port_id = Number(payload.origin_port_id);
  if (payload.destination_port_id != null) payload.destination_port_id = Number(payload.destination_port_id);

  // eslint-disable-next-line no-console
  console.info("[createCargoShipment] POST /cargo-shipment", payload);

  try {
    const { data } = await axiosInstance.post("/cargo-shipment", payload);
    return data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[createCargoShipment] failed:", err?.response?.data || err);
    throw parseAxiosError(err);
  }
}

/* ============================================================================================
 * PATCH /cargo-shipment/:id/mark-in
 * Marks a cargo as "in shipment" (optimistic UI can hide it from free list)
 * ========================================================================================== */
export async function markCargoInShipment(cargoId, body = {}) {
  const id = Number(cargoId);
  if (!id) throw new Error("markCargoInShipment: invalid cargo id");
  try {
    const { data } = await axiosInstance.patch(`/cargo-shipment/${id}/mark-in`, body);
    return data;
  } catch (err) {
    throw parseAxiosError(err);
  }
}

/* ============================================================================================
 * PATCH /cargo-shipment/:id/mark-not
 * Reverts a cargo back to "not in shipment"
 * ========================================================================================== */
export async function markCargoNotInShipment(cargoId, body = {}) {
  const id = Number(cargoId);
  if (!id) throw new Error("markCargoNotInShipment: invalid cargo id");
  try {
    const { data } = await axiosInstance.patch(`/cargo-shipment/${id}/mark-not`, body);
    return data;
  } catch (err) {
    throw parseAxiosError(err);
  }
}
