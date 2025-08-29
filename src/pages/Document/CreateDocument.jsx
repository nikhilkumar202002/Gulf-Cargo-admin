import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiXCircle, FiFileText } from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../../auth/AuthContext";
import "../Styles.css";

const DocumentTypeCreate = () => {
  const navigate = useNavigate();
   const { token, logout } = useAuth();

  const [formData, setFormData] = useState({
    documentType: "",
    status: "1", 
  });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  setSuccess("");

    if (!formData.documentType.trim()) {
    setError("Document type is required.");
    setLoading(false);
    return;
  }

    try {
    const response = await axios.post(
      "https://gulfcargoapi.bhutanvoyage.in/api/document-type",
      {
        document_name: formData.documentType.trim(),  
        status: Number(formData.status),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

 if (response.data.success) {
      setSuccess("Document Type created successfully!");
      setFormData({ documentType: "", status: "1" });

      setTimeout(() => {
        navigate("/documents/createdocument");
      }, 1500);
    } else {
      setError(response.data.message || "Failed to create document type.");
    }
  } catch (err) {
    console.error("Error creating document type:", err.response?.data || err.message);

    if (err.response?.status === 422) {
      setError(
        err.response?.data?.message ||
          "Invalid input. Please check the fields and try again."
      );
    } else if (err.response?.status === 401) {
      setError("Session expired. Logging out...");
      setTimeout(() => logout(), 1500);
    } else {
      setError("Something went wrong. Please try again later.");
    }
  } finally {
    setLoading(false);
  }
};
  

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg">
  
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-6">
          <FiFileText className="text-red-500" size={22} />
          Create Document Type
        </h2>

        {error && <p className="text-red-500 text-center mb-3">{error}</p>}
        {success && <p className="text-green-600 text-center mb-3">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
    
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="documentType"
              value={formData.documentType}
              onChange={handleChange}
              placeholder="e.g., Passport, ID Card"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
            />
          </div>

        
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

       
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg shadow transition"
            >
              <FiSave />
              Save
            </button>
            <button
              type="button"
              onClick={() => navigate("/documents/documentlist")}
              className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg shadow"
            >
              <FiXCircle />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentTypeCreate;
