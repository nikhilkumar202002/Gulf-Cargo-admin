// src/pages/staff/StaffCreate.jsx
import React, { useEffect, useState } from "react";
import { HiUserAdd } from "react-icons/hi";
import { useAuth } from "../../auth/AuthContext";
import "../Styles.css";

import { getActiveBranches } from "../../api/branchApi";
import { getActiveVisaTypes } from "../../api/visaType";
import { getAllRoles } from "../../api/rolesApi";
import { getActiveDocumentTypes } from "../../api/documentTypeApi";
import { staffRegister } from "../../api/accountApi"; // <-- uses (data, token, axiosOpts?)

const toList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

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

  // selections (IDs as strings)
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("");
  const [selectedVisaType, setSelectedVisaType] = useState("");

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [visaExpiryDate, setVisaExpiryDate] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");

  // enums (as required by backend)
  const [status, setStatus] = useState("1");      // staff status: "1" active, "0" inactive
  const [visaStatus, setVisaStatus] = useState("1"); // visa status: "1" active, "0" inactive

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0); // to reset file inputs
  const [submitMsg, setSubmitMsg] = useState({ text: "", variant: "" }); // success | error

  useEffect(() => {
    if (!token) return;

    (async () => {
      try { setBranches(toList(await getActiveBranches())); } catch { setBranches([]); }
      finally { setLoadingBranches(false); }

      try { setVisas(toList(await getActiveVisaTypes())); } catch { setVisas([]); }
      finally { setLoadingVisas(false); }

      try { setRoles(toList(await getAllRoles())); } catch { setRoles([]); }
      finally { setLoadingRoles(false); }

      try { setDocTypes(toList(await getActiveDocumentTypes())); } catch { setDocTypes([]); }
      finally { setLoadingDocTypes(false); }
    })();
  }, [token]);

  const requiredOk = () =>
    name.trim() &&
    email.trim() &&
    password.trim() &&
    selectedRole &&
    selectedBranch &&
    appointmentDate &&
    visaExpiryDate &&
    selectedVisaType &&
    visaStatus !== "" &&
    selectedDocType &&
    documentNumber.trim();

  const resetFields = () => {
    setName("");
    setEmail("");
    setPassword("");
    setContactNumber("");
    setAppointmentDate("");
    setVisaExpiryDate("");
    setDocumentNumber("");
    setSelectedBranch("");
    setSelectedRole("");
    setSelectedDocType("");
    setSelectedVisaType("");
    setStatus("1");
    setVisaStatus("1");
    setFormKey((k) => k + 1); // resets uncontrolled inputs (file)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg({ text: "", variant: "" });

    if (!requiredOk()) {
      setSubmitMsg({ text: "Fill all required fields.", variant: "error" });
      return;
    }

    const roleObj = roles.find((r) => String(r.id ?? r._id) === String(selectedRole));
    const roleName =
      (roleObj?.role_name ?? roleObj?.name ?? roleObj?.title ?? "").trim() || "Staff";

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      role: roleName,
      role_id: String(selectedRole),
      contact_number: contactNumber || undefined,
      branch_id: String(selectedBranch),
      status: status === "" ? 1 : Number(status),               // 1/0
      appointment_date: appointmentDate,                         // YYYY-MM-DD
      visa_expiry_date: visaExpiryDate,                          // YYYY-MM-DD
      visa_type_id: String(selectedVisaType),
      visa_status: visaStatus === "" ? 1 : Number(visaStatus),   // 1/0
      document_id: String(selectedDocType),
      document_number: documentNumber.trim(),
      documents: [],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      setSubmitting(true);
      const res = await staffRegister(payload, token, { signal: controller.signal });
      // ✅ show success message below button
      setSubmitMsg({
        text: res?.message || "User registered successfully.",
        variant: "success",
      });
      // ✅ reset all fields (message remains visible)
      resetFields();
    } catch (err) {
      // show backend validation under the button
      const respErrors =
        err?.data?.errors || err?.response?.data?.errors || {};
      const flat = Object.entries(respErrors).map(
        ([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`
      );
      setSubmitMsg({
        text: [err?.message || "Registration failed.", ...flat].join(" "),
        variant: "error",
      });
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false); // <-- guarantees the button goes back to "Submit"
    }
  };

  const getId = (x) => x?.id ?? x?._id ?? x?.value;
  const getBranchLabel = (b) => b?.branch_name ?? b?.name ?? b?.title ?? `Branch #${b?.id ?? b?._id}`;
  const getRoleLabel = (r) => r?.role_name ?? r?.name ?? r?.title ?? `Role #${r?.id ?? r?._id}`;
  const getDocTypeLabel = (d) =>
    d?.name ?? d?.document_name ?? d?.document_type ?? d?.type_name ?? d?.title ?? `Doc #${d?.id ?? d?._id}`;
  const getVisaTypeLabel = (v) => v?.type_name ?? v?.name ?? v?.title ?? `Visa #${v?.id ?? v?._id}`;

  return (
    <div className="flex justify-center items-center w-full">
      <div className="w-full max-w-4xl bg-white rounded-2xl p-8">
        <div className="staffcreate-header">
          <h1 className="staffcreate-heading flex items-center gap-3">
            <span className="staff-form-header-icon"><HiUserAdd /></span>
            Staff Registration
          </h1>
        </div>

        {/* key={formKey} resets file inputs on success */}
        <form key={formKey} className="space-y-6" onSubmit={handleSubmit}>
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Name *</label>
              <input
                type="text"
                placeholder="Enter Full Name"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={name} onChange={(e) => setName(e.target.value)} required
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
              <label className="block text-sm font-medium text-gray-700">Staff Password *</label>
              <input
                type="password"
                placeholder="Enter Password"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Email *</label>
              <input
                type="email"
                placeholder="Enter Email"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>
          </div>

          {/* Row 2b */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <input
                type="text"
                placeholder="+971…"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={contactNumber} onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Branch *</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                disabled={loadingBranches}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)} required
              >
                <option value="">{loadingBranches ? "Loading branches..." : "Select Branch"}</option>
                {!loadingBranches &&
                  branches.map((b) => (
                    <option key={getId(b)} value={String(getId(b))}>
                      {getBranchLabel(b)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Status *</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={status}
                onChange={(e) => setStatus(e.target.value)} required
              >
                <option value="">Select Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Staff Role *</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                disabled={loadingRoles}
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)} required
              >
                <option value="">{loadingRoles ? "Loading roles..." : "Select Role"}</option>
                {!loadingRoles &&
                  roles.map((r) => (
                    <option key={getId(r)} value={String(getId(r))}>
                      {getRoleLabel(r)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Row 4: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Visa Expiry Date *</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={visaExpiryDate} onChange={(e) => setVisaExpiryDate(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Appointment *</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} required
              />
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Document Type *</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                disabled={loadingDocTypes}
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)} required
              >
                <option value="">{loadingDocTypes ? "Loading document types..." : "Select Document Type"}</option>
                {!loadingDocTypes &&
                  docTypes.map((d) => (
                    <option key={getId(d)} value={String(getId(d))}>
                      {d?.name ?? d?.document_name ?? d?.document_type ?? d?.type_name ?? d?.title}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type of Visa *</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                disabled={loadingVisas}
                value={selectedVisaType}
                onChange={(e) => setSelectedVisaType(e.target.value)} required
              >
                <option value="">{loadingVisas ? "Loading visa types..." : "Select Visa Type"}</option>
                {!loadingVisas &&
                  visas.map((v) => (
                    <option key={getId(v)} value={String(getId(v))}>
                      {getVisaTypeLabel(v)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Row 6 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Upload Document</label>
              <input type="file" className="mt-1 w-full text-gray-700 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Visa Status *</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                value={visaStatus}
                onChange={(e) => setVisaStatus(e.target.value)} required
              >
                <option value="">Select Visa Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Document Number *</label>
            <input
              type="text"
              placeholder="Enter Document Number"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
              value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button type="button" className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="staff-create-form-btn bg-[#262262] text-white px-5 py-2 rounded-lg hover:bg-[#3e379b] transition disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>

          {/* Message BELOW the buttons */}
          {submitMsg.text && (
            <p
              className={`mt-2 text-sm ${
                submitMsg.variant === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {submitMsg.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default StaffCreate;
