"use client";

import { useState } from "react";

const AddBranch = () => {

   const [formData, setFormData] = useState({
    branchName: "",
    location: "",
    branchCode: "",
    contactNo: "",
    adminEmail: "",
    adminPassword: "",
    branchAddress: "",
    branchEmail: "",
    website: "",
  });

   const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Branch created successfully!");
    console.log("Submitted data:", formData);
  };


  return (
    <>
        <section className='add-branch'>
          <div className="add-branch-container flex items-center justify-center">
            
              <div className="min-h-screen bg-gray-50 p-6 w-full max-w-5xl">
                <div className="bg-white rounded-xl p-8 ">
                  
                  <h1 className="text-2xl font-semibold text-gray-700 mb-6">Create Branch</h1>

                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                    <div>
                      <label className="block text-gray-700 mb-1">Branch Name</label>
                      <input
                        type="text"
                        name="branchName"
                        placeholder="Enter title"
                        value={formData.branchName}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        name="location"
                        placeholder="Enter location"
                        value={formData.location}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-1">Branch Code</label>
                      <input
                        type="text"
                        name="branchCode"
                        placeholder="Enter branch code"
                        value={formData.branchCode}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                   
                    <div>
                      <label className="block text-gray-700 mb-1">Contact No</label>
                      <input
                        type="text"
                        name="contactNo"
                        placeholder="Enter contact number"
                        value={formData.contactNo}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-1">Admin Email</label>
                      <input
                        type="email"
                        name="adminEmail"
                        placeholder="Enter admin email"
                        value={formData.adminEmail}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-blue-50"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-1">Admin Password</label>
                      <input
                        type="password"
                        name="adminPassword"
                        placeholder="Enter password"
                        value={formData.adminPassword}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-blue-50"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-1">Branch Address</label>
                      <textarea
                        name="branchAddress"
                        placeholder="Enter branch address"
                        value={formData.branchAddress}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-1">Branch Email</label>
                      <input
                        type="email"
                        name="branchEmail"
                        placeholder="Enter branch email"
                        value={formData.branchEmail}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-1">Website (Optional)</label>
                      <input
                        type="text"
                        name="website"
                        placeholder="Enter website address"
                        value={formData.website}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Submit
                      </button>
                      <button
                        type="button"
                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                        onClick={() =>
                          setFormData({
                            branchName: "",
                            location: "",
                            branchCode: "",
                            contactNo: "",
                            adminEmail: "",
                            adminPassword: "",
                            branchAddress: "",
                            branchEmail: "",
                            website: "",
                          })
                        }
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
          </div>
        </section>
    </>
  )
}

export default AddBranch