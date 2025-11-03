// api/billShipmentApi.js
import api from "./axiosInstance";

// ---- tiny logger helpers
const info = (t, x) => console.log(`%c${t}`, "color:#2563eb;font-weight:700", x);
const ok  = (t, x) => console.log(`%c${t}`, "color:#16a34a;font-weight:700", x ?? "");
const bad = (t, x) => console.error(`%c${t}`, "color:#dc2626;font-weight:700", x ?? "");

// ---- CREATE (POST /physical-shipment)
export const createBillShipment = async (payload) => {
  const url = "/physical-shipment";
  info("POST " + url + " =>", payload);
  try {
    const r = await api.post(url, payload);
    ok("POST /physical-shipment [OK]", { status: r.status });
    return r.data ?? r;
  } catch (e) {
    bad("POST /physical-shipment [ERR]", {
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });
    throw e;
  }
};

// ---- LIST (GET /physical-shipments)  <-- NOTE: plural
export const getBillShipments = async (params = {}) => {
  const url = "/physical-shipments";
  try {
    info("GET " + url + " params =>", params);
    const res = await api.get(url, { params });
    ok("GET /physical-shipments [OK]", { status: res.status });
    return res.data ?? res;
  } catch (e) {
    bad("GET /physical-shipments [ERR]", {
      baseURL: api.defaults.baseURL,
      url,
      status: e?.response?.status,
      data: e?.response?.data,
      msg: e?.message,
    });
    throw e;
  }
};


// Bulk/single in one helper
export const updateBillShipmentStatuses = async (shipmentIds, shipmentStatusId) => {
  const url = "/physical-shipment/update-status";
  const payload = {
    shipment_ids: shipmentIds.map(Number),
    shipment_status_id: Number(shipmentStatusId),
  };
  info("POST " + url + " =>", payload);
  try {
    const res = await api.post(url, payload);
    ok("POST /physical-shipment/update-status [OK]", { status: res.status });
    return res.data ?? res;
  } catch (e) {
    bad("POST /physical-shipment/update-status [ERR]", {
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });
    throw e;
  }
};

export const getBillShipmentById = async (shipmentId) => {
  const url = `/physical-shipment/${shipmentId}`;
  info("GET " + url);
  try {
    const res = await api.get(url);
    ok(`GET ${url} [OK]`, { status: res.status });
    return res.data ?? res;
  } catch (e) {
    bad(`GET ${url} [ERR]`, {
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });
    throw e;
  }
};
// ---- UPDATE (PUT /physical-shipment/:id)
export const updateBillShipment = async (shipmentId, payload) => {
  const url = `/physical-shipment/${shipmentId}`;
  console.log("%cPUT " + url + " =>", "color:#2563eb;font-weight:700", payload);

  try {
    const res = await api.put(url, payload);
    console.log("%cPUT /physical-shipment [OK]", "color:#16a34a;font-weight:700", { status: res.status });
    return res.data ?? res;
  } catch (e) {
    console.error("%cPUT /physical-shipment [ERR]", "color:#dc2626;font-weight:700", {
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });
    throw e;
  }
};

// ---- DELETE (POST /physical-shipments/bulk-delete)
export const deleteBillShipments = async (shipmentIds) => {
  const url = "/physical-shipments/bulk-delete";
  const payload = {
    shipment_ids: Array.isArray(shipmentIds)
      ? shipmentIds.map(Number)
      : [Number(shipmentIds)],
  };

  info("DELETE " + url + " =>", payload);
  try {
    // Some APIs accept body with DELETE — if yours doesn’t, use query param fallback.
    const res = await api.delete(url, { data: payload });
    ok("DELETE /physical-shipments/bulk-delete [OK]", { status: res.status });
    return res.data ?? res;
  } catch (e) {
    bad("DELETE /physical-shipments/bulk-delete [ERR]", {
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });
    throw e;
  }
};

// Convenience single-update wrapper
export const updateSingleBillShipmentStatus = (shipmentId, shipmentStatusId) =>
  updateBillShipmentStatuses([shipmentId], shipmentStatusId);
