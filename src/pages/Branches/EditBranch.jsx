import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const EditBranch = () => {
  const { id } = useParams();
  const navigate = useNavigate();


  const token = localStorage.getItem("token");

  const [branch, setBranch] = useState({
    branch_name: "",
    branch_code: "",
    contact_number: "",
    alternative_number: "",
    email: "",
    location: "",
    website: "",
    address: "",
    status: "Active", // Default status
  });

  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const response = await axios.post(
          "https://gulfcargoapi.bhutanvoyage.in/api/branch/view",
          { id },
          {
            headers: {
              Authorization: `Bearer ${token}`, // ✅ Add token for security
            },
          }
        );

        // ✅ Set branch data from API response
        if (response.data) {
          setBranch({
            branch_name: response.data.branch_name || "",
            branch_code: response.data.branch_code || "",
            contact_number: response.data.contact_number || "",
            alternative_number: response.data.alternative_number || "",
            email: response.data.email || "",
            location: response.data.location || "",
            website: response.data.website || "",
            address: response.data.address || "",
            status: response.data.status || "Active",
          });
        }
      } catch (error) {
        console.error("Error fetching branch:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranch();
  }, [id, token]);

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
        branch,
        {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Secure update
          },
        }
      );

      alert("Branch updated successfully!");
      navigate("/branches");
    } catch (error) {
      console.error("Error updating branch:", error);
      alert("Failed to update branch!");
    }
  };

  // ✅ Show loading while fetching data
  if (loading) {
    return (
      <div className="p-6 text-center text-lg font-semibold">
        Loading branch details...
      </div>
    );
  }

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
            required
          />
          <input
            type="text"
            name="branch_code"
            value={branch.branch_code}
            onChange={handleChange}
            placeholder="Branch Code"
            className="border p-2 w-full"
            required
          />
          <input
            type="text"
            name="contact_number"
            value={branch.contact_number}
            onChange={handleChange}
            placeholder="Contact Number"
            className="border p-2 w-full"
            required
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
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Update Branch
        </button>
      </form>
    </div>
  );
};

export default EditBranch;
