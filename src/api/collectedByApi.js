import axiosInstance from "./axiosInstance";

// Fetch all collected items or filtered by status
export const getCollected = async (status = null) => {
  try {
    const url = status !== null ? `/collected?status=${status}` : '/collected';
    const { data } = await axiosInstance.get(url);
    return data;  // Assuming the API returns data in the `data` property
  } catch (error) {
    console.error('Error fetching collected items:', error);
    throw error; // Propagate error for handling in component
  }
};

// Fetch active collected items (status=1)
export const getActiveCollected = async () => {
  return getCollected(1);  // Using getCollected with status=1
};

// Fetch inactive collected items (status=0)
export const getInactiveCollected = async () => {
  return getCollected(0);  // Using getCollected with status=0
};

// Create a new collected item (POST)
export const createCollected = async (collectedData) => {
  try {
    const { data } = await axiosInstance.post('/collected', collectedData);
    return data;  // Assuming the response contains data with the new collected item
  } catch (error) {
    console.error('Error creating collected item:', error);
    throw error; // Propagate error for handling in component
  }
};
