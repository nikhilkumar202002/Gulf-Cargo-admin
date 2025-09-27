import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { FiArrowLeft } from "react-icons/fi";
import "../styles.css";

function ViewBranch() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBranch = async () => {
    try {
      const res = await api.get(`/branch/${id}`); // ✅ token auto-handled if axiosInstance has interceptor
      const b = res.data?.branch ?? res.data?.data ?? res.data;
      setBranch(b || null);
      setError("");
    } catch (err) {
      
      setError("Failed to fetch branch details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await fetchBranch();
    };
    run();

    const interval = setInterval(run, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  const isActive =
    branch &&
    (branch.status === 1 ||
      branch.status === "1" ||
      branch.status === true ||
      branch.status === "Active");

  return (
    <section className="flex justify-center py-10 px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6 md:p-10">
        <div className="view-branch-header flex justify-between border-b items-center">
          <h2>Branch Details</h2>
          <button
            className="flex items-center gap-2 mb-6 text-white bg-[#ED2624] hover:bg-[#e6403e] px-5 py-2 rounded-lg shadow transition-all duration-300"
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft size={18} />
            Back
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <p className="text-center text-lg text-gray-600 animate-pulse">
            Loading branch details...
          </p>
        ) : error ? (
          <p className="text-center text-red-500 text-lg">{error}</p>
        ) : (
          branch && (
            <div>
              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Branch Name
                  </span>
                  <span className="text-lg font-semibold text-gray-800">
                    {branch.branch_name}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Branch Code
                  </span>
                  <span className="text-lg font-semibold text-gray-800">
                    {branch.branch_code}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Alternative Number
                  </span>
                  <span className="text-lg font-semibold text-gray-800">
                    {branch.branch_alternative_number}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">Email</span>
                  <span className="text-lg font-semibold text-[#262262] break-words">
                    {branch.branch_email}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Address
                  </span>
                  <span className="text-lg font-semibold text-gray-800">
                    {branch.branch_address}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Location
                  </span>
                  <span className="text-lg font-semibold text-gray-800">
                    {branch.branch_location}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Contact Number
                  </span>
                  <span className="text-lg font-semibold text-gray-800">
                    {branch.branch_contact_number}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Website
                  </span>
                  <a
                    href={branch.branch_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-[#262262] hover:underline break-words"
                  >
                    {branch.branch_website}
                  </a>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Status
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold w-fit ${
                      branch.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {branch.status}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Created By
                  </span>
                  <span className="text-lg font-semibold text-gray-800">
                    {branch.created_by}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Creator Email
                  </span>
                  <span className="text-lg font-semibold text-[#262262] break-words">
                    {branch.created_by_email}
                  </span>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}

export default ViewBranch;
