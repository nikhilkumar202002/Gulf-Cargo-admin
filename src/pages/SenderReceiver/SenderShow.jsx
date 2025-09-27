// src/pages/PartyView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPartyById } from "../../api/partiesApi";
import { FiMail, FiPhone, FiMapPin, FiHome, FiFileText, FiDownload, FiHash, FiUser, FiArrowLeft } from "react-icons/fi";

const Pill = ({ children, tone = "slate" }) => {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-rose-50 text-rose-700 ring-rose-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
};

const Card = ({ title, icon, children, className = "" }) => (
  <div className={`rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm ${className}`}>
    <div className="mb-3 flex items-center gap-2 text-slate-500">
      {icon}
      <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
    </div>
    <div className="space-y-2 text-sm">{children}</div>
  </div>
);

const Row = ({ label, value, mono = false, align = "right" }) => {
  const alignCls =
    align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right";
  return (
    <div className="grid grid-cols-[110px,1fr] items-start gap-3">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span
        className={[
          "min-w-0 font-medium text-slate-800", // allow the cell to actually shrink
          alignCls,
          mono ? "font-mono" : "",
          // WRAPPING / BREAKING:
          "break-all",               // break long tokens (emails, ids)
          "whitespace-pre-wrap",     // allow wrapping
        ].join(" ")}
      >
        {value || "—"}
      </span>
    </div>
  );
};


const Avatar = ({ name = "—" }) => {
  const initials = (name || "—")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-600 text-lg font-semibold text-white shadow-sm ring-1 ring-slate-300">
      {initials}
    </div>
  );
};

export default function PartyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState("");
  const [party, setParty] = useState(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setErr("");
      try {
        const res = await getPartyById(id);
        // your partiesApi returns {success?, data?} – support both shapes
        const obj = res?.data ?? res;
        setParty(obj || null);
      } catch (e) {
        
        setErr(e?.message || "Failed to load party.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const statusTone = useMemo(() => {
    const s = String(party?.status || "").toLowerCase();
    return s === "active" ? "green" : s === "inactive" ? "red" : "slate";
  }, [party]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Loading party details…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
          {err}
        </div>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
          No party found.
        </div>
      </div>
    );
  }

  const {
    name,
    email,
    contact_number,
    whatsapp_number,
    status,
    branch_id,
    branch_name,
    customer_type_id,
    customer_type,
    document_type_id,
    document_type,
    document_id,
    country,
    state,
    district,
    city,
    postal_code,
    address,
    created_at,
    updated_at,
    documents = [],
  } = party;

  return (
    <section className="p-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow">
        {/* Hero header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={name} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">{name || "—"}</h1>
                <Pill tone={statusTone}>{status || "—"}</Pill>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {email && (
                  <span className="inline-flex items-center gap-1">
                    <FiMail className="text-slate-400" /> {email}
                  </span>
                )}
                {contact_number && (
                  <span className="inline-flex items-center gap-1">
                    <FiPhone className="text-slate-400" /> {contact_number}
                  </span>
                )}
                {whatsapp_number && (
                  <span className="inline-flex items-center gap-1">
                    <FiPhone className="text-slate-400" /> WhatsApp: {whatsapp_number}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <FiHash /> ID: {party.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <FiArrowLeft /> Back
            </button>
            
          </div>
        </div>

        {/* At a glance */}
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <Card title="Identity" icon={<FiUser />}>
            <Row label="Customer Type" value={customer_type} />
            <Row label="Type ID" value={customer_type_id} mono />
            <Row label="Branch" value={branch_name} />
            <Row label="Branch ID" value={branch_id} mono />
          </Card>

          <Card title="Document" icon={<FiFileText />}>
            <Row label="Type" value={document_type} />
            <Row label="Type ID" value={document_type_id} mono />
            <Row label="Document No." value={document_id} mono />
          </Card>

          <Card title="Timeline" icon={<FiHash />}>
            <Row label="Created" value={created_at} />
            <Row label="Updated" value={updated_at} />
          </Card>
        </div>

        {/* Details grid */}
        <div className="grid gap-6 p-6 md:grid-cols-3">
          {/* Contact */}
          <Card title="Contact" icon={<FiPhone />} className="md:col-span-1">
            <Row
                  label="Email"
                  align="left"
                  value={
                    email ? (
                      <a
                        href={`mailto:${email}`}
                        className="break-all text-blue-600 underline decoration-blue-400 underline-offset-2 hover:text-blue-700"
                      >
                        {email}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
            <Row label="Phone" value={contact_number} />
            <Row label="WhatsApp" value={whatsapp_number} />
            <div className="pt-2 text-xs text-slate-500">
              Tip: copy & paste as E.164 for consistency.
            </div>
          </Card>

          {/* Location */}
          <Card title="Location" icon={<FiMapPin />} className="md:col-span-1">
            <Row label="Country" value={country} />
            <Row label="State" value={state} />
            <Row label="District" value={district} />
            <Row label="City" value={city} />
            <Row label="Postal Code" value={postal_code} mono />
          </Card>

          {/* Address */}
          <Card title="Address" icon={<FiHome />} className="md:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-sm text-slate-800">
              {address || "—"}
            </div>
          </Card>
        </div>

        {/* Documents */}
        <div className="p-6">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <FiFileText />
              <h3 className="text-xs font-semibold uppercase tracking-wide">Documents</h3>
            </div>

            {Array.isArray(documents) && documents.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {documents.map((url, i) => {
                  const ext = (url.split(".").pop() || "").toUpperCase();
                  return (
                    <li key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                          <FiFileText />
                        </div>
                        <div className="leading-tight">
                          <div className="font-medium text-slate-800">Document {i + 1}</div>
                          <div className="text-xs text-slate-500 break-all">{url}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill tone="blue">{ext || "FILE"}</Pill>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
                        >
                          <FiDownload /> Open
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
                No documents uploaded.
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
