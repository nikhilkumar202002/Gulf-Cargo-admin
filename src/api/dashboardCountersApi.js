// src/api/dashboardCountersApi.js
import api from "./axiosInstance";

/** pull a numeric count from various response shapes */
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

const safeGet = async (path, config) => {
  try {
    return await getCount(path, config);
  } catch (err) {
    if (err?.response?.status === 404) return null; // ignore missing route
    throw err;
  }
};

// ----- NEW: derive totalStaff if /count-staff is missing -----
async function fetchTotalStaff(config) {
  // 1) try a direct total
  const direct = await safeGet("/count-staff", config);
  if (typeof direct === "number") return direct;

  // 2) fallback: sum active + inactive (if backend exposes them)
  const [active, inactive] = await Promise.all([
    safeGet("/count-active-staff", config),
    safeGet("/count-inactive-staff", config),
  ]);
  const a = Number(active) || 0;
  const b = Number(inactive) || 0;
  if (a || b) return a + b;

  // 3) nothing available
  return 0;
}

/**
 * getCounters({ totalStaff, sender, receiver })
 * Only hits what you request. Missing routes resolve to 0.
 */
export const getCounters = async (
  { totalStaff = true, sender = true, receiver = true } = {},
  config = {}
) => {
  const tasks = [];

  if (totalStaff) {
    tasks.push(fetchTotalStaff(config).then((v) => ["totalStaff", v]));
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
