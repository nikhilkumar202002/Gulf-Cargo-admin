import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiXCircle } from "react-icons/fi";
import { FaCcVisa } from "react-icons/fa6";
import "../Styles.css";

const VisaTypeCreate = () => {

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    visaType: "",
    status: "Active",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Visa Type Created:", formData);
    navigate("/visa");
  };


  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-6">
        {/* Page Header */}
        <div className="w-full max-w-2xl ">
          <h2 className="flex items-center gap-3 staff-panel-heading">
            <span className="staff-panel-heading-icon">
              <FaCcVisa />
            </span>
            Create Visa Type
          </h2>
        </div>

        {/* Form Card */}
        <div className="bg-white w-full max-w-2xl rounded-xl p-6 shadow-md border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Visa Type */}
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

            {/* Status */}
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
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#262262] hover:bg-[#18153d] text-white px-5 py-2 rounded-lg shadow-md transition-all duration-200"
              >
                <FiSave className="text-lg" />
                Save
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
