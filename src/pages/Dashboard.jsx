import React, { useState } from "react";
import { FaUsers, FaClock, FaInbox, FaTruck, FaUserCheck, FaUserTimes, FaUserMinus, FaBoxOpen, FaRegClock, FaPeopleCarry, FaExchangeAlt, FaCircle, FaChevronRight, FaChevronLeft } from "react-icons/fa";
import "./Styles.css";

const Card = ({ data }) => (
  <div className="dashboard-card flex items-center gap-3 bg-white rounded-2xl shadow-sm">
    <div className="card-icon flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-xl text-blue-600">
      {data.icon}
    </div>
    <div className="flex flex-col">
      <h1 className="text-xl font-semibold">{data.value}</h1>
      <p className="text-sm text-gray-500">{data.title}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const mainCards = [
    { title: "Total Staffs", value: 100, icon: <FaUsers /> },
    { title: "Sender", value: 2868, icon: <FaInbox /> },
    { title: "Cargo Out for Delivery", value: 63, icon: <FaTruck /> },
    { title: "Cargo Pending", value: 41, icon: <FaClock /> },
  ];

  const staffData = [
    { label: 'Present', value: 80, icon: <FaUserCheck className="text-green-500" /> },
    { label: 'Absent', value: 15, icon: <FaUserTimes className="text-red-500" /> },
    { label: 'Partial', value: 5, icon: <FaUserMinus className="text-yellow-500" /> },
    { label: 'Moving Pending', value: 4, icon: <FaExchangeAlt className="text-pink-500" /> },
  ];

  const cargoData = [
    { label: 'Receiver', value: 2928, icon: <FaBoxOpen className="text-blue-400" /> },
    { label: 'Cargo Out for Delivery', value: 63, icon: <FaTruck className="text-purple-500" /> },
    { label: 'Waiting for Clearance', value: 12, icon: <FaRegClock className="text-orange-500" /> },
    { label: 'Moving Enquiry Collected', value: 87, icon: <FaPeopleCarry className="text-cyan-500" /> },
  ];

  const shipmentData = [
    {
      date: "Today",
      shipmentId: "CARGO-2023123",
      sender: "Acme Logistics",
      status: "Out for Delivery",
      destination: "New York, NY",
      type: "Express",
      amount: "- 120.00 $",
      statusColor: "bg-blue-500",
    },
    {
      date: "Today",
      shipmentId: "CARGO-2023124",
      sender: "FastShip",
      status: "Pending",
      destination: "Los Angeles, CA",
      type: "Standard",
      amount: "- 45.00 $",
      statusColor: "bg-yellow-400",
    },
    {
      date: "20.05",
      shipmentId: "CARGO-2023125",
      sender: "Eagle Carriers",
      status: "Delivered",
      destination: "Chicago, IL",
      type: "Overnight",
      amount: "- 150.00 $",
      statusColor: "bg-green-500",
    },
    {
      date: "19.05",
      shipmentId: "CARGO-2023126",
      sender: "ShipRight",
      status: "Cleared",
      destination: "Houston, TX",
      type: "Standard",
      amount: "- 100.00 $",
      statusColor: "bg-purple-500",
    },
    {
      date: "18.05",
      shipmentId: "CARGO-2023127",
      sender: "Urban Movers",
      status: "In Transit",
      destination: "Miami, FL",
      type: "Express",
      amount: "- 85.00 $",
      statusColor: "bg-orange-400",
    },
  ];

  const [page, setPage] = useState(1);

  return (
    <section className='dashboard min-h-screen bg-gray-50'>
      <div className="dashboard-container max-w-7xl mx-auto py-8">

        {/* Staff cards */}
        <div className="dashboard-row grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {mainCards.map((card, index) => (
            <Card key={index} data={card} />
          ))}
        </div>

        <div className="dashboard-row">
          <div className="dashboard-row-heading mb-4">
            <h1 className='dashboard-overview text-xl font-bold'>Overview data</h1>
          </div>

          <div className="dashboard-table-wrapper flex gap-3 flex-col md:flex-row">
            {/* Staff Attendance Table */}
            <div className="staff-attendance bg-white rounded-2xl shadow-md p-6 flex-1">
              <h2 className="text-lg font-semibold mb-5">Staff Attendance</h2>
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-left font-semibold text-xs">
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right pr-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {staffData.map((row) => (
                    <tr key={row.label} className="border-b last:border-b-0">
                      <td className="flex items-center gap-3 py-3">
                        <span className="p-2 rounded-lg bg-gray-100">
                          {row.icon}
                        </span>
                        <span className="font-medium">{row.label}</span>
                      </td>
                      <td className="text-right font-semibold text-gray-700 pr-2">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cargo & Movement Table */}
            <div className="cargo-movement bg-white rounded-2xl shadow-md p-6 flex-1">
              <h2 className="text-lg font-semibold mb-5">Cargo & Movement Overview</h2>
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-left font-semibold text-xs">
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right pr-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {cargoData.map((row) => (
                    <tr key={row.label} className="border-b last:border-b-0">
                      <td className="flex items-center gap-3 py-3">
                        <span className="p-2 rounded-lg bg-gray-100">
                          {row.icon}
                        </span>
                        <span className="font-medium">{row.label}</span>
                      </td>
                      <td className="text-right font-semibold text-gray-700 pr-2">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Shipment Table */}
        <div className="dashboard-cargo-list mt-10">
          <div className="dashboard-cargo-list-heading mb-3">
            <h1 className="text-lg font-bold">Latest Shipments</h1>
          </div>

            <div className="dashboard-cargo-table rounded-2xl shadow-md bg-white px-6 py-8">
           
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 font-semibold">
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Shipment ID</th>
                    <th className="py-2 text-left">Sender</th>
                    <th className="py-2 text-left">Destination</th>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-left">Type</th>
                    <th className="py-2 text-left">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {shipmentData.map((item) => (
                    <tr key={item.shipmentId} className="border-t last:border-b-0 hover:bg-gray-50 transition">
                      <td className="py-2">{item.date}</td>
                      <td className="py-2 font-medium">{item.shipmentId}</td>
                      <td className="py-2">{item.sender}</td>
                      <td className="py-2">{item.destination}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${item.statusColor}`}>
                          <FaCircle className="w-2 h-2" /> {item.status}
                        </span>
                      </td>
                      <td className="py-2 text-left">{item.type}</td>
                      <td className="py-2 text-left font-semibold">{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex justify-between items-center mt-6">
                <button
                  className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-500 bg-gray-100 hover:bg-gray-200"
                  disabled={page === 1}
                >
                  <FaChevronLeft className="w-3 h-3" /> Prev
                </button>
                <span className="text-gray-600 text-sm">
                  Page {page} of 1
                </span>
                <button
                  className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm text-gray-500 bg-gray-100 hover:bg-gray-200"
                  disabled={true}
                >
                  Next <FaChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

    </section>
  );
};

export default Dashboard;
