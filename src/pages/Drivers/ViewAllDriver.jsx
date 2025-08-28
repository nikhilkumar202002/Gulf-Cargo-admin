import React, { useState } from 'react'
import { LiaUsersSolid } from "react-icons/lia";
import { FiSearch, FiPlus } from "react-icons/fi";

function ViewAllDriver() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');

  const drivers = [
    {
      fullName: "John Doe",
      dob: "1990-05-12",
      gender: "Male",
      contact: "9876543210",
      altContact: "9123456780",
      email: "john@example.com",
      address: "123, Main Street, City",
      licenseType: "LMV",
      licenseExpiry: "2026-05-12",
      aadhar: "1234-5678-9012",
      pan: "ABCDE1234F",
      joiningDate: "2023-01-10",
      employeeId: "EMP001",
      designation: "Driver",
      workShift: "Morning",
      assignedVehicle: "Truck 01",
      status: "Active",
    },
    {
      fullName: "Jane Smith",
      dob: "1992-08-20",
      gender: "Female",
      contact: "9876543211",
      altContact: "",
      email: "jane@example.com",
      address: "456, Park Avenue, City",
      licenseType: "HMV",
      licenseExpiry: "2025-08-20",
      aadhar: "9876-5432-1098",
      pan: "",
      joiningDate: "2024-03-15",
      employeeId: "EMP002",
      designation: "Helper",
      workShift: "Evening",
      assignedVehicle: "Truck 02",
      status: "Inactive",
    },
  ];

  // Filter drivers based on search term and selected field
  const filteredDrivers = drivers.filter(driver => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    switch (searchField) {
      case 'name':
        return driver.fullName.toLowerCase().includes(searchLower);
      case 'employeeId':
        return driver.employeeId.toLowerCase().includes(searchLower);
      case 'designation':
        return driver.designation.toLowerCase().includes(searchLower);
      case 'status':
        return driver.status.toLowerCase().includes(searchLower);
      case 'vehicle':
        return driver.assignedVehicle.toLowerCase().includes(searchLower);
      case 'contact':
        return driver.contact.includes(searchTerm);
      default:
        // Search all fields
        return (
          driver.fullName.toLowerCase().includes(searchLower) ||
          driver.employeeId.toLowerCase().includes(searchLower) ||
          driver.designation.toLowerCase().includes(searchLower) ||
          driver.status.toLowerCase().includes(searchLower) ||
          driver.assignedVehicle.toLowerCase().includes(searchLower) ||
          driver.contact.includes(searchTerm) ||
          driver.email.toLowerCase().includes(searchLower) ||
          driver.licenseType.toLowerCase().includes(searchLower)
        );
    }
  });

  const handleAddDriver = () => {
    // Add your navigation logic here
    console.log('Add new driver');
    // Example: navigate('/add-driver') or openModal()
  };

  return (
    <>
      <section className='all-driver-view'>
        {/* Header with title and Add Driver button */}
        <div className="flex items-center justify-between pb-6">
          <h2 className="flex items-center gap-3 staff-panel-heading">
            <span className="staff-panel-heading-icon">
              <LiaUsersSolid />
            </span>
            All Drivers
          </h2>
          
          <button
            onClick={handleAddDriver}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <FiPlus className="w-4 h-4" />
            Add Driver
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search Field Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="searchField" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Search by:
              </label>
              <select
                id="searchField"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="employeeId">Employee ID</option>
                <option value="designation">Designation</option>
                <option value="status">Status</option>
                <option value="vehicle">Vehicle</option>
                <option value="contact">Contact</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="flex-1 relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={`Search drivers${searchField !== 'all' ? ` by ${searchField}` : ''}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Clear Search */}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredDrivers.length} of {drivers.length} drivers
            {searchTerm && (
              <span className="ml-2 text-blue-600">
                for "{searchTerm}"
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="text-white all-driver-view">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">DOB</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Gender</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Lic. Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Lic. Exp.</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Emp ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Designation</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Shift</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Vehicle</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody className='all-driver-view-content'>
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver, index) => (
                  <tr
                    key={index}
                    className={`${
                      index % 2 === 0 ? "bg-gray-50" : "bg-white"
                    } hover:bg-gray-100 transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{driver.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.dob}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.gender}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.contact}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.licenseType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.licenseExpiry}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{driver.employeeId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.designation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.workShift}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.assignedVehicle}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          driver.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {driver.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="12" className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <FiSearch className="w-8 h-8 text-gray-400" />
                      <p>No drivers found matching your search criteria</p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-blue-600 hover:text-blue-700 text-sm underline"
                        >
                          Clear search and show all drivers
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default ViewAllDriver
