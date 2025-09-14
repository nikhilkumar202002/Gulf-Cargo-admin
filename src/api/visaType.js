import axiosInstance from "./axiosInstance";

// Create a new visa type (POST)
export const createVisaType = async (data) => {
  try {
    const response = await axiosInstance.post('/visa-type', data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating visa type:', error);
    throw error; // To handle this in the component
  }
};

// Get all visa types (GET)
export const getVisaTypes = async () => {
  try {
    const response = await axiosInstance.get('/visa-types', {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching visa types:', error);
    throw error; // To handle this in the component
  }
};


export const getActiveVisaTypes = async (token) => {
  try {
    const response = await axiosInstance.get("/visa-types?status=1", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Ensure token is correctly included here
      },
    });
    console.log("Visa types response:", response.data); // Log response for debugging
    return response.data;
  } catch (error) {
    console.error("Error fetching active visa types:", error);
    throw error; // Handle error properly
  }
};

// Get all inactive visa types (GET)
export const getInactiveVisaTypes = async () => {
  try {
    const response = await axiosInstance.get('/inactive-visa-types', {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching inactive visa types:', error);
    throw error; // To handle this in the component
  }
};

// Update a visa type (PUT)
export const updateVisaType = async (id, data) => {
  try {
    const response = await axiosInstance.put(`/visa-type/${id}`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating visa type with ID ${id}:`, error);
    throw error; // To handle this in the component
  }
};
