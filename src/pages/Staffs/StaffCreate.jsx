import React from "react";
import { HiUserAdd } from "react-icons/hi";
import "../Styles.css";

const StaffCreate = () => {
  return (
    <>
      
      <div className="flex justify-center items-center w-full ">
        <div className="w-full max-w-4xl bg-white rounded-2xl p-8">
          <div className="staffcreate-header ">
              <h1 className="staffcreate-heading flex items-center gap-3"><span className="staff-form-header-icon"><HiUserAdd/></span>Staff Registration</h1>
            </div>

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Staff Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Full Name"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload Photo
                </label>
                <input
                  type="file"
                  className="mt-1 w-full text-gray-700 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer"
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Staff Password
                </label>
                <input
                  type="password"
                  placeholder="Enter Password"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Staff ID
                </label>
                <input
                  type="text"
                  value="AR0219"
                  disabled
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Staff Branch
                </label>
                <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200">
                  <option value="">Select Branch</option>
                  <option>Dubai</option>
                  <option>Abu Dhabi</option>
                  <option>Sharjah</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Staff Email
                </label>
                <input
                  type="email"
                  placeholder="Enter Email"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                />
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Staff Status
                </label>
                <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200">
                  <option>Select Status</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Staff Role
                </label>
                <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200">
                  <option>Select Role</option>
                  <option>Super Admin</option>
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Staff</option>
                </select>
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Visa Expiry Date
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date of Appointment
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                />
              </div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Document Type
                </label>
                <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200">
                  <option>Select</option>
                  <option>Passport</option>
                  <option>ID Card</option>
                  <option>License</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type of Visa
                </label>
                <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200">
                  <option>Select</option>
                  <option>Employment</option>
                  <option>Visit</option>
                  <option>Residence</option>
                </select>
              </div>
            </div>

            {/* Row 7 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload Document
                </label>
                <input
                  type="file"
                  className="mt-1 w-full text-gray-700 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Visa Status
                </label>
                <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200">
                  <option>Active</option>
                  <option>Expired</option>
                </select>
              </div>
            </div>

            {/* Document ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Document ID
              </label>
              <input
                type="text"
                placeholder="Enter Document ID"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="staff-create-form-btn bg-[#262262] text-white px-5 py-2 rounded-lg hover:bg-[#3e379b] transition"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </>

  );
};

export default StaffCreate;
