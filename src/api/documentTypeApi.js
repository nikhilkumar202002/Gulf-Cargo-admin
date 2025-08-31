import axiosInstance from "./axiosInstance";

// Create a new document type (POST)
export const createDocumentType = async (data) => {
  try {
    const response = await axiosInstance.post('/document-type', data);
    return response.data;
  } catch (error) {
    console.error('Error creating document type:', error);
    throw error;
  }
};

// Get all document types (GET)
export const getDocumentTypes = async () => {
  try {
    const response = await axiosInstance.get('/document-types');
    return response.data;
  } catch (error) {
    console.error('Error fetching document types:', error);
    throw error;
  }
};

// Get all active document types (GET)
export const getActiveDocumentTypes = async () => {
  try {
    const response = await axiosInstance.get('/active-document-types');
    return response.data;
  } catch (error) {
    console.error('Error fetching active document types:', error);
    throw error;
  }
};

// Get all inactive document types (GET)
export const getInactiveDocumentTypes = async () => {
  try {
    const response = await axiosInstance.get('/inactive-document-types');
    return response.data;
  } catch (error) {
    console.error('Error fetching inactive document types:', error);
    throw error;
  }
};

// Update a document type (PUT)
export const updateDocumentType = async (id, data) => {
  try {
    const response = await axiosInstance.put(`/document-type/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating document type with ID ${id}:`, error);
    throw error;
  }
};
