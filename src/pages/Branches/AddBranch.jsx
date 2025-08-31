import { useState } from "react";
import { storeBranch } from "../../api/branchApi"; 

const AddBranch = () => {

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    branchName: "",
    location: "",
    branchCode: "",
    contactNo: "",
    alternativeContactNo: "",   
    adminEmail: "",
    adminPassword: "",
    branchAddress: "",
    branchEmail: "",
    website: "",
    status: 1,
  });

 const handleChange = (e) => {
    const { name, value } = e.target;
    const val = name === "status" ? Number(value) : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("⚠️ You are not logged in!");
        return;
      }

      // Backend expects snake_case keys
      const payload = {
        branch_name: formData.branchName,
        branch_code: formData.branchCode,
        branch_contact_number: formData.contactNo,
        branch_alternative_number: formData.alternativeContactNo,
        branch_email: formData.branchEmail,
        branch_address: formData.branchAddress,
        branch_location: formData.location,
        branch_website: formData.website,
        status: formData.status,
      };

      const data = await storeBranch(payload); 

      if (data) {
        setMessage("✅ Branch created successfully!");
        setFormData({
          branchName: "",
          location: "",
          branchCode: "",
          contactNo: "",
          alternativeContactNo: "",
          adminEmail: "",
          adminPassword: "",
          branchAddress: "",
          branchEmail: "",
          website: "",
          status: 1,
        });
      }
    } catch (error) {
      if (error.response) {
        console.error("Branch creation failed:", error.response.data);
        setMessage("❌ " + (error.response.data.message || "Failed to create branch."));
      } else {
        console.error("Error:", error.message);
        setMessage("❌ " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="add-branch">
        <div className="add-branch-container flex items-center justify-center">
          <div className="min-h-screen bg-gray-50 p-6 w-full max-w-5xl">
            <div className="bg-white rounded-xl p-8">
              <h1 className="text-2xl font-semibold text-gray-700 mb-6">
                Create Branch
              </h1>

              {message && (
                <div className="mb-4 text-center text-sm font-medium text-blue-600">
                  {message}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Branch Name */}
                <div>
                  <label className="block text-gray-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Branch Code */}
                <div>
                  <label className="block text-gray-700 mb-1">Branch Code</label>
                  <input
                    type="text"
                    name="branchCode"
                    value={formData.branchCode}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Contact No */}
                <div>
                  <label className="block text-gray-700 mb-1">Contact No</label>
                  <input
                    type="text"
                    name="contactNo"
                    value={formData.contactNo}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-1">Alternative Contact No</label>
                  <input
                    type="text"
                    name="alternativeContactNo"
                    placeholder="Enter alternative contact number"
                    value={formData.alternativeContactNo}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Branch Email */}
                <div>
                  <label className="block text-gray-700 mb-1">Branch Email</label>
                  <input
                    type="email"
                    name="branchEmail"
                    value={formData.branchEmail}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Branch Address */}
                <div>
                  <label className="block text-gray-700 mb-1">Branch Address</label>
                  <textarea
                    name="branchAddress"
                    value={formData.branchAddress}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                {/* Website */}
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-1">
                    Website (Optional)
                  </label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status (Active / Inactive) */}
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>

                {/* Buttons */}
                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                 <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-2 rounded-lg text-white ${
                      loading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {loading ? "Submitting..." : "Submit"}
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
                        status: 1,
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