import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  X,
  FileText,
  ExternalLink,
  Clipboard,
  ClipboardCheck,
  Download,
  Printer,
  ChevronDown,
} from "lucide-react";

/* ----------------------- tiny utils ----------------------- */
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const take = (o, ...keys) => keys.map((k) => o?.[k]).find((x) => x !== undefined && x !== null);

const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (isObj(v) && Array.isArray(v.data)) return v.data;
  if (isObj(v) && isObj(v.data) && Array.isArray(v.data.data)) return v.data.data;
  return [];
};

const getDocs = (payload) => {
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
  <div className="flex flex-col gap-1 rounded-xl bg-slate-50/70 px-3 py-2">
    <dt className="text-[12px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="text-slate-900 break-words">{value === "" || value == null ? "—" : String(value)}</dd>
  </div>
);

const Section = ({ title, children, className = "" }) => (
  <section className={`mt-6 ${className}`}>
    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
      <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700" />
      {title}
    </h4>
    {children}
  </section>
);

/* ----------------------- Component ----------------------- */
export default function CreateReceiverSenderModal({ open, onClose, data, details }) {
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);

  // prevent background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // focus trap + escape
  useEffect(() => {
    if (!open) return;

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="email"]:not([disabled])',
      'input[type="file"]:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const el = modalRef.current;
    const focusables = el ? Array.from(el.querySelectorAll(focusableSelector)) : [];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === "Tab" && focusables.length > 1) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // initial focus
    (closeBtnRef.current || first)?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const payload = useMemo(() => {
    if (!data) return null;
    return isObj(data?.data) ? data.data : data;
  }, [data]);

  const submittedRows = useMemo(() => {
    if (!isObj(details)) return [];
    return Object.entries(details).filter(([, v]) => v !== undefined);
  }, [details]);

  const docs = useMemo(() => getDocs(payload || {}), [payload]);

  const copySummary = async () => {
    const lines = submittedRows.map(([k, v]) => `${k}: ${v ?? "—"}`).join("\n");
    await navigator.clipboard.writeText(lines || "No details available");
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify({ payload, details }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sender-receiver-${payload?.id ?? "created"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printView = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="crs-title"
            ref={modalRef}
            className="relative z-[101] w-[92%] max-w-4xl"
            initial={{ y: 20, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 8, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
              {/* Decorative gradient */}
              <div className="pointer-events-none absolute -inset-x-6 -top-8 h-24 bg-gradient-to-r from-emerald-400/20 via-blue-400/10 to-rose-400/20 blur-2xl" />

              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-6 pt-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 id="crs-title" className="text-lg font-semibold text-slate-900">
                      Created successfully
                    </h3>
                    <p className="text-sm text-slate-600">
                      The sender/receiver has been saved
                      {payload?.id ? (
                        <>
                          {" "}
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                            ID: {payload.id}
                          </span>
                        </>
                      ) : null}
                      .
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copySummary}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {copied ? <ClipboardCheck className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />} 
                    {copied ? "Copied" : "Copy summary"}
                  </button>
                  <button
                    onClick={downloadJson}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <Download className="h-4 w-4" /> Download JSON
                  </button>
                  <button
                    onClick={printView}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                  <button
                    ref={closeBtnRef}
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500 text-white shadow-sm transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 pb-6 pt-4">
                {/* Submitted Details */}
                {submittedRows.length > 0 ? (
                  <Section title="Submitted Details">
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {submittedRows.map(([k, v]) => (
                        <KV key={k} label={k} value={v} />
                      ))}
                    </dl>
                  </Section>
                ) : (
                  <p className="text-sm text-slate-500">No submitted details were provided.</p>
                )}

                {/* Documents */}
                <Section title="Documents">
                  {docs.length > 0 ? (
                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/30">
                      {docs.map((d, i) => (
                        <li key={`${d.url}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                              <FileText className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 truncate text-sm text-slate-800">{d.name}</span>
                          </div>
                          {d.url ? (
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                            >
                              Open <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">No URL</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No documents returned by the server.</p>
                  )}
                </Section>

                {/* Raw debug (collapsible) */}
                <Section title="Debug">
                  <button
                    type="button"
                    onClick={() => setRawOpen((s) => !s)}
                    className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${rawOpen ? "rotate-180" : "rotate-0"}`}
                    />
                    {rawOpen ? "Hide raw response" : "Show raw response"}
                  </button>

                  <AnimatePresence initial={false}>
                    {rawOpen && (
                      <motion.pre
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 max-h-[260px] overflow-auto rounded-lg bg-slate-900 p-3 text-[12px] leading-relaxed text-emerald-100"
                      >
                        {JSON.stringify(payload ?? {}, null, 2)}
                      </motion.pre>
                    )}
                  </AnimatePresence>
                </Section>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
