import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { HiArrowNarrowLeft, HiHome } from "react-icons/hi";
import { getPartyById } from "../../api/partiesApi";
import { getActiveCustomerTypes } from "../../api/customerTypeApi";
import { getActiveDocumentTypes } from "../../api/documentTypeApi";
import {
  getActiveCountries,
  getActiveStatesByCountry,
  getActiveDistrictsByState,
} from "../../api/worldApi";

/* ---------- utils ---------- */
const normalizeList = (p) => {
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.data)) return p.data.data;
  if (p && typeof p === "object") {
    const firstArray = Object.values(p).find(Array.isArray);
    if (Array.isArray(firstArray)) return firstArray;
  }
  return [];
};
const getId = (o) => String(o?.id ?? o?._id ?? o?.code ?? o?.uuid ?? "");
const pickLabel = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
};

/* labels */
const getTypeLabel = (t) =>
  t?.customer_type ?? t?.name ?? t?.title ?? t?.label ?? `Type ${getId(t)}`;
const getDocLabel = (d) => {
  const keys = ["document_type", "doc_type", "type_name", "name", "title", "label", "type"];
  return pickLabel(d, keys) ?? `Doc ${getId(d)}`;
};
const getCountryLabel = (c) =>
  pickLabel(c, ["name", "country", "country_name", "title", "label"]) || `Country ${getId(c)}`;
const getStateLabel = (s) =>
  pickLabel(s, ["name", "state", "state_name", "title", "label"]) || `State ${getId(s)}`;
const getDistrictLabel = (d) =>
  pickLabel(d, ["district_name", "district", "name", "title", "label"]) ||
  `District ${getId(d)}`;

const resolveLabel = (id, list, labelFn) => {
  if (!id) return "";
  const item = list.find((x) => String(getId(x)) === String(id));
  return item ? labelFn(item) : "";
};

/* tiny display helper */
const Row = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-gray-500 text-sm">{label}</span>
    <span className="text-gray-900">{value || "—"}</span>
  </div>
);

const LIST_ROUTE = "/senderreceiver/senderview";

const SenderShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // lookups
  const [types, setTypes] = useState([]);
  const [docs, setDocs] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) fetch party
        const pr = await getPartyById(id);
        const p = pr?.data ?? pr;
        if (!mounted) return;
        setParty(p);

        // 2) fetch lookups in parallel
        const [tyRes, dcRes, cRes] = await Promise.all([
          getActiveCustomerTypes({ per_page: 500 }),
          getActiveDocumentTypes(),
          getActiveCountries({ per_page: 500 }),
        ]);
        if (!mounted) return;
        const tys = normalizeList(tyRes);
        const dcs = normalizeList(dcRes);
        const ctrs = normalizeList(cRes);
        setTypes(tys);
        setDocs(dcs);
        setCountries(ctrs);

        // 3) fetch dependent lookups if we only have IDs
        const countryId =
          p.country_id ?? p.countryId ?? p.country?.id ?? p.country?._id ?? null;
        if (countryId) {
          const stRes = await getActiveStatesByCountry(countryId);
          if (!mounted) return;
          setStates(normalizeList(stRes));
        }

        const stateId = p.state_id ?? p.stateId ?? p.state?.id ?? p.state?._id ?? null;
        if (stateId) {
          const dtRes = await getActiveDistrictsByState(stateId);
          if (!mounted) return;
          setDistricts(normalizeList(dtRes));
        }
      } catch (e) {
        if (!mounted) return;
        console.error(e);
        setErr("Failed to load customer details.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const d = party || {};

  // base fields (robust key fallbacks)
  const name = d.name ?? d.full_name ?? d.customer_name ?? "";
  const email = d.email ?? "";
  const phone = d.phone ?? d.contact ?? d.contact_number ?? d.mobile ?? "";
  const whatsapp = d.whatsapp ?? d.whatsapp_number ?? d.whatsApp ?? "";

  const documentId = d.document_id ?? d.id_number ?? d.document_number ?? "";

  // resolve labels: prefer nested name, else resolve by id
  const customerType =
    d.customer_type?.customer_type ??
    d.customer_type_name ??
    resolveLabel(d.customer_type_id ?? d.customerType, types, getTypeLabel);

  const branch =
    d.branch?.name ?? d.branch_name ?? d.branch ?? ""; // if you also have a branches list, resolve by id similarly

  const documentType =
    d.document_type?.document_type ??
    d.document_type_name ??
    resolveLabel(d.document_type_id ?? d.senderIdType, docs, getDocLabel);

  const country =
    d.country?.name ??
    d.country_name ??
    resolveLabel(d.country_id ?? d.countryId, countries, getCountryLabel);

  const state =
    d.state?.name ??
    d.state_name ??
    resolveLabel(d.state_id ?? d.stateId, states, getStateLabel);

  const district =
    d.district?.district_name ??
    d.district_name ??
    resolveLabel(d.district_id ?? d.districtId, districts, getDistrictLabel);

  const city = d.city ?? "";
  const zip = d.zip_code ?? d.zip ?? d.postal_code ?? d.pincode ?? "";
  const address = d.address ?? "";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3">
  <button
    onClick={() => navigate(-1)}
    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
  >
    <HiArrowNarrowLeft /> Back
  </button>

  <Link
    to={LIST_ROUTE}
    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
  >
    <HiHome /> Back to List
  </Link>
</div>

      <h2 className="text-2xl font-semibold text-gray-900 mt-4 mb-6">Customer Details</h2>

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : err ? (
        <div className="text-red-600">{err}</div>
      ) : (
        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Row label="Name" value={name} />
            <Row label="Email" value={email} />
            <Row label="Phone" value={phone} />
            <Row label="WhatsApp" value={whatsapp} />
            <Row label="Customer Type" value={customerType} />
            <Row label="Branch" value={branch} />
            <Row label="Document Type" value={documentType} />
            <Row label="Document ID" value={documentId} />
          </div>

          <hr />

          <h3 className="text-lg font-semibold text-gray-800">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Row label="Country" value={country} />
            <Row label="State" value={state} />
            <Row label="District" value={district} />
            <Row label="City" value={city} />
            <Row label="Zip Code" value={zip} />
          </div>
          <div>
            <Row label="Address" value={address} />
          </div>

          {d.document && typeof d.document === "string" && (
            <div className="pt-2">
              <a
                href={d.document}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Download Document
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SenderShow;
