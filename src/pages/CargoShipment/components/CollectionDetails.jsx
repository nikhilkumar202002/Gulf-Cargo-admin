import React from 'react';
import { labelOf, prettyDriver } from '../../../utils/cargoHelpers';
import { RiFileList2Line } from "react-icons/ri";
 
export const CollectionDetails = React.memo(({ form, onRoleChange, updateForm, collectedByOptions, collectRoles }) => {
  const isOfficeRoleAutoSelected = form.collectedByRoleName === 'Office' && form.collectedByPersonId;

  const selectedPerson = React.useMemo(() => {
    if (!form.collectedByPersonId || !collectedByOptions.length) return null;
    return collectedByOptions.find(opt => {
      const valueId = form.collectedByRoleName === "Driver"
        ? opt?.id ?? opt?.driver_id ?? null
        : opt?.user_id ?? opt?.staff_id ?? opt?.id ?? null;
      return String(valueId) === String(form.collectedByPersonId);
    });
  }, [form.collectedByPersonId, form.collectedByRoleName, collectedByOptions]);

  const selectedPersonLabel = React.useMemo(() => {
    if (!selectedPerson) return '';
    return form.collectedByRoleName === "Driver" ? prettyDriver(selectedPerson) : labelOf(selectedPerson);
  }, [selectedPerson, form.collectedByRoleName]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <RiFileList2Line className="text-lg text-slate-600" />
        <h3 className="text-sm font-semibold tracking-wide text-slate-700">
          Collection Details
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 items-end">
          <div className='w-full space-y-1'>
            <label className="block text-xs font-medium text-slate-600">Invoice No</label>
            <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-base font-semibold text-slate-800 border border-slate-200 shadow-sm">
              {form.invoiceNo || "BR:000001"}
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(form.invoiceNo || "")}
                className="ml-2 rounded-md bg-white border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100 transition"
                title="Copy invoice number"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="w-full space-y-1">
            <label className="block text-xs font-medium text-slate-600">Branch</label>
            <div className="flex items-center rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 shadow-sm h-[42px]">
              {form.branchName || "--"}
            </div>
          </div>
        <div className="w-full space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Collected By (Role)
          </label>
          {isOfficeRoleAutoSelected ? (
            <input
              type="text"
              readOnly
              className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2 h-[42px]"
              value={form.collectedByRoleName}
            />
          ) : (
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 h-[42px]"
              value={form.collectedByRoleId}
              onChange={onRoleChange}
            >
              <option value="">Select role</option>
              {collectRoles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="w-full space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Collected By (Person)
          </label>
          {isOfficeRoleAutoSelected ? (
            <input
              type="text"
              readOnly
              className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2 h-[42px]"
              value={selectedPersonLabel}
            />
          ) : (
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 h-[42px]"
              value={form.collectedByPersonId}
              onChange={(e) => updateForm(draft => { draft.collectedByPersonId = e.target.value; })}
              disabled={!form.collectedByRoleName}
            >
              <option value="">Select person</option>
              {collectedByOptions.map((opt, i) => {
                const valueId = form.collectedByRoleName === "Driver" ? opt?.id ?? opt?.driver_id ?? null : opt?.staff_id ?? opt?.user_id ?? opt?.id ?? null;
                if (!valueId) return null;
                const label = form.collectedByRoleName === "Driver" ? prettyDriver(opt) : labelOf(opt);
                return (<option key={`${valueId}-${i}`} value={String(valueId)}>{label}</option>);
              })}
            </select>
          )}
        </div>
      </div>
    </div>
  );
});