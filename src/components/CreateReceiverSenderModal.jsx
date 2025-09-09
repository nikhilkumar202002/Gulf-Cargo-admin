import React, { useEffect, useMemo } from "react";

/** Safe helpers */
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const entriesSafe = (v) => (isObj(v) ? Object.entries(v) : []);
const take = (o, ...keys) => keys.map((k) => o?.[k]).find((x) => x !== undefined && x !== null);
const labelize = (s) =>
  String(s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

/** Extract array safely from many API shapes */
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (isObj(v) && Array.isArray(v.data)) return v.data;
  if (isObj(v) && isObj(v.data) && Array.isArray(v.data.data)) return v.data.data;
  return [];
};

const getDocs = (payload) => {
  // accepts: ["url", ...] OR [{url/name/path}, ...]
  const raw = take(payload, "documents") ?? take(payload?.data, "documents") ?? [];
  const list = asArray(raw) || [];
  return list
    .map((d) => {
      if (typeof d === "string") return { url: d, name: d.split("/").pop() || "document" };
      if (isObj(d)) {
        const url = d.url || d.path || d.href || d.link || "";
        const name = d.name || url.split("/").pop() || "document";
        return { url, name };
      }
      return null;
    })
    .filter(Boolean);
};

const KV = ({ label, value }) => (
  <div>
    <dt className="text-gray-500">{label}</dt>
    <dd className="text-gray-900 break-words">{value === "" || value == null ? "—" : String(value)}</dd>
  </div>
);

const Section = ({ title, rows }) =>
  rows.length ? (
    <>
      <h4 className="mt-5 mb-2 font-semibold text-gray-800">{title}</h4>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {rows.map(([k, v]) => (
          <KV key={k} label={k} value={v} />
        ))}
      </dl>
    </>
  ) : null;

const canonicalOrder = [
  "id", "name", "email",
  "branch_name", "branch_id",
  "customer_type", "customer_type_id",
  "document_type", "document_type_id", "document_id",
  "whatsapp_number", "contact_number",
  "country", "country_id",
  "state", "state_id",
  "district", "district_id",
  "city", "postal_code", "zip_code",
  "address", "status",
  "created_at", "updated_at",
];

export default function CreateReceiverSenderModal({ open, onClose, data, details }) {
  // Always run hooks (no conditional early-returns before hooks)
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // normalize payload
  const payload = useMemo(() => {
    if (!data) return null;
    // Accept {success, data:{...}} or plain object
    return isObj(data?.data) ? data.data : data;
  }, [data]);

  // Submitted details (already human-friendly from the form)
  const submittedRows = useMemo(() => {
    if (!isObj(details)) return [];
    return Object.entries(details).filter(([, v]) => v !== undefined);
  }, [details]);

  // Server rows in a stable order + include any extra fields
  const serverRows = useMemo(() => {
    if (!isObj(payload)) return [];
    const out = [];

    // ordered keys first
    for (const k of canonicalOrder) {
      if (k in payload) out.push([labelize(k), payload[k]]);
    }

    // any remaining keys
    for (const [k, v] of Object.entries(payload)) {
      if (!canonicalOrder.includes(k)) out.push([labelize(k), v]);
    }

    return out;
  }, [payload]);

  const docs = useMemo(() => getDocs(payload || {}), [payload]);

  // After hooks: decide whether to render
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-[92%] max-w-3xl p-6 max-h-[85vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-green-700">Created successfully</h3>
        <p className="text-sm text-gray-600 mt-1">
          The sender/receiver has been saved{payload?.id ? ` (ID: ${payload.id})` : ""}.
        </p>

        <Section title="Submitted Details" rows={submittedRows} />
        <Section title="Server Response" rows={serverRows} />

        {docs.length > 0 && (
          <>
            <h4 className="mt-5 mb-2 font-semibold text-gray-800">Documents</h4>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              {docs.map((d, i) => (
                <li key={`${d.url}-${i}`}>
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {d.name}
                    </a>
                  ) : (
                    <span className="break-all">{d.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {payload && !docs.length && (
          <p className="text-sm text-gray-500 mt-4">No documents returned by the server.</p>
        )}

        {/* Raw (collapsible) for debugging */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            Raw payload
          </summary>
          <pre className="mt-2 text-xs bg-gray-50 border rounded p-3 overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
