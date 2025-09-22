import api from "./axiosInstance";

const unwrap = (res) => res?.data ?? res;

/* -------------------- Countries -------------------- */
export const createCountry = async (payload) => {
  const res = await api.post("/country", payload);
  return unwrap(res);
};

export const getCountries = async (params = {}) => {
  const res = await api.get("/countries", { params });
  return unwrap(res);
};

export const getActiveCountries = async (params = {}) => {
  const res = await api.get("/active-countries", { params });
  return unwrap(res);
};

export const getInactiveCountries = async (params = {}) => {
  const res = await api.get("/inactive-countries", { params });
  return unwrap(res);
};

/* -------------------- States -------------------- */
export const createState = async (payload) => {
  const res = await api.post("/state", payload);
  return unwrap(res);
};

export const getStates = async (params = {}) => {
  const res = await api.get("/states", { params });
  return unwrap(res);
};

export const getActiveStates = async (params = {}) => {
  const res = await api.get("/active-states", { params });
  return unwrap(res);
};

export const getInactiveStates = async (params = {}) => {
  const res = await api.get("/inactive-states", { params });
  return unwrap(res);
};

export const getStatesByCountry = async (countryId, extra = {}) =>
  getStates({ country_id: Number(countryId), ...extra });

export const getActiveStatesByCountry = async (countryId, extra = {}) =>
  getActiveStates({ country_id: Number(countryId), ...extra });

/* -------------------- Districts -------------------- */
export const createDistrict = async (payload) => {
  const res = await api.post("/district", payload);
  return unwrap(res);
};

export const getDistricts = async (params = {}) => {
  const res = await api.get("/districts", { params });
  return unwrap(res);
};

export const getActiveDistricts = async (params = {}) => {
  const res = await api.get("/active-districts", { params });
  return unwrap(res);
};

export const getInactiveDistricts = async (params = {}) => {
  const res = await api.get("/inactive-districts", { params });
  return unwrap(res);
};

export const getDistrictsByState = async (stateId, extra = {}) =>
  getDistricts({ state_id: Number(stateId), ...extra });

export const getActiveDistrictsByState = async (stateId, extra = {}) =>
  getActiveDistricts({ state_id: Number(stateId), ...extra });

export default {
  // countries
  createCountry,
  getCountries,
  getActiveCountries,
  getInactiveCountries,
  // states
  createState,
  getStates,
  getActiveStates,
  getInactiveStates,
  getStatesByCountry,
  getActiveStatesByCountry,
  // districts
  createDistrict,
  getDistricts,
  getActiveDistricts,
  getInactiveDistricts,
  getDistrictsByState,
  getActiveDistrictsByState,
};
