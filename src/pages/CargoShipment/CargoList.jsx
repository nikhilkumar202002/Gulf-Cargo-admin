import React, { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import * as XLSX from 'xlsx';
import { CiMenuKebab } from 'react-icons/ci';
import { GiCargoCrate } from "react-icons/gi";
import "./ShipmentStyles.css";

// Dummy data for testing
const cargos = [
  {
    slno: 1,
    bookingNo: 'B123',
    transferFrom: 'Port A',
    sender: 'John Doe',
    receiver: 'Jane Smith',
    date: '2025-09-17',
    noPcs: 5,
    totalWeight: '200 kg',
    status: 'Enquiry Collected',
  },
  {
    slno: 2,
    bookingNo: 'B124',
    transferFrom: 'Port B',
    sender: 'Mark Lee',
    receiver: 'Sarah Kim',
    date: '2025-09-16',
    noPcs: 3,
    totalWeight: '150 kg',
    status: 'Pending',
  },
  // Add more sample data as needed
];

function AllCargoList() {
  const [filteredCargos, setFilteredCargos] = useState(cargos);
  const [filter, setFilter] = useState({
    sender: '',
    receiver: '',
    date: '',
    fromDate: '',
    tillDate: '',
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
  };

  const filterData = () => {
    let filtered = cargos.filter((cargo) => {
      const isSenderMatch = filter.sender ? cargo.sender.toLowerCase().includes(filter.sender.toLowerCase()) : true;
      const isReceiverMatch = filter.receiver ? cargo.receiver.toLowerCase().includes(filter.receiver.toLowerCase()) : true;
      const isDateMatch = filter.date ? cargo.date === filter.date : true;
      const isFromDateMatch = filter.fromDate ? new Date(cargo.date) >= new Date(filter.fromDate) : true;
      const isTillDateMatch = filter.tillDate ? new Date(cargo.date) <= new Date(filter.tillDate) : true;
      return isSenderMatch && isReceiverMatch && isDateMatch && isFromDateMatch && isTillDateMatch;
    });
    setFilteredCargos(filtered);
  };

  React.useEffect(() => {
    filterData();
  }, [filter]);

  const handleExcelExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredCargos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cargos');
    XLSX.writeFile(wb, 'Cargos.xlsx');
  };

  return (
    <section className="bg-gray-50 p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-indigo-600 flex items-center gap-2">
            <GiCargoCrate className="text-2xl" />
            All Cargo List
          </h1>
          <button
            onClick={() => window.history.back()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Back
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="whi">
            <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
                 <input
            type="text"
            name="sender"
            value={filter.sender}
            onChange={handleFilterChange}
            className="border p-2 rounded- w-full"
            placeholder="Filter by Sender "
          />
          <input
            type="text"
            name="receiver"
            value={filter.receiver}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
            placeholder="Filter by Receiver"
          />
          <input
            type="date"
            name="fromDate"
            value={filter.fromDate}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
          />
          <input
            type="date"
            name="tillDate"
            value={filter.tillDate}
            onChange={handleFilterChange}
            className="border p-2 rounded-lg w-full"
          />
          <button
            onClick={filterData}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Apply
          </button>
          <button
            onClick={handleExcelExport}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Export to Excel
          </button>
            </div>
         
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-200 text-sm text-gray-700">
              <tr>
                <th className="py-2 px-4 border">ID</th>
                <th className="py-2 px-4 border">Booking No.</th>
                <th className="py-2 px-4 border">Sender</th>
                <th className="py-2 px-4 border">Receiver</th>
                <th className="py-2 px-4 border">Date</th>
                <th className="py-2 px-4 border">Weight (kg)</th>
                <th className="py-2 px-4 border">Status</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              {filteredCargos.map((cargo) => (
                <tr key={cargo.slno} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{cargo.slno}</td>
                  <td className="py-2 px-4 border">{cargo.bookingNo}</td>
                  <td className="py-2 px-4 border">{cargo.sender}</td>
                  <td className="py-2 px-4 border">{cargo.receiver}</td>
                  <td className="py-2 px-4 border">{cargo.date}</td>
                  <td className="py-2 px-4 border">{cargo.totalWeight}</td>
                  <td className="py-2 px-4 border">
                    <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded-lg">
                      {cargo.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 border">
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="bg-gray-100 text-black px-2 py-1 rounded-md hover:bg-gray-200">
                        <CiMenuKebab />
                      </Menu.Button>

                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            <Menu.Item>
                              <button className="block px-4 py-2 text-sm text-gray-700">Edit</button>
                            </Menu.Item>
                            <Menu.Item>
                              <button className="block px-4 py-2 text-sm text-gray-700">View</button>
                            </Menu.Item>
                            <Menu.Item>
                              <button className="block px-4 py-2 text-sm text-gray-700">Invoice</button>
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AllCargoList;
