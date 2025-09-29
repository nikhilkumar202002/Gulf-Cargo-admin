import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";

/* ---------------- Skeleton chip ---------------- */
const Skel = ({ w = 120, h = 14, r = 8, className = "" }) => (
  <span
    className={`skel ${className}`}
    style={{
      display: "inline-block",
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: r,
    }}
    aria-hidden="true"
  />
);

/* ---------------- Status Toggle ---------------- */
const StatusToggle = ({ value, onChange, disabled }) => {
  const active = Number(value) === 1;
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(active ? 0 : 1)}
      className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-medium transition
        ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}
        ${disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-sm"}
      `}
      aria-pressed={active}
    >
      <span
        className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-500"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </button>
  );
};

/* -------------- helpers -------------- */
const unwrapBranch = (res) =>
  res?.data?.branch ?? res?.data?.data ?? res?.data ?? null;

const coerceStatus = (s) => {
  if (s === 1 || s === "1" || s === true || s === "Active") return 1;
  return 0;
};

const emptyBranch = {
  branch_name: "",
  branch_code: "",
  branch_contact_number: "",
  branch_alternative_number: "",
  branch_email: "",
  branch_location: "",
  branch_website: "",
  branch_address: "",
  status: 1,
};

const EditBranch = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [branch, setBranch] = useState(emptyBranch);
  const [initial, setInitial] = useState(emptyBranch);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // strict mode guard
  const fetchedRef = useRef(false);

  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const fetchBranch = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await api.get(`/branch/${id}`, { signal: ctrl.signal });
        const b = unwrapBranch(res);
        if (!b) throw new Error("Branch details not found.");
        const normalized = {
          branch_name: b.branch_name || "",
          branch_code: b.branch_code || "",
          branch_contact_number: b.branch_contact_number || "",
          branch_alternative_number: b.branch_alternative_number || "",
          branch_email: b.branch_email || "",
          branch_location: b.branch_location || "",
          branch_website: b.branch_website || "",
          branch_address: b.branch_address || "",
          status: coerceStatus(b.status),
        };
        if (!aborted) {
          setBranch(normalized);
          setInitial(normalized);
        }
      } catch (e) {
  if (aborted || e?.name === "CanceledError") return;
  const msg = e?.response?.data?.message || e?.message || "Failed to fetch branch details.";
  setErr(msg);
  toast.error(msg);
} finally {
        if (!aborted) setLoading(false);
      }
    };

    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchBranch();
    } else {
      fetchBranch();
    }

    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [id]);

  const dirty = useMemo(() => JSON.stringify(branch) !== JSON.stringify(initial), [branch, initial]);

  const setField = (name, value) => {
    setBranch((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "status") {
      setField(name, coerceStatus(value));
    } else if (name === "branch_code") {
      setField(name, value.toUpperCase());
    } else {
      setField(name, value);
    }
  };

  const validate = () => {
    if (!branch.branch_name.trim()) return "Branch name is required.";
    if (!branch.branch_code.trim()) return "Branch code is required.";
    // basic email check if user typed one
    if (branch.branch_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branch.branch_email)) {
      return "Please enter a valid email address.";
    }
    // basic URL check if user typed one
    if (
      branch.branch_website &&
      !/^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(branch.branch_website.trim())
    ) {
      return "Website should start with http:// or https://";
    }
    return "";
  };

const doSave = async (goBackAfter) => {
  const v = validate();
  if (v) {
    setErr(v);
    toast.error(v);
    return;
  }
  setErr("");
  setSaving(true);

  const payload = {
    branch_name: branch.branch_name.trim(),
    branch_code: branch.branch_code.trim(),
    branch_contact_number: branch.branch_contact_number.trim(),
    branch_alternative_number: branch.branch_alternative_number.trim(),
    branch_email: branch.branch_email.trim(),
    branch_location: branch.branch_location.trim(),
    branch_website: branch.branch_website.trim(),
    branch_address: branch.branch_address.trim(),
    status: Number(branch.status),
  };

  try {
    await toast.promise(
      api.put(`/branch/${id}`, payload),
      {
        loading: "Saving changes…",
        success: "Branch updated successfully.",
        error: (e) =>
          e?.response?.data?.message ||
          e?.message ||
          "Failed to update branch.",
      },
      { success: { duration: 2000 } }
    );

    // reflect saved state
    setInitial(payload);
    if (goBackAfter) navigate("/branches");
  } finally {
    setSaving(false);
  }
};


  /* -------------------- UI -------------------- */
  if (loading) {
    return (
      <div className="px-4 py-10 flex justify-center">
        <div className="w-full max-w-5xl bg-white shadow-lg rounded-2xl p-8">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div>
              <Skel w={180} h={22} />
              <div className="mt-2"><Skel w={260} /></div>
            </div>
            <Skel w={96} h={40} r={10} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <Skel w={96} />
                <div className="mt-2"><Skel w="100%" h={42} r={10} /></div>
              </div>
            ))}
            <div className="md:col-span-2">
              <Skel w={96} />
              <div className="mt-2"><Skel w="100%" h={96} r={12} /></div>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3 mt-2">
              <Skel w={110} h={42} r={10} />
              <Skel w={150} h={42} r={10} />
              <Skel w={150} h={42} r={10} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-10 px-4">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-2xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Edit Branch</h2>
            <p className="text-sm text-slate-500">Update branch profile and contact details.</p>
          </div>
          <button
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 border border-slate-300 px-4 py-2 rounded-lg transition"
            onClick={() => navigate(-1)}
            type="button"
          >
            <FiArrowLeft size={18} />
            Back
          </button>
        </div>

        {/* Error banner */}
        {err && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {err}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving) doSave(false);
          }}
          className="space-y-6"
        >
          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Branch Name */}
            <label className="block">
              <span className="block text-sm font-medium text-slate-700">Branch Name</span>
              <input
                type="text"
                name="branch_name"
                value={branch.branch_name}
                onChange={handleChange}
                placeholder="Eg. Kochi HQ"
                className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </label>

            {/* Branch Code */}
            <label className="block">
              <span className="block text-sm font-medium text-slate-700">Branch Code</span>
              <input
                type="text"
                name="branch_code"
                value={branch.branch_code}
                onChange={handleChange}
                placeholder="Eg. KCHI01"
                className="mt-1 w-full border rounded-lg p-3 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </label>

            {/* Contact Number */}
            <label className="block">
              <span className="block text-sm font-medium text-slate-700">Contact Number</span>
              <input
                type="text"
                name="branch_contact_number"
                value={branch.branch_contact_number}
                onChange={handleChange}
                placeholder="Eg. +91 98XXXXXXX"
                className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </label>

            {/* Alternative Number */}
            <label className="block">
              <span className="block text-sm font-medium text-slate-700">Alternative Number</span>
              <input
                type="text"
                name="branch_alternative_number"
                value={branch.branch_alternative_number}
                onChange={handleChange}
                placeholder="Optional"
                className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {/* Email */}
            <label className="block">
              <span className="block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                name="branch_email"
                value={branch.branch_email}
                onChange={handleChange}
                placeholder="name@example.com"
                className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {/* Location */}
            <label className="block">
              <span className="block text-sm font-medium text-slate-700">City / Location</span>
              <input
                type="text"
                name="branch_location"
                value={branch.branch_location}
                onChange={handleChange}
                placeholder="Eg. Kakkanad, Kochi"
                className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {/* Website */}
            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-slate-700">Website</span>
              <input
                type="text"
                name="branch_website"
                value={branch.branch_website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="mt-1 w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {/* Address */}
            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-slate-700">Address</span>
              <textarea
                name="branch_address"
                value={branch.branch_address}
                onChange={handleChange}
                placeholder="Full postal address..."
                className="mt-1 w-full min-h-[96px] border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {/* Status */}
            <div className="md:col-span-2">
              <span className="block text-sm font-medium text-slate-700 mb-1">Status</span>
              <div className="flex items-center gap-3">
                <StatusToggle
                  value={branch.status}
                  onChange={(v) => setField("status", Number(v))}
                  disabled={saving}
                />
                <select
                  name="status"
                  value={branch.status}
                  onChange={handleChange}
                  className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={saving}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-end">
            <button
              type="button"
              className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg transition"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => !saving && doSave(true)}
              className="bg-indigo-500 text-white hover:bg-indigo-600 px-5 py-2.5 rounded-lg shadow transition disabled:opacity-60"
              disabled={saving || !dirty}
              title={!dirty ? "No changes to save" : ""}
            >
              {saving ? "Saving…" : "Save & Back"}
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-lg shadow transition disabled:opacity-60"
              disabled={saving || !dirty}
              title={!dirty ? "No changes to save" : ""}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>

      {/* skeleton css (move to global if you prefer) */}
      <style>{`
        .skel { background:#e5e7eb; position:relative; overflow:hidden; }
        .skel::after { content:""; position:absolute; inset:0; transform:translateX(-100%);
          background:linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(255,255,255,.75) 50%, rgba(229,231,235,0) 100%);
          animation: skel-shimmer 1.2s infinite;
        }
        @keyframes skel-shimmer { 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
};

export default EditBranch;
