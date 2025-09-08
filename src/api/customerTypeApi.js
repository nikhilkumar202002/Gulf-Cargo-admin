import api from "./axiosInstance";

const unwrap = (res) => res?.data ?? res;

export const createCustomerType = async (payload) => {
  const res = await api.post("/customer-type", payload);
  return unwrap(res);
};

export const getCustomerTypes = async (params = {}) => {
  const res = await api.get("/customer-types", { params });
  return unwrap(res);
};

export const getActiveCustomerTypes = async (params = {}) => {
  const res = await api.get("/active-customer-types", { params });
  return unwrap(res);
};

export const getInactiveCustomerTypes = async (params = {}) => {
  const res = await api.get("/inactive-customer-types", { params });
  return unwrap(res);
};

export default {
  createCustomerType,
  getCustomerTypes,
  getActiveCustomerTypes,
  getInactiveCustomerTypes,
};