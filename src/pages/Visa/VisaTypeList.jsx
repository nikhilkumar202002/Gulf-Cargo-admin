import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEllipsisV } from "react-icons/fa";
import "../styles.css";

const VisaTypeList = () => {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null); // Track which row's menu is open

  // Example data
  const visaTypes = [
    { id: 1, name: "Company Visa", status: "Active", employees: 12 },
    { id: 2, name: "Visiting Visa", status: "Active", employees: 5 },
    { id: 3, name: "Work Permit", status: "Active", employees: 8 },
  ];

  const toggleMenu = (id) => {
    setOpenMenu(openMenu === id ? null : id); // Toggle dropdown
  };

  return (
    <div className="visa-page">
      <div className="header-section">
        <h2>Visa Type List</h2>
        <button className="add-btn" onClick={() => navigate("/VisaTypeCreate")}>
          Add New
        </button>
      </div>

      <div className="table-container">
        <table className="visa-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visaTypes.map((visa) => (
              <tr key={visa.id}>
                <td>{visa.name}</td>
                <td>
                  <span className={`status-badge ${visa.status.toLowerCase()}`}>
                    {visa.status}
                  </span>
                </td>
                <td>{visa.employees}</td>
                <td className="action-buttons">
                  <div className="dropdown-container">
                    <button
                      className="dots-btn"
                      onClick={() => toggleMenu(visa.id)}
                    >
                      <FaEllipsisV />
                    </button>

                    {openMenu === visa.id && (
                      <div className="dropdown-menu">
                        <button
                          onClick={() => navigate(`/visa/${visa.id}/employees`)}
                        >
                          View
                        </button>
                        <button>Edit</button>
                        <button>Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VisaTypeList;
