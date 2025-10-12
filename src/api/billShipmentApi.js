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

// ---- UPDATE (single) – keep if you support editing a shipment
export const updateBillShipment = async (id, payload) => {
  const url = `/physical-shipment/${id}`;
  try {
    info("PATCH " + url, payload);
    const res = await api.patch(url, payload);
    ok("PATCH /physical-shipment/:id [OK]", { status: res.status });
    return res.data ?? res;
  } catch (e) {
    bad("PATCH /physical-shipment/:id [ERR]", {
      status: e?.response?.status,
      data: e?.response?.data,
      msg: e?.message,
    });
    throw e;
  }
};

// No bulk status update (per your instruction)
