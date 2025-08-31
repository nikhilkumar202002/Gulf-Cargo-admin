import api from "./axiosInstance";

// Helper function to convert to array if it's not already
const toArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

// Get All Roles
export const getAllRoles = async (params = {}) => {
  const { data } = await api.get("/roles", { params });

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.roles)) return data.roles;
  if (data?.roles && typeof data.roles === "object") return toArray(data.roles);

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.roles)) return data.data.roles;
  if (data?.data?.roles && typeof data.data.roles === "object")
    return toArray(data.data.roles);
  if (Array.isArray(data?.data?.data)) return data.data.data;

  // Final single-object fallback: { id, role_name }
  if (data && typeof data === "object" && "role_name" in data) return [data];

  return [];
};

// Create Role
export const createRole = async (payload) => {
  const { data } = await api.post("/role", payload);
  return data; // Return data without masking
};
