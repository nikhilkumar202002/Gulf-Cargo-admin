import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiMoreVertical, FiEye, FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import { FaCcVisa } from "react-icons/fa";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import "../styles.css";

const VisaTypeList = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [visaTypes, setVisaTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const toggleMenu = (id) => {
    setOpenMenu(openMenu === id ? null : id);
  };

  const fetchVisaTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "https://gulfcargoapi.bhutanvoyage.in/api/visa-types",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setVisaTypes(response.data.data || []);
      } else {
        setVisaTypes([]);
        setError(response.data.message || "Failed to fetch visa types");
      }
    } catch (err) {
      console.error("Error fetching visa types:", err.response?.data || err.message);
      if (err.response?.status === 401) {
        setError("Session expired. Logging out...");
        setTimeout(() => logout(), 1500);
      } else {
        setError("Something went wrong. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisaTypes();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="bg-gray-50 min-h-screen max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5 ">
          <h2 className="flex items-center gap-3 staff-panel-heading">
            <span className="staff-panel-heading-icon">
              <FaCcVisa />
            </span>
            All Visas
          </h2>
          <button
            onClick={() => navigate("/visatype/create")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all duration-200"
          >
            <FiPlus className="text-lg" />
            Add New
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          {loading ? (
            <p className="text-center py-6 text-gray-500">Loading visa types...</p>
          ) : visaTypes.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No visa types found.</p>
          ) : (
            <table className="w-full text-sm text-gray-700">
              <thead className="visa-table-heading border-b">
                <tr>
                  <th className="py-6 px-6 text-left">Name</th>
                  <th className="py-6 px-6 text-left">Status</th>
                  <th className="py-6 px-6 text-center">Employees</th>
                  <th className="py-6 px-6 text-center">Actions</th>
                </tr>
              </thead>
     <tbody>
  {visaTypes.map((visa, index) => (
    <tr
      key={visa.id}
      className="hover:bg-gray-50 border-b border-gray-200 last:border-none"
    >
      {/* Visa Name */}
      <td className="px-6 py-4">{visa.type_name}</td>

      {/* Status Badge */}
      <td className="px-6 py-4">
        <span
          className={`px-3 py-1 text-sm rounded-full ${
            visa.status === "Active"
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {visa.status}
        </span>
      </td>

      {/* Employees Count */}
      <td className="px-6 py-4 text-center">0</td>

      {/* Actions */}
      <td className="px-6 py-4 text-center text-gray-500 cursor-pointer">
        ⋮
      </td>
    </tr>
  ))}
</tbody>


            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default VisaTypeList;
