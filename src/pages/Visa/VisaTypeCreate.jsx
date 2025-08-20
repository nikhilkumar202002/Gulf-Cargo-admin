import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

const VisaTypeCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    visaType: "",
    visaNumber: "",
    issueDate: "",
    expiryDate: "",
    staffName: "",
    status: "Active",
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Visa Created:", formData);
    // API call or state management logic here
    navigate("/visa"); // redirect back to visa list page
  };

  return (
    <div className="visa-page">

      {/* Title */}
      <div className="header-section">
        <h2>Create Visa</h2>
      </div>

      {/* Form */}
      <form className="visa-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Visa Type</label>
          <input
            type="text"
            name="visaType"
            value={formData.visaType}
            onChange={handleChange}
            placeholder="Enter visa type"
            required
          />
        </div>

        <div className="form-group">
          <label>Visa Number</label>
          <input
            type="text"
            name="visaNumber"
            value={formData.visaNumber}
            onChange={handleChange}
            placeholder="Enter visa number"
            required
          />
        </div>

        <div className="form-group">
          <label>Issue Date</label>
          <input
            type="date"
            name="issueDate"
            value={formData.issueDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Expiry Date</label>
          <input
            type="date"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Staff Name</label>
          <input
            type="text"
            name="staffName"
            value={formData.staffName}
            onChange={handleChange}
            placeholder="Enter staff name"
            required
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save</button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/visa")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default VisaTypeCreate;
