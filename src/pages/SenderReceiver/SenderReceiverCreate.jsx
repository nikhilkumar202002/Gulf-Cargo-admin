
import React, { useEffect, useRef, useState } from "react";
import { FaUserTie } from "react-icons/fa";
import { getCustomerTypes } from "../../api/customerTypeApi";
import { getDocumentTypes } from "../../api/documentTypeApi";
import { getCountries, getStatesByCountry, getDistrictsByState } from "../../api/worldApi";
import { getAllBranches } from "../../api/branchApi";
import { createParty } from "../../api/partiesApi";

import CreateReceiverSenderModal from "../../components/CreateReceiverSenderModal";
import ErrorBoundary from "../../components/ErrorBoundary";

/* ---------------------- Helpers ---------------------- */
const normalizeList = (p) => {
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.data)) return p.data.data;
  if (Array.isArray(p?.districts)) return p.districts;
  if (Array.isArray(p?.states)) return p.states;
  if (Array.isArray(p?.countries)) return p.countries;
  if (p && typeof p === "object") {
    const firstArray = Object.values(p).find(Array.isArray);
    if (Array.isArray(firstArray)) return firstArray;
  }
  return [];
};

const pickLabel = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
};

const getId = (o) =>
  typeof o === "string" ? o : String(o?.id ?? o?._id ?? o?.code ?? o?.uuid ?? "");

/* Country / State / District label getters */
const getCountryLabel = (c) =>
  typeof c === "string"
    ? c
    : pickLabel(c, ["name", "country", "country_name", "title", "label"]) || `Country ${getId(c)}`;

const getStateLabel = (s) =>
  typeof s === "string"
    ? s
    : pickLabel(s, ["name", "state", "state_name", "title", "label"]) || `State ${getId(s)}`;

const getDistrictLabel = (d) =>
  typeof d === "string"
    ? d
    : pickLabel(d, ["district_name", "district", "name", "title", "label"]) ||
      `District ${getId(d)}`;

/* Customer Type getters */
const getTypeId = (t) => String(t?.id ?? t?._id ?? t?.value ?? "");
const getTypeLabel = (t) =>
  t?.customer_type ?? t?.name ?? t?.type ?? t?.title ?? t?.label ?? `Type ${getTypeId(t)}`;

/* Document Type getters */
const DOC_LABEL_CANDIDATES = [
  "document_type",
  "doc_type",
  "type_name",
  "documentName",
  "document",
  "name",
  "title",
  "label",
  "type",
];
const getDocId = (d) => String(d?.id ?? d?._id ?? d?.code ?? d?.uuid ?? d?.value ?? "");
const getDocLabel = (d) => {
  for (const k of DOC_LABEL_CANDIDATES) {
    const v = d?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  const entries = Object.entries(d ?? {}).filter(
    ([k, v]) =>
      typeof v === "string" &&
      v.trim() &&
      !/^(id|_id|code|uuid|status|active|created_at|updated_at)$/i.test(k)
  );
  if (entries.length) {
    entries.sort((a, b) => b[1].length - a[1].length);
    return entries[0][1];
  }
  return `Doc ${getDocId(d)}`;
};

/* Branch getters */
const getBranchId = (b) =>
  typeof b === "string" ? b : String(b?.id ?? b?._id ?? b?.code ?? b?.uuid ?? "");
const getBranchLabel = (b) =>
  typeof b === "string"
    ? b
    : b?.branch_name ?? b?.name ?? b?.title ?? b?.label ?? `Branch ${getBranchId(b)}`;

/* Resolve an ID to a label from a list */
const resolveLabel = (id, list, getLabelFn) => {
  if (!id) return "";
  const item = list.find((x) => String(getId(x)) === String(id));
  return item ? getLabelFn(item) : String(id);
};


/* ---------------------- Main Component ---------------------- */

// single source of truth for empty form
const makeInitialForm = () => ({
  name: "",
  email: "",
  branch: "", // branch_id
  customerType: "", // customer_type_id
  whatsappNumber: "",
  contactNumber: "",
  senderIdType: "", // document_type_id
  senderId: "", // maps to document_id
  documents: [], // File[]
  country: "", // country_id
  state: "", // state_id
  district: "", // district_id
  city: "",
  zipCode: "",
  address: "",
});

const SenderCreate = () => {
  /* selects data */
  const [customerTypes, setCustomerTypes] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [branches, setBranches] = useState([]);

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);

  /* loaders + errors */
  const [typesLoading, setTypesLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(true);
  const [branchLoading, setBranchLoading] = useState(true);

  const [typesError, setTypesError] = useState("");
  const [docsError, setDocsError] = useState("");
  const [branchError, setBranchError] = useState("");

  const [countryLoading, setCountryLoading] = useState(true);
  const [stateLoading, setStateLoading] = useState(false);
  const [districtLoading, setDistrictLoading] = useState(false);

  const [countryError, setCountryError] = useState("");
  const [stateError, setStateError] = useState("");
  const [districtError, setDistrictError] = useState("");

  /* form state */
  const [formData, setFormData] = useState(makeInitialForm());
  const [fileKey, setFileKey] = useState(0); // force-reset file input

  /* submit state */
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdData, setCreatedData] = useState(null);
  const [displayDetails, setDisplayDetails] = useState(null);

  /* reset everything */
  const resetForm = () => {
    setFormData(makeInitialForm());
    setFieldErrors({});
    setSubmitError("");
    setCreatedData(null);
    setDisplayDetails(null);
    setFileKey((k) => k + 1);
  };

  /* handle input */
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => {
      if (name === "country") return { ...prev, country: value, state: "", district: "" };
      if (name === "state") return { ...prev, state: value, district: "" };
      if (name === "documents") return { ...prev, documents: Array.from(files || []) };
      return { ...prev, [name]: value };
    });
  };

  /* load customer types + doc types + branches (once) */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setTypesLoading(true);
        setDocsLoading(true);
        setBranchLoading(true);
        setTypesError("");
        setDocsError("");
        setBranchError("");

        // IMPORTANT: order of Promise.all must match destructuring below
        const [branchesRes, docsRes, custTypesRes] = await Promise.all([
          getAllBranches({ per_page: 500 }),
          getDocumentTypes({ per_page: 1000 }),
          getCustomerTypes({ per_page: 1000 }),
        ]);

        if (!mounted) return;
        setBranches(normalizeList(branchesRes));
        setDocTypes(normalizeList(docsRes));
        setCustomerTypes(normalizeList(custTypesRes));
      } catch (err) {
        if (!mounted) return;
        setTypesError("Failed to load customer types.");
        setDocsError("Failed to load document types.");
        setBranchError("Failed to load branches.");
        console.error(err);
      } finally {
        if (!mounted) return;
        setTypesLoading(false);
        setDocsLoading(false);
        setBranchLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ONE useEffect for country → state → district chain */
  const fetchStamp = useRef(0);
  useEffect(() => {
    let mounted = true;
    const myStamp = ++fetchStamp.current;

    (async () => {
      try {
        // Countries once
        if (countries.length === 0) {
          setCountryLoading(true);
          setCountryError("");
          try {
            const cRes = await getCountries({ per_page: 500 });
            if (!mounted || fetchStamp.current !== myStamp) return;
            setCountries(normalizeList(cRes));
          } catch (e) {
            if (!mounted || fetchStamp.current !== myStamp) return;
            setCountryError("Failed to load countries.");
            console.error(e);
          } finally {
            if (mounted && fetchStamp.current === myStamp) setCountryLoading(false);
          }
        }

        // States when country chosen
        if (!formData.country) {
          if (mounted && fetchStamp.current === myStamp) {
            setStates([]);
            setStateError("");
            setDistricts([]);
            setDistrictError("");
          }
          return;
        }

        setStateLoading(true);
        setStateError("");
        try {
          const sRes = await getStatesByCountry(formData.country);
          if (!mounted || fetchStamp.current !== myStamp) return;
          setStates(normalizeList(sRes));
        } catch (e) {
          if (!mounted || fetchStamp.current !== myStamp) return;
          setStateError("Failed to load states.");
          console.error(e);
        } finally {
          if (mounted && fetchStamp.current === myStamp) setStateLoading(false);
        }

        // Districts when state chosen
        if (!formData.state) {
          if (mounted && fetchStamp.current === myStamp) {
            setDistricts([]);
            setDistrictError("");
          }
          return;
        }

        setDistrictLoading(true);
        setDistrictError("");
        try {
          const dRes = await getDistrictsByState(formData.state);
          if (!mounted || fetchStamp.current !== myStamp) return;
          setDistricts(normalizeList(dRes));
        } catch (e) {
          if (!mounted || fetchStamp.current !== myStamp) return;
          setDistrictError("Failed to load districts.");
          console.error(e);
        } finally {
          if (mounted && fetchStamp.current === myStamp) setDistrictLoading(false);
        }
      } catch {}
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.country, formData.state]);

  /* Build payload (JSON or multipart if files present) */
  const buildPartyPayload = (fd) => {
    const files = Array.isArray(fd.documents) ? fd.documents : [];
    const hasFiles = files.length > 0;

    const map = {
      name: fd.name,
      email: fd.email,
      phone: fd.contactNumber,
      whatsapp: fd.whatsappNumber,
      customer_type_id: fd.customerType ? Number(fd.customerType) : "",
      document_type_id: fd.senderIdType ? Number(fd.senderIdType) : "",
      document_id: fd.senderId, // server expects this key
      branch_id: fd.branch ? Number(fd.branch) : "",
      country_id: fd.country ? Number(fd.country) : "",
      state_id: fd.state ? Number(fd.state) : "",
      district_id: fd.district ? Number(fd.district) : "",
      city: fd.city,
      zip_code: fd.zipCode,
      address: fd.address,
    };

    if (!hasFiles) {
      return Object.fromEntries(Object.entries(map).filter(([, v]) => v !== "" && v != null));
    }

    const f = new FormData();
    for (const [k, v] of Object.entries(map)) {
      if (v !== "" && v != null) f.append(k, v);
    }
    // Multi-file preferred
    files.forEach((file) => f.append("documents[]", file, file.name));
    // Back-compat for servers that accept single 'document'
    if (files.length === 1) f.append("document", files[0], files[0].name);
    return f;
  };

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setFieldErrors({});

    if (!formData.name || !formData.customerType || !formData.senderIdType || !formData.senderId) {
      setSubmitError("Name, Customer Type, ID Type, and Document ID are required.");
      return;
    }

    try {
      setSubmitLoading(true);
      const payload = buildPartyPayload(formData);
      const created = await createParty(payload);

      const details = {
        Name: formData.name,
        Email: formData.email,
        WhatsApp: formData.whatsappNumber,
        Phone: formData.contactNumber,
        "Customer Type": resolveLabel(formData.customerType, customerTypes, getTypeLabel),
        "Document Type": resolveLabel(formData.senderIdType, docTypes, getDocLabel),
        "Document ID": formData.senderId,
        Branch: resolveLabel(formData.branch, branches, getBranchLabel),
        Country: resolveLabel(formData.country, countries, getCountryLabel),
        State: resolveLabel(formData.state, states, getStateLabel),
        District: resolveLabel(formData.district, districts, getDistrictLabel),
        City: formData.city,
        "Zip Code": formData.zipCode,
        Address: formData.address,
        Attachments:
          formData.documents?.length > 0
            ? formData.documents.map((f) => f.name).join(", ")
            : "—",
      };

      setCreatedData(created ?? null);
      setDisplayDetails(details);
      setShowSuccess(true);
      // resetForm();
    } catch (err) {
      console.error(err);
      const apiMsg = err?.response?.data?.message || "Failed to submit form.";
      const apiErrors = err?.response?.data?.errors;
      setSubmitError(apiMsg);
      if (apiErrors && typeof apiErrors === "object") setFieldErrors(apiErrors);
    } finally {
      setSubmitLoading(false);
    }
  };

  /* Close modal */
  const handleCloseSuccess = () => {
    setShowSuccess(false);
    resetForm();
  };

  /* Renderers */
  const renderCountryOptions = () =>
    countries.map((c) => (
      <option key={getId(c)} value={getId(c)}>
        {getCountryLabel(c)}
      </option>
    ));
  const renderStateOptions = () =>
    states.map((s) => (
      <option key={getId(s)} value={getId(s)}>
        {getStateLabel(s)}
      </option>
    ));
  const renderDistrictOptions = () =>
    districts.map((d) => (
      <option key={getId(d)} value={getId(d)}>
        {getDistrictLabel(d)}
      </option>
    ));

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-start py-10">
      <div className="bg-white shadow-lg rounded-xl w-full max-w-5xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-3">
          <span className="staff-panel-heading-icon">
            <FaUserTie />
          </span>
          Create Sender/Receiver
        </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Top */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <input
                type="text"
                name="name"
                placeholder="Enter Name"
                value={formData.name}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              {fieldErrors.name && <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>}
            </div>

            <div>
              <input
                type="email"
                name="email"
                placeholder="Enter Email ID"
                value={formData.email}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>}
            </div>

            {/* Branch */}
            <div>
              <select
                name="branch"
                value={String(formData.branch ?? "")}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
                disabled={branchLoading}
              >
                <option value="">{branchLoading ? "Loading..." : "Select Branch"}</option>
                {!branchLoading &&
                  branches.map((b) => {
                    const id = getBranchId(b);
                    const label = getBranchLabel(b);
                    return (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    );
                  })}
              </select>
              {branchError && <p className="text-sm text-red-600">{branchError}</p>}
              {fieldErrors.branch_id && (
                <p className="text-sm text-red-600">{fieldErrors.branch_id[0]}</p>
              )}
            </div>

            {/* Customer Type */}
            <div>
              <select
                name="customerType"
                value={String(formData.customerType ?? "")}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
                disabled={typesLoading}
              >
                <option value="">{typesLoading ? "Loading..." : "Select Customer Type"}</option>
                {!typesLoading &&
                  customerTypes.map((t) => (
                    <option key={getTypeId(t)} value={getTypeId(t)}>
                      {getTypeLabel(t)}
                    </option>
                  ))}
              </select>
              {typesError && <p className="text-sm text-red-600">{typesError}</p>}
              {fieldErrors.customer_type_id && (
                <p className="text-sm text-red-600">{fieldErrors.customer_type_id[0]}</p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <input
                type="text"
                name="whatsappNumber"
                placeholder="Enter WhatsApp Number"
                value={formData.whatsappNumber}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
              />
              {fieldErrors.whatsapp && (
                <p className="text-sm text-red-600">{fieldErrors.whatsapp[0]}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="contactNumber"
                placeholder="Enter Contact Number"
                value={formData.contactNumber}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
              />
              {fieldErrors.phone && <p className="text-sm text-red-600">{fieldErrors.phone[0]}</p>}
            </div>
          </div>

          {/* ID Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <select
                name="senderIdType"
                value={String(formData.senderIdType ?? "")}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
                disabled={docsLoading}
              >
                <option value="">{docsLoading ? "Loading..." : "Select ID Type"}</option>
                {!docsLoading &&
                  docTypes.map((d) => (
                    <option key={getDocId(d)} value={getDocId(d)}>
                      {getDocLabel(d)}
                    </option>
                  ))}
              </select>
              {docsError && <p className="text-sm text-red-600">{docsError}</p>}
              {fieldErrors.document_type_id && (
                <p className="text-sm text-red-600">{fieldErrors.document_type_id[0]}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                name="senderId"
                placeholder="Document ID"
                value={formData.senderId}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
              />
              {(fieldErrors.document_id || fieldErrors["document id"]) && (
                <p className="text-sm text-red-600">
                  {fieldErrors.document_id?.[0] ?? fieldErrors["document id"]?.[0]}
                </p>
              )}
            </div>

            <div>
              <input
                key={fileKey}
                type="file"
                name="documents"
                multiple
                onChange={handleChange}
                className="w-full border rounded-lg px-1 py-1 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600 cursor-pointer"
              />
              {formData.documents?.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {formData.documents.length} file(s):{" "}
                  {formData.documents.map((f) => f.name).join(", ")}
                </p>
              )}
              {fieldErrors["documents.0"] && (
                <p className="text-sm text-red-600">{fieldErrors["documents.0"][0]}</p>
              )}
            </div>
          </div>

          <hr />

          {/* Address */}
          <h3 className="text-lg font-semibold text-gray-700">Add Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Country */}
            <div>
              <select
                name="country"
                value={String(formData.country ?? "")}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
                disabled={countryLoading}
              >
                <option value="">{countryLoading ? "Loading..." : "Select Country"}</option>
                {!countryLoading && renderCountryOptions()}
              </select>
              {countryError && <p className="text-sm text-red-600">{countryError}</p>}
              {fieldErrors.country_id && (
                <p className="text-sm text-red-600">{fieldErrors.country_id[0]}</p>
              )}
            </div>

            {/* State */}
            <div>
              <select
                name="state"
                value={String(formData.state ?? "")}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
                disabled={!formData.country || stateLoading}
              >
                <option value="">
                  {!formData.country
                    ? "Select Country first"
                    : stateLoading
                    ? "Loading..."
                    : "Select State"}
                </option>
                {!stateLoading && formData.country && renderStateOptions()}
              </select>
              {stateError && <p className="text-sm text-red-600">{stateError}</p>}
              {fieldErrors.state_id && (
                <p className="text-sm text-red-600">{fieldErrors.state_id[0]}</p>
              )}
            </div>

            {/* District */}
            <div>
              <select
                name="district"
                value={String(formData.district ?? "")}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
                disabled={!formData.state || districtLoading}
              >
                <option value="">
                  {!formData.state
                    ? "Select State first"
                    : districtLoading
                    ? "Loading..."
                    : "Select District"}
                </option>
                {!districtLoading && formData.state && renderDistrictOptions()}
              </select>
              {districtError && <p className="text-sm text-red-600">{districtError}</p>}
              {fieldErrors.district_id && (
                <p className="text-sm text-red-600">{fieldErrors.district_id[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <input
                type="text"
                name="city"
                placeholder="City"
                value={formData.city}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
              />
              {fieldErrors.city && <p className="text-sm text-red-600">{fieldErrors.city[0]}</p>}
            </div>
            <div>
              <input
                type="text"
                name="zipCode"
                placeholder="Zip Code"
                value={formData.zipCode}
                onChange={handleChange}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
              />
              {fieldErrors.zip_code && (
                <p className="text-sm text-red-600">{fieldErrors.zip_code[0]}</p>
              )}
            </div>
          </div>

          <div>
            <textarea
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleChange}
              className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            {fieldErrors.address && (
              <p className="text-sm text-red-600">{fieldErrors.address[0]}</p>
            )}
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex justify-end gap-4 pt-2">
            <button
              type="button"
              className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
              onClick={resetForm}
              disabled={submitLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg transition text-white ${
                submitLoading ? "bg-red-300" : "bg-red-500 hover:bg-red-600"
              }`}
              disabled={submitLoading}
            >
              {submitLoading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>

      <ErrorBoundary onClose={handleCloseSuccess}>
<CreateReceiverSenderModal
  open={showSuccess}
  onClose={handleCloseSuccess}
  data={createdData}          // <-- pass whole response; component normalizes internally
  details={displayDetails}
/>
</ErrorBoundary>
    </div>
  );
};

export default SenderCreate;
