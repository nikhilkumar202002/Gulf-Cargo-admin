import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

const ReceiverView = () => {
  const navigate = useNavigate(); // ✅ hook for navigation

  return (
    <div className="customer-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span>Home</span> / <span>Receiver</span> / <span>Index</span>
      </div>

      {/* Title + Add Button */}
      <div className="header-section">
        <h2>List Receiver</h2>
        <button className="add-btn" onClick={() => navigate("/receivercreate")}>
          Add New
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="customer-table">
          <thead>
            <tr>
              <th>Sl No.</th>
              <th>Customer Name</th>
              <th>Branch Name</th>
              <th>Email</th>
              <th>Contact Number</th>
            </tr>
          </thead>
          <tbody>
            {/* Data rows will be added dynamically later */}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceiverView;
