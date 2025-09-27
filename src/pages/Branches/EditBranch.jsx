import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import api from "../../api/axiosInstance";

const EditBranch = () => {
  const { id } = useParams();
  const navigate = useNavigate();

   const [branch, setBranch] = useState({
    branch_name: "",
    branch_code: "",
    branch_contact_number: "",
    branch_alternative_number: "",
    branch_email: "",
    branch_location: "",
    branch_website: "",
    branch_address: "",
    status: 1,
  });

  const [loading, setLoading] = useState(true);

   useEffect(() => {
    let cancelled = false;

    const fetchBranch = async () => {
      try {
        const res = await api.get(`/branch/${id}`); // ✅ baseURL + token auto
        const b =
          res.data?.branch ??
          res.data?.data ??
          res.data; // handle different shapes safely

        if (!b) throw new Error("Branch details not found");
        if (!cancelled) {
          setBranch({
            branch_name: b.branch_name || "",
            branch_code: b.branch_code || "",
            branch_contact_number: b.branch_contact_number || "",
            branch_alternative_number: b.branch_alternative_number || "",
            branch_email: b.branch_email || "",
            branch_location: b.branch_location || "",
            branch_website: b.branch_website || "",
            branch_address: b.branch_address || "",
            status: Number(b.status ?? 1), // ✅ keep numeric
          });
        }
      } catch (error) {
        
        alert("Failed to fetch branch details!");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBranch();
    return () => {
      cancelled = true;
    };
  }, [id]);

   const handleChange = (e) => {
    const { name, value } = e.target;
    setBranch((prev) => ({
      ...prev,
      [name]: name === "status" ? Number(value) : value,
    }));
  };


   const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/branch/${id}`, branch); 
      alert("Branch updated successfully!");
      navigate("/branches");
    } catch (error) {
      
      alert(
        `Failed to update branch!\n${
          error?.response?.data?.message || "Please check all fields."
        }`
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-lg font-semibold">
        Loading branch details...
      </div>
    );
  }

  return (
    <div className="flex justify-center py-10 px-4">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-8">
        <div className="view-branch-header flex justify-between border-b items-center">
          <h2>Update Branch</h2>
          <button
            className="flex items-center gap-2 mb-6 text-white bg-[#ED2624] hover:bg-[#e6403e] px-5 py-2 rounded-lg shadow transition-all duration-300"
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft size={18} />
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input
              type="text"
              name="branch_name"
              value={branch.branch_name}
              onChange={handleChange}
              placeholder="Branch Name"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="text"
              name="branch_code"
              value={branch.branch_code}
              onChange={handleChange}
              placeholder="Branch Code"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="text"
              name="branch_contact_number"
              value={branch.branch_contact_number}
              onChange={handleChange}
              placeholder="Contact Number"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="text"
              name="branch_alternative_number"
              value={branch.branch_alternative_number}
              onChange={handleChange}
              placeholder="Alternative Number"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="email"
              name="branch_email"
              value={branch.branch_email}
              onChange={handleChange}
              placeholder="Email"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              name="branch_location"
              value={branch.branch_location}
              onChange={handleChange}
              placeholder="Location"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              name="branch_website"
              value={branch.branch_website}
              onChange={handleChange}
              placeholder="Website"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Address */}
          <textarea
            name="branch_address"
            value={branch.branch_address}
            onChange={handleChange}
            placeholder="Address"
            className="border rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Status */}
         <select
          name="status"
          value={branch.status} // ✅ Always numeric
          onChange={(e) => setBranch({ ...branch, status: parseInt(e.target.value) })}
          className="border rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value={1}>Active</option>
          <option value={0}>Inactive</option>
        </select>


          {/* Submit Button */}
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-700 transition-all w-full"
          >
            Update Branch
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditBranch;
