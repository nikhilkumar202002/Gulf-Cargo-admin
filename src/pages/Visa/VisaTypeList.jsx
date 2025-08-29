import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiMoreVertical, FiEye, FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import { FaCcVisa } from "react-icons/fa";
import { useAuth } from "../../auth/AuthContext"; // ✅ use token from AuthContext
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
     <div className="bg-gray-50 min-h-screen max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-3 staff-panel-heading">
            <span className="staff-panel-heading-icon">
              <FaCcVisa />
            </span>
            All Visas
          </h2>
          <button
            onClick={() => navigate("/VisaTypeCreate")}
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
                {visaTypes.map((visa) => (
                  <tr
                    key={visa.id}
                    className="visa-table-content border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-gray-900">
                      {visa.type_name}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          visa.status === 1
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {visa.status === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">0</td>
                    <td className="py-4 px-6 text-center relative" ref={menuRef}>
                      <button
                        onClick={() => toggleMenu(visa.id)}
                        className="p-2 rounded-full hover:bg-gray-100 transition"
                      >
                        <FiMoreVertical className="text-gray-500" size={18} />
                      </button>

                      {openMenu === visa.id && (
                        <div className="absolute right-10 top-2 w-36 bg-white shadow-lg rounded-lg border border-gray-100 z-10 animate-fade-in">
                          <ul className="flex flex-col text-sm">
                            <li>
                              <button
                                onClick={() =>
                                  navigate(`/visa/${visa.id}/employees`)
                                }
                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-left"
                              >
                                <FiEye className="text-blue-500" />
                                View
                              </button>
                            </li>
                            <li>
                              <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-left">
                                <FiEdit2 className="text-yellow-500" />
                                Edit
                              </button>
                            </li>
                            <li>
                              <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-left">
                                <FiTrash2 className="text-red-500" />
                                Delete
                              </button>
                            </li>
                          </ul>
                        </div>
                      )}
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
