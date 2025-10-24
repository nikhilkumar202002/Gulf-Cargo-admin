import React from 'react';
import { idOf, labelOf } from '../../../utils/cargoHelpers';

export const ShipmentDetails = React.memo(({ form, updateForm, options, loading }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700">
          Shipment & Payment
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Shipping Method
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.shippingMethodId}
            onChange={(e) => updateForm(draft => { draft.shippingMethodId = e.target.value; })}
            disabled={loading}
          >
            <option value="">Select</option>
            {options.methods.map((m) => (
              <option key={String(idOf(m))} value={String(idOf(m))}>
                {labelOf(m)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Payment Method
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.paymentMethodId}
            onChange={(e) => updateForm(draft => { draft.paymentMethodId = e.target.value; })}
          >
            <option value="">Select Payment Method</option>
            {options.paymentMethods.map((pm) => (
              <option key={String(pm.id)} value={String(pm.id)}>
                {pm.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Delivery Type
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.deliveryTypeId}
            onChange={(e) => updateForm(draft => { draft.deliveryTypeId = e.target.value; })}
          >
            <option value="">Select</option>
            {options.deliveryTypes.map((t) => (
              <option key={String(t.id)} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});