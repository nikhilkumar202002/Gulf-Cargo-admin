import { Button } from "@radix-ui/themes";
import React, { useState } from "react";
import { FaSearch, FaEdit, FaTrash, FaUsers } from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi";
import { LuPlus } from "react-icons/lu";

const branchData = [
  { name: "GULF CARGO KSA HAIL", code: "HL40", location: "Hail", numbers: ["050 343 3725", "056 877 8615"] },
  { name: "GULF CARGO KSA TABUK", code: "TB50", location: "Tabuk", numbers: ["053 886 6793", "058 928 2543"] },
  { name: "GULF CARGO KSA JEDDAH", code: "JED10", location: "Jeddah", numbers: ["053 833 0839", "053 833 0890"] },
  { name: "Cargo World", code: "WC", location: "Cargo World", numbers: ["050 062 9263", "054 040 6835"] },
  { name: "GULF CARGO KSA BURAIDAH", code: "BUR50", location: "Buraidah", numbers: ["055 022 4780", "057 703 9691"] },
  { name: "GULF CARGO KSA UNAIZAH", code: "ON70", location: "Onaizah", numbers: ["055 970 2203", "055 970 2203"] },
  { name: "GULF CARGO KSA AL JOUF", code: "AJ30", location: "Al Jouf", numbers: ["054 359 1837", "055 811 9967"] },
  { name: "GULF CARGO KSA RIYADH", code: "RUH81", location: "Riyadh", numbers: ["054 430 8508", "054 314 5105"] },
  { name: "GULF CARGO KSA HAFAR AL BATIN", code: "HB60", location: "Hafar Al Batin", numbers: ["053 886 6793", "058 928 2543"] },
  { name: "AL AHSA", code: "AH20", location: "AL HAFUF BALADIYA-POST OFFICE ROAD", numbers: ["050 062 9263", "054 040 6835"] },
];

const AllBranches = () => {

    const [search, setSearch] = useState("");
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter branches based on search term
  const filteredBranches = branchData.filter(
    (branch) =>
      branch.name.toLowerCase().includes(search.toLowerCase()) ||
      branch.code.toLowerCase().includes(search.toLowerCase()) ||
      branch.location.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredBranches.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentBranches = filteredBranches.slice(startIndex, startIndex + rowsPerPage);

  // Toggle 3-dot menu
  const toggleMenu = (index) => {
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  const handleEdit = (branch) => {
    alert(`Edit ${branch.name}`);
  };

  const handleDelete = (branch) => {
    if (window.confirm(`Are you sure you want to delete ${branch.name}?`)) {
      alert(`${branch.name} deleted successfully.`);
    }
  };

  const handleViewUsers = (branch) => {
    alert(`View users for ${branch.name}`);
  };


  return (
    <>
        <div className="add-branch-header">
                <h1 className="add-branch-heading">Staff Members List</h1>
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

          {/* Rows per page selector */}
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
                <Button className="flex items-center gap-2 font-bold">Add New Member <LuPlus /></Button>
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
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.length > 0 ? (
                filteredBranches.map((branch, index) => (
                  <tr
                    key={index}
                    className="border-t hover:bg-gray-50 transition duration-200"
                  >
                    <td className="py-3 px-4 font-medium text-gray-700">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{branch.name}</td>
                    <td className="py-3 px-4 text-gray-600">{branch.code}</td>
                    <td className="py-3 px-4 text-gray-600">{branch.location}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {branch.numbers.map((num, i) => (
                        <p key={i}>{num}</p>
                      ))}
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
                          <button
                            onClick={() => handleEdit(branch)}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-yellow-100 w-full text-yellow-600"
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(branch)}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-red-100 w-full text-red-600"
                          >
                            <FaTrash /> Delete
                          </button>
                          <button
                            onClick={() => handleViewUsers(branch)}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-green-100 w-full text-green-600"
                          >
                            <FaUsers /> Users
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="py-4 px-4 text-center text-gray-500"
                  >
                    No matching branches found.
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