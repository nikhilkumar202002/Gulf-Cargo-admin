import axiosInstance from "./axiosInstance";

// POST /driver - Create a new driver
export const createDriver = async (driverData) => {
  try {
    const { data } = await axiosInstance.post('/driver', driverData);
    return data;  // Return the response data
  } catch (error) {
    console.error('Error creating driver:', error);
    throw error;  // Propagate error for handling in component
  }
};

// GET /drivers - Fetch all drivers
export const getAllDrivers = async () => {
  try {
    const { data } = await axiosInstance.get('/drivers');
    return data;  // Return the response data
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw error;  // Propagate error for handling in component
  }
};

// GET /drivers?status=1 - Fetch active drivers
export const getActiveDrivers = async () => {
  try {
    const { data } = await axiosInstance.get('/drivers?status=1');
    return data;  // Return the response data
  } catch (error) {
    console.error('Error fetching active drivers:', error);
    throw error;  // Propagate error for handling in component
  }
};

// GET /drivers?status=0 - Fetch inactive drivers
export const getInactiveDrivers = async () => {
  try {
    const { data } = await axiosInstance.get('/drivers?status=0');
    return data;  // Return the response data
  } catch (error) {
    console.error('Error fetching inactive drivers:', error);
    throw error;  // Propagate error for handling in component
  }
};
