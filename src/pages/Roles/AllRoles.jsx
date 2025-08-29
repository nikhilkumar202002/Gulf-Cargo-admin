import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";

function AllRoles() {

  const { token, logout } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch roles from API
  const fetchRoles = async () => {
    try {
      if (!token) {
        setError("Unauthorized: Please log in first.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        "https://gulfcargoapi.bhutanvoyage.in/api/roles",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 401) {
        setError("Session expired. Logging out...");
        setTimeout(() => logout(), 1500);
        return;
      }

      const data = await response.json();
      console.log("API Roles Response:", data);

      // ✅ Access the correct property
      setRoles(data.roles || []);
      setError("");
    } catch (err) {
      console.error("Error fetching roles:", err);
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };


  // Fetch roles on mount + refresh every 5s
  useEffect(() => {
    fetchRoles();
    const interval = setInterval(() => {
      fetchRoles();
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);


  return (
    <>
      <section className="all-roles p-6">
        <div className="all-roles-container max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">All Roles</h2>

          {loading ? (
            <p className="text-gray-600">Loading roles...</p>
          ) : roles.length === 0 ? (
            <p className="text-red-500">No roles found.</p>
          ) : (

            <div className="overflow-x-auto rounded-lg p-6 bg-white">
              <table className="w-full text-left ">
                <thead>
                  <tr className="text-[#262262] text-sm border-b border-gray-200">
                    <th className="px-4 py-3">Sl. No</th>
                    <th className="px-4 py-3">Role Name</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, index) => (
                    <tr
                      key={role.id}
                      className="hover:bg-gray-50 border-b border-gray-200 text-sm"
                    >
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">{role.role_name}</td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default AllRoles