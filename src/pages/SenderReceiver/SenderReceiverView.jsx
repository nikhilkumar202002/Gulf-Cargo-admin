import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiPlus, HiHome, HiEye } from "react-icons/hi";
import { getParties, getPartiesByCustomerType } from "../../api/partiesApi";
import { getActiveCustomerTypes } from "../../api/customerTypeApi";
import "../styles.css";

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
const getTypeLabel = (t) =>
  t?.customer_type ?? t?.name ?? t?.title ?? t?.label ?? `Type ${getId(t)}`;

// 🔑 robust row id (covers common server shapes)
const getRowId = (x) =>
  String(
    x?.id ??
    x?.party_id ??
    x?.partyId ??
    x?.uuid ??
    x?.code ??
    ""
  );

const SenderView = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [types, setTypes] = useState([]);
  const [typeLoading, setTypeLoading] = useState(true);
  const [typeErr, setTypeErr] = useState("");
  const [customerTypeId, setCustomerTypeId] = useState(""); // filter
  const [q, setQ] = useState(""); // search box
  const [qNow, setQNow] = useState(""); // debounced

  // debounce on-type search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setQNow(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // load customer types once (for filter)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setTypeLoading(true);
        setTypeErr("");
        const res = await getActiveCustomerTypes({ per_page: 500 });
        if (!mounted) return;
        setTypes(normalizeList(res));
      } catch (e) {
        if (!mounted) return;
        setTypeErr("Failed to load customer types.");
        console.error(e);
      } finally {
        if (!mounted) return;
        setTypeLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // load parties whenever filter/search changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const params = {
          per_page: 500,
          ...(qNow ? { search: qNow } : {}),
        };

        const res = customerTypeId
          ? await getPartiesByCustomerType(customerTypeId, params)
          : await getParties(params);

        if (!mounted) return;
        setRows(normalizeList(res));
      } catch (e) {
        if (!mounted) return;
        setErr("Failed to load parties.");
        console.error(e);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [customerTypeId, qNow]);

  const renderTypeFilter = useMemo(
    () => (
      <select
        value={String(customerTypeId)}
        onChange={(e) => setCustomerTypeId(e.target.value)}
        className="border rounded-lg px-3 py-2"
        disabled={typeLoading}
      >
        <option value="">{typeLoading ? "Loading types..." : "All Customer Types"}</option>
        {!typeLoading &&
          types.map((t) => {
            const id = getId(t);
            const label = getTypeLabel(t);
            return (
              <option key={id} value={id}>
                {label}
              </option>
            );
          })}
      </select>
    ),
    [customerTypeId, typeLoading, types]
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <HiHome className="text-gray-600" />
        <span className="cursor-pointer hover:text-blue-600">Home</span>
        <span>/</span>
        <span className="cursor-pointer hover:text-blue-600">Customer</span>
        <span>/</span>
        <span className="text-gray-800 font-medium">Index</span>
      </div>

      {/* Title + Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">List Customer</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* search */}
          <input
            type="text"
            placeholder="Search name / email / phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full sm:w-72"
          />
          {/* filter by customer type */}
          {renderTypeFilter}
          {/* add new */}
          <button
            onClick={() => navigate("/sendercreate")}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md transition"
          >
            <HiPlus className="text-lg" />
            Add New
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="min-w-full bg-white rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm uppercase tracking-wide">
              <th className="py-3 px-4 text-left">Sl No.</th>
              <th className="py-3 px-4 text-left">Customer Name</th>
              <th className="py-3 px-4 text-left">Customer Type</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan="7" className="py-6 text-center text-red-600">
                  {err}
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((p, idx) => {
                const rowId = getRowId(p);
                const name = p.name ?? p.full_name ?? p.customer_name ?? "—";
                const email = p.email ?? "—";
                const typeLabel =
                  p.customer_type?.customer_type ??
                  p.customer_type_name ??
                  p.type ??
                  p.customer_type ??
                  "—";
                const canView = !!rowId;

                return (
                  <tr
                    key={rowId || `${name}-${idx}`}
                    className={`border-b last:border-none hover:bg-gray-50 transition ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-700">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-800">{name}</td>
                    <td className="py-3 px-4 text-gray-700">{typeLabel}</td>
                    <td className="py-3 px-4 text-gray-700">{email}</td>
                    <td className="py-3 px-4">
                      <button
                        title={canView ? "View" : "Missing ID"}
                        onClick={() =>
                          canView &&
                          navigate(`/senderreceiver/senderview/${encodeURIComponent(rowId)}`)
                        }
                        disabled={!canView}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md text-white ${
                          canView
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : "bg-gray-300 cursor-not-allowed"
                        }`}
                      >
                        <HiEye /> View
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="py-6 text-center text-gray-500 italic">
                  No customers found. Click “Add New” to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SenderView;
