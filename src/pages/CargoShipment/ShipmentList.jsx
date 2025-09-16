import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { getShipment } from "../../api/shipmentsApi"; // adjust path

const cx = (...c) => c.filter(Boolean).join(" ");
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const Spinner = ({ className = "h-5 w-5 text-indigo-600" }) => (
  <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const Badge = ({ text = "", color = "indigo" }) => (
  <span
    className={{
      indigo: "inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700",
      green: "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700",
      amber: "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800",
      red: "inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700",
      slate: "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700",
    }[color] || "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"}
  >
    {text || "—"}
  </span>
);

const statusColor = (s = "") => {
  const v = (s || "").toLowerCase();
  if (v.includes("hold") || v.includes("wait")) return "amber";
  if (v.includes("deliver") || v.includes("cleared")) return "green";
  if (v.includes("cancel")) return "red";
  return "indigo";
};

/* field helpers for flexible item schemas */
const pick = (obj, keys, fallback = "—") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};
const normalizeItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((it, i) => ({
    idx: i + 1,
    name: pick(it, ["name", "item_name", "cargo_name", "description", "title", "item"], "Item"),
    qty: pick(it, ["quantity", "qty", "pieces", "count"], "—"),
    weight: pick(it, ["weight", "weight_kg", "kg"], "—"),
    notes: pick(it, ["notes", "remarks", "comment"], ""),
    raw: it,
  }));

export default function ShipmentList() {
  const { id } = useParams();
  const location = useLocation();
  const hydrated = location.state?.shipment || null;

  const [shipment, setShipment] = useState(hydrated || null);
  const [loading, setLoading] = useState(!hydrated);
  const [err, setErr] = useState("");

  const items = useMemo(() => normalizeItems(shipment?.items || []), [shipment]);

  useEffect(() => {
    if (!id || hydrated) return;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const s = await getShipment(id);
        setShipment(s || null);
      } catch (e) {
        setErr(e?.message || "Failed to load shipment");
        setShipment(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, hydrated]);

  const stat = (label, val) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{val ?? "—"}</div>
    </div>
  );

  return (
    <section className="shipment-list-view">
      <div className="shipment-list-container min-h-screen bg-slate-50">
        {/* Header */}
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">Shipment</h1>
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          </div>

          {/* Card: Identity */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-600"><Spinner /><span>Loading shipment…</span></div>
            ) : err ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{err}</div>
            ) : !shipment ? (
              <div className="text-slate-600">Shipment not found.</div>
            ) : (
              <>
                {/* Top row: Track badge + AWB */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 font-mono text-sm font-semibold text-white shadow-sm">
                    {shipment.track_code ?? "—"}
                  </span>
                  {shipment.track_code && (
                    <button
                      type="button"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(shipment.track_code); } catch {}
                      }}
                      className="text-slate-500 hover:text-slate-700"
                      title="Copy track code"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  )}
                  {shipment.awb_number ? (
                    <div className="text-xs text-slate-600">AWB: <span className="font-medium">{shipment.awb_number}</span></div>
                  ) : null}
                  <div className="ml-auto">
                    <Badge text={shipment.status ?? "—"} color={statusColor(shipment.status)} />
                  </div>
                </div>

                {/* Meta grid */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {stat("Booking Date", formatDate(shipment.created_at ?? shipment.booking_date))}
                  {stat("Sender", shipment.sender)}
                  {stat("Receiver", shipment.receiver)}
                  {stat("Route", `${shipment.origin_port ?? "—"} → ${shipment.destination_port ?? "—"}`)}
                </div>
              </>
            )}
          </div>

          {/* Items Table */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Cargo Items</h2>
              <p className="text-xs text-slate-600">Items inside this shipment.</p>
            </div>

            {loading ? (
              <div className="p-5 text-slate-600"><Spinner /> </div>
            ) : (items.length === 0) ? (
              <div className="p-5 text-sm text-slate-600">No items found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">#</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Weight (kg)</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((it) => (
                      <tr key={it.idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-700">{it.idx}</td>
                        <td className="px-4 py-2 text-sm text-slate-800">{it.name}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{it.qty}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{it.weight}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {it.notes || (
                            <code className="rounded bg-slate-50 px-1 py-0.5 text-[11px] text-slate-500">
                              id:{String(it.raw?.id ?? "-")}
                            </code>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
