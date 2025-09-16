
import api from "./axiosInstance";

/** Try to pull a numeric count out of various API shapes */
const toCount = (res) => {
  const d = res?.data ?? {};
  if (typeof d === "number") return d;
  if (typeof d?.count === "number") return d.count;
  if (typeof d?.data?.count === "number") return d.data.count;
  const firstNum = Object.values(d?.data ?? d).find((v) => typeof v === "number");
  return typeof firstNum === "number" ? firstNum : null;
};

const getCount = async (path, config = {}) => {
  const res = await api.get(path, config);
  return toCount(res);
};

// ---- SAFE GET (return null on 404 so UI won’t crash) ----
const safeGet = async (path, config) => {
  try {
    return await getCount(path, config);
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

/**
 * getCounters({ totalStaff, sender, receiver })
 * - Only hits endpoints you enable
 * - Silently returns 0 when an endpoint is missing (404)
 */
export const getCounters = async (
  { totalStaff = true, sender = true, receiver = true } = {},
  config = {}
) => {
  const tasks = [];

  if (totalStaff) {
    // If your backend has a different route, change here (e.g. "/staff/count")
    tasks.push(
      safeGet("/count-staff", config).then((v) => ["totalStaff", Number(v) || 0])
    );
  }
  if (sender) {
    tasks.push(
      safeGet("/parties/count/customer-type/1", config).then((v) => ["customerType1", Number(v) || 0])
    );
  }
  if (receiver) {
    tasks.push(
      safeGet("/parties/count/customer-type/2", config).then((v) => ["customerType2", Number(v) || 0])
    );
  }

  const entries = await Promise.all(tasks);
  return Object.fromEntries(entries);
};

export default { getCounters };