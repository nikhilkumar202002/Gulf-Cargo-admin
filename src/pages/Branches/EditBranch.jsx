import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import axios from "axios";

const EditBranch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [branch, setBranch] = useState({
    branch_name: "",
    branch_code: "",
    branch_contact_number: "",
    branch_alternative_number: "",
    branch_email: "",
    branch_location: "",
    branch_website: "",
    branch_address: "",
    status: 1, // ✅ Default to active (numeric)
  });

  const [loading, setLoading] = useState(true);

  // ✅ Fetch existing branch details
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const response = await axios.get(
          `https://gulfcargoapi.bhutanvoyage.in/api/branch/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data && response.data.branch) {
         setBranch({
            branch_name: response.data.branch.branch_name || "",
            branch_code: response.data.branch.branch_code || "",
            branch_contact_number: response.data.branch.branch_contact_number || "",
            branch_alternative_number: response.data.branch.branch_alternative_number || "",
            branch_email: response.data.branch.branch_email || "",
            branch_location: response.data.branch.branch_location || "",
            branch_website: response.data.branch.branch_website || "",
            branch_address: response.data.branch.branch_address || "",
            status: Number(response.data.branch.status), // ✅ Force numeric
          });

        } else {
          alert("Branch details not found!");
        }
      } catch (error) {
        console.error("Error fetching branch:", error);
        alert("Failed to fetch branch details!");
      } finally {
        setLoading(false);
      }
    };

    fetchBranch();
  }, [id, token]);

  // ✅ Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setBranch({
      ...branch,
      [name]: name === "status" ? parseInt(value) : value, // ✅ Convert status to number
    });
  };

  // ✅ Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.put(
        `https://gulfcargoapi.bhutanvoyage.in/api/branch/${id}`,
        branch,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Branch updated successfully!");
      navigate("/branches");
    } catch (error) {
      console.error("Error updating branch:", error.response?.data || error);
      alert(
        `Failed to update branch!\n${
          error.response?.data?.message || "Please check all fields."
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
