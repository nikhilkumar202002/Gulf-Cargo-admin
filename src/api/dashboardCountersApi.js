
import api from "./axiosInstance";

/** Try to pull a numeric count out of various API shapes */
const toCount = (res) => {
  const d = res?.data ?? {};
  if (typeof d === "number") return d;
  if (typeof d?.count === "number") return d.count;
  if (typeof d?.data?.count === "number") return d.data.count;

  // Fallback: scan first numeric value on the object
  const values = Object.values(d?.data ?? d);
  const firstNum = values.find((v) => typeof v === "number");
  if (typeof firstNum === "number") return firstNum;

  throw new Error("Unexpected counter response shape");
};

const formatErr = (err) => {
  const e = new Error(
    err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed"
  );
  e.status = err?.response?.status;
  e.details = err?.response?.data;
  return e;
};

/** Generic GET returning a number from a /count-* endpoint */
const getCount = async (path, config = {}) => {
  try {
    const res = await api.get(path, config);
    return toCount(res);
  } catch (err) {
    throw formatErr(err);
  }
};

// --- Staff counters ---
export const getActiveStaffCount = (config) =>
  getCount("/count-active-staff", config);

export const getInactiveStaffCount = (config) =>
  getCount("/count-inactive-staff", config);

export const getSuperAdminStaffCount = (config) =>
  getCount("/count-super-admin-staff", config);

export const getAgencyStaffCount = (config) =>
  getCount("/count-agency-staff", config);

export const getStaffCount = (config) => getCount("/count-staff", config);

// --- Parties by customer type (1, 2, ...) ---
export const getCustomerTypeCount = (type, config) =>
  getCount(`/parties/count/customer-type/${type}`, config);

// Convenience aliases if you specifically use 1 & 2:
export const getCustomerType1Count = (config) =>
  getCustomerTypeCount(1, config);
export const getCustomerType2Count = (config) =>
  getCustomerTypeCount(2, config);

// --- Fetch everything needed for dashboard in parallel ---
export const getAllDashboardCounters = async (config = {}) => {
  const [
    activeStaff,
    inactiveStaff,
    superAdminStaff,
    agencyStaff,
    totalStaff,
    custType1,
    custType2,
  ] = await Promise.all([
    getActiveStaffCount(config),
    getInactiveStaffCount(config),
    getSuperAdminStaffCount(config),
    getAgencyStaffCount(config),
    getStaffCount(config),
    getCustomerType1Count(config),
    getCustomerType2Count(config),
  ]);

  return {
    activeStaff,
    inactiveStaff,
    superAdminStaff,
    agencyStaff,
    totalStaff,
    customerType1: custType1,
    customerType2: custType2,
  };
};

export default {
  getActiveStaffCount,
  getInactiveStaffCount,
  getSuperAdminStaffCount,
  getAgencyStaffCount,
  getStaffCount,
  getCustomerTypeCount,
  getCustomerType1Count,
  getCustomerType2Count,
  getAllDashboardCounters,
};
