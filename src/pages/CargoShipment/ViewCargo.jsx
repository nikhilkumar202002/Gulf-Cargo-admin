// src/pages/ViewCargo.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { BsFillBoxSeamFill } from "react-icons/bs";
import { IoLocationSharp } from "react-icons/io5";
import { MdAddIcCall } from "react-icons/md";
import { CiEdit } from "react-icons/ci";
import { getCargoById } from "../../api/createCargoApi"; // adjust if you exported it elsewhere
import "./ShipmentStyles.css";

/* ---------------- helpers ---------------- */
const fmt = {
  money: (v) => {
    const n = Number(v ?? 0);
    return isNaN(n) ? "0.00" : n.toFixed(2);
  },
  weight: (v) => {
    const n = Number(v ?? 0);
    return isNaN(n) ? "0.000" : n.toFixed(3);
  },
  date: (d) => (d ? String(d) : "—"),
  time: (t) => {
    if (!t) return "—";
    const m = String(t).match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
    if (!m) return t;
    const hh = String(Math.min(23, Number(m[1]))).padStart(2, "0");
    const mm = String(Math.min(59, Number(m[2]))).padStart(2, "0");
    return `${hh}:${mm}`;
  },
};

const statusClass = (s) => {
  const v = String(s || "").toLowerCase();
  if (!v || v === "pending") return "bg-amber-100 text-amber-800";
  if (v.includes("received") || v.includes("delivered")) return "bg-emerald-100 text-emerald-800";
  if (v.includes("cancel")) return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-800";
};

const Copy = ({ text }) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="ml-2 text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text || "");
          setOk(true);
          setTimeout(() => setOk(false), 900);
        } catch {}
      }}
    >
      {ok ? "Copied" : "Copy"}
    </button>
  );
};

const Stat = ({ label, value, after }) => (
  <div>
    <div className="text-xs text-gray-500">{label}</div>
    <div className="font-medium break-words">
      {value ?? "—"} {after}
    </div>
  </div>
);

/* ---------------- page ---------------- */
export default function ViewCargo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const c = await getCargoById(id);
        setCargo(c || {});
      } catch (e) {
        setErr(e?.message || "Failed to fetch cargo.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const items = useMemo(() => Array.isArray(cargo?.items) ? cargo.items : [], [cargo]);

  const totals = useMemo(() => ({
    total_cost: fmt.money(cargo?.total_cost),
    bill_charges: fmt.money(cargo?.bill_charges),
    vat_percentage: Number(cargo?.vat_percentage ?? 0),
    vat_cost: fmt.money(cargo?.vat_cost),
    net_total: fmt.money(cargo?.net_total),
    total_weight: fmt.weight(cargo?.total_weight),
  }), [cargo]);

  const statusText = cargo?.status?.name ?? cargo?.status ?? "—";
  const shippingText = cargo?.shipping_method?.name ?? cargo?.shipping_method ?? "—";
  const paymentText  = cargo?.payment_method?.name  ?? cargo?.payment_method  ?? "—";
  const deliveryText = cargo?.delivery_type?.name   ?? cargo?.delivery_type   ?? "—";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-indigo-600 flex items-center gap-2">
            <BsFillBoxSeamFill className="text-2xl" />
            Cargo Details
          </h1>

          <div className="flex gap-2">
            {/* Edit assumes your edit route is /cargo/:id */}
            <Link
              to={`/cargo/${id}`}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 flex items-center gap-1"
            >
              <CiEdit className="text-lg" />
              Edit
            </Link>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Print
            </button>
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Back
            </button>
          </div>
        </div>

        {/* Error/Loading */}
        {err && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {err}
          </div>
        )}
        {loading && (
          <div className="rounded-xl border bg-white p-6 animate-pulse text-gray-400">
            Loading cargo…
          </div>
        )}

        {!loading && !err && (
          <div className="space-y-6">
            {/* Booking + Status row */}
            <div className="rounded-xl bg-white p-4 border">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm text-gray-500">Booking No.</div>
                  <div className="text-lg font-semibold">
                    {cargo?.booking_no || "—"}
                  </div>
                  {cargo?.booking_no && <Copy text={cargo.booking_no} />}
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-lg ${statusClass(statusText)}`}>
                    {statusText}
                  </span>
                  <div className="text-sm text-gray-500">
                    {cargo?.branch_name ? `Branch: ${cargo.branch_name}` : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl bg-white p-4 border">
                <div className="text-base font-semibold mb-2">Sender</div>
                <div className="text-sm">{cargo?.sender_name || "—"}</div>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p className="flex items-center gap-1">
                    <IoLocationSharp className="text-red-500" />
                    {cargo?.sender?.address ?? cargo?.address ?? "—"}
                  </p>
                  <p className="flex items-center gap-1">
                    <MdAddIcCall className="text-emerald-600" />
                    {cargo?.sender?.contact_number ?? cargo?.sender_phone ?? "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 border">
                <div className="text-base font-semibold mb-2">Receiver</div>
                <div className="text-sm">{cargo?.receiver_name || "—"}</div>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p className="flex items-center gap-1">
                    <IoLocationSharp className="text-red-500" />
                    {cargo?.receiver?.address ?? cargo?.address ?? "—"}
                  </p>
                  <p className="flex items-center gap-1">
                    <MdAddIcCall className="text-emerald-600" />
                    {cargo?.receiver?.contact_number ?? cargo?.receiver_phone ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Shipment meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl bg-white p-4 border">
                <div className="text-base font-semibold mb-2">Shipment</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Stat label="Date" value={fmt.date(cargo?.date)} />
                  <Stat label="Time" value={fmt.time(cargo?.time)} />
                  <Stat label="Shipping Method" value={shippingText} />
                  <Stat label="Payment Method" value={paymentText} />
                  <div className="col-span-2">
                    <div className="flex items-center">
                      <Stat label="LRL Tracking Code" value={cargo?.lrl_tracking_code || "—"} />
                      {cargo?.lrl_tracking_code && <Copy text={cargo.lrl_tracking_code} />}
                    </div>
                  </div>
                  <Stat label="Collected By" value={cargo?.collected_by || "—"} />
                  <Stat label="Delivery Type" value={deliveryText} />
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 border">
                <div className="text-base font-semibold mb-2">Financials</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Stat label="Total Cost" value={totals.total_cost} after=" SAR" />
                  <Stat label="Bill Charges" value={totals.bill_charges} after=" SAR" />
                  <Stat label="VAT %" value={totals.vat_percentage} />
                  <Stat label="VAT Cost" value={totals.vat_cost} after=" SAR" />
                  <Stat label="Net Total" value={totals.net_total} after=" SAR" />
                  <Stat label="Total Weight" value={totals.total_weight} after=" kg" />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="rounded-xl bg-white p-4 border">
              <div className="text-base font-semibold mb-2">Special Remarks</div>
              <div className="text-sm text-gray-700">
                {cargo?.special_remarks || "—"}
              </div>
            </div>

            {/* Items table */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 font-semibold">Items</div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr className="text-left text-gray-600">
                      <th className="px-3 py-2 w-14 text-center">Slno</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2 w-32 text-right">Pieces</th>
                      <th className="px-3 py-2 w-36 text-right">Unit Price</th>
                      <th className="px-3 py-2 w-36 text-right">Total Price</th>
                      <th className="px-3 py-2 w-32 text-right">Weight (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                          No items listed.
                        </td>
                      </tr>
                    )}
                    {items.map((it, i) => (
                      <tr key={`${i}-${it?.slno || "x"}`} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 text-center text-gray-500">
                          {it?.slno || i + 1}
                        </td>
                        <td className="px-3 py-2">{it?.name || "—"}</td>
                        <td className="px-3 py-2 text-right">{Number(it?.piece_no ?? it?.pieces ?? 0)}</td>
                        <td className="px-3 py-2 text-right">{fmt.money(it?.unit_price ?? it?.unitPrice)} SAR</td>
                        <td className="px-3 py-2 text-right">{fmt.money(it?.total_price ?? (Number(it?.piece_no || 0) * Number(it?.unit_price || 0)))} SAR</td>
                        <td className="px-3 py-2 text-right">{fmt.weight(it?.weight)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-100"
              >
                Print
              </button>
              <Link
                to={`/cargo/${id}`}
                className="px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Edit Cargo
              </Link>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
