import React, { useEffect, useState } from 'react';
import { getShipmentMethods } from '../../api/shipmentMethodApi';
import { getPorts } from '../../api/portApi';
import { getActiveBranches } from '../../api/branchApi';
import { listStaffs } from '../../api/accountApi';
import { getActiveShipmentStatuses } from '../../api/shipmentStatusApi';
import { PiShippingContainerFill } from "react-icons/pi";
import "./ShipmentStyles.css";

function CreateShipment() {
  const [shipmentMethods, setShipmentMethods] = useState([]);
  const [ports, setPorts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [shipmentStatuses, setShipmentStatuses] = useState([]);

  const [formData, setFormData] = useState({
    shipmentNumber: '',
    awbNo: '',
    licenseDetails: '',
    exchangeRate: '',
    shipmentDetails: '',
    portOfOrigin: '',
    portOfDestination: '',
    shippingMethod: '',
    createdOn: new Date().toISOString().split('T')[0], // default current date
    clearingAgent: '',
    createdBy: '',
    shipmentStatus: 'Shipment Booked', // default value
  });

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  useEffect(() => {
    // Fetch Shipment Methods
    getShipmentMethods({}, 'your-token-here')
      .then(data => {
        console.log("Fetched Shipment Methods:", data); // Log shipment methods
        setShipmentMethods(data);
      });

    // Fetch Ports
    getPorts({}, 'your-token-here')
      .then(data => {
        console.log("Fetched Ports:", data); // Log ports data
        setPorts(data);
      });

    // Fetch Branches
    getActiveBranches({})
      .then(data => {
        console.log("Fetched Branches:", data); // Log branches data
        setBranches(data);
      })
      .catch(error => {
        console.error("Error fetching branches:", error); // Log any error
      });

    // Fetch Staff Names (Created By)
    listStaffs({})
      .then(data => {
        console.log("Fetched Staffs:", data); // Log staffs data
        setStaffs(data);
      });

    // Fetch Shipment Statuses
    getActiveShipmentStatuses('your-token-here')
      .then(data => {
        console.log("Fetched Shipment Statuses:", data);
        setShipmentStatuses(data);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="bg-white rounded-lg p-6">
        <h2 className="create-shipment-header text-xl font-semibold text-gray-800 mb-6 flex gap-2 items-center"><span className='shipment-header-icon text-[#ED2624]'><PiShippingContainerFill/></span>Create Shipment</h2>
        
        <form>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Shipment Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipment Number</label>
              <input 
                type="text"
                name="shipmentNumber"
                value={formData.shipmentNumber}
                onChange={handleChange}
                placeholder="Enter Shipment Number" 
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>

            {/* Port of Origin */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Port Of Origin</label>
              <select 
                name="portOfOrigin"
                value={formData.portOfOrigin}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option>Select</option>
                {ports.map((port) => (
                  <option key={port.id} value={port.id}>{port.name}</option>
                ))}
              </select>
            </div>

            {/* Port of Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Port Of Destination</label>
              <select 
                name="portOfDestination"
                value={formData.portOfDestination}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option>Select</option>
                {ports.map((port) => (
                  <option key={port.id} value={port.id}>{port.name}</option>
                ))}
              </select>
            </div>

            {/* Shipping Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipping Method</label>
              <select 
                name="shippingMethod"
                value={formData.shippingMethod}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option>Select</option>
                {shipmentMethods.map((method) => (
                  <option key={method.id} value={method.id}>{method.name}</option>
                ))}
              </select>
            </div>

            {/* AWB No / Container No */}
            <div>
              <label className="block text-sm font-medium text-gray-700">AWB No / Container no:</label>
              <input 
                type="text" 
                name="awbNo"
                value={formData.awbNo}
                onChange={handleChange}
                placeholder="Enter AWB or Container No" 
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>

            {/* Created On */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Created On</label>
              <input 
                type="date" 
                name="createdOn"
                value={formData.createdOn} 
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>

            {/* Clearing Agent */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Clearing Agent</label>
              <select 
                name="clearingAgent"
                value={formData.clearingAgent}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option>Select Agent</option>
                {branches.length > 0 ? (
                  branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                  ))
                ) : (
                  <option>No branches available</option>
                )}
              </select>
            </div>

            {/* Created by */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Created by</label>
              <select 
                name="createdBy"
                value={formData.createdBy}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option>Select Staff</option>
                {staffs.map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
            </div>

            {/* Shipment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipment Status</label>
              <select 
                name="shipmentStatus"
                value={formData.shipmentStatus}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Shipment Booked">Shipment Booked</option>
                {shipmentStatuses.map((status) => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </div>

            {/* License Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700">License Details</label>
              <input 
                type="text" 
                name="licenseDetails"
                value={formData.licenseDetails}
                onChange={handleChange}
                placeholder="Enter License Details" 
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>

            {/* Exchange Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Exchange Rate</label>
              <input 
                type="text" 
                name="exchangeRate"
                value={formData.exchangeRate}
                onChange={handleChange}
                placeholder="Enter Exchange Rate" 
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>

            {/* Shipment Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Shipment Details</label>
              <input 
                type="text" 
                name="shipmentDetails"
                value={formData.shipmentDetails}
                onChange={handleChange}
                placeholder="Enter Shipment Details" 
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-[#262262] text-white font-semibold rounded-md hover:bg-[#1a1746]">Submit</button>
            <button type="button" className="ml-4 px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateShipment;
