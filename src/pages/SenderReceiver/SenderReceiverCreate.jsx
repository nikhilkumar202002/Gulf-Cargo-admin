// src/pages/SenderCreate.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaUserTie } from "react-icons/fa";
import { FiAlertCircle, FiPaperclip } from "react-icons/fi";
import { Toaster, toast } from "react-hot-toast";

import { getCustomerTypes } from "../../api/customerTypeApi";
import { getDocumentTypes } from "../../api/documentTypeApi";
import {
  getCountries,
  getStatesByCountry,
  getDistrictsByState,
  getActiveDistrictsByState,
} from "../../api/worldApi";
import { getAllBranches } from "../../api/branchApi";
import { createParty } from "../../api/partiesApi";
import { getPhoneCodes } from "../../api/phoneCodeApi";

import CreateReceiverSenderModal from "../../components/CreateReceiverSenderModal";
import ErrorBoundary from "../../components/ErrorBoundary";

import "./CustomerStyles.css";

/* ───────────────────────────── Helpers ───────────────────────────── */
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
const debugNormalize = (label, res) => normalizeList(res);
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
    : pickLabel(c, ["name", "country", "country_name", "title", "label"]) ||
      `Country ${getId(c)}`;
const getStateLabel = (s) =>
  typeof s === "string"
    ? s
    : pickLabel(s, ["name", "state", "state_name", "title", "label"]) ||
      `State ${getId(s)}`;
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

/* Resolve ID → label */
const resolveLabel = (id, list, getLabelFn) => {
  if (!id) return "";
  const item = list.find((x) => String(getId(x)) === String(id));
  return item ? getLabelFn(item) : String(id);
};

/* Upload limits */
const MAX_FILE_MB = 8;
const MAX_TOTAL_MB = 24;
const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 0.82;
const bytesToMB = (b) => b / (1024 * 1024);
const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
async function compressIfImage(file) {
  if (!file.type.startsWith("image/")) return file;
  try {
    const img = await loadImageFromFile(file);
    let { width, height } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    if (scale < 1) {
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", WEBP_QUALITY));
    if (!blob) return file;
    if (blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/* ─────────────── Phone code helpers ─────────────── */
const getDialCode = (o) =>
  String(
    o?.dial_code ?? o?.phone_code ?? o?.code ?? o?.calling_code ?? o?.isd ?? o?.prefix ?? ""
  ).replace(/\s+/g, "");
const getDialLabel = (o) => {
  const name = o?.country ?? o?.country_name ?? o?.name ?? o?.title ?? o?.label ?? "—";
  const dc = getDialCode(o);
  return dc ? `${name} (${dc})` : name;
};
const pickDialCodeByNumber = (num = "", codes = []) => {
  if (!num?.startsWith("+")) return null;
  const only = num.replace(/[^\d+]/g, "");
  let best = null;
  for (const c of codes) {
    const dc = getDialCode(c);
    if (!dc || !dc.startsWith("+")) continue;
    if (only.startsWith(dc) && (!best || dc.length > getDialCode(best).length)) best = c;
  }
  return best;
};
const composeE164 = (code, local) => {
  const c = String(code || "").trim();
  const n = String(local || "").trim();
  if (!c && !n) return "";
  if (n.startsWith("+")) return n.replace(/\s+/g, "");
  const cc = c.startsWith("+") ? c : `+${c}`;
  return (cc + n.replace(/[^\d]/g, "")).replace(/\s+/g, "");
};

/* ───────────────────────────── UI bits ───────────────────────────── */
const Section = ({ title, subtitle, children, icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
    </div>
    {children}
  </div>
);

const Label = ({ children, required }) => (
  <label className="mb-1 block text-sm font-medium text-slate-700">
    {children} {required ? <span className="text-rose-600">*</span> : null}
  </label>
);

const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-500 focus:ring";
const fieldDisabled = "disabled:cursor-not-allowed disabled:bg-slate-50";

const ErrorMsg = ({ children }) =>
  children ? (
    <p className="mt-1 flex items-center gap-1 text-sm text-rose-700">
      {/* simple icon spacing without importing another icon */}
      <span className="inline-block h-4 w-4 rounded-full bg-rose-600/10 ring-1 ring-rose-200" />
      {children}
    </p>
  ) : null;

/* Skeleton atom */
const Skel = ({ h = 40, w = "100%", className = "" }) => (
  <div
    className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
    style={{ height: h, width: w }}
  />
);

/* ─────────────────────────── Main Component ─────────────────────────── */
const makeInitialForm = () => ({
  name: "",
  email: "",
  branch: "",
  customerType: "",
  whatsappNumber: "",
  contactNumber: "",
  senderIdType: "",
  senderId: "",
  documents: [],
  country: "",
  state: "",
  district: "",
  city: "",
  zipCode: "",
  address: "",
});

const SenderCreate = () => {
  // selects
  const [customerTypes, setCustomerTypes] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);

  // phone codes
  const [phoneCodes, setPhoneCodes] = useState([]);
  const [phoneCodesLoading, setPhoneCodesLoading] = useState(true);
  const [phoneCodesError, setPhoneCodesError] = useState("");

  // selected dial codes
  const [contactCode, setContactCode] = useState("+");
  const [whatsappCode, setWhatsappCode] = useState("+");

  // loaders/errors
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

  // form + submit
  const [formData, setFormData] = useState(makeInitialForm());
  const [fileKey, setFileKey] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdData, setCreatedData] = useState(null);
  const [displayDetails, setDisplayDetails] = useState(null);

  const resetForm = () => {
    setFormData(makeInitialForm());
    setFieldErrors({});
    setSubmitError("");
    setSubmitNotice("");
    setCreatedData(null);
    setDisplayDetails(null);
    setFileKey((k) => k + 1);
  };

  const handleChange = async (e) => {
    const { name, value, files } = e.target;

    // cascading clears
    if (name === "country") {
      setStates([]);
      setDistricts([]);
      return setFormData((prev) => ({ ...prev, country: value, state: "", district: "" }));
    }
    if (name === "state") {
      setDistricts([]);
      return setFormData((prev) => ({ ...prev, state: value, district: "" }));
    }

    // phone numbers → auto-pick dial code if "+…"
    if (name === "whatsappNumber" || name === "contactNumber") {
      if (value?.startsWith("+") && phoneCodes.length) {
        const match = pickDialCodeByNumber(value, phoneCodes);
        if (match) {
          const code = getDialCode(match);
          if (name === "whatsappNumber") setWhatsappCode(code);
          if (name === "contactNumber") setContactCode(code);
        }
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    // files
    if (name === "documents") {
      setSubmitNotice("");
      const picked = Array.from(files || []);
      const processed = await Promise.all(picked.map(compressIfImage));
      const overs = processed.filter((f) => bytesToMB(f.size) > MAX_FILE_MB);
      if (overs.length) {
        setSubmitNotice(`Some files exceed ${MAX_FILE_MB}MB: ${overs.map((f) => f.name).join(", ")}`);
      }
      const kept = processed.filter((f) => bytesToMB(f.size) <= MAX_FILE_MB);

      const totalMB = kept.reduce((s, f) => s + bytesToMB(f.size), 0);
      if (totalMB > MAX_TOTAL_MB) {
        let running = 0;
        const trimmed = [];
        for (const f of kept) {
          const next = running + bytesToMB(f.size);
          if (next > MAX_TOTAL_MB) break;
          running = next;
          trimmed.push(f);
        }
        setFormData((prev) => ({ ...prev, documents: trimmed }));
        setSubmitNotice(
          `Total attachments trimmed to ${MAX_TOTAL_MB}MB. Kept ${trimmed.length}/${processed.length} file(s).`
        );
        return;
      }
      setFormData((prev) => ({ ...prev, documents: kept }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchStamp = useRef(0);

  /* first fetch: branches/types/docs */
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
  }, []);

  /* phone codes (once) */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPhoneCodesLoading(true);
        setPhoneCodesError("");
        const token = localStorage.getItem("token");
        const list = await getPhoneCodes({ per_page: 1000 }, token);
        if (!alive) return;
        setPhoneCodes(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!alive) return;
        setPhoneCodesError("Failed to load phone codes.");
        setPhoneCodes([]);
      } finally {
        if (!alive) return;
        setPhoneCodesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* countries / states / districts cascade */
  useEffect(() => {
    let mounted = true;
    const myStamp = ++fetchStamp.current;
    (async () => {
      try {
        if (countries.length === 0) {
          setCountryLoading(true);
          try {
            const cRes = await getCountries({ per_page: 500 });
            if (!mounted || fetchStamp.current !== myStamp) return;
            setCountries(debugNormalize("countries", cRes));
            setCountryError("");
          } catch (e) {
            if (!mounted || fetchStamp.current !== myStamp) return;
            setCountryError("Failed to load countries.");
          } finally {
            if (mounted && fetchStamp.current === myStamp) setCountryLoading(false);
          }
        }

        if (formData.country) {
          setStateLoading(true);
          try {
            const sRes = await getStatesByCountry(Number(formData.country));
            if (!mounted || fetchStamp.current !== myStamp) return;
            setStates(debugNormalize("states", sRes));
            setStateError("");
          } catch (e) {
            if (!mounted || fetchStamp.current !== myStamp) return;
            setStateError("Failed to load states.");
          } finally {
            if (mounted && fetchStamp.current === myStamp) setStateLoading(false);
          }
        }

        if (formData.state) {
          setDistrictLoading(true);
          try {
            const stateId = Number(formData.state);
            let dRes = await getDistrictsByState(stateId);
            let list = normalizeList(dRes);
            if (Array.isArray(list) && list.length === 0) {
              dRes = await getActiveDistrictsByState(stateId);
            }
            if (!mounted || fetchStamp.current !== myStamp) return;
            setDistricts(debugNormalize("districts", dRes));
            setDistrictError("");
          } catch (e) {
            if (!mounted || fetchStamp.current !== myStamp) return;
            setDistrictError("Failed to load districts.");
          } finally {
            if (mounted && fetchStamp.current === myStamp) setDistrictLoading(false);
          }
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [formData.country, formData.state]);

  /* payload (JSON or multipart) */
  const buildPartyPayload = (fd) => {
    const files = Array.isArray(fd.documents) ? fd.documents : [];
    const hasFiles = files.length > 0;

    // compose full numbers
    const whatsappFull = composeE164(whatsappCode, fd.whatsappNumber);
    const contactFull = composeE164(contactCode, fd.contactNumber);

    const map = {
      name: fd.name,
      email: fd.email,
      contact_number: contactFull, // E.164
      whatsapp_number: whatsappFull, // E.164
      customer_type_id: fd.customerType ? Number(fd.customerType) : "",
      document_type_id: fd.senderIdType ? Number(fd.senderIdType) : "",
      document_id: fd.senderId,
      branch_id: fd.branch ? Number(fd.branch) : "",
      country_id: fd.country ? Number(fd.country) : "",
      state_id: fd.state ? Number(fd.state) : "",
      district_id: fd.district ? Number(fd.district) : "",
      city: fd.city,
      postal_code: fd.zipCode,
      address: fd.address,
    };

    if (!hasFiles) {
      return Object.fromEntries(Object.entries(map).filter(([, v]) => v !== "" && v != null));
    }
    const f = new FormData();
    for (const [k, v] of Object.entries(map)) {
      if (v !== "" && v != null) f.append(k, v);
    }
    files.forEach((file) => f.append("documents[]", file, file.name));
    if (files.length === 1) f.append("document", files[0], files[0].name);
    return f;
  };

  /* submit */
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

      const created = await toast.promise(
        createParty(payload),
        {
          loading: "Submitting…",
          success: "Customer created successfully",
          error: (e) => e?.response?.data?.message || "Failed to submit form.",
        },
        { position: "top-right" }
      );

      const details = {
        Name: formData.name,
        Email: formData.email,
        WhatsApp: composeE164(whatsappCode, formData.whatsappNumber),
        Phone: composeE164(contactCode, formData.contactNumber),
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
          formData.documents?.length > 0 ? formData.documents.map((f) => f.name).join(", ") : "—",
      };

      setCreatedData(created ?? null);
      setDisplayDetails(details);
      setShowSuccess(true);
    } catch (err) {
      if (err?.response?.status === 413) {
        setSubmitError("Attachments exceed server limit (413). Trim or upload fewer files.");
        toast.error("Attachments too large (413)", { position: "top-right" });
        return;
      }
      const apiMsg = err?.response?.data?.message || "Failed to submit form.";
      setSubmitError(apiMsg);
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors && typeof apiErrors === "object") setFieldErrors(apiErrors);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    resetForm();
  };

  /* options */
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      {/* Toaster */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          success: {
            style: { background: "#10B981", color: "white" },
            iconTheme: { primary: "white", secondary: "#10B981" },
          },
          error: {
            style: { background: "#EF4444", color: "white" },
            iconTheme: { primary: "white", secondary: "#EF4444" },
          },
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-600 text-white shadow-sm">
              <FaUserTie />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Create Sender / Receiver</h2>
              <div className="mt-0.5 text-xs text-slate-500">
                Add a new customer party with identity, contact, and address.
              </div>
            </div>
          </div>

          <nav aria-label="Breadcrumb" className="text-sm">
            <ol className="flex items-center gap-2">
              <li>
                <Link to="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline">
                  Home
                </Link>
              </li>
              <li className="text-slate-400">/</li>
              <li>
                <Link to="/cargo/allcargolist" className="text-slate-500 hover:text-slate-700 hover:underline">
                  Customers
                </Link>
              </li>
              <li className="text-slate-400">/</li>
              <li aria-current="page" className="font-medium text-slate-800">
                Add Customer
              </li>
            </ol>
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity */}
          <Section title="Identity" subtitle="Basic info & classification" icon={<FaUserTie size={16} />}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label required>Name</Label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={fieldBase}
                  placeholder="Enter full name"
                  aria-invalid={!!fieldErrors.name}
                />
                <ErrorMsg>{fieldErrors.name?.[0]}</ErrorMsg>
              </div>

              <div>
                <Label>Email</Label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={fieldBase}
                  placeholder="name@example.com"
                  aria-invalid={!!fieldErrors.email}
                />
                <ErrorMsg>{fieldErrors.email?.[0]}</ErrorMsg>
              </div>

              <div>
                <Label required>Branch</Label>
                {branchLoading ? (
                  <Skel />
                ) : (
                  <select
                    name="branch"
                    value={String(formData.branch ?? "")}
                    onChange={handleChange}
                    className={`${fieldBase} ${fieldDisabled}`}
                    disabled={branchLoading}
                    aria-invalid={!!fieldErrors.branch_id}
                  >
                    <option value="">{branchLoading ? "Loading..." : "Select Branch"}</option>
                    {!branchLoading &&
                      branches.map((b) => (
                        <option key={getBranchId(b)} value={getBranchId(b)}>
                          {getBranchLabel(b)}
                        </option>
                      ))}
                  </select>
                )}
                {branchError && <ErrorMsg>{branchError}</ErrorMsg>}
                <ErrorMsg>{fieldErrors.branch_id?.[0]}</ErrorMsg>
              </div>

              <div>
                <Label required>Customer Type</Label>
                {typesLoading ? (
                  <Skel />
                ) : (
                  <select
                    name="customerType"
                    value={String(formData.customerType ?? "")}
                    onChange={handleChange}
                    className={`${fieldBase} ${fieldDisabled}`}
                    disabled={typesLoading}
                    aria-invalid={!!fieldErrors.customer_type_id}
                  >
                    <option value="">{typesLoading ? "Loading..." : "Select Customer Type"}</option>
                    {!typesLoading &&
                      customerTypes.map((t) => (
                        <option key={getTypeId(t)} value={getTypeId(t)}>
                          {getTypeLabel(t)}
                        </option>
                      ))}
                  </select>
                )}
                {typesError && <ErrorMsg>{typesError}</ErrorMsg>}
                <ErrorMsg>{fieldErrors.customer_type_id?.[0]}</ErrorMsg>
              </div>
            </div>
          </Section>

          {/* Contact with phone codes */}
          <Section
            title="Contact"
            subtitle="Reachability details"
            icon={<FiAlertCircle size={16} className="rotate-180 opacity-70" />}
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* WhatsApp */}
              <div>
                <Label>WhatsApp Number</Label>
                <div className="grid grid-cols-[150px,1fr] gap-2">
                  {phoneCodesLoading ? (
                    <Skel />
                  ) : (
                    <select
                      value={whatsappCode}
                      onChange={(e) => setWhatsappCode(e.target.value)}
                      disabled={phoneCodesLoading}
                      className={`${fieldBase} ${fieldDisabled}`}
                    >
                      <option value="+">{phoneCodesLoading ? "Loading…" : "Code"}</option>
                      {!phoneCodesLoading &&
                        phoneCodes.map((pc, i) => (
                          <option key={i} value={getDialCode(pc)}>
                            {getDialLabel(pc)}
                          </option>
                        ))}
                    </select>
                  )}
                  <input
                    type="text"
                    name="whatsappNumber"
                    placeholder="WhatsApp number"
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    className={fieldBase}
                  />
                </div>
                {phoneCodesError && <p className="mt-1 text-sm text-rose-700">{phoneCodesError}</p>}
                <ErrorMsg>{fieldErrors.whatsapp?.[0] ?? fieldErrors.whatsapp_number?.[0]}</ErrorMsg>
              </div>

              {/* Contact */}
              <div>
                <Label>Contact Number</Label>
                <div className="grid grid-cols-[150px,1fr] gap-2">
                  {phoneCodesLoading ? (
                    <Skel />
                  ) : (
                    <select
                      value={contactCode}
                      onChange={(e) => setContactCode(e.target.value)}
                      disabled={phoneCodesLoading}
                      className={`${fieldBase} ${fieldDisabled}`}
                    >
                      <option value="+">{phoneCodesLoading ? "Loading…" : "Code"}</option>
                      {!phoneCodesLoading &&
                        phoneCodes.map((pc, i) => (
                          <option key={i} value={getDialCode(pc)}>
                            {getDialLabel(pc)}
                          </option>
                        ))}
                    </select>
                  )}
                  <input
                    type="text"
                    name="contactNumber"
                    placeholder="Contact number"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    className={fieldBase}
                  />
                </div>
                <ErrorMsg>{fieldErrors.phone?.[0] ?? fieldErrors.contact_number?.[0]}</ErrorMsg>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Tip: paste a full <span className="font-mono">+CC…</span> number; the dial code will auto-select.
            </p>
          </Section>

          {/* Identification */}
          <Section title="Identification" subtitle="Government ID / document" icon={<FiPaperclip size={16} />}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <Label required>ID Type</Label>
                {docsLoading ? (
                  <Skel />
                ) : (
                  <select
                    name="senderIdType"
                    value={String(formData.senderIdType ?? "")}
                    onChange={handleChange}
                    className={`${fieldBase} ${fieldDisabled}`}
                    disabled={docsLoading}
                    aria-invalid={!!fieldErrors.document_type_id}
                  >
                    <option value="">{docsLoading ? "Loading..." : "Select ID Type"}</option>
                    {!docsLoading &&
                      docTypes.map((d) => (
                        <option key={getDocId(d)} value={getDocId(d)}>
                          {getDocLabel(d)}
                        </option>
                      ))}
                  </select>
                )}
                {docsError && <ErrorMsg>{docsError}</ErrorMsg>}
                <ErrorMsg>{fieldErrors.document_type_id?.[0]}</ErrorMsg>
              </div>

              <div>
                <Label required>Document ID</Label>
                <input
                  type="text"
                  name="senderId"
                  value={formData.senderId}
                  onChange={handleChange}
                  className={fieldBase}
                  placeholder="e.g., ABC12345"
                  aria-invalid={!!(fieldErrors.document_id || fieldErrors["document id"])}
                />
                <ErrorMsg>{fieldErrors.document_id?.[0] ?? fieldErrors["document id"]?.[0]}</ErrorMsg>
              </div>

              <div>
                <Label>Attachments</Label>
                <input
                  key={fileKey}
                  type="file"
                  name="documents"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black"
                />
                {submitNotice && <p className="mt-1 text-xs text-amber-700">{submitNotice}</p>}
                {formData.documents?.length > 0 && (
                  <p className="mt-1 line-clamp-2 break-all text-xs text-slate-600">
                    {formData.documents.length} file(s): {formData.documents.map((f) => f.name).join(", ")}
                  </p>
                )}
                <ErrorMsg>{fieldErrors["documents.0"]?.[0]}</ErrorMsg>
              </div>
            </div>
          </Section>

          {/* Address */}
          <Section title="Address" subtitle="Location details" icon={<FiAlertCircle size={16} />}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <Label>Country</Label>
                {countryLoading ? (
                  <Skel />
                ) : (
                  <select
                    name="country"
                    value={String(formData.country ?? "")}
                    onChange={handleChange}
                    className={`${fieldBase} ${fieldDisabled}`}
                    disabled={countryLoading}
                    aria-invalid={!!fieldErrors.country_id}
                  >
                    <option value="">{countryLoading ? "Loading..." : "Select Country"}</option>
                    {!countryLoading && renderCountryOptions()}
                  </select>
                )}
                {countryError && <ErrorMsg>{countryError}</ErrorMsg>}
                <ErrorMsg>{fieldErrors.country_id?.[0]}</ErrorMsg>
              </div>

              <div>
                <Label>State</Label>
                {stateLoading ? (
                  <Skel />
                ) : (
                  <select
                    name="state"
                    value={String(formData.state ?? "")}
                    onChange={handleChange}
                    className={`${fieldBase} ${fieldDisabled}`}
                    disabled={!formData.country || stateLoading}
                    aria-invalid={!!fieldErrors.state_id}
                  >
                    <option value="">
                      {!formData.country ? "Select Country first" : stateLoading ? "Loading..." : "Select State"}
                    </option>
                    {!stateLoading && formData.country && renderStateOptions()}
                  </select>
                )}
                {stateError && <ErrorMsg>{stateError}</ErrorMsg>}
                <ErrorMsg>{fieldErrors.state_id?.[0]}</ErrorMsg>
              </div>

              <div>
                <Label>District</Label>
                {districtLoading ? (
                  <Skel />
                ) : (
                  <select
                    name="district"
                    value={String(formData.district ?? "")}
                    onChange={handleChange}
                    className={`${fieldBase} ${fieldDisabled}`}
                    disabled={!formData.state || districtLoading}
                    aria-invalid={!!fieldErrors.district_id}
                  >
                    <option value="">
                      {!formData.state ? "Select State first" : districtLoading ? "Loading..." : "Select District"}
                    </option>
                    {!districtLoading && formData.state && renderDistrictOptions()}
                  </select>
                )}
                {districtError && <ErrorMsg>{districtError}</ErrorMsg>}
                <ErrorMsg>{fieldErrors.district_id?.[0]}</ErrorMsg>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label>City</Label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={fieldBase}
                  placeholder="City"
                  aria-invalid={!!fieldErrors.city}
                />
                <ErrorMsg>{fieldErrors.city?.[0]}</ErrorMsg>
              </div>
              <div>
                <Label>Zip / Postal Code</Label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className={`${fieldBase} font-mono`}
                  placeholder="e.g., 682001"
                  aria-invalid={!!fieldErrors.zip_code}
                />
                <ErrorMsg>{fieldErrors.zip_code?.[0]}</ErrorMsg>
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`${fieldBase} min-h-[96px]`}
                placeholder="Street, Building, Landmark"
                aria-invalid={!!fieldErrors.address}
              />
              <ErrorMsg>{fieldErrors.address?.[0]}</ErrorMsg>
            </div>

            <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 py-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-slate-700 hover:bg-slate-50"
                onClick={resetForm}
                disabled={submitLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className={`rounded-lg px-5 py-2 text-white transition ${
                  submitLoading ? "cursor-not-allowed bg-rose-400" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submitLoading ? "Submitting…" : "Submit"}
              </button>
            </div>
          </Section>

          {/* Global submit error */}
          {submitError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitError}
            </div>
          )}
        </form>
      </div>

      <ErrorBoundary onClose={handleCloseSuccess}>
        <CreateReceiverSenderModal
          open={showSuccess}
          onClose={handleCloseSuccess}
          data={createdData}
          details={displayDetails}
        />
      </ErrorBoundary>
    </div>
  );
};

export default SenderCreate;
