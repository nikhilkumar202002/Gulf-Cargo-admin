import React from 'react'
import "../Styles.css";
import { FaTruckMoving } from "react-icons/fa";

function AddDriver() {
  return (
    <>
       <div className="add-driver-main flex justify-center">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-4xl ">
         <h2 className="flex items-center gap-3 staff-panel-heading mb-6 border-b pb-3">
                    <span className="staff-panel-heading-icon">
                      <FaTruckMoving />
                    </span>
                    Create Visa Type
                  </h2>

        <form className="space-y-8">
          {/* Personal Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <input
                type="date"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <select className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200">
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <input
                type="text"
                placeholder="Contact Number"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <input
                type="text"
                placeholder="Alternate Contact"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <input
                type="email"
                placeholder="Email Address"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <textarea
                placeholder="Full Address"
                className="p-3 border rounded-lg col-span-2 md:col-span-2 focus:outline-none focus:ring focus:ring-blue-200"
              />
              <input
                type="file"
                className="w-full border rounded-lg px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600 cursor-pointer"
            />
            
            </div>
          </div>

          {/* License Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">
              License Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="License Number"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <select className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200">
                <option value="">License Type</option>
                <option>LMV</option>
                <option>HMV</option>
                <option>Trailer</option>
              </select>
              <input
                type="date"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">
              Employment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="date"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <select className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200">
                <option>Driver</option>
                <option>Helper</option>
              </select>
              <select className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200">
                <option value="">Work Shift</option>
                <option>Morning</option>
                <option>Evening</option>
                <option>Night</option>
                <option>Rotational</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Assigned Vehicle"
              className="p-3 border rounded-lg w-full mt-4 focus:outline-none focus:ring focus:ring-blue-200"
            />
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">
              Bank Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Bank Name"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <input
                type="text"
                placeholder="Account Number"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <input
                type="text"
                placeholder="IFSC Code"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
              <input
                type="text"
                placeholder="UPI ID"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Driver
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default AddDriver