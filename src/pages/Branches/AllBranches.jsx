import { Button } from "@radix-ui/themes";
import React, { useEffect, useState } from "react";
import { FaSearch, FaEdit, FaTrash, FaUsers, FaEye  } from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi";
import { LuPlus } from "react-icons/lu";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles.css";


const AllBranches = () => {

  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "https://gulfcargoapi.bhutanvoyage.in/api/branches",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        console.log("API Response:", response.data);

        if (response.data && Array.isArray(response.data)) {
          setBranches(response.data);
        } else if (response.data && Array.isArray(response.data.data)) {
          setBranches(response.data.data);
        } else {
          setBranches([]);
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
        setBranches([]); // avoid filter crash
      }
    };

    fetchBranches();
  }, []);


  const filteredBranches = branches.filter(
    (branch) =>
      branch.branch_name?.toLowerCase().includes(search.toLowerCase()) ||
      branch.branch_code?.toLowerCase().includes(search.toLowerCase()) ||
      branch.branch_location?.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredBranches.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentBranches = filteredBranches.slice(
    startIndex,
    startIndex + rowsPerPage
  );


  const toggleMenu = (index) => {
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

 const handleEdit = (branch) => {
  navigate(`/branches/edit/${branch.id}`, { state: branch });
};

  const handleDelete = async (branch) => {
  if (!window.confirm(`Are you sure you want to delete ${branch.branch_name}?`)) {
    return;
  }

  try {
    const token = localStorage.getItem("token"); // ✅ fix: get token here

    await axios.delete(
      `https://gulfcargoapi.bhutanvoyage.in/api/branch/${branch.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    alert("Branch deleted successfully!");
    // ✅ remove the deleted branch from UI
    setBranches((prev) => prev.filter((b) => b.id !== branch.id));
  } catch (error) {
    console.error("Delete error:", error.response?.data || error.message);
    alert(
      `Failed to delete branch!\n${
        error.response?.data?.message || "Please try again."
      }`
    );
  }
};


  const handleViewUsers = (branch) => {
    alert(`View users for ${branch.branch_name}`);
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
                      {/* 3-dot menu */}
                      <button
                        onClick={() => toggleMenu(index)}
                        className="p-2 rounded hover:bg-gray-200 transition"
                      >
                        <FiMoreVertical size={20} />
                      </button>

                      {openMenuIndex === index && (
                        <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10">
                           <button className="flex items-center gap-2 px-4 py-2 hover:bg-green-100 w-full text-green-600">
                            <Link to={`/branch/viewbranch/${branch.id}`} className="flex items-center gap-2 w-full">
                              <FaEye /> View
                            </Link>
                          </button>
                 
                          <button className="flex items-center gap-2 px-4 py-2 hover:bg-yellow-100 w-full text-yellow-600">
                            <Link to={`/branches/edit/${branch.id}`}   state={branch} className="flex items-center gap-2 w-full">
                              <FaEdit /> Edit
                            </Link>
                          </button>
                          <button
                            onClick={() => handleDelete(branch)}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-red-100 w-full text-red-600"
                          >
                            <FaTrash /> Delete
                          </button>
                         
                        </div>
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