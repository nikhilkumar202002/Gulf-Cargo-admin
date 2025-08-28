import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const EditBranch = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [branch, setBranch] = useState({
    branch_name: "",
    branch_code: "",
    contact_number: "",
    alternative_number: "",
    email: "",
    location: "",
    website: "",
    address: "",
    status: "Active",
  });

  // ✅ Fetch branch details
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const response = await axios.post(
          "https://gulfcargoapi.bhutanvoyage.in/api/branch/view",
          { id } // sending branch id in request body
        );
        setBranch(response.data);
      } catch (error) {
        console.error("Error fetching branch:", error);
      }
    };

    fetchBranch();
  }, [id]);

  // ✅ Handle input changes
  const handleChange = (e) => {
    setBranch({ ...branch, [e.target.name]: e.target.value });
  };

  // ✅ Update branch
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `https://gulfcargoapi.bhutanvoyage.in/api/branch/update/${id}`,
        branch
      );
      navigate("/branches");
    } catch (error) {
      console.error("Error updating branch:", error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Edit Branch</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="branch_name"
            value={branch.branch_name}
            onChange={handleChange}
            placeholder="Branch Name"
            className="border p-2 w-full"
          />
          <input
            type="text"
            name="branch_code"
            value={branch.branch_code}
            onChange={handleChange}
            placeholder="Branch Code"
            className="border p-2 w-full"
          />
          <input
            type="text"
            name="contact_number"
            value={branch.contact_number}
            onChange={handleChange}
            placeholder="Contact Number"
            className="border p-2 w-full"
          />
          <input
            type="text"
            name="alternative_number"
            value={branch.alternative_number}
            onChange={handleChange}
            placeholder="Alternative Number"
            className="border p-2 w-full"
          />
          <input
            type="email"
            name="email"
            value={branch.email}
            onChange={handleChange}
            placeholder="Email"
            className="border p-2 w-full"
          />
          <input
            type="text"
            name="location"
            value={branch.location}
            onChange={handleChange}
            placeholder="Location"
            className="border p-2 w-full"
          />
          <input
            type="text"
            name="website"
            value={branch.website}
            onChange={handleChange}
            placeholder="Website"
            className="border p-2 w-full"
          />
        </div>
        <textarea
          name="address"
          value={branch.address}
          onChange={handleChange}
          placeholder="Address"
          className="border p-2 w-full"
        />
        <select
          name="status"
          value={branch.status}
          onChange={handleChange}
          className="border p-2 w-full"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Update
        </button>
      </form>
    </div>
  );
};

export default EditBranch;
