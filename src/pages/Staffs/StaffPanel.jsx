import React, { useState, useEffect } from "react";
import { FiMoreVertical } from "react-icons/fi";
import { FaUsers } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { MdClose } from "react-icons/md";
import "../Styles.css";
import { listStaffs } from "../../api/accountApi";

const StaffPanel = () => {
  const [filter, setFilter] = useState({ name: "", email: "", status: "" });
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dropdownId, setDropdownId] = useState(null);
  const navigate = useNavigate();

  // map any backend shape to UI-safe fields
  const mapStaff = (s, idx) => ({
    id: s.id ?? s.staff_id ?? s._id ?? idx,
    name:
      s.name ||
      [s.first_name, s.last_name].filter(Boolean).join(" ") ||
      s.username ||
      "—",
    email: s.email || s.user_email || "—",
    role:
      (s.role && (s.role.name || s.role.title)) ||
      s.role_name ||
      s.role ||
      s.role_id ||
      "—",
    status:
      (s.status === 1 ||
        s.is_active === 1 ||
        s.active === true ||
        String(s.status).toLowerCase() === "active")
        ? "Active"
        : "Inactive",
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const raw = await listStaffs();
        const normalized = (Array.isArray(raw) ? raw : []).map(mapStaff);
        setStaff(normalized);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Failed to load staff.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-wrapper")) setDropdownId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStaff = staff.filter((u) =>
    (filter.name ? u.name.toLowerCase().includes(filter.name.toLowerCase()) : true) &&
    (filter.email ? u.email.toLowerCase().includes(filter.email.toLowerCase()) : true) &&
    (filter.status ? u.status === filter.status : true)
  );

  const handleClear = () => setFilter({ name: "", email: "", status: "" });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-3 staff-panel-heading">
          <span className="staff-panel-heading-icon"><FaUsers /></span>
          All Staff Members
        </h2>
        <button
          onClick={() => navigate("/staffcreate")}
          className="bg-green-600 text-white px-5 py-2 rounded-lg shadow hover:bg-green-700 transition"
        >
          + Create Staff
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Filter by Name"
          value={filter.name}
          onChange={(e) => setFilter((p) => ({ ...p, name: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none w-56"
        />
        <input
          type="text"
          placeholder="Filter by Email"
          value={filter.email}
          onChange={(e) => setFilter((p) => ({ ...p, email: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none w-56"
        />
        <select
          value={filter.status}
          onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none w-44"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button
          onClick={handleClear}
          className="bg-[#ED2624] hover:bg-[#d32724] text-white px-4 py-2 rounded-lg transition flex items-center gap-1"
        >
          <MdClose /> Clear
        </button>
      </div>

      {isLoading && <div className="bg-white rounded-lg p-6 text-gray-600">Loading staff…</div>}
      {error && !isLoading && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 mb-4">{error}</div>
      )}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg overflow-hidden">
          <table className="min-w-full divide-y text-left">
            <thead>
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase">#</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Details</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-6 text-gray-500 text-center">No staff found.</td></tr>
              ) : (
                filteredStaff.map((user, index) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 text-gray-800">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-gray-500 text-sm">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.role}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>{user.status}</span>
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <div className="dropdown-wrapper inline-block">
                        <FiMoreVertical
                          className="text-gray-500 cursor-pointer hover:text-gray-700"
                          size={20}
                          onClick={() => setDropdownId(dropdownId === user.id ? null : user.id)}
                        />
                        {dropdownId === user.id && (
                          <div className="absolute right-6 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                            <button onClick={() => navigate(`/staff/${user.id}`)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">View</button>
                            <button onClick={() => alert(`Editing ${user.name}`)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Edit</button>
                            <button onClick={() => alert(`Deleting ${user.name}`)} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StaffPanel;
