import React from 'react';
import ItemAutosuggest from './ItemAutosuggest';

export const BoxesSection = React.memo(({
  boxes,
  addBox,
  removeBox,
  setBoxWeight,
  addItemToBox,
  removeItemFromBox,
  setBoxItem,
  itemOptions
}) => {
  return (
    <div className="space-y-4">
      {boxes.map((box, boxIndex) => (
        <div
          key={boxIndex}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-sm font-semibold text-slate-800">
                Box No:{" "}
                <span className="ml-2 inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-2 py-0.5">
                  {box.box_number}
                </span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Box Weight (kg)</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  title="Enter after packing"
                  className={`w-32 rounded-lg border px-2 py-1 text-right ${Number(box.box_weight || 0) <= 0
                    ? "border-rose-300"
                    : "border-slate-300"
                    }`}
                  value={box.box_weight ?? 0}
                  onChange={(e) => setBoxWeight(boxIndex, e.target.value)}
                  placeholder="0.000"
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => removeBox(boxIndex)}
                disabled={boxes.length <= 1}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-white ${boxes.length <= 1
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-rose-600 hover:bg-rose-700"
                  }`}
                title={
                  boxes.length <= 1
                    ? "At least one box is required"
                    : "Remove this box"
                }
              >
                Remove Box
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-3 py-2 w-12 text-center">Sl.</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 w-28 text-right">Pieces</th>
                  <th className="px-3 py-2 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {box.items.map((it, itemIndex) => (
                  <tr key={itemIndex} className={itemIndex % 2 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-3 py-2 text-center text-slate-500">{itemIndex + 1}</td>
                    <td className="px-3 py-2">
                      <ItemAutosuggest
                        value={it.name}
                        onChange={(v) => setBoxItem(boxIndex, itemIndex, "name", v)}
                        options={itemOptions}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
                        placeholder="0"
                        value={it.pieces}
                        onChange={(e) => setBoxItem(boxIndex, itemIndex, "pieces", Number.parseInt(e.target.value || 0, 10) || 0)}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removeItemFromBox(boxIndex, itemIndex)} className="inline-flex rounded-lg bg-rose-500 px-2 py-1 text-white hover:bg-rose-600">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => addItemToBox(boxIndex)} className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Add Item</button>
          </div>
        </div>
      ))}
    </div>
  );
});