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
  const { data } = await api.get("/parties", { params });
  const parties = data?.data ?? data ?? [];

  const want = Number(customerTypeId); // 1=sender, 2=receiver

  // normalize many possible shapes
  const typeIdOf = (p) => {
    const raw = p?.customer_type_id ?? p?.customerTypeId ?? p?.type_id ?? p?.typeId ?? p?.customer_type ?? p?.type ?? p?.role;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n;
      if (/sender/i.test(raw)) return 1;
      if (/receiver|consignee/i.test(raw)) return 2;
    }
    const obj = (p?.customer_type && typeof p.customer_type === "object" ? p.customer_type : null)
             || (p?.type && typeof p.type === "object" ? p.type : null);
    if (obj) {
      const n = Number(obj.id ?? obj.value ?? obj.code);
      if (!Number.isNaN(n)) return n;
      const nm = String(obj.name ?? obj.title ?? obj.label ?? "");
      if (/sender/i.test(nm)) return 1;
      if (/receiver|consignee/i.test(nm)) return 2;
    }
    return null;
  };

  return parties.filter((p) => typeIdOf(p) === want);
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
