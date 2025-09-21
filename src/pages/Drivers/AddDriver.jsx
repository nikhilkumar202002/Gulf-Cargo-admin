import React, { useEffect, useState } from "react";
import "../Styles.css";
import { Link } from "react-router-dom";
import { FaTruckMoving } from "react-icons/fa";
import { createDriver } from "../../api/driverApi";
import { getPhoneCodes } from "../../api/phoneCodeApi";
import { getActiveBranches } from "../../api/branchApi";
import { getActiveLicenseTypes } from "../../api/licenceType";

const AddDriver = () => {
  // Match backend-required request fields
  const [form, setForm] = useState({
    name: "",
    email_address: "",
    phone_code_id: "",   // numeric id required
    phone_number: "",
    status: "1",         // "1" | "0" → convert to Number on submit
    license_type: "",    // label string
    license_number: "",
    branch_name: "",     // label string
  });

  const [documents, setDocuments] = useState([]);
  const [codes, setCodes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState([]);

  const [loading, setLoading] = useState({ codes: true, branches: true, licenseTypes: true });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [fieldErrors, setFieldErrors] = useState(null);

  // helpers for various API shapes
  const idFrom = (it) => it?.id ?? it?.phone_code_id ?? null;
  const dialFrom = (it) => it?.dial_code ?? it?.phone_code ?? it?.code ?? "";
  const countryFrom = (it) => it?.country ?? it?.name ?? it?.country_name ?? it?.iso2 ?? it?.iso ?? "";
  const codeLabel = (it) => [countryFrom(it), dialFrom(it)].filter(Boolean).join(" ");

  const branchLabel = (b) => b?.name ?? b?.branch_name ?? b?.title ?? `Branch #${b?.id ?? ""}`;
  const licenseLabel = (t) => t?.name ?? t?.type_name ?? t?.title ?? `Type #${t?.id ?? ""}`;

  useEffect(() => {
    (async () => {
      try {
        setLoading((p) => ({ ...p, codes: true }));
        const list = await getPhoneCodes();
        setCodes(Array.isArray(list) ? list : []);
      } catch {
        setMsg({ type: "error", text: "Failed to load phone codes." });
      } finally {
        setLoading((p) => ({ ...p, codes: false }));
      }

      try {
        setLoading((p) => ({ ...p, branches: true }));
        const list = await getActiveBranches({ per_page: 500 });
        setBranches(Array.isArray(list) ? list : []);
      } catch {
        setMsg({ type: "error", text: "Failed to load branches." });
      } finally {
        setLoading((p) => ({ ...p, branches: false }));
      }

      try {
        setLoading((p) => ({ ...p, licenseTypes: true }));
        const list = await getActiveLicenseTypes();
        setLicenseTypes(Array.isArray(list) ? list : (list?.data ?? []));
      } catch {
        setMsg({ type: "error", text: "Failed to load license types." });
      } finally {
        setLoading((p) => ({ ...p, licenseTypes: false }));
      }
    })();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setFieldErrors(null);
    setSubmitting(true);

    try {
      // Always use FormData so we can nest files as documents[i][file]
      const fd = new FormData();
      fd.append("name", form.name.trim());
      if (form.email_address.trim()) fd.append("email_address", form.email_address.trim());
      fd.append("phone_code_id", String(Number(form.phone_code_id))); // numeric
      fd.append("phone_number", form.phone_number.trim());
      fd.append("status", String(Number(form.status)));               // numeric 1/0
      fd.append("license_type", form.license_type);
      if (form.license_number.trim()) fd.append("license_number", form.license_number.trim());
      fd.append("branch_name", form.branch_name);

      // Nested files: documents[0][file], documents[1][file], ...
      documents.forEach((file, i) => {
        fd.append(`documents[${i}][file]`, file);
      });

      const res = await createDriver(fd);

      if (res?.success) {
        setMsg({ type: "success", text: "Driver created successfully." });
        // Reset
        setForm({
          name: "",
          email_address: "",
          phone_code_id: "",
          phone_number: "",
          status: "1",
          license_type: "",
          license_number: "",
          branch_name: "",
        });
        setDocuments([]);
      } else {
        setMsg({ type: "error", text: res?.message || "Create failed." });
      }
    } catch (err) {
      const server = err?.response?.data;
      setFieldErrors(server?.errors || null);
      setMsg({ type: "error", text: (server?.message || "Validation failed").toString() });
      console.error("Create driver error:", server || err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-driver-main w-full flex justify-center items-center">

      <div className="bg-white shadow-md rounded-xl px-6 ">
         <div className="add-driver-header flex justify-between items-center">
      
        <h2 className="flex items-center gap-3 staff-panel-heading">
          <span className="staff-panel-heading-icon"><FaTruckMoving /></span>
          Add Driver
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
              <Link to="/drivers/alldriverslist" className="text-gray-500 hover:text-gray-700 hover:underline">
                Drivers
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li aria-current="page" className="text-gray-800 font-medium">
              Add Driver
            </li>
          </ol>
        </nav>

         </div>
        {msg.text && (
          <div className={`mb-4 rounded-md px-4 py-2 ${msg.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {msg.text}
          </div>
        )}
        {fieldErrors && (
          <ul className="mb-4 text-sm text-red-700 list-disc pl-5">
            {Object.entries(fieldErrors).flatMap(([field, arr]) =>
              (arr || []).map((m, i) => <li key={field + i}>{field}: {m}</li>)
            )}
          </ul>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              type="text"
              placeholder="Full Name"
              className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              required
            />

            <input
              name="email_address"
              value={form.email_address}
              onChange={onChange}
              type="email"
              placeholder="Email Address"
              className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            />

            {/* Phone code (ID) + number */}
            <div className="flex gap-2">
              <select
                name="phone_code_id"
                value={form.phone_code_id}
                onChange={onChange}
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200 w-44"
                required
              >
                <option value="">{loading.codes ? "Loading…" : "Code"}</option>
                {codes.map((c, idx) => {
                  const id = idFrom(c);
                  if (!id) return null;
                  return (
                    <option key={`${id}-${idx}`} value={id}>
                      {codeLabel(c)}
                    </option>
                  );
                })}
              </select>

              <input
                name="phone_number"
                value={form.phone_number}
                onChange={onChange}
                type="text"
                placeholder="Phone Number"
                className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200 flex-1"
                required
              />
            </div>

            {/* Numeric status */}
            <select
              name="status"
              value={form.status}
              onChange={onChange}
              className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>

            {/* License Type (dropdown) */}
            <select
              name="license_type"
              value={form.license_type}
              onChange={onChange}
              className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
              required
            >
              <option value="">
                {loading.licenseTypes ? "Loading license types…" : "Select license type"}
              </option>
              {licenseTypes.map((t, idx) => {
                const label = licenseLabel(t);
                return (
                  <option key={`${label}-${idx}`} value={label}>
                    {label}
                  </option>
                );
              })}
            </select>

            <input
              name="license_number"
              value={form.license_number}
              onChange={onChange}
              type="text"
              placeholder="License Number"
              className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            />

            {/* Branch (dropdown) */}
            <select
              name="branch_name"
              value={form.branch_name}
              onChange={onChange}
              className="p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200 md:col-span-2"
              required
            >
              <option value="">
                {loading.branches ? "Loading branches…" : "Select branch"}
              </option>
              {branches.map((b, idx) => {
                const label = branchLabel(b);
                return (
                  <option key={`${label}-${idx}`} value={label}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Documents (optional) */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Documents</h3>
            <input
              type="file"
              multiple
              onChange={(e) => setDocuments(Array.from(e.target.files || []))}
              className="w-full border rounded-lg px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
            {documents.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {documents.length} file(s) selected
              </p>
            )}
          </div>

          <div className="flex justify-end add-driver-submit">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-70"
            >
              {submitting ? "Saving…" : "Add Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDriver;
