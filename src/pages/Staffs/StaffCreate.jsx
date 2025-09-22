// src/pages/Staffs/StaffCreate.jsx
import React, { useEffect, useState, useRef } from "react";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { useSelector } from "react-redux";
import "../Styles.css";

import { getPhoneCodes } from "../../api/phoneCodeApi";
import { getActiveBranches } from "../../api/branchApi";
import { getActiveVisaTypes } from "../../api/visaType";
import { getAllRoles } from "../../api/rolesApi";
import { getActiveDocumentTypes } from "../../api/documentTypeApi";
import { staffRegister } from "../../api/accountApi";
import { FaUserCheck } from "react-icons/fa";

import { Link } from "react-router-dom";

import "./StaffStyles.css";

/* ---------- helpers ---------- */
const toList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};
const getId = (x) => x?.id ?? x?._id ?? x?.value;
const getBranchLabel = (b) => b?.branch_name ?? b?.name ?? b?.title ?? `Branch #${b?.id ?? b?._id}`;
const getRoleLabel = (r) => r?.role_name ?? r?.name ?? r?.title ?? `Role #${r?.id ?? r?._id}`;
const getDocTypeLabel = (d) =>
  d?.name ?? d?.document_name ?? d?.document_type ?? d?.type_name ?? d?.title ?? `Doc #${d?.id ?? d?._id}`;
const getVisaTypeLabel = (v) => v?.type_name ?? v?.name ?? v?.title ?? `Visa #${v?.id ?? v?._id}`;
const extractDial = (c) => {
  const raw = c?.code ?? c?.dial_code ?? c?.phone_code ?? c?.prefix ?? (c?.calling_code ? `+${c.calling_code}` : "");
  if (!raw) return "";
  const s = String(raw).trim();
  return s.startsWith("+") ? s : `+${s}`;
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const tooBig = (f) => f && f.size > MAX_FILE_BYTES;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^[0-9]{6,15}$/;
const passwordRe = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/; // >=6 chars, at least 1 letter & 1 digit

/* ---------- component ---------- */
const StaffCreate = () => {
  const token = useSelector((s) => s.auth?.token);

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
  const [showPwd, setShowPwd] = useState(false);
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
  const [phoneCodeId, setPhoneCodeId] = useState("");

  // validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // file refs
  const photoRef = useRef(null);
  const docRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        setLoadingBranches(true);
        setBranches(toList(await getActiveBranches()));
      } catch { setBranches([]); }
      finally { setLoadingBranches(false); }

      try {
        setLoadingVisas(true);
        setVisas(toList(await getActiveVisaTypes(token)));
      } catch { setVisas([]); }
      finally { setLoadingVisas(false); }

      try {
        setLoadingRoles(true);
        setRoles(toList(await getAllRoles()));
      } catch { setRoles([]); }
      finally { setLoadingRoles(false); }

      try {
        setLoadingDocTypes(true);
        setDocTypes(toList(await getActiveDocumentTypes()));
      } catch { setDocTypes([]); }
      finally { setLoadingDocTypes(false); }

      try {
        const pc = await getPhoneCodes();
        setPhoneCodes(pc);
      } catch { setPhoneCodes([]); }
    })();
  }, [token]);

  useEffect(() => {
    if (Array.isArray(phoneCodes) && phoneCodes.length && !phoneCodeId) {
      const india = phoneCodes.find((c) => extractDial(c) === "+91");
      if (india) {
        setPhoneCodeId(String(getId(india)));
        setPhoneCode(extractDial(india));
      }
    }
  }, [phoneCodes, phoneCodeId]);

  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const validateAll = () => {
    const next = {};

    if (!name.trim()) next.name = "Name is required.";
    if (!emailRe.test(email)) next.email = "Enter a valid email.";
    if (!passwordRe.test(password)) next.password = "Min 6 chars, include letters & numbers.";
    if (!selectedRole) next.selectedRole = "Select a role.";
    if (!selectedBranch) next.selectedBranch = "Select a branch.";
    if (!appointmentDate) next.appointmentDate = "Select appointment date.";
    if (!visaExpiryDate) next.visaExpiryDate = "Select visa expiry date.";
    if (appointmentDate && visaExpiryDate) {
      if (new Date(visaExpiryDate) <= new Date(appointmentDate)) {
        next.visaExpiryDate = "Visa expiry must be after appointment date.";
      }
    }
    if (!selectedVisaType) next.selectedVisaType = "Select visa type.";
    if (visaStatus === "") next.visaStatus = "Select visa status.";
    if (!selectedDocType) next.selectedDocType = "Select a document type.";
    if (!documentNumber.trim()) next.documentNumber = "Enter document number.";
    if (!phoneCodeId) next.phoneCodeId = "Select a country code.";
    if (contactNumber && !phoneRe.test(contactNumber)) {
      next.contactNumber = "Digits only (6–15).";
    }

    const photo = photoRef.current?.files?.[0];
    const docFiles = Array.from(docRef.current?.files ?? []);

    if (photo) {
      if (tooBig(photo)) next.profile_pic = "Profile photo exceeds 2MB.";
      if (!/^image\/(jpeg|jpg|png|webp)$/i.test(photo.type)) next.profile_pic = "Photo: JPG, PNG, or WEBP only.";
    }

    if (docFiles.length === 0) {
      next.documents = "Upload at least one document.";
    } else {
      for (const f of docFiles) {
        if (tooBig(f)) { next.documents = `Document "${f.name}" exceeds 2MB.`; break; }
        if (!/^(application\/pdf|image\/(jpeg|jpg|png|webp))$/i.test(f.type)) {
          next.documents = `Unsupported document type: ${f.name}`;
          break;
        }
      }
    }

    return { next, photo, docFiles };
  };

  const hasErrors = (obj) => Object.keys(obj).length > 0;

  const scrollToFirstError = (obj) => {
    const order = [
      "name","email","password",
      "selectedRole","selectedBranch",
      "appointmentDate","visaExpiryDate",
      "selectedVisaType","visaStatus",
      "selectedDocType","documentNumber",
      "phoneCodeId","contactNumber",
      "profile_pic","documents"
    ];
    const firstKey = order.find((k) => obj[k]);
    if (!firstKey) return;
    const el = document.querySelector(`[data-field="${firstKey}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // const requiredOk = () => {
  //   const { next } = validateAll();
  //   return !hasErrors(next);
  // };

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
    setErrors({});
    setTouched({});
    setFormKey((k) => k + 1); // resets file inputs
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitMsg({ text: "", variant: "" });

  const { next, photo, docFiles } = validateAll();
  setErrors(next);
  if (hasErrors(next)) {
    setTouched((t) => {
      const all = { ...t };
      Object.keys(next).forEach((k) => (all[k] = true));
      return all;
    });
    scrollToFirstError(next);
    setSubmitMsg({ text: "Please fix the highlighted fields.", variant: "error" });
    return;
  }

  // Resolve role name from the roles array
  const roleObj = roles.find((r) => String(getId(r)) === String(selectedRole));
  const roleName = (roleObj?.role_name ?? roleObj?.name ?? roleObj?.title ?? "").trim() || "Staff";

  // Build FormData
  const formData = new FormData();
  formData.append("name", name.trim());
  formData.append("email", email.trim());
  formData.append("password", password);
  formData.append("role", roleName);  // Now roleName is defined
  formData.append("role_id", String(selectedRole));
  formData.append("phone_code_id", String(phoneCodeId));  // Phone code ID is included
  formData.append("contact_number", contactNumber || "");  // Phone number is included
  formData.append("branch_id", String(selectedBranch));
  formData.append("status", status === "" ? "1" : String(status));
  formData.append("appointment_date", appointmentDate);
  formData.append("visa_expiry_date", visaExpiryDate);
  formData.append("visa_type_id", String(selectedVisaType));
  formData.append("visa_status", visaStatus === "" ? "1" : String(visaStatus));

  // document meta
  formData.append("document_type_id", String(selectedDocType));
  formData.append("document_id", String(selectedDocType));
  formData.append("document_number", documentNumber.trim());

  if (photo) {
    formData.append("profile_pic", photo, photo.name);
  }
  docFiles.forEach((f) => formData.append("documents[]", f, f.name));

  // Submit
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    setSubmitting(true);
    const res = await staffRegister(formData, token, { signal: controller.signal });
    setSubmitMsg({ text: res?.message || "User registered successfully.", variant: "success" });
    resetFields();
  } catch (err) {
    const apiErrors = err?.response?.data?.errors || err?.data?.errors || {};
    const flat = Object.entries(apiErrors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`);
    setSubmitMsg({
      text: [err?.response?.data?.message || err?.message || "Registration failed.", ...flat].join(" "),
      variant: "error",
    });
    console.error("Register failed", err?.response?.status, err?.response?.data);
  } finally {
    clearTimeout(timeoutId);
    setSubmitting(false);
  }
};



  // helper ui bits
  const err = (k) => touched[k] && errors[k];
  const inputClass = (k) =>
    `mt-1 w-full rounded-lg border px-3 py-2 shadow-sm focus:ring ${
      err(k) ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
    }`;

  return (
    <div className="flex justify-center items-center w-full">
      <div className="w-full max-w-4xl bg-white rounded-2xl p-8">
          <div className="add-cargo-header flex justify-between items-center">
            <h2 className="header-cargo-heading flex items-center gap-2">
              <span className="header-cargo-icon"><FaUserCheck /></span>
                Staff Registration
            </h2>
            <nav aria-label="Breadcrumb" className="">
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 hover:underline">
                    Home
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li>
                  <Link to="/hr&staff/allstaffs" className="text-gray-500 hover:text-gray-700 hover:underline">
                    Staffs
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li aria-current="page" className="text-gray-800 font-medium">
                  Add Staff
                </li>
              </ol>
            </nav>
          </div>

        <form key={formKey} className="space-y-6" onSubmit={handleSubmit} noValidate>
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-field="name">
              <label className="block text-sm font-medium text-gray-700">Staff Name *</label>
              <input
                type="text"
                placeholder="Enter Full Name"
                className={inputClass("name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => markTouched("name")}
                aria-invalid={!!err("name")}
                aria-describedby="name-err"
                required
              />
              {err("name") && <p id="name-err" className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div data-field="profile_pic">
              <label className="block text-sm font-medium text-gray-700">Upload Photo</label>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={`mt-1 w-full text-gray-700 border rounded-lg px-3 py-2 cursor-pointer ${err("profile_pic") ? "border-red-500" : "border-gray-300"}`}
                onBlur={() => markTouched("profile_pic")}
                aria-invalid={!!err("profile_pic")}
                aria-describedby="photo-err"
              />
              {err("profile_pic") && <p id="photo-err" className="text-xs text-red-600 mt-1">{errors.profile_pic}</p>}
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-field="password">
              <label className="block text-sm font-medium text-gray-700">Staff Password *</label>
              <div className="mt-1 relative">
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Enter Password"
                  className={`${inputClass("password")} pr-10`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => markTouched("password")}
                  autoComplete="new-password"
                  aria-invalid={!!err("password")}
                  aria-describedby="password-err"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  title={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <IoEyeOff size={18} /> : <IoEye size={18} />}
                </button>
              </div>
              {err("password") && <p id="password-err" className="text-xs text-red-600 mt-1">{errors.password}</p>}
            </div>

            <div data-field="email">
              <label className="block text-sm font-medium text-gray-700">Staff Email *</label>
              <input
                type="email"
                placeholder="Enter Email"
                className={inputClass("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched("email")}
                autoComplete="email"
                aria-invalid={!!err("email")}
                aria-describedby="email-err"
                required
              />
              {err("email") && <p id="email-err" className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Row 2b */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-field="contactNumber">
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <div className="mt-1 flex gap-2">
                <div data-field="phoneCodeId" className="w-40">
                  <select
                    className={inputClass("phoneCodeId")}
                    value={phoneCodeId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setPhoneCodeId(id);
                      const obj = phoneCodes.find((c) => String(getId(c)) === String(id));
                      setPhoneCode(extractDial(obj) || "+");
                    }}
                    onBlur={() => markTouched("phoneCodeId")}
                    aria-invalid={!!err("phoneCodeId")}
                    aria-describedby="phonecode-err"
                    required
                  >
                    <option value="">{Array.isArray(phoneCodes) && phoneCodes.length ? "Select code" : "Loading codes…"}</option>
                    {Array.isArray(phoneCodes) && phoneCodes.map((c, i) => {
                      const dial = extractDial(c);
                      const name = c?.name ?? c?.country ?? c?.country_name ?? c?.iso2 ?? "";
                      return (
                        <option key={String(getId(c) ?? i)} value={String(getId(c))}>
                          {dial}{name ? ` — ${name}` : ""}
                        </option>
                      );
                    })}
                  </select>
                  {err("phoneCodeId") && <p id="phonecode-err" className="text-xs text-red-600 mt-1">{errors.phoneCodeId}</p>}
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Phone number"
                    className={inputClass("contactNumber")}
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    onBlur={() => markTouched("contactNumber")}
                    aria-invalid={!!err("contactNumber")}
                    aria-describedby="phone-err"
                  />
                  {err("contactNumber") && <p id="phone-err" className="text-xs text-red-600 mt-1">{errors.contactNumber}</p>}
                </div>
              </div>
            </div>

            <div data-field="selectedBranch">
              <label className="block text-sm font-medium text-gray-700">Staff Branch *</label>
              <select
                className={inputClass("selectedBranch")}
                disabled={loadingBranches}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                onBlur={() => markTouched("selectedBranch")}
                aria-invalid={!!err("selectedBranch")}
                aria-describedby="branch-err"
                required
              >
                <option value="">{loadingBranches ? "Loading branches..." : "Select Branch"}</option>
                {!loadingBranches && branches.map((b) => (
                  <option key={getId(b)} value={String(getId(b))}>
                    {getBranchLabel(b)}
                  </option>
                ))}
              </select>
              {err("selectedBranch") && <p id="branch-err" className="text-xs text-red-600 mt-1">{errors.selectedBranch}</p>}
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-field="status">
              <label className="block text-sm font-medium text-gray-700">Staff Status *</label>
              <select
                className={inputClass("status")}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                onBlur={() => markTouched("status")}
                required
              >
                <option value="">Select Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>

            <div data-field="selectedRole">
              <label className="block text-sm font-medium text-gray-700">Staff Role *</label>
              <select
                className={inputClass("selectedRole")}
                disabled={loadingRoles}
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                onBlur={() => markTouched("selectedRole")}
                aria-invalid={!!err("selectedRole")}
                aria-describedby="role-err"
                required
              >
                <option value="">{loadingRoles ? "Loading roles..." : "Select Role"}</option>
                {!loadingRoles && roles.map((r) => (
                  <option key={getId(r)} value={String(getId(r))}>
                    {getRoleLabel(r)}
                  </option>
                ))}
              </select>
              {err("selectedRole") && <p id="role-err" className="text-xs text-red-600 mt-1">{errors.selectedRole}</p>}
            </div>
          </div>

          {/* Row 4: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-field="visaExpiryDate">
              <label className="block text-sm font-medium text-gray-700">Visa Expiry Date *</label>
              <input
                type="date"
                className={inputClass("visaExpiryDate")}
                value={visaExpiryDate}
                onChange={(e) => setVisaExpiryDate(e.target.value)}
                onBlur={() => markTouched("visaExpiryDate")}
                aria-invalid={!!err("visaExpiryDate")}
                aria-describedby="visaexp-err"
                required
              />
              {err("visaExpiryDate") && <p id="visaexp-err" className="text-xs text-red-600 mt-1">{errors.visaExpiryDate}</p>}
            </div>

            <div data-field="appointmentDate">
              <label className="block text-sm font-medium text-gray-700">Date of Appointment *</label>
              <input
                type="date"
                className={inputClass("appointmentDate")}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                onBlur={() => markTouched("appointmentDate")}
                aria-invalid={!!err("appointmentDate")}
                aria-describedby="appoint-err"
                required
              />
              {err("appointmentDate") && <p id="appoint-err" className="text-xs text-red-600 mt-1">{errors.appointmentDate}</p>}
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-field="selectedDocType">
              <label className="block text-sm font-medium text-gray-700">Document Type *</label>
              <select
                className={inputClass("selectedDocType")}
                disabled={loadingDocTypes}
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                onBlur={() => markTouched("selectedDocType")}
                aria-invalid={!!err("selectedDocType")}
                aria-describedby="doctype-err"
                required
              >
                <option value="">{loadingDocTypes ? "Loading document types..." : "Select Document Type"}</option>
                {!loadingDocTypes && docTypes.map((d) => (
                  <option key={getId(d)} value={String(getId(d))}>
                    {getDocTypeLabel(d)}
                  </option>
                ))}
              </select>
              {err("selectedDocType") && <p id="doctype-err" className="text-xs text-red-600 mt-1">{errors.selectedDocType}</p>}
            </div>

            <div data-field="selectedVisaType">
              <label className="block text-sm font-medium text-gray-700">Type of Visa *</label>
              <select
                className={inputClass("selectedVisaType")}
                disabled={loadingVisas}
                value={selectedVisaType}
                onChange={(e) => setSelectedVisaType(e.target.value)}
                onBlur={() => markTouched("selectedVisaType")}
                aria-invalid={!!err("selectedVisaType")}
                aria-describedby="visatype-err"
                required
              >
                <option value="">{loadingVisas ? "Loading visa types..." : "Select Visa Type"}</option>
                {!loadingVisas && visas.length === 0 && (
                  <option value="">No visa types available</option>
                )}
                {!loadingVisas && visas.map((v) => (
                  <option key={getId(v)} value={String(getId(v))}>
                    {getVisaTypeLabel(v)}
                  </option>
                ))}
              </select>
              {err("selectedVisaType") && <p id="visatype-err" className="text-xs text-red-600 mt-1">{errors.selectedVisaType}</p>}
            </div>
          </div>

          {/* Row 6 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-field="documents">
              <label className="block text-sm font-medium text-gray-700">Upload Document(s) *</label>
              <input
                ref={docRef}
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className={`mt-1 w-full text-gray-700 border rounded-lg px-3 py-2 cursor-pointer ${err("documents") ? "border-red-500" : "border-gray-300"}`}
                onBlur={() => markTouched("documents")}
                aria-invalid={!!err("documents")}
                aria-describedby="docs-err"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                You can select multiple files. They’ll be sent as <code>documents[]</code>. Max 2MB each.
              </p>
              {err("documents") && <p id="docs-err" className="text-xs text-red-600 mt-1">{errors.documents}</p>}
            </div>

            <div data-field="visaStatus">
              <label className="block text-sm font-medium text-gray-700">Visa Status *</label>
              <select
                className={inputClass("visaStatus")}
                value={visaStatus}
                onChange={(e) => setVisaStatus(e.target.value)}
                onBlur={() => markTouched("visaStatus")}
                aria-invalid={!!err("visaStatus")}
                aria-describedby="visastatus-err"
                required
              >
                <option value="">Select Visa Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
              {err("visaStatus") && <p id="visastatus-err" className="text-xs text-red-600 mt-1">{errors.visaStatus}</p>}
            </div>
          </div>

          {/* Document Number */}
          <div data-field="documentNumber">
            <label className="block text-sm font-medium text-gray-700">Document Number *</label>
            <input
              type="text"
              placeholder="Enter Document Number"
              className={inputClass("documentNumber")}
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              onBlur={() => markTouched("documentNumber")}
              aria-invalid={!!err("documentNumber")}
              aria-describedby="docnum-err"
              required
            />
            {err("documentNumber") && <p id="docnum-err" className="text-xs text-red-600 mt-1">{errors.documentNumber}</p>}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 transition"
              onClick={resetFields}
            >
              Clear
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
