
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

function guessDocType(file) {
  const t = (file?.type || "").toLowerCase();
  if (t.startsWith("image/")) return "Image";
  if (t === "application/pdf") return "PDF";
  if (t.includes("word")) return "Doc";
  if (t.includes("sheet") || t.includes("excel")) return "Sheet";
  return "Other";
}

export async function createShipmentMultipart(payload, documents = [], axiosOpts = {}) {
  try {
    const fd = new FormData();

    appendFormData(fd, payload);
    documents.forEach((entry, i) => {
      const file = entry?.file instanceof File ? entry.file : (entry instanceof File ? entry : null);
      if (!file) return;
      fd.append(`documents[${i}][file]`, file, file.name);
      const type =
        typeof entry?.type === "string" && entry.type.trim()
          ? entry.type.trim()
          : guessDocType(file);
      fd.append(`documents[${i}][type]`, type);
    });

    const res = await api.post("/shipment", fd, { ...axiosOpts });
    return res?.data ?? res;
  } catch (err) {
    throw normalizeError(err, "createShipment");
  }
}

export const FILE_SIZE_2MB = 2 * 1024 * 1024;
export function assertMaxFileSize(file, max = FILE_SIZE_2MB) {
  if (file && file.size > max) {
    const mb = (max / (1024 * 1024)).toFixed(1);
    throw new Error(`File "${file.name}" exceeds ${mb}MB limit`);
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

// PUT /shipment/{id}/status  (send { status_id } or { status } as your API expects)
export async function updateShipmentStatus(shipmentId, payload = {}, axiosOpts = {}) {
  if (!shipmentId) throw new Error("updateShipmentStatus: shipmentId is required");
  try {
    const res = await api.put(`/shipment/${shipmentId}/status`, payload, { ...axiosOpts });
    return res?.data ?? res;
  } catch (err) {
    throw normalizeError(err, "updateShipmentStatus");
  }
}
