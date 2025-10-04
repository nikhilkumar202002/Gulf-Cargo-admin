import { useEffect, useMemo, useState } from "react";
import { storeBranch } from "../../api/branchApi";
import { getPhoneCodes } from "../../api/phoneCodeApi";
import { Link } from "react-router-dom";
import { IoGitBranch } from "react-icons/io5";
import BranchModal from "./components/BranchModal";
import { Toaster, toast } from "react-hot-toast";
import "./BranchStyles.css";

// --- small helpers ---
const onlyDigits = (s = "") => (s || "").replace(/\D+/g, "");
const normalizeCode = (code) => {
  if (!code) return "";
  const c = String(code).trim();
  if (!c) return "";
  if (c.startsWith("+")) return c;
  // handle cases like "971" or "00971"
  if (c.startsWith("00")) return `+${c.slice(2)}`;
  return `+${c}`;
};

// find the longest matching dial code at the start of a typed string
const sniffDialFromTyped = (val, dialSet) => {
  if (!val?.startsWith("+")) return null;
  // collect up to 5 digits after + to test codes like +1, +44, +880, +971, etc.
  const m = val.match(/^\+(\d{1,5})/);
  if (!m) return null;
  // check longest-first
  for (let len = m[1].length; len >= 1; len--) {
    const tryCode = `+${m[1].slice(0, len)}`;
    if (dialSet.has(tryCode)) return tryCode;
  }
  return null;
};

export default function AddBranch() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // form state (trimmed to what your backend actually uses)
  const [form, setForm] = useState({
    branchName: "",
    branchNamear: "",
    location: "",
    branchCode: "",
    branchAddress: "",
    branchEmail: "",
    website: "",
    status: 1,
    // phone parts (code + number)
    contactDial: "+91",
    contactNumber: "",
    altDial: "+91",
    altNumber: "",
  });

  // phone code list
  const [codes, setCodes] = useState([]);
  const dialSet = useMemo(
    () => new Set(codes.map((c) => normalizeCode(c?.dial_code || c?.dialCode || c?.code))),
    [codes]
  );

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const list = await getPhoneCodes({}, token);
        const norm = (list || [])
          .map((it) => {
            const dial =
              normalizeCode(it?.dial_code || it?.dialCode || it?.code || it?.dialCodeNumber);
            const name = it?.name || it?.country || it?.country_name || it?.label || "";
            return dial ? { label: `${name ? `${name} ` : ""}(${dial})`, dial } : null;
          })
          .filter(Boolean)
          .reduce((acc, cur) => { if (!acc.find((x) => x.dial === cur.dial)) acc.push(cur); return acc; }, [])
          .sort((a, b) => a.label.localeCompare(b.label));
        setCodes(norm);
      } catch {
        setCodes([{ label: "India (+91)", dial: "+91" }]);
      }
    })();
  }, []);

  const update = (patch) => setForm((p) => ({ ...p, ...patch }));

  const onNumberInput = (fieldDial, fieldNum) => (e) => {
    const raw = e.target.value;
    const found = sniffDialFromTyped(raw, dialSet);
    if (found) {
      const stripped = raw.replace(new RegExp(`^\\${found}`), "");
      update({ [fieldDial]: found, [fieldNum]: onlyDigits(stripped) });
      return;
    }
    update({ [fieldNum]: onlyDigits(raw) });
  };

  const onSelectDial = (fieldDial) => (e) => update({ [fieldDial]: e.target.value });

  const handleChange = (e) => {
    const { name, value } = e.target;
    update({ [name]: name === "status" ? Number(value) : value });
  };

  const composeE164 = (dial, number) => {
    const d = normalizeCode(dial) || "+";
    const n = onlyDigits(number);
    return d + n;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("⚠️ You are not logged in!");
        setLoading(false);
        return;
      }

      const payload = {
        branch_name: form.branchName.trim(),
        branch_name_ar: form.branchNamear.trim(),
        branch_code: form.branchCode.trim(),
        branch_contact_number: composeE164(form.contactDial, form.contactNumber),
        branch_alternative_number: form.altNumber ? composeE164(form.altDial, form.altNumber) : null,
        branch_email: form.branchEmail.trim() || null,
        branch_address: form.branchAddress.trim(),
        branch_location: form.location.trim(),
        branch_website: form.website.trim() || null,
        status: Number(form.status) || 0,
      };

      if (!payload.branch_name) throw new Error("Branch name is required.");
      if (!payload.branch_code) throw new Error("Branch code is required.");
      if (!form.contactNumber) throw new Error("Enter a valid contact number.");

      // Call API
      const created = await storeBranch(payload);

      // Prefer API-returned record; fallback to payload
      const record =
        created?.data ||
        created?.branch ||
        created ||
        payload;

      toast.success("Branch created successfully");
      setModalData(record);
      setModalOpen(true);

      // Reset form (keep last selected dials)
      setForm((p) => ({
        branchName: "",
        branchNamear: "",
        location: "",
        branchCode: "",
        branchAddress: "",
        branchEmail: "",
        website: "",
        status: 1,
        contactDial: p.contactDial,
        contactNumber: "",
        altDial: p.altDial,
        altNumber: "",
      }));
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create branch.";
      setMessage("❌ " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-5xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="add-cargo-header flex justify-between items-center">
            <h2 className="header-cargo-heading flex items-center gap-2">
              <span className="header-cargo-icon"><IoGitBranch /></span>
              Create New Branch
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
                  <Link to="/branches" className="text-gray-500 hover:text-gray-700 hover:underline">
                    Branches
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li aria-current="page" className="text-gray-800 font-medium">
                  Add Branch
                </li>
              </ol>
            </nav>
          </div>

          {message ? (
            <div
              className={`mb-4 rounded-lg px-3 py-2 text-sm ${message.startsWith("✅")
                  ? "bg-emerald-50 text-emerald-700"
                  : message.startsWith("⚠️")
                    ? "bg-amber-50 text-amber-800"
                    : message.startsWith("❌")
                      ? "bg-rose-50 text-rose-700"
                      : "bg-blue-50 text-blue-700"
                }`}
            >
              {message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            {/* Branch Name */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Branch Name</label>
              <input
                name="branchName"
                value={form.branchName}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                placeholder="e.g., Kochi HQ"
                required
              />
            </div>
             <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Branch Name In Arabic</label>
              <input
                name="branchNamear"
                value={form.branchNamear}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                placeholder="e.g., شركة سواحل الخليج "
                required
              />
            </div>
             <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                placeholder="City / Area"
                required
              />
            </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 my-4">
 
              <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Branch Code</label>
              <input
                name="branchCode"
                value={form.branchCode}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                placeholder="e.g., BR-001"
                required
              />
            </div>
                 <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Branch Email</label>
              <input
                type="email"
                name="branchEmail"
                value={form.branchEmail}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                placeholder="branch@company.com"
              />
            </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2 my-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <textarea
                name="branchAddress"
                value={form.branchAddress}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                placeholder="Street, Building, Landmark"
              />
            </div>

            {/* Website */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Website (Optional)</label>
              <input
                name="website"
                value={form.website}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                placeholder="https://example.com"
              />
            </div>

            {/* Contact: Dial + Number */}
            <div className="md:col-span-2 my-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Primary Contact</label>
              <div className="flex gap-2">
                <select
                  value={form.contactDial}
                  onChange={onSelectDial("contactDial")}
                  className="w-40 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring"
                >
                  {codes.length ? (
                    codes.map((c) => (
                      <option key={c.dial} value={c.dial}>
                        {c.label}
                      </option>
                    ))
                  ) : (
                    <option value="+91">India (+91)</option>
                  )}
                </select>
                <input
                  inputMode="numeric"
                  value={form.contactNumber}
                  onChange={onNumberInput("contactDial", "contactNumber")}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  placeholder="Type number — or paste with +code to auto-select"
                  aria-label="Primary phone number"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Tip: Paste like <code className="rounded bg-slate-100 px-1">+9715XXXXXXXX</code> to auto-select the code.
              </p>
            </div>

            {/* Alternative Contact */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Alternative Contact (Optional)</label>
              <div className="flex gap-2">
                <select
                  value={form.altDial}
                  onChange={onSelectDial("altDial")}
                  className="w-40 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring"
                >
                  {codes.length ? (
                    codes.map((c) => (
                      <option key={c.dial} value={c.dial}>
                        {c.label}
                      </option>
                    ))
                  ) : (
                    <option value="+91">India (+91)</option>
                  )}
                </select>
                <input
                  inputMode="numeric"
                  value={form.altNumber}
                  onChange={onNumberInput("altDial", "altNumber")}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 outline-none ring-emerald-500 focus:ring"
                  placeholder="Optional number — supports +code auto-select"
                  aria-label="Alternate phone number"
                />
              </div>
            </div>

            {/* Status */}
            <div className="my-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring"
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>

            {/* Actions */}
            <div className="md:col-span-2 mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({
                    branchName: "",
                    branchNamear: "",
                    location: "",
                    branchCode: "",
                    branchAddress: "",
                    branchEmail: "",
                    website: "",
                    status: 1,
                    contactDial: p.contactDial,
                    contactNumber: "",
                    altDial: p.altDial,
                    altNumber: "",
                  }))
                }
                className="rounded-lg border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`rounded-lg px-5 py-2 text-white transition ${loading
                    ? "cursor-not-allowed bg-emerald-400"
                    : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
              >
                {loading ? "Submitting…" : "Create Branch"}
              </button>
            </div>
          </form>
        </div>
      </div>

<Toaster position="top-right" toastOptions={{ duration: 3000 }} />

       <BranchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </section>
  );
}
