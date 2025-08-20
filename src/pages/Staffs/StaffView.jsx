import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../Styles.css"; // make sure path is correct

export default function StaffView() {
  const { id } = useParams();
  const { getById } = useStaff();
  const staff = getById(id);
  const navigate = useNavigate();

  if (!staff) {
    return <div className="p-4 text-red-500">Staff not found.</div>;
  }

  return (
    <div className="staff-view-container">
      <div className="staff-card">
        {/* Header */}
        <div className="staff-card-header">
          <h2>👤 Staff Details</h2>
          <button className="btn-back" onClick={() => navigate(-1)}>
            ⬅ Back
          </button>
        </div>

        {/* Staff Info */}
        <div className="staff-details-grid">
          <div><strong>Name:</strong> {staff.name}</div>
          <div><strong>Staff ID:</strong> {staff.staffId}</div>
          <div><strong>Email:</strong> {staff.email}</div>
          <div><strong>Branch:</strong> {staff.branch}</div>
          <div><strong>Status:</strong> {staff.status}</div>
          <div><strong>Role:</strong> {staff.role}</div>
          {staff.appointmentDate && (
            <div><strong>Date of Appointment:</strong> {staff.appointmentDate}</div>
          )}
          {staff.visaType && (
            <div><strong>Type of Visa:</strong> {staff.visaType}</div>
          )}
        </div>
      </div>
    </div>
  );
}
