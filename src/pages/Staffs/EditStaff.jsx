// src/pages/staff/EditStaff.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";

import axiosInstance from "../../api/axiosInstance";
import { getStaff, updateStaffProfile } from "../../api/accountApi";
import { getActiveBranches } from "../../api/branchApi";
import { getAllRoles } from "../../api/rolesApi";
import { getActiveVisaTypes } from "../../api/visaType";
import { getActiveDocumentTypes } from "../../api/documentTypeApi";

/* ---------------- Font note ----------------
Add Inter once (index.html):
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
and apply font-inter on <body> or a wrapper.
------------------------------------------------ */

const toList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};
const getId = (x) => x?.id ?? x?._id ?? x?.value;
const getBranchLabel = (b) => b?.branch_name ?? b?.name ?? b?.title ?? `Branch #${b?.id ?? b?._id}`;
const getRoleLabel = (r) => r?.role_name ?? r?.name ?? r?.title ?? `Role #${r?.id ?? r?._id}`;
const getDocTypeLabel = (d) => d?.name ?? d?.document_name ?? d?.document_type ?? d?.type_name ?? d?.title ?? `Doc #${d?.id ?? d?._id}`;
const getVisaTypeLabel = (v) => v?.type_name ?? v?.name ?? v?.title ?? `Visa #${v?.id ?? v?._id}`;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneDigitsRe = /^[0-9]{6,15}$/;       // digits only after we strip the code
const phoneWithCodeRe = /^\+?\d{7,18}$/;     // "+971501234567" etc.
const passwordRe = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const tooBig = (f) => f && f.size > MAX_FILE_BYTES;
const coerceStatus = (v) => (v === 1 || v === true || v === "1" || String(v).toLowerCase() === "active" ? 1 : 0);

const resolveFileUrl = (src) => {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  const base = (axiosInstance.defaults.baseURL || "").replace(/\/+$/, "");
  const path = String(src).replace(/^\/+/, "");
  return base && path ? `${base}/${path}` : path;
};

// aggressively figure out the real avatar path (mirrors StaffView patterns)
const computeAvatarUrl = (raw) => {
  const candidates = [
    raw?.avatar_url,
    raw?.avatar,
    raw?.photo_url,
    raw?.profile_image,
    raw?.image,
    raw?.photo,
  ].filter(Boolean);

  for (const c of candidates) {
    const abs = resolveFileUrl(c);
    if (abs) return abs;
    if (String(c).startsWith("storage/")) return `/${c}`;
    if (String(c).startsWith("/storage/")) return c;
  }
  return "";
};

const mapIn = (raw) => {
  if (!raw) {
    return {
      name: "", email: "",
      // we now store a single contact string WITH country code, e.g. +971501234567
      contact_full: "",
      branch_id: "", role_id: "", status: 1,
      appointment_date: "", visa_expiry_date: "",
      visa_type_id: "", visa_status: 1,
      document_type_id: "", document_number: "",
      avatar_url: "", documents: [],
      // keep originals for parsing on save:
      _phone_code: "", _contact_number: "",
    };
  }

  const roleId = raw.role_id ?? raw.roleId ?? (raw.role && (raw.role.id || raw.role.role_id)) ?? raw.role_id_fk ?? "";
  const phone_code = raw.phone_code || raw.dial_code || raw.country_code || raw.ccode || "";
  const contact_number = raw.contact_number ?? raw.phone ?? raw.mobile ?? "";
  const contact_full = (phone_code ? String(phone_code).startsWith("+") ? phone_code : `+${String(phone_code).replace(/^00/, "")}` : "")
    + String(contact_number || "");

  const docs = Array.isArray(raw.documents) ? raw.documents : [];

  return {
    name: raw.name ?? [raw.first_name, raw.last_name].filter(Boolean).join(" ") ?? "",
    email: raw.email ?? raw.user_email ?? "",

    contact_full: contact_full || "",

    branch_id: String(raw.branch_id ?? raw.branch?.id ?? "") || "",
    role_id: String(roleId || "") || "",
    status: coerceStatus(raw.status ?? raw.is_active ?? raw.active),

    appointment_date: raw.appointment_date ?? raw.joined_at ?? "",
    visa_expiry_date: raw.visa_expiry_date ?? "",
    visa_type_id: String(raw.visa_type_id ?? "") || "",
    visa_status: coerceStatus(raw.visa_status ?? 1),

    document_type_id: String(raw.document_type_id ?? raw.document_id ?? "") || "",
    document_number: raw.document_number ?? "",

    avatar_url: computeAvatarUrl(raw),
    documents: docs,

    _phone_code: phone_code || "",
    _contact_number: contact_number || "",
  };
};

const mapOut = (f) => {
  // parse contact_full into code + number
  // Accepts "+971501234567" or "971501234567" or just digits -> we try to extract a code prefix
  let code = "";
  let number = "";
  const raw = (f.contact_full || "").trim();
  if (!raw) {
    code = "";
    number = "";
  } else if (/^\+/.test(raw)) {
    // +<1-5 digits> then the rest
    const m = raw.match(/^\+(\d{1,5})(.*)$/);
    if (m) {
      code = `+${m[1]}`;
      number = (m[2] || "").replace(/\D+/g, "");
    } else {
      // fallback: strip non-digits, take first 2-3 as code
      const d = raw.replace(/\D+/g, "");
      code = d.length > 2 ? `+${d.slice(0, 3)}` : `+${d.slice(0, 2)}`;
      number = d.slice(code.length - 1);
    }
  } else {
    // no plus: try to treat first 2-3 digits as code (best effort)
    const d = raw.replace(/\D+/g, "");
    code = d.length > 2 ? `+${d.slice(0, 3)}` : `+${d.slice(0, 2)}`;
    number = d.slice(code.length - 1);
  }

  return {
    name: f.name.trim(),
    email: f.email.trim(),
    phone_code: code,           // backend can store code if it wants
    contact_number: number,     // digits only
    branch_id: f.branch_id,
    role_id: f.role_id,
    status: Number(f.status),
    appointment_date: f.appointment_date,
    visa_expiry_date: f.visa_expiry_date,
    visa_type_id: f.visa_type_id,
    visa_status: Number(f.visa_status),
    document_type_id: f.document_type_id,
    document_number: f.document_number.trim(),
  };
};

export default function EditStaff() {
  const { id } = useParams();
  const navigate = useNavigate();

  // dropdowns
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [visas, setVisas] = useState([]);
  const [docTypes, setDocTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // form state
  const [f, setF] = useState(mapIn(null));
  const [initial, setInitial] = useState(mapIn(null));

  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  // docs
  const [newDocs, setNewDocs] = useState([]);
  const [removeDocIds, setRemoveDocIds] = useState(new Set());

  const photoRef = useRef(null);
  const docsRef = useRef(null);

  const fetchProtectedImage = async (url) => {
    try {
      const res = await axiosInstance.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      setAvatarPreview(blobUrl);
    } catch {
      // final fallback: try adding /storage if path implies it
      if (/\/?storage\//.test(url) === false) {
        const maybe = url.replace(/\/+$/, "");
        const patched = `${maybe}/storage`;
        try {
          const res2 = await axiosInstance.get(patched, { responseType: "blob" });
          const blobUrl2 = URL.createObjectURL(res2.data);
          setAvatarPreview(blobUrl2);
        } catch {/* give up */}
      }
    }
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [br, rl, vs, dt, staffObj] = await Promise.all([
          getActiveBranches({}),
          getAllRoles(),
          getActiveVisaTypes(),
          getActiveDocumentTypes(),
          getStaff(id),
        ]);
        if (cancel) return;

        setBranches(Array.isArray(br) ? br : []);
        setRoles(toList(rl));
        setVisas(toList(vs));
        setDocTypes(toList(dt));

        const staff = mapIn(staffObj);
        setF(staff);
        setInitial(staff);

        const avatarAbs = staff.avatar_url ? resolveFileUrl(staff.avatar_url) : "";
        setAvatarPreview(avatarAbs);
        setAvatarRemoved(false);
        setAvatarFile(null);
        setNewDocs([]);
        setRemoveDocIds(new Set());
      } catch (e) {
        if (cancel) return;
        const msg = e?.response?.data?.message || e?.message || "Failed to load staff.";
        setErr(msg);
        toast.error(msg);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [id]);

  const dirty =
    JSON.stringify(f) !== JSON.stringify(initial) ||
    avatarRemoved ||
    !!avatarFile ||
    newDocs.length > 0 ||
    removeDocIds.size > 0 ||
    (password && password.length > 0);

  const setField = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const fileToDataURL = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//i.test(file.type)) return toast.error("Select an image file.");
    if (tooBig(file)) return toast.error("Max image 2MB.");
    const dataURL = await fileToDataURL(file);
    setAvatarFile(file);
    setAvatarPreview(dataURL);
    setAvatarRemoved(false);
  };

  const openAvatarPicker = () => {
    if (photoRef.current) {
      photoRef.current.value = "";
      photoRef.current.click();
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    setAvatarRemoved(true);
  };

  const handleDocsPick = (e) => {
    const files = Array.from(e.target.files || []);
    const bad = files.find((f) => tooBig(f) || !/^(application\/pdf|image\/(jpeg|jpg|png|webp))$/i.test(f.type));
    if (bad) return toast.error("Docs must be PDF/JPG/PNG/WEBP & ≤ 2MB each.");
    setNewDocs((prev) => [...prev, ...files]);
  };

  const removeNewDocAt = (i) => setNewDocs((prev) => prev.filter((_, idx) => idx !== i));
  const toggleRemoveExistingDoc = (docId) =>
    setRemoveDocIds((s) => {
      const next = new Set(s);
      const key = String(docId);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ------ VALIDATION (with new single phone field) ------
  const validate = () => {
    if (!f.name.trim()) return "Name is required.";
    if (!emailRe.test(f.email)) return "Enter a valid email.";
    if (!f.branch_id) return "Select a branch.";
    if (!f.role_id) return "Select a role.";
    if (!f.appointment_date) return "Select appointment date.";
    if (!f.visa_expiry_date) return "Select visa expiry date.";
    if (new Date(f.visa_expiry_date) <= new Date(f.appointment_date)) return "Visa expiry must be after appointment date.";
    if (!f.visa_type_id) return "Select visa type.";
    if (f.visa_status === "" || f.visa_status === null) return "Select visa status.";
    if (!f.document_type_id) return "Select a document type.";
    if (!f.document_number.trim()) return "Enter document number.";

    // one input containing code+number
    const cfull = (f.contact_full || "").trim();
    if (!cfull) return "Enter contact number with country code (e.g. +971501234567).";
    if (!phoneWithCodeRe.test(cfull.replace(/[\s()-]/g, "")))
      return "Contact must include country code, e.g. +971501234567.";

    // on save we’ll split, but verify number part length
    const digits = cfull.replace(/\D+/g, "");
    const codeLen = cfull.startsWith("+") ? (digits.length > 10 ? 3 : 2) : 2; // cheap check
    const rest = digits.slice(codeLen);
    if (!phoneDigitsRe.test(rest)) return "Phone number must be 6–15 digits after code.";

    if (password && !passwordRe.test(password)) return "Password: min 6, include letters & numbers.";
    return "";
  };

  const doSave = async () => {
    const v = validate();
    if (v) { setErr(v); toast.error(v); return; }

    setErr("");
    setSaving(true);

    const payload = mapOut(f);
    const fd = new FormData();
    Object.entries(payload).forEach(([k, val]) => fd.append(k, val ?? ""));

    if (password) fd.append("password", password);
    if (avatarFile) fd.append("avatar", avatarFile);
    if (avatarRemoved && !avatarFile) fd.append("avatar_remove", "1");
    newDocs.forEach((file) => fd.append("documents[]", file, file.name));
    if (removeDocIds.size > 0) {
      Array.from(removeDocIds).forEach((docId) => fd.append("remove_document_ids[]", String(docId)));
    }

    try {
      await toast.promise(
        updateStaffProfile(id, fd),
        {
          loading: "Updating staff…",
          success: "Staff updated.",
          error: (e) => e?.response?.data?.message || e?.message || "Update failed.",
        },
        { success: { duration: 1600 } }
      );
      navigate("/hr&staff/staffs");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 font-inter">
      <Toaster position="top-right" toastOptions={{ duration: 2800 }} />

      <div className="mx-auto max-w-5xl rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="rounded-t-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-white">
              <h2 className="text-lg font-semibold leading-6">Edit Staff</h2>
              <p className="text-white/80 text-sm">Update full profile details.</p>
            </div>
            <nav aria-label="Breadcrumb" className="text-xs text-white/80">
              <ol className="flex items-center gap-1">
                <li><Link to="/dashboard" className="hover:underline">Home</Link></li>
                <li>›</li>
                <li><Link to="/hr&staff/staffs" className="hover:underline">Staffs</Link></li>
                <li>›</li>
                <li className="text-white">Edit</li>
              </ol>
            </nav>
          </div>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <div className="animate-pulse space-y-5">
              <div className="h-6 w-40 rounded bg-gray-200" />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-12 rounded bg-gray-200" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {err && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {err}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); if (!saving) doSave(); }} className="space-y-7" noValidate>
                {/* Name + Avatar */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Staff Name *</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.name}
                      onChange={(e) => setField("name", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Profile Photo</label>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="avatar"
                            className="h-full w-full object-cover"
                            onError={() => {
                              const raw = f.avatar_url || "";
                              const url = resolveFileUrl(raw);
                              if (url && !/^data:/i.test(avatarPreview)) fetchProtectedImage(url);
                            }}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 font-semibold text-indigo-800">
                            {String(f.name || "U").trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                        )}
                      </div>

                      <input ref={photoRef} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
                      <button
                        type="button"
                        onClick={openAvatarPicker}
                        className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white shadow-sm hover:bg-black"
                        disabled={saving}
                      >
                        {avatarPreview ? "Replace" : "Upload"}
                      </button>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="rounded-xl border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                          disabled={saving}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">PNG/JPG/WEBP, up to 2MB.</p>
                  </div>
                </div>

                {/* Password + Email */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Password (optional)</label>
                    <input
                      type={showPwd ? "text" : "password"}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="mt-2 text-xs text-gray-500 underline"
                    >
                      {showPwd ? "Hide password" : "Show password"}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Staff Email *</label>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.email}
                      onChange={(e) => setField("email", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Contact (single field WITH country code) + Branch */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact (with country code) *</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.contact_full}
                      onChange={(e) => setField("contact_full", e.target.value)}
                      placeholder="+971501234567"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Format: +{`<code>`}{`<number>`} (no spaces preferred).</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Staff Branch *</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.branch_id}
                      onChange={(e) => setField("branch_id", e.target.value)}
                      required
                    >
                      <option value="">{branches.length ? "Select Branch" : "No active branches"}</option>
                      {branches.map((b) => (
                        <option key={String(b.id)} value={String(b.id)}>
                          {getBranchLabel(b)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status + Role */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Staff Status *</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.status}
                      onChange={(e) => setField("status", Number(e.target.value))}
                      required
                    >
                      <option value="">Select Status</option>
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Staff Role *</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.role_id}
                      onChange={(e) => setField("role_id", e.target.value)}
                      required
                    >
                      <option value="">{roles.length ? "Select Role" : "No roles"}</option>
                      {roles.map((r) => (
                        <option key={getId(r)} value={String(getId(r))}>
                          {getRoleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Visa Expiry Date *</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.visa_expiry_date}
                      onChange={(e) => setField("visa_expiry_date", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Appointment *</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.appointment_date}
                      onChange={(e) => setField("appointment_date", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Document Type + Visa Type */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Document Type *</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.document_type_id}
                      onChange={(e) => setField("document_type_id", e.target.value)}
                      required
                    >
                      <option value="">{docTypes.length ? "Select Document Type" : "No types"}</option>
                      {docTypes.map((d) => (
                        <option key={getId(d)} value={String(getId(d))}>
                          {getDocTypeLabel(d)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type of Visa *</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.visa_type_id}
                      onChange={(e) => setField("visa_type_id", e.target.value)}
                      required
                    >
                      <option value="">{visas.length ? "Select Visa Type" : "No visa types"}</option>
                      {visas.map((v) => (
                        <option key={getId(v)} value={String(getId(v))}>
                          {getVisaTypeLabel(v)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Document Number + Upload */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Document Number *</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={f.document_number}
                      onChange={(e) => setField("document_number", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Upload Document(s)</label>
                    <input
                      ref={docsRef}
                      type="file"
                      multiple
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-gray-700"
                      onChange={handleDocsPick}
                    />
                    <p className="mt-1 text-xs text-gray-500">PDF/JPG/PNG/WEBP, ≤ 2MB each.</p>
                  </div>
                </div>

                {/* Existing docs + mark for removal */}
                {Array.isArray(f.documents) && f.documents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Existing Documents</label>
                    <ul className="mt-2 space-y-2">
                      {f.documents.map((d) => (
                        <li key={String(d.id || d._id || d.name)} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                          <div className="truncate">
                            {d.url ? (
                              <a href={resolveFileUrl(d.url)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                                {d.name || d.filename || `Document #${d.id}`}
                              </a>
                            ) : (
                              <span>{d.name || d.filename || `Document #${d.id}`}</span>
                            )}
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={removeDocIds.has(String(d.id))}
                              onChange={() => toggleRemoveExistingDoc(String(d.id))}
                            />
                            <span className="text-rose-600">Mark for removal</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* New docs list */}
                {newDocs.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Files to Upload</label>
                    <ul className="mt-2 space-y-2">
                      {newDocs.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                          <span className="truncate">{f.name}</span>
                          <button
                            type="button"
                            className="text-rose-600 hover:underline text-sm"
                            onClick={() => removeNewDocAt(i)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-700 shadow-sm hover:bg-gray-50"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                    disabled={saving || !dirty}
                    title={!dirty ? "No changes to save" : ""}
                  >
                    {saving ? "Saving…" : "Save & Back"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
