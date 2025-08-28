import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

function UserProfile() {

    const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

   useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get(
          "https://gulfcargoapi.bhutanvoyage.in/api/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (response.data?.success && response.data?.user) {
          setUser(response.data.user);
        } else {
          throw new Error("Unexpected profile API response");
        }
      } catch (err) {
        console.error("Profile fetch failed:", err);
        logout();
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate, logout]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading user profile…
      </div>
    );
  }

  return (
    <>
        <section className='profile-page'>
            <div className="profile-page-container">
<div className="flex justify-center items-center min-h-screen p-6">
      <div className="bg-white shadow-lg rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white text-center">
          <img
            src={user.profile_pic || "/avatar.png"}
            alt="Profile"
            className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-md"
          />
          <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
          <p className="text-sm opacity-90">{user.email}</p>
          <p className="mt-1 text-xs bg-white/20 px-3 py-1 rounded-full inline-block">
            {user.role?.name}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-gray-700">
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Status</span>
            <span>{user.status}</span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Branch</span>
            <span>{user.branch?.name || "Not Assigned"}</span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Visa Status</span>
            <span>{user.visa?.status || "N/A"}</span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Visa Expiry</span>
            <span>{user.visa?.expiry || "N/A"}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Documents</span>
            <span>
              {user.documents?.document_number
                ? user.documents.document_number
                : "Not Uploaded"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center">
          <button className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
            </div>
        </section>
    </>
  )
}

export default UserProfile