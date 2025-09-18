
import api from "./axiosInstance";

function normalizeError(err, label) {
  const status = err?.response?.status ?? null;
  const server = err?.response?.data;
  const message = server?.message || server?.error || err?.message || "Request failed";
  const e = new Error(`${label}${status ? ` ${status}` : ""}: ${message}`);
  e.status = status;
  e.server = server;
  e.errors = server?.errors || server?.data?.errors || null;
  return e;
}

export function appendFormData(fd, data, parentKey = "") {
  if (data === undefined || data === null) return;
  if (data instanceof File) {
    fd.append(parentKey, data, data.name);
    return;
  }
  if (Array.isArray(data)) {
    data.forEach((v, i) => appendFormData(fd, v, parentKey ? `${parentKey}[${i}]` : String(i)));
    return;
  }
  if (typeof data === "object") {
    Object.entries(data).forEach(([k, v]) =>
      appendFormData(fd, v, parentKey ? `${parentKey}[${k}]` : k)
    );
    return;
  }
  fd.append(parentKey, data);
}

export const FILE_SIZE_2MB = 2 * 1024 * 1024;
export const assertMaxFileSize = (file, max = FILE_SIZE_2MB) => {
  if (file && file.size > max) {
    const mb = Math.ceil(file.size / 1024 / 1024);
    const maxMb = Math.ceil(max / 1024 / 1024);
    throw new Error(`"${file.name}" is ${mb}MB; max allowed ${maxMb}MB.`);
  }
};

function normErr(err, label) {
  const status = err?.response?.status ?? null;
  const data = err?.response?.data;
  const msg = data?.message || err?.message || "Request failed";
  const e = new Error(`${label}${status ? ` ${status}` : ""}: ${msg}`);
  e.status = status;
  e.server = data;
  e.errors = data?.errors || null;
  return e;
}

const put = (fd, k, v) => {
  if (v === undefined || v === null || v === "") return; // keep 0
  fd.append(k, String(v));
};

export async function createShipmentMultipart(payload, documents = [], axiosOpts = {}) {
  try {
    const fd = new FormData();

    // ---- flat fields the backend validates ----
    put(fd, "awb_number", payload.awb_number);
    put(fd, "shipment_method_id", payload.shipment_method_id);
    put(fd, "shipment_status_id", payload.shipment_status_id);
    put(fd, "origin_port_id", payload.origin_port_id);
    put(fd, "destination_port_id", payload.destination_port_id);
    put(fd, "clearing_agent_id", payload.clearing_agent_id);
    put(fd, "created_date", payload.created_date);
    put(fd, "sender_id", payload.sender_id);
    put(fd, "receiver_id", payload.receiver_id);
    put(fd, "internal_remarks", payload.internal_remarks);
    put(fd, "notes", payload.notes);

    // ---- REQUIRED totals (must be present) ----
    put(fd, "tax_percentage", payload.tax_percentage);
    put(fd, "subtotal", payload.subtotal);
    put(fd, "tax", payload.tax);
    put(fd, "total_weight", payload.total_weight);
    put(fd, "total_pieces", payload.total_pieces);
    put(fd, "total_amount", payload.total_amount);

    // ---- items[] ----
    (payload.items || []).forEach((it, i) => {
      put(fd, `items[${i}][description]`, it.description);
      put(fd, `items[${i}][hsn_code]`, it.hsn_code);
      put(fd, `items[${i}][no_of_pieces]`, it.no_of_pieces);
      put(fd, `items[${i}][box_number]`, it.box_number);
      put(fd, `items[${i}][weight]`, it.weight);
      put(fd, `items[${i}][unit_price]`, it.unit_price);
      put(fd, `items[${i}][invoice_value]`, it.invoice_value);
    });

    // ---- documents[] ----
  (documents || []).forEach((d, i) => {
  const f =
    d?.file instanceof File
      ? d.file
      : d instanceof File
      ? d
      : null;

  if (!f) return;

  // what the server expects
  fd.append(`documents[${i}][file]`, f, f.name);

  // optional extras if you have them
  if (d?.type)  fd.append(`documents[${i}][type]`, String(d.type));
  if (d?.label) fd.append(`documents[${i}][label]`, String(d.label));
});

    const res = await api.post("/shipment", fd, {
      headers: { Accept: "application/json" }, // don't set Content-Type
      ...axiosOpts,
    });
    return res?.data ?? res;
  } catch (err) {
    throw normErr(err, "createShipment");
  }
}



// GET /shipment/track/{trackingCode}
export async function trackShipment(trackingCode, axiosOpts = {}) {
  if (!trackingCode) throw new Error("trackShipment: trackingCode is required");
  try {
    const res = await api.get(`/shipment/track/${encodeURIComponent(trackingCode)}`, { ...axiosOpts });
    return res?.data ?? res;
  } catch (err) {
    throw normalizeError(err, "trackShipment");
  }
}

export async function listShipments({
  page = 1,
  perPage = 10,
  query = "",
  status = "all",
  from = "",
  to = "",
  axiosOpts = {},
} = {}) {
  try {
    const params = {};

    if (page) params.page = page;
    if (perPage) { params.per_page = perPage; params.perPage = perPage; }

    const q = (query || "").trim();
    if (q) { params.query = q; params.search = q; params.q = q; }

    if (status && status !== "all") {
      params.status = status;
      params.status_name = status;
    }

    if (from) {
      params.from = from;
      params.from_date = from;
      params.start_date = from;
      params.date_from = from;
    }
    if (to) {
      params.to = to;
      params.to_date = to;
      params.end_date = to;
      params.date_to = to;
    }

    const res = await api.get("/shipments", { params, ...axiosOpts });
    const d = res?.data ?? res;

    const list = Array.isArray(d?.shipments)
      ? d.shipments
      : Array.isArray(d)
      ? d
      : Array.isArray(d?.data)
      ? d.data
      : [];

    const meta = d?.meta || null;
    return { list, meta };
  } catch (err) {
    throw normalizeError(err, "listShipments");
  }
}


export async function getShipment(id, axiosOpts = {}) {
  if (!id) throw new Error("getShipment: id is required");
  try {
    const res = await api.get(`/shipments/${id}`, { ...axiosOpts });
    const d = res?.data ?? res;
    return d?.shipment || d?.data || d || null;
  } catch (err) {
    throw normalizeError(err, "getShipment");
  }
}

/* --- update status: try POST; fall back to PUT if server says 405/404 --- */
export async function updateShipmentStatus(shipmentId, status, axiosOpts = {}) {
  if (!shipmentId) throw new Error("updateShipmentStatus: shipmentId is required");
  if (!status) throw new Error("updateShipmentStatus: status is required");
  try {
    const res = await api.post(`/shipment/${shipmentId}/status`, { status }, { ...axiosOpts });
    return res?.data ?? res;
  } catch (err) {
    const code = err?.response?.status;
    if (code === 405 || code === 404) {
      const res2 = await api.put(`/shipment/${shipmentId}/status`, { status }, { ...axiosOpts });
      return res2?.data ?? res2;
    }
    throw normalizeError(err, "updateShipmentStatus");
  }
}