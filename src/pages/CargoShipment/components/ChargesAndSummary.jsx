import React from 'react';
import { FiFileText } from "react-icons/fi";
 
const CHARGE_ROWS = [
  ["total_weight", "Total Weight"],
  ["duty", "Duty"],
  ["packing_charge", "Packing charge"],
  ["additional_packing_charge", "Additional Packing charge"],
  ["insurance", "Insurance"],
  ["awb_fee", "AWB Fee"],
  ["vat_amount", "VAT Amount"],
  ["volume_weight", "Volume weight"],
  ["other_charges", "Other charges"],
  ["discount", "Discount"],
];

export const ChargesAndSummary = React.memo(({ form, updateForm, totalWeight, derived, subtotal, billCharges, vatCost, netTotal, toMoney }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <FiFileText className="text-lg text-slate-600" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-700">
            Remarks & Charges
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Special remarks
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form.specialRemarks}
              onChange={(e) => updateForm(draft => { draft.specialRemarks = e.target.value; })}
              placeholder="(optional) Handle with care, fragile goods."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              VAT %
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
              placeholder="0.00"
              value={form.vatPercentage}
              onChange={(e) => updateForm(draft => { draft.vatPercentage = Number.parseFloat(e.target.value || 0) || 0; })}
            />
          </div>
        </div>

        {/* Charges Matrix */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Charges</th>
                <th className="px-3 py-2 font-medium text-right">Quantity</th>
                <th className="px-3 py-2 font-medium text-right">Unit Rate</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {CHARGE_ROWS.map(([key, label], index) => {
                const row = form.charges[key] || { qty: 0, rate: 0 };
                const qtyValue = key === "total_weight" ? totalWeight : row.qty;
                const amountValue = derived.rows[key]?.amount ?? 0;
                return (
                  <tr key={key} className={index % 2 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-3 py-2 text-slate-700">{label}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                        value={qtyValue}
                        onChange={(e) => updateForm(draft => {
                          if (key !== 'total_weight') {
                            draft.charges[key].qty = Number(e.target.value || 0);
                          }
                        })}
                        readOnly={key === "total_weight"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                        value={row.rate}
                        onChange={(e) => updateForm(draft => {
                          draft.charges[key].rate = Number(e.target.value || 0);
                        })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        readOnly
                        className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium"
                        value={amountValue.toFixed(2)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-medium">
              <tr>
                <td className="px-3 py-2 text-slate-700">No. of Boxes</td>
                <td colSpan={3} className="px-3 py-2">
                  <input
                    type="number"
                    readOnly
                    className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2 text-right"
                    value={form.charges.no_of_pieces}
                  />
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right text-slate-800">Total Amount</td>
                <td className="px-3 py-2">
                  <input
                    readOnly
                    className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2 text-right font-semibold"
                    value={derived.totalAmount.toFixed(2)}
                  />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-700">
            Summary
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-700"><span>Subtotal</span><b>{subtotal.toFixed(2)}</b></div>
            <div className="flex justify-between text-slate-700"><span>Bill Charges</span><b>{toMoney(billCharges)}</b></div>
            <div className="flex justify-between text-slate-700"><span>VAT</span><b>{vatCost.toFixed(2)}</b></div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
              <span>Total (Net)</span>
              <span>{netTotal.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-600">
              <span>Total Weight</span>
              <span>{totalWeight.toFixed(3)} kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});