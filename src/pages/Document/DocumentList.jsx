import React, { useState, useEffect, useRef  } from "react";
import { useNavigate } from "react-router-dom";
import { FiMoreVertical, FiPlus } from "react-icons/fi";
import { FiFileText } from "react-icons/fi";
import { useAuth } from "../../auth/AuthContext"; 
import axios from "axios";
import "../styles.css";

const DocumentTypeList = () => {

const navigate = useNavigate();

  const { token, logout } = useAuth();
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const toggleMenu = (id) => {
    setOpenMenu(openMenu === id ? null : id);
  };

  const fetchDocumentTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "https://gulfcargoapi.bhutanvoyage.in/api/document-types",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setDocumentTypes(response.data.data || []);
      } else {
        setDocumentTypes([]);
        setError(response.data.message || "Failed to fetch document types");
      }
    } catch (err) {
      console.error("Error fetching document types:", err.response?.data || err.message);
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
    fetchDocumentTypes();
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
    <div className="bg-gray-50 min-h-screen max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-800">
          <span className="p-2 bg-red-100 text-red-600 rounded-lg">
            <FiFileText />
          </span>
          All Documents
        </h2>
        <button 
        onClick={() => navigate("/documents/createdocument")}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition">
          <FiPlus className="text-lg" />
          Add New
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            {loading ? (
            <p className="text-center py-6 text-gray-500">Loading document types...</p>
          ) : documentTypes.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No document types found.</p>
          ) : (

        <table className="w-full text-sm text-gray-700">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="py-4 px-6 text-left">Name</th>
              <th className="py-4 px-6 text-left">Status</th>
              <th className="py-4 px-6 text-center">Employees</th>
              <th className="py-4 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documentTypes.map((doc, index) => (
              <tr
                key={doc.id}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-6 font-medium text-gray-900">
                  {doc.document_name}
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      doc.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-center">0</td>
                <td className="py-4 px-6 text-center">
                  <button className="p-2 rounded-full hover:bg-gray-100 transition">
                    <FiMoreVertical className="text-gray-500" size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          )}
      </div>
    </div>
  );
};

export default DocumentTypeList;
