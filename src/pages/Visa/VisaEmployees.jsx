import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles.css";

const VisaEmployees = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Example employee data by visa type
  const employeesByVisa = {
    1: ["John Doe", "Jane Smith", "Ali Khan"],
    2: ["Emily Brown", "Chris Lee"],
    3: ["Michael Scott", "Dwight Schrute", "Jim Halpert"],
  };

  const employees = employeesByVisa[id] || [];

  return (
    <div className="employee-page">
      <div className="header-section">
        <h2>Employees under Visa ID {id}</h2>
        <button className="add-btn" onClick={() => navigate(-1)}>
          ⬅ Back
        </button>
      </div>

      <ul className="employee-list">
        {employees.length > 0 ? (
          employees.map((emp, index) => <li key={index}>{emp}</li>)
        ) : (
          <p>No employees found for this visa.</p>
        )}
      </ul>
    </div>
  );
};

export default VisaEmployees;
