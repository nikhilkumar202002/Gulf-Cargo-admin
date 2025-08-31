// src/pages/staff/StaffCreate.jsx
import React, { useEffect, useState } from "react";
import { HiUserAdd } from "react-icons/hi";
import { useAuth } from "../../auth/AuthContext";
import "../Styles.css";

// ✅ Your API wrappers
import { getActiveBranches } from "../../api/branchApi";
import { getActiveVisaTypes } from "../../api/visaType";
import { getAllRoles } from "../../api/rolesApi";
import { getActiveDocumentTypes } from "../../api/documentTypeApi";

/** ---------- helpers ---------- */

// normalize common API shapes into an array
const toList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;
  // sometimes endpoints return {success, data:[...]}
  if (res && typeof res === "object" && Array.isArray(res.data)) return res.data;
  return [];
};

// pick a reasonable id
const getId = (x) => x?.id ?? x?._id ?? x?.value ?? String(x?.name ?? x?.title ?? "");

// labels (defensive against varying backend keys)
const getBranchLabel = (b) => b?.branch_name ?? b?.name ?? b?.title ?? `Branch #${b?.id ?? ""}`;
const getRoleLabel = (r) => r?.role_name ?? r?.name ?? r?.title ?? `Role #${r?.id ?? ""}`;
const getDocTypeLabel = (d) =>
  d?.name ?? d?.document_name ?? d?.document_type ?? d?.type_name ?? d?.title ?? `Doc #${d?.id ?? ""}`;
const getVisaTypeLabel = (v) => v?.type_name ?? v?.name ?? v?.title ?? `Visa #${v?.id ?? ""}`;

const StaffCreate = () => {
  const { token } = useAuth();

  // dropdown data
  const [branches, setBranches] = useState([]);
  const [visas, setVisas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [docTypes, setDocTypes] = useState([]);

  // loading flags
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingVisas, setLoadingVisas] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingDocTypes, setLoadingDocTypes] = useState(true);

  // selections (wire these into your submit payload later)
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("");
  const [selectedVisaType, setSelectedVisaType] = useState("");

  // basic fields (add the rest as needed)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!token) return; // if axiosInstance already injects token, this just avoids work before login

    const load = async () => {
      // Branches
      try {
        const res = await getActiveBranches(); // {data:[...]} or [...]
        setBranches(toList(res));
      } catch (e) {
        console.error("Branches load failed:", e);
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }

      // Visa Types
      try {
        const res = await getActiveVisaTypes();
        setVisas(toList(res));
      } catch (e) {
        console.error("Visa types load failed:", e);
        setVisas([]);
      } finally {
        setLoadingVisas(false);
      }

      // Roles
      try {
        const list = await getAllRoles();
        setRoles(toList(list));
      } catch (e) {
        console.error("Roles load failed:", e);
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }

      // Document Types
      try {
        const res = await getActiveDocumentTypes();
        setDocTypes(toList(res));
      } catch (e) {
        console.error("Document types load failed:", e);
        setDocTypes([]);
      } finally {
        setLoadingDocTypes(false);
      }
    };

    load();
  }, [token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: build payload from state and POST to your backend
    // const payload = { name, email, password, branch_id: selectedBranch, role_id: selectedRole, document_type_id: selectedDocType, visa_type_id: selectedVisaType, ... }
    // await createStaff(payload)
    console.log({
      name,
      email,
      password,
      branch_id: selectedBranch,
      role_id: selectedRole,
      document_type_id: selectedDocType,
      visa_type_id: selectedVisaType,
    });
    alert("Submit clicked — wire this to your create staff API.");
  };

  return (
    <div className="flex justify-center items-center w-full">
      <div className="w-full max-w-4xl bg-white rounded-2xl p-8">
        <div className="staffcreate-header">
          <h1 className="staffcreate-heading flex items-center gap-3">
            <span className="staff-form-header-icon"><HiUserAdd /></span>
            Staff Registration
          </h1>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Name</label>
              <input
                type="text"
                placeholder="Enter Full Name"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Upload Photo</label>
              <input type="file" className="mt-1 w-full text-gray-700 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Password</label>
              <input
                type="password"
                placeholder="Enter Password"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Email</label>
              <input
                type="email"
                placeholder="Enter Email"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Staff Branch</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
              disabled={loadingBranches}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">{loadingBranches ? "Loading branches..." : "Select Branch"}</option>
              {!loadingBranches &&
                branches.map((b) => (
                  <option key={getId(b)} value={getId(b)}>
                    {getBranchLabel(b)}
                  </option>
                ))}
            </select>
          </div>

          {/* Row 4: Status + Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Status</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200">
                <option value="">Select Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Role</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                disabled={loadingRoles}
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">{loadingRoles ? "Loading roles..." : "Select Role"}</option>
                {!loadingRoles &&
                  roles.map((r) => (
                    <option key={getId(r)} value={getId(r)}>
                      {getRoleLabel(r)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Row 5: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Visa Expiry Date</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Appointment</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200" />
            </div>
          </div>

          {/* Row 6: Document Type + Visa Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Document Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                disabled={loadingDocTypes}
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
              >
                <option value="">{loadingDocTypes ? "Loading document types..." : "Select Document Type"}</option>
                {!loadingDocTypes && docTypes.length === 0 && (
                  <option value="" disabled>No active document types found</option>
                )}
                {!loadingDocTypes &&
                  docTypes.map((d) => (
                    <option key={getId(d)} value={getId(d)}>
                      {getDocTypeLabel(d)}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type of Visa</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                disabled={loadingVisas}
                value={selectedVisaType}
                onChange={(e) => setSelectedVisaType(e.target.value)}
              >
                <option value="">{loadingVisas ? "Loading visa types..." : "Select Visa Type"}</option>
                {!loadingVisas && visas.length === 0 && (
                  <option value="" disabled>No active visa types found</option>
                )}
                {!loadingVisas &&
                  visas.map((v) => (
                    <option key={getId(v)} value={getId(v)}>
                      {getVisaTypeLabel(v)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Row 7 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Upload Document</label>
              <input type="file" className="mt-1 w-full text-gray-700 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Visa Status</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200">
                <option>Active</option>
                <option>Expired</option>
              </select>
            </div>
          </div>

          {/* Document ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Document ID</label>
            <input
              type="text"
              placeholder="Enter Document ID"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button type="button" className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 transition">
              Cancel
            </button>
            <button type="submit" className="staff-create-form-btn bg-[#262262] text-white px-5 py-2 rounded-lg hover:bg-[#3e379b] transition">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffCreate;
