import { Button } from "@radix-ui/themes";
import React, { useEffect, useState } from "react";
import { FaSearch  } from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi";
import { LuPlus } from "react-icons/lu";
import { Link } from "react-router-dom";
import DropdownMenu from "../../components/DropdownMenu";
import api from "../../api/axiosInstance";
import "../styles.css";


const AllBranches = () => {

   const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

 useEffect(() => {
    let cancelled = false;

    const fetchBranches = async () => {
      try {
        const res = await api.get("/branches"); 
        const payload = res.data;
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];
        if (!cancelled) setBranches(items);
      } catch (error) {
        console.error("Error fetching branches:", error?.response?.data || error.message);
        if (!cancelled) setBranches([]); 
      }
    };

    fetchBranches();
    return () => {
      cancelled = true;
    };
  }, []);

const filteredBranches = branches.filter(
    (b) =>
      b.branch_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.branch_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.branch_location?.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredBranches.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentBranches = filteredBranches.slice(startIndex, startIndex + rowsPerPage);

  const handleDelete = async (branch) => {
    if (!window.confirm(`Are you sure you want to delete ${branch.branch_name}?`)) return;

    try {
      await api.delete(`/branch/${branch.id}`); 
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
      alert("Branch deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error?.response?.data || error.message);
      alert(`Failed to delete branch!\n${error?.response?.data?.message || "Please try again."}`);
    }
  };


  return (
    <>
      <div className="add-branch-header">
        <h1 className="add-branch-heading">Branch List</h1>
      </div>

      <div className="p-6 bg-white shadow-lg rounded-lg">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
          {/* Search bar */}
          <div className="relative w-full md:w-1/2">
            <input
              type="text"
              placeholder="Search branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>

          {/* Rows per page selector + Add button */}
          <div className="all-branches-row-right flex gap-4">
            <div className="flex items-center gap-2 md:w-auto w-full">
              <label className="font-medium text-gray-700">Rows:</label>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>

            <div className="all-branches-row-add-new">
              <Link to="/branches/add">
                <Button className="flex items-center gap-2 font-bold">
                  Add New Branch <LuPlus />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg">
          <table className="w-full border-collapse">
            <thead className="allbranches-table-head">
              <tr>
                <th className="py-3 px-4 text-left">#</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Branch Code</th>
                <th className="py-3 px-4 text-left">Location</th>
                <th className="py-3 px-4 text-left">Contact Numbers</th>
                <th className="py-3 px-4 text-left">Email</th>

                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentBranches.length > 0 ? (
                currentBranches.map((branch, index) => (
                  <tr
                    key={branch.id}
                    className="border-t hover:bg-gray-50 transition duration-200"
                  >
                    <td className="py-3 px-4 font-medium text-gray-700">
                      {startIndex + index + 1}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{branch.branch_name || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{branch.branch_code || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{branch.branch_location || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {branch.branch_contact_number && <p>{branch.branch_contact_number}</p>}
                      {branch.branch_alternative_number && <p>{branch.branch_alternative_number}</p>}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{branch.branch_email || "-"}</td>

                    <td className="py-3 px-4">
                      {branch.status === "Active" || branch.status === 1 ? (
                        <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
                          Inactive
                        </span>
                      )}
                    </td>
                   <td className="py-3 px-4 text-center relative">

<button
  onClick={(e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenMenuIndex(index);
    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX - 100, 
    });
  }}
  className="p-2 rounded hover:bg-gray-200 transition"
>
  <FiMoreVertical size={20} />
</button>


{openMenuIndex === index && (
  <DropdownMenu
    branch={branch}
    handleDelete={handleDelete}
    position={menuPosition}
    onClose={() => setOpenMenuIndex(null)}
  />
)}

</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    className="py-4 px-4 text-center text-gray-500"
                  >
                    No branches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <p className="text-gray-600">
            Showing {startIndex + 1} -{" "}
            {Math.min(startIndex + rowsPerPage, filteredBranches.length)} of{" "}
            {filteredBranches.length} branches
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-100"
            >
              Prev
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      </div>


    </>
  )
}

export default AllBranches