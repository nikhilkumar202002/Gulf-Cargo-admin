import api from "./axiosInstance";

// Get All Branches
export const getAllBranches = async () => {
  const { data } = await api.get("/branches");
  return data; // Return data without masking
};

// Get Active Branches
export const getActiveBranches = async () => {
  const { data } = await api.get("/active-branches");
  return data; // Return data without masking
};

// Get Inactive Branches
export const getInactiveBranches = async () => {
  const { data } = await api.get("/inactive-branches");
  return data; // Return data without masking
};

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
