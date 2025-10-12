// src/api/billApi.js
import api from "./axiosInstance";

/**
 * POST /custom-shipment
 * Create a single custom shipment.
 * @param {Object} data - Payload for the shipment (bill_no, pcs, weight, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const createCustomShipment = (data) => {
  return api.post("/physical-bill", data);
};

/**
 * GET /custom-shipments
 * Fetch a list of custom shipments.
 * @param {Object} [params] - Optional query params (page, limit, search, status, date_from, date_to, etc.)
 * @param {boolean} [isShipment] - If true, fetch shipments that are added to the shipment (is_shipment=1); otherwise, fetch those not added (is_shipment=0)
 * @returns {Promise<AxiosResponse>}
 */
export const getPhysicalBills = async (params = {}, isShipment = null) => {
  if (isShipment !== null) params.is_shipment = isShipment ? 1 : 0;
  const { data } = await api.get("/physical-bills", { params });
  // Return RAW rows so the consumer (CreateShipmentBill) can use fields like
  // booking_no, sender_name, receiver_name, total_weight, is_shipment, etc.
  const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  return list;
};

/**
 * GET /custom-shipment/:id
 * Fetch a single custom shipment by ID.
 * @param {string|number} id - Shipment ID
 * @returns {Promise<AxiosResponse>}
 */
export const getCustomShipmentById = (id) => {
  if (id == null) throw new Error("getCustomShipmentById: 'id' is required");
  return api.get(`/physical-bill/${id}`);
};

/**
 * POST /custom-shipments/import
 * Import shipments from an Excel file.
 * Expects a File/Blob; backend should read the uploaded file from the "file" field.
 * @param {File|Blob} file - The Excel file (e.g., .xlsx)
 * @param {Object} [extraFields] - Any additional form fields your backend expects
 * @returns {Promise<AxiosResponse>}
 */
export const importCustomShipments = (file, extraFields = {}) => {
  if (!file) throw new Error("importCustomShipments: 'file' is required");
  const formData = new FormData();
  formData.append("file", file);
  // Append extra fields if provided (e.g., overwrite=true)
  Object.entries(extraFields).forEach(([k, v]) => formData.append(k, v));
  return api.post("/physical-bills/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export default {
  createCustomShipment,
  getPhysicalBills,
  getCustomShipmentById,
  importCustomShipments,
};
