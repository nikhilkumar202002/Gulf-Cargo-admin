import React from 'react';
import { addressFromParty, phoneFromParty } from '../../../utils/cargoHelpers';
import { FaUserPlus } from "react-icons/fa";
import { FiUser, FiSend, FiUserCheck } from "react-icons/fi";

export const PartyInfo = React.memo(({ form, updateForm, options, loading, onSenderAdd, onReceiverAdd, selectedSender, selectedReceiver }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiSend className="text-lg text-slate-600" />
            <h3 className="text-sm font-semibold tracking-wide text-slate-700">Sender Info</h3>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSenderAdd();
            }}
            className="party-add-btn"
          >
            <FaUserPlus />
            <span>Add</span>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Sender/Customer
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form.senderId}
              onChange={(e) => updateForm(draft => { draft.senderId = e.target.value; })}
              disabled={loading}
            >
              <option value="">Select a sender</option>
              {options.senders.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
            <div className="grid grid-cols-[60px_1fr] gap-2">
              <span className="text-slate-500">Address</span>
              <span className="text-slate-800 font-medium">
                {addressFromParty(selectedSender) || form.senderAddress || "—"}
              </span>
            </div>
            <div className="grid grid-cols-[60px_1fr] gap-2">
              <span className="text-slate-500">Phone</span>
              <span className="text-slate-800 font-medium">
                {phoneFromParty(selectedSender) || form.senderPhone || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiUserCheck className="text-lg text-slate-600" />
            <h3 className="text-sm font-semibold tracking-wide text-slate-700">Receiver Info</h3>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReceiverAdd();
            }}
            className="party-add-btn"
          >
            <FaUserPlus />
            <span>Add</span>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Receiver/Customer
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form.receiverId}
              onChange={(e) => updateForm(draft => { draft.receiverId = e.target.value; })}
              disabled={loading}
            >
              <option value="">Select a receiver</option>
              {options.receivers.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
            <div className="grid grid-cols-[60px_1fr] gap-2">
              <span className="text-slate-500">Address</span>
              <span className="text-slate-800 font-medium">
                {addressFromParty(selectedReceiver) || form.receiverAddress || "—"}
              </span>
            </div>
            <div className="grid grid-cols-[60px_1fr] gap-2">
              <span className="text-slate-500">Phone</span>
              <span className="text-slate-800 font-medium">
                {phoneFromParty(selectedReceiver) || form.receiverPhone || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});