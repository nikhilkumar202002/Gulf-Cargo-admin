// api/branchApi.js
import api from "./axiosInstance";

/* ---------------- helpers ---------------- */
const unwrap = (res) => res?.data ?? res;

// Pull an array out of common API shapes: {data:[...]}, {data:{data:[...]}}, {branches:[...]}, [...]
const normalizeArray = (o) => {
  if (!o) return [];
  if (Array.isArray(o)) return o;

  const d = o.data ?? o.branches ?? o.items ?? null;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;        // Laravel paginator
  if (Array.isArray(o?.data?.data)) return o.data.data;

  const firstArr = Object.values(o).find(Array.isArray);
  return Array.isArray(firstArr) ? firstArr : [];
};

// Detect "active" truthiness across common shapes
const isActive = (b) => {
  const v =
    b?.status ?? b?.active ?? b?.is_active ?? b?.isActive ?? b?.enabled ?? b?.isEnabled;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "active" || s === "1" || s === "true" || s === "enabled";
  }
  return false;
};

/* -------------- core list -------------- */

// Get All Branches (optionally with params like {page, per_page, search})
export const getAllBranches = async (params = {}) => {
  const res = await api.get("/branches", { params });
  return normalizeArray(unwrap(res));
};

/**
 * Get Active Branches
 * 1) Tries /active-branches if it exists.
 * 2) Falls back to /branches with {active:1,status:'Active'} and filters client-side.
 */
export const getActiveBranches = async (params = {}) => {
  // Try dedicated endpoint first
  try {
    const res = await api.get("/active-branches", { params });
    const list = normalizeArray(unwrap(res));
    if (list.length) return list;
  } catch (_) {
    // ignore; fallback below
  }

  const merged = {
    per_page: 500,
    active: 1,
    status: "Active",
    ...params,
  };
  const res = await api.get("/branches", { params: merged });
  const list = normalizeArray(unwrap(res));
  return list.filter(isActive);
};

/**
 * Get Inactive Branches
 * 1) Tries /inactive-branches if it exists.
 * 2) Falls back to /branches and filters client-side.
 */
export const getInactiveBranches = async (params = {}) => {
  try {
    const res = await api.get("/inactive-branches", { params });
    const list = normalizeArray(unwrap(res));
    if (list.length) return list;
  } catch (_) {
    // ignore; fallback below
  }

  const res = await api.get("/branches", { params: { per_page: 500, ...params } });
  const list = normalizeArray(unwrap(res));
  return list.filter((b) => !isActive(b));
};

/* -------------- CRUD -------------- */

// View Single Branch
export const viewBranch = async (id) => {
  const { data } = await api.get(`/branch/${id}`);
  return data; // Return data without masking
};

// Store Branch
export const storeBranch = async (branchData) => {
  const { data } = await api.post("/branch", branchData);
  return data; // Return data without masking
};

// Update Branch
export const updateBranch = async (id, branchData) => {
  const { data } = await api.put(`/branch/${id}`, branchData);
  return data; // Return data without masking
};

// Delete Branch
export const deleteBranch = async (id) => {
  const { data } = await api.delete(`/branch/${id}`);
  return data; // Return data without masking
};
