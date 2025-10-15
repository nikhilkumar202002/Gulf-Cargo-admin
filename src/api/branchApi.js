// api/branchApi.js
import api from "./axiosInstance";

/* ---------------- helpers ---------------- */
const unwrap = (res) => res?.data ?? res;
const pick = (d = {}) => ({
  id: d.id ?? d.branch_id ?? null,
  branch_name: d.branch_name ?? "",
  branch_name_ar: d.branch_name_ar ?? "",
  branch_code: d.branch_code ?? "",
  branch_alternative_number: d.branch_alternative_number ?? "",
  branch_email: d.branch_email ?? "",
  logo_url: d.logo_url ?? "",
  branch_address: d.branch_address ?? "",
  branch_location: d.branch_location ?? "",
  branch_contact_number: d.branch_contact_number ?? "",
  branch_website: d.branch_website ?? "",
  status: d.status ?? "",
  created_by: d.created_by ?? "",
  created_by_email: d.created_by_email ?? "",
});

export async function getBranchByIdSmart(id) {
  // If your server path is stable, keep only the right one:
  const candidates = [
    `/branches/${id}`,
    `/branch/${id}`,
    `/api/branches/${id}`,
    `/api/branch/${id}`,
  ];
  let lastErr;
  for (const path of candidates) {
    try {
      const { data } = await api.get(path);

      // NEW: support { success, branch: {...} }
      const obj =
        data?.branch ??
        data?.data?.branch ??
        data?.data?.data ??
        data?.data ??
        data;

      if (obj) return pick(obj);
      return pick({});
    } catch (e) {
      if (e?.response?.status === 404) { lastErr = e; continue; }
      throw e;
    }
  }
  throw lastErr || new Error("Branch not found");
}

/* -------------- core list -------------- */

// Get All Branches (optionally with params like {page, per_page, search})
export async function getAllBranches() {
  const { data } = await api.get(`/branches`);
  // keep your existing list unwrapping as needed
  const list = data?.data?.data ?? data?.data ?? data?.items ?? data?.results ?? data?.branches ?? [];
  return Array.isArray(list) ? list.map(pick) : [];
}

export const getActiveBranches = async (params = {}) => {
  // Try dedicated endpoint first
  try {
    const res = await api.get("/branches?status=1", { params });
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


/**
 * Get users of a specific branch
 * @param {number|string} branchId - The ID of the branch
 * @returns {Array} - List of users in that branch
 */
export const getBranchUsers = async (branchId) => {
  if (!branchId) return [];
  try {
    const { data } = await api.get(`/branches/${branchId}/users`);
    // normalize common shapes
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.users)) return data.users;
    // last-resort: first array found
    const firstArr = Object.values(data || {}).find(Array.isArray);
    return Array.isArray(firstArr) ? firstArr : [];
  } catch (err) {
    return [];
  }
};