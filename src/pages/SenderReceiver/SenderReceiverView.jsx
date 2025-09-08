import React from "react";
import { useNavigate } from "react-router-dom";
import { HiPlus, HiHome } from "react-icons/hi";
import "../styles.css";

const SenderView = () => {
  const navigate = useNavigate();

  // Temporary dummy data (replace with API later)
  const customers = [
    {
      id: 1,
      name: "Michael Scott",
      branch: "Branch 1",
      email: "michael.scott@example.com",
      contact: "+93 700123456",
    },
    {
      id: 2,
      name: "Pam Beesly",
      branch: "Branch 2",
      email: "pam.beesly@example.com",
      contact: "+91 9876543210",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <HiHome className="text-gray-600" />
        <span className="cursor-pointer hover:text-blue-600">Home</span>
        <span>/</span>
        <span className="cursor-pointer hover:text-blue-600">Customer</span>
        <span>/</span>
        <span className="text-gray-800 font-medium">Index</span>
      </div>

      {/* Title + Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">List Customer</h2>
        <button
          onClick={() => navigate("/sendercreate")}
          className="mt-4 sm:mt-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md transition"
        >
          <HiPlus className="text-lg" />
          Add New
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="min-w-full bg-white rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm uppercase tracking-wide">
              <th className="py-3 px-4 text-left">Sl No.</th>
              <th className="py-3 px-4 text-left">Customer Name</th>
              <th className="py-3 px-4 text-left">Branch Name</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Contact Number</th>
            </tr>
          </thead>
          <tbody>
            {customers.length > 0 ? (
              customers.map((customer, index) => (
                <tr
                  key={customer.id}
                  className={`border-b last:border-none hover:bg-gray-50 transition ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="py-3 px-4 text-gray-700">{index + 1}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">
                    {customer.name}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{customer.branch}</td>
                  <td className="py-3 px-4 text-gray-700">{customer.email}</td>
                  <td className="py-3 px-4 text-gray-700">{customer.contact}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="py-6 text-center text-gray-500 italic"
                >
                  No customers found. Click “Add New” to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SenderView;

