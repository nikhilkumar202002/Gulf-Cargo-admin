// src/pages/Staffs/StaffCreate.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
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
import { Toaster, toast } from "react-hot-toast";
import StaffModal from "./components/StaffModal";
import axiosInstance from "../../api/axiosInstance";
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
  const raw =
    c?.code ??
    c?.dial_code ??
    c?.phone_code ??
    c?.prefix ??
    (c?.calling_code ? `+${c.calling_code}` : "");
  if (!raw) return "";
  const s = String(raw).trim();
  return s.startsWith("+") ? s : `+${s}`;
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const tooBig = (f) => f && f.size > MAX_FILE_BYTES;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Allow 9–15 digits.
const phoneRe = /^[0-9]{9,15}$/;
const passwordRe = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/; // >=6 chars, at least 1 letter & 1 digit

// --- phone helpers ---
const normalizeCode = (code) => {
  if (!code) return "";
  const c = String(code).trim();
  if (!c) return "";
  if (c.startsWith("+")) return c;
  if (c.startsWith("00")) return `+${c.slice(2)}`;
  return `+${c}`;
};

// find the longest matching dial code at the start of a typed string
const sniffDialFromTyped = (val, dialSet) => {
  if (!val?.startsWith("+")) return null;
  const m = val.match(/^\+(\d{1,5})/);
  if (!m) return null;
  for (let len = m[1].length; len >= 1; len--) {
    const tryCode = `+${m[1].slice(0, len)}`;
    if (dialSet.has(tryCode)) return tryCode;
  }
  return null;
};

const resolveFileUrl = (src) => {
  if (!src || /^https?:\/\//i.test(src) || /^data:image/i.test(src)) {
    return src || "";
  }
  const base = (axiosInstance.defaults.baseURL || "").replace(/\/+$/, "");
  const path = String(src).replace(/^\/+/, "");
  return base && path ? `${base}/${path}` : path;
};
/**
 * Normalizes the user object from the API response to match the structure
 * expected by the StaffModal component.
 * @param {object} user The raw user object from the API.
 * @param {object} formState The current state of the form to get related data.
 * @returns {object} A display-ready user object.
 */
const normalizeUserForDisplay = (user, formState) => {
  if (!user) return null;

  const { roles, branches, visas, docTypes } = formState.options;
  const role = roles.find(r => String(getId(r)) === String(user.role_id));
  const branch = branches.find(b => String(getId(b)) === String(user.branch_id));
  const visaType = visas.find(v => String(getId(v)) === String(user.visa_type_id)); 
  const docTypeId = user.document_type_id ?? user.document_id;
  const docType = docTypes.find(d => String(getId(d)) === String(docTypeId));

  const fullContact = (user.phone_code && user.contact_number)
    ? `${normalizeCode(user.phone_code)}${user.contact_number}`
    : user.contact_number;

  return {
    ...user,
    contact_full: fullContact,
    role: { id: user.role_id, name: role ? getRoleLabel(role) : user.role },
    branch: { id: user.branch_id, name: branch ? getBranchLabel(branch) : 'Unknown' },
    visa: {
      type_id: user.visa_type_id,
      type_name: visaType ? getVisaTypeLabel(visaType) : 'Unknown',
      expiry: user.visa_expiry_date,
      status: user.visa_status,
    },
    documents: {
      document_type_id: docTypeId,
      document_type_name: docType ? getDocTypeLabel(docType) : 'Unknown',
      document_number: user.document_number,
      files: (user.documents || []).map(file => typeof file === 'string' ? resolveFileUrl(file) : file),
    },
    profile_pic: resolveFileUrl(user.profile_pic),
  };
};

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
  const [phoneCode, setPhoneCode] = useState("+966");
  const [phoneCodeId, setPhoneCodeId] = useState("");

  // Build dial sets/maps from API list
  const dialSet = useMemo(() => {
    const s = new Set();
    (phoneCodes || []).forEach((c) => {
      const dial = normalizeCode(c?.dial_code || c?.dialCode || c?.code || c?.prefix || c?.phone_code);
      if (dial) s.add(dial);
    });
    return s;
  }, [phoneCodes]);

  const dialToId = useMemo(() => {
    const m = new Map();
    (phoneCodes || []).forEach((c) => {
      const dial = normalizeCode(c?.dial_code || c?.dialCode || c?.code || c?.prefix || c?.phone_code);
      const id = getId(c);
      if (dial && id && !m.has(dial)) m.set(dial, String(id));
    });
    return m;
  }, [phoneCodes]);

  // validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // file refs
  const photoRef = useRef(null);
  const docRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    (async () => {
      // BRANCHES
      try {
        setLoadingBranches(true);
        const list = await getActiveBranches({}, token); // pass token
        const arr = Array.isArray(list) ? list : [];
        setBranches(arr);

        // default to logged-in user's branch if available, else keep current selection, else first
        if (!selectedBranch && arr.length) {
          const auth = (() => {
            try { return JSON.parse(localStorage.getItem("auth") || "{}"); } catch { return {}; }
          })();
          const myId = auth?.user?.branch?.id ?? auth?.user?.branch_id ?? null;
          const pickId =
            (myId && arr.find(b => String(b.id) === String(myId))?.id) ||
            arr[0]?.id;
          if (pickId) setSelectedBranch(String(pickId));
        }
      } catch (e) {
        console.error("Failed to load branches", e);
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }

      // VISAS
      try {
        setLoadingVisas(true);
        setVisas(toList(await getActiveVisaTypes(token)));
      } catch {
        setVisas([]);
      } finally {
        setLoadingVisas(false);
      }

      // ROLES
      try {
        setLoadingRoles(true);
        setRoles(toList(await getAllRoles()));
      } catch {
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }

      // DOCUMENT TYPES
      try {
        setLoadingDocTypes(true);
        setDocTypes(toList(await getActiveDocumentTypes()));
      } catch {
        setDocTypes([]);
      } finally {
        setLoadingDocTypes(false);
      }

      // PHONE CODES
      try {
        const pc = await getPhoneCodes();
        setPhoneCodes(pc);
      } catch {
        setPhoneCodes([]);
      }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (Array.isArray(phoneCodes) && phoneCodes.length && !phoneCodeId) {
      const saudi = phoneCodes.find((c) => extractDial(c) === "+966");
      if (saudi) {
        setPhoneCodeId(String(getId(saudi)));
        setPhoneCode(extractDial(saudi));
      } else {
        const firstCode = phoneCodes[0];
        if (firstCode) {
          setPhoneCodeId(String(getId(firstCode)));
          setPhoneCode(extractDial(firstCode));
        }
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

    // Phone validation (digits only, 9–15)
    if (!phoneRe.test(contactNumber)) {
      next.contactNumber = "Enter 9–15 digits.";
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
      "name", "email", "password",
      "selectedRole", "selectedBranch",
      "appointmentDate", "visaExpiryDate",
      "selectedVisaType", "visaStatus",
      "selectedDocType", "documentNumber",
      "phoneCodeId", "contactNumber",
      "profile_pic", "documents"
    ];
    const firstKey = order.find((k) => obj[k]);
    if (!firstKey) return;
    const el = document.querySelector(`[data-field="${firstKey}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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

    // Resolve role display name for backend if needed
    const roleObj = roles.find((r) => String(getId(r)) === String(selectedRole));
    const roleName = (roleObj?.role_name ?? roleObj?.name ?? roleObj?.title ?? "").trim() || "Staff";

    // Build FormData
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    formData.append("password", password);
    formData.append("role", roleName);
    formData.append("role_id", String(selectedRole));

    // phone fields
    formData.append("phone_code_id", String(phoneCodeId));
    formData.append("phone_code", phoneCode);
    formData.append("contact_number", contactNumber); // national digits only

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

    if (photo) formData.append("profile_pic", photo, photo.name);
    docFiles.forEach((f) => formData.append("documents[]", f, f.name));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      setSubmitting(true);
      const res = await staffRegister(formData, token, { signal: controller.signal });
      const user = res?.user;
      if (!user) throw new Error("Unexpected response from server.");

      toast.success(res?.message || "Staff registered successfully");
      const displayUser = normalizeUserForDisplay(user, {
        options: { roles, branches, visas, docTypes },
        form: {
          appointmentDate,
          visaExpiryDate,
          visaStatus,
          documentNumber,
        }
      });
      setModalData(displayUser);
      setModalOpen(true);
      setSubmitMsg({ text: res?.message || "User registered successfully.", variant: "success" });
      resetFields();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || err?.data?.errors || {};
      const flat = Object.entries(apiErrors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`);
      setSubmitMsg({
        text: [err?.response?.data?.message || err?.message || "Registration failed.", ...flat].join(" "),
        variant: "error",
      });
      toast.error(err?.response?.data?.message || err?.message || "Registration failed.");
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  // helper ui bits
  const err = (k) => touched[k] && errors[k];
  const inputClass = (k) =>
    `mt-1 w-full rounded-lg border px-3 py-2 shadow-sm focus:ring ${
      err(k)
        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
        : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
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
                <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 hover:underline">Home</Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link to="/hr&staff/allstaffs" className="text-gray-500 hover:text-gray-700 hover:underline">Staffs</Link>
              </li>
              <li className="text-gray-400">/</li>
              <li aria-current="page" className="text-gray-800 font-medium">Add Staff</li>
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

          {/* Row 2b: Contact and Role */}
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
                      const dial =
                        normalizeCode(
                          obj?.dial_code || obj?.dialCode || obj?.code || obj?.prefix || obj?.phone_code
                        ) || extractDial(obj) || "+";
                      setPhoneCode(dial);
                    }}
                    onBlur={() => markTouched("phoneCodeId")}
                    aria-invalid={!!err("phoneCodeId")}
                    aria-describedby="phonecode-err"
                    required
                  >
                    <option value="">
                      {Array.isArray(phoneCodes) && phoneCodes.length ? "Select code" : "Loading codes…"}
                    </option>
                    {Array.isArray(phoneCodes) && phoneCodes.map((c, i) => {
                      const dial = extractDial(c);
                      return <option key={String(getId(c) ?? i)} value={String(getId(c))}>{dial}</option>;
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
                    onChange={(e) => {
                      const raw = e.target.value;
                      let payload = raw;

                      // auto-select & strip +<dial> if pasted/typed
                      if (raw && raw[0] === "+") {
                        try {
                          const found = sniffDialFromTyped(raw, dialSet || new Set());
                          if (found) {
                            const id = dialToId.get(found);
                            if (id) {
                              setPhoneCodeId(id);
                              setPhoneCode(found);
                            }
                            const escaped = found.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                            payload = raw.replace(new RegExp("^" + escaped), "");
                          }
                        } catch {
                          payload = raw; // fail safe
                        }
                      }

                      const digits = (payload || "").replace(/\D+/g, "");
                      setContactNumber(digits.slice(0, 15));
                    }}
                    onBlur={() => markTouched("contactNumber")}
                    inputMode="numeric"
                    pattern="\d*"
                    minLength={9}
                    maxLength={15}
                    aria-invalid={!!err("contactNumber")}
                    aria-describedby="phone-err"
                  />
                  {err("contactNumber") && <p id="phone-err" className="text-xs text-red-600 mt-1">{errors.contactNumber}</p>}
                </div>
              </div>
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

          {/* Row 2b */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <option value="">
                  {loadingBranches
                    ? "Loading branches..."
                    : branches.length
                    ? "Select Branch"
                    : "No active branches found"}
                </option>

                {branches.map((b) => (
                  <option key={String(b.id)} value={String(b.id)}>
                    {getBranchLabel(b)}
                  </option>
                ))}
              </select>
              {err("selectedBranch") && (
                <p id="branch-err" className="text-xs text-red-600 mt-1">{errors.selectedBranch}</p>
              )}
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
                {!loadingVisas && visas.length === 0 && <option value="">No visa types available</option>}
                {!loadingVisas && visas.map((v) => (
                  <option key={getId(v)} value={String(getId(v))}>
                    {getVisaTypeLabel(v)}
                  </option>
                ))}
              </select>
              {err("selectedVisaType") && <p id="visatype-err" className="text-xs text-red-600 mt-1">{errors.selectedVisaType}</p>}
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

          {/* Row 6 */}
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
          </div>

          {/* Document Upload */}
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
            <p className={`mt-2 text-sm ${submitMsg.variant === "success" ? "text-green-600" : "text-red-600"}`}>
              {submitMsg.text}
            </p>
          )}
        </form>
      </div>

      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <StaffModal open={modalOpen} onClose={() => setModalOpen(false)} data={modalData} />
    </div>
  );
};

export default StaffCreate;
