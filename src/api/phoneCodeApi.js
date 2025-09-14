import axiosInstance from "./axiosInstance";

const LIST_ENDPOINT = "/phone-codes";
const ONE_ENDPOINT  = "/phone-code";

// robust extractor for many common API shapes
const extractArray = (res) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.data?.phone_codes)) return d.data.phone_codes;
  if (Array.isArray(d?.phone_codes)) return d.phone_codes;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

export const getPhoneCodes = async (params = {}, token, axiosOpts = {}) => {
  const cfg = { ...axiosOpts, params };
  if (token) {
    cfg.headers = { ...(axiosOpts.headers || {}), Authorization: `Bearer ${token}` };
  }
  const res = await axiosInstance.get(LIST_ENDPOINT, cfg);
  return extractArray(res); 
};

export const getPhoneCode = async (params, token, axiosOpts = {}) => {
  const cfg = { ...axiosOpts, params };
  if (token) {
    cfg.headers = { ...(axiosOpts.headers || {}), Authorization: `Bearer ${token}` };
  }
  const res = await axiosInstance.get(ONE_ENDPOINT, cfg);
  return (res?.data ?? res);
};
