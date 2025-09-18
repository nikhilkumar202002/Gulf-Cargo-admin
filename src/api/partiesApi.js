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

// Fixing the API call to filter parties by customer type correctly
export const getPartiesByCustomerType = async (customerTypeId, params = {}) => {
  if (customerTypeId == null) throw new Error("customerTypeId is required");

  // Fetch all parties
  const res = await api.get("/parties", { params });
  const parties = unwrap(res);

  // Filter the parties by customerTypeId (1 for sender, 2 for receiver)
  return parties.filter((party) => party.customer_type_id === customerTypeId);
};

export const getPartyById = async (partyId) => {
  if (partyId == null) throw new Error("partyId is required");
  const res = await api.get(`/party/${partyId}`);
  return unwrap(res);
};

export default {
  createParty,
  getParties,
  getPartyById,
  getPartiesByCustomerType,
};
