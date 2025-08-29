import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiXCircle } from "react-icons/fi";
import { FaCcVisa } from "react-icons/fa6";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import "../Styles.css";

const VisaTypeCreate = () => {

  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [formData, setFormData] = useState({
    visaType: "",
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

  if (!formData.visaType.trim()) {
    setError("Visa type is required.");
    setLoading(false);
    return;
  }

  try {
    const response = await axios.post(
      "https://gulfcargoapi.bhutanvoyage.in/api/visa-type",
      {
        type_name: formData.visaType.trim(),  // ✅ correct key
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
      setSuccess("Visa Type created successfully!");
      setFormData({ visaType: "", status: "1" });

      setTimeout(() => {
        navigate("/visa/allvisa");
      }, 1500);
    } else {
      setError(response.data.message || "Failed to create visa type.");
    }
  } catch (err) {
    console.error("Error creating visa type:", err.response?.data || err.message);

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
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-2xl ">
          <h2 className="flex items-center gap-3 staff-panel-heading">
            <span className="staff-panel-heading-icon">
              <FaCcVisa />
            </span>
            Create Visa Type
          </h2>
        </div>

        <div className="bg-white w-full max-w-2xl rounded-xl p-6 shadow-md border border-gray-100">
          {error && <p className="text-red-500 text-center mb-3">{error}</p>}
          {success && <p className="text-green-600 text-center mb-3">{success}</p>}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Visa Type <span className="text-red-500">*</span>
              </label>
             <input
                  type="text"
                  name="visaType"
                  value={formData.visaType}  
                  onChange={handleChange}
                  placeholder="e.g., Company Visa"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#262262] hover:bg-[#18153d] text-white px-5 py-2 rounded-lg shadow-md transition-all duration-200"
              >
                <FiSave className="text-lg" />
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/visa")}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-lg shadow-md transition-all duration-200"
              >
                <FiXCircle className="text-lg" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default VisaTypeCreate;
