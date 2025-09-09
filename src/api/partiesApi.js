import api from "./axiosInstance";

const unwrap = (res) => res?.data ?? res;

  export const createParty = async (payload) => {
      const isFD = typeof FormData !== "undefined" && payload instanceof FormData;
      const res = await api.post("/party", payload, {
      transformRequest: isFD ? [(d) => d] : undefined, 
      });
    return unwrap(res);
  };

export const getParties = async (params = {}) => {
  const res = await api.get("/parties", { params });
  return unwrap(res);
};

export const getPartyById = async (partyId) => {
  if (partyId == null) throw new Error("partyId is required");
  const res = await api.get(`/party/${partyId}`);
  return unwrap(res);
};

export const getPartiesByCustomerType = async (customerTypeId, params = {}) => {
  if (customerTypeId == null) throw new Error("customerTypeId is required");
  const res = await api.get(`/parties/customer-type/${customerTypeId}`, { params });
  return unwrap(res);
};

export default {
  createParty,
  getParties,
  getPartyById,
  getPartiesByCustomerType,
};
