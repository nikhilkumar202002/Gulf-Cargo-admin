import React, { useEffect, useState, useRef } from "react";
import { HiUserAdd } from "react-icons/hi";
import { useAuth } from "../../auth/AuthContext";
import "../Styles.css";

import { getPhoneCodes } from "../../api/phoneCodeApi";
import { getActiveBranches } from "../../api/branchApi";
import { getActiveVisaTypes } from "../../api/visaType";
import { getAllRoles } from "../../api/rolesApi";
import { getActiveDocumentTypes } from "../../api/documentTypeApi";
import { staffRegister } from "../../api/accountApi";

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
  const [appointmentDate, setAppointmentDate] = useState(""); // YYYY-MM-DD
  const [visaExpiryDate, setVisaExpiryDate] = useState("");   // YYYY-MM-DD
  const [documentNumber, setDocumentNumber] = useState("");

  // enums
  const [status, setStatus] = useState("1");
  const [visaStatus, setVisaStatus] = useState("1");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [submitMsg, setSubmitMsg] = useState({ text: "", variant: "" });

  const [phoneCodes, setPhoneCodes] = useState([]);
const [phoneCode, setPhoneCode] = useState("+91");

  // file refs
  const photoRef = useRef(null);
  const docRef = useRef(null);
  const docsRef = docRef;

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        setLoadingBranches(true);
        const branchesData = await getActiveBranches();
        setBranches(toList(branchesData));
      } catch {
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }

      try {
        setLoadingVisas(true);
        const visaData = await getActiveVisaTypes(token);
        setVisas(toList(visaData));
      } catch {
        setVisas([]);
      } finally {
        setLoadingVisas(false);
      }

      try {
        setLoadingRoles(true);
        setRoles(toList(await getAllRoles()));
      } catch {
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }

      try {
        setLoadingDocTypes(true);
        setDocTypes(toList(await getActiveDocumentTypes()));
      } catch {
        setDocTypes([]);
      } finally {
        setLoadingDocTypes(false);
      }

        try {
          const pc = await getPhoneCodes();   // already returns an array now
          setPhoneCodes(pc);                  // <-- was setPhoneCodes(toList(pc))
        } catch {
          setPhoneCodes([]);
        }

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
    setFormKey((k) => k + 1); // resets file inputs
  };

  const getId = (x) => x?.id ?? x?._id ?? x?.value;
  const getBranchLabel = (b) => b?.branch_name ?? b?.name ?? b?.title ?? `Branch #${b?.id ?? b?._id}`;
  const getRoleLabel = (r) => r?.role_name ?? r?.name ?? r?.title ?? `Role #${r?.id ?? r?._id}`;
  const getDocTypeLabel = (d) =>
    d?.name ?? d?.document_name ?? d?.document_type ?? d?.type_name ?? d?.title ?? `Doc #${d?.id ?? d?._id}`;
  const getVisaTypeLabel = (v) => v?.type_name ?? v?.name ?? v?.title ?? `Visa #${v?.id ?? v?._id}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg({ text: "", variant: "" });

    if (!requiredOk()) {
      setSubmitMsg({ text: "Fill all required fields.", variant: "error" });
      return;
    }

    const roleObj = roles.find((r) => String(getId(r)) === String(selectedRole));
    const roleName = (roleObj?.role_name ?? roleObj?.name ?? roleObj?.title ?? "").trim() || "Staff";

    const formData = new FormData();

    // basic fields
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    formData.append("password", password);
    formData.append("role", roleName);
    formData.append("role_id", String(selectedRole));
    formData.append("phone_code", phoneCode || "");
    formData.append("contact_number", contactNumber || "");
    formData.append("branch_id", String(selectedBranch));
    formData.append("status", status === "" ? 1 : Number(status));
    formData.append("appointment_date", appointmentDate);   // e.g. 2025-09-01
    formData.append("visa_expiry_date", visaExpiryDate);    // e.g. 2026-09-01
    formData.append("visa_type_id", String(selectedVisaType));
    formData.append("visa_status", visaStatus === "" ? 1 : Number(visaStatus));
    

    // photo
    if (photoRef.current?.files?.[0]) {
      formData.append("photo", photoRef.current.files[0]);
    }

    const photo = photoRef.current?.files?.[0];
      if (photo) {
        formData.append("profile_pic", photo); 
        formData.append("photo", photo);     
      }

    formData.append("document_id", String(selectedDocType));
    formData.append("document_number", documentNumber.trim());

    const docFiles = Array.from(docsRef.current?.files ?? []);
    docFiles.forEach((f) => formData.append("documents[]", f));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      setSubmitting(true);
      const res = await staffRegister(formData, token, { signal: controller.signal });
      setSubmitMsg({ text: res?.message || "User registered successfully.", variant: "success" });
      resetFields();
    } catch (err) {
      const errors = err?.response?.data?.errors || err?.data?.errors || {};
      const flat = Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`);
      setSubmitMsg({
        text: [err?.response?.data?.message || err?.message || "Registration failed.", ...flat].join(" "),
        variant: "error",
      });
      console.error("Register failed",
        err?.response?.status, err?.response?.data?.message, err?.response?.data?.errors);
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

useEffect(() => {
  const count = Array.isArray(phoneCodes) ? phoneCodes.length : 0;
  console.log(`[PhoneCodes] list ${count ? "loaded" : "empty"} (${count} items)`);

  if (count) {
    const exists = phoneCodes.some((c) => extractDial(c) === phoneCode);
    console.log(`[PhoneCodes] selected code "${phoneCode}" ${exists ? "FOUND" : "NOT FOUND"} in list`);
    if (!exists) {
      const sample = phoneCodes.slice(0, 5).map(extractDial).filter(Boolean);
      console.log("[PhoneCodes] first few codes:", sample);
    }
  }
}, [phoneCodes, phoneCode]);

  const extractDial = (c) => {
  const raw = c?.code ?? c?.dial_code ?? c?.phone_code ?? c?.prefix ?? (c?.calling_code ? `+${c.calling_code}` : "");
  if (!raw) return "";
  const s = String(raw).trim();
  return s.startsWith("+") ? s : `+${s}`;
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
            <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-gray-700 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer"
                />
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
              <div className="mt-1 flex gap-2">
                <select
                  className="w-28 rounded-lg border border-gray-300 px-2 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                >
                  {phoneCodes.length > 0 ? (
                    phoneCodes.map((c, i) => {
                      const code = c?.code ?? c?.dial_code ?? c?.phone_code ?? c?.prefix ?? "";
                      const name = c?.name ?? c?.country ?? c?.country_name ?? c?.iso2 ?? "";
                      if (!code) return null;
                      return (
                        <option key={`${code}-${name || i}`} value={code}>
                          {code}{name ? ` — ${name}` : ""}
                        </option>
                      );
                    })
                  ) : (
                    <>
                      <option value="+91">+91 — India</option>
                      <option value="+971">+971 — UAE</option>
                    </>
                  )}
                </select>

                <input
                  type="text"
                  placeholder="Phone number"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>
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
                      {getDocTypeLabel(d)}
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
                onChange={(e) => setSelectedVisaType(e.target.value)}
                required
              >
                <option value="">{loadingVisas ? "Loading visa types..." : "Select Visa Type"}</option>
                {!loadingVisas && visas.length === 0 && (
                  <option value="">No visa types available</option>
                )}
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
              <label className="block text-sm font-medium text-gray-700">Upload Document(s) *</label>
              <input
                ref={docRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="mt-1 w-full text-gray-700 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer"
                required
              />
              <p className="text-xs text-gray-500 mt-1">You can select multiple files. They’ll be sent as <code>documents[]</code>.</p>
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

          {submitMsg.text && (
            <p className={`mt-2 text-sm ${submitMsg.variant === "success" ? "text-green-600" : "text-red-600"}`}>
              {submitMsg.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default StaffCreate;
