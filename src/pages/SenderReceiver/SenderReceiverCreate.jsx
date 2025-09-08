import React, { useState, useEffect } from "react";
import { FaUserTie } from "react-icons/fa";
import { getActiveCustomerTypes } from "../../api/customerTypeApi";

const normalizeActiveTypes = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const getTypeId = (t) => t?.id ?? t?._id ?? t?.value ?? String(t?.name ?? "");
const getTypeLabel = (t) => t?.name ?? t?.type ?? t?.title ?? t?.label ?? `Type ${getTypeId(t)}`;

const SenderCreate = () => {

  const [activeTypes, setActiveTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    branch: "",
    customerType: "",
    whatsappNumber: "",
    contactNumber: "",
    senderIdType: "CPR No",
    senderId: "",
    document: null,
    country: "Australia",
    state: "Al Manamah",
    district: "Al Manamah",
    city: "",
    zipCode: "",
    address: "",
  });

  // handle input changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

    useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setTypesLoading(true);
        setTypesError("");
        const res = await getActiveCustomerTypes({ per_page: 1000 }); 
        const list = normalizeActiveTypes(res);
        if (mounted) setActiveTypes(list);
      } catch (err) {
        if (mounted) setTypesError("Failed to load customer types.");
        console.error(err);
      } finally {
        if (mounted) setTypesLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted:", formData);
  };

  // reset form
  const handleCancel = () => {
    setFormData({
      name: "",
      email: "",
      branch: "",
      customerType: "",
      whatsappNumber: "",
      contactNumber: "",
      senderIdType: "CPR No",
      senderId: "",
      document: null,
      country: "Australia",
      state: "Al Manamah",
      district: "Al Manamah",
      city: "",
      zipCode: "",
      address: "",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-start py-10">
      <div className="bg-white shadow-lg rounded-xl w-full max-w-5xl p-8">

          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-3">
            <span className="staff-panel-heading-icon"><FaUserTie/></span>Create Sender/Receiver
          </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input
              type="text"
              name="name"
              placeholder="Enter Name"
              value={formData.name}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <input
              type="email"
              name="email"
              placeholder="Enter Email ID"
              value={formData.email}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <select
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option value="">Select Branch</option>
              <option>Branch 1</option>
              <option>Branch 2</option>
            </select>
              <select
        name="customerType"
        value={String(formData.customerType ?? "")}
        onChange={handleChange}
        className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
        disabled={typesLoading}
      >
        <option value="">{typesLoading ? "Loading..." : "Select Customer Type"}</option>
        {!typesLoading &&
          activeTypes.map((t) => {
            const id = String(getTypeId(t));
            const label = getTypeLabel(t);
            return (
              <option key={id} value={id}>
                {label}
              </option>
            );
          })}
      </select>

      {typesError ? (
        <p className="mt-1 text-sm text-red-600">{typesError}</p>
      ) : null}

          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
            <input
              type="text"
              name="whatsappNumber"
              placeholder="Enter WhatsApp Number"
              value={formData.whatsappNumber}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            
            <input
              type="text"
              name="contactNumber"
              placeholder="Enter Contact Number"
              value={formData.contactNumber}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>

          {/* ID Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <select
              name="senderIdType"
              value={formData.senderIdType}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option>CPR No</option>
              <option>Passport</option>
              <option>Driving License</option>
            </select>
            <input
              type="text"
              name="senderId"
              placeholder="Document ID"
              value={formData.senderId}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <input
              type="file"
              name="document"
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600 cursor-pointer"
            />
          </div>

          <hr />

          {/* Address Info */}
          <h3 className="text-lg font-semibold text-gray-700">Add Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option>Australia</option>
              <option>India</option>
              <option>UAE</option>
            </select>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option>Al Manamah</option>
              <option>Dubai</option>
              <option>Bangalore</option>
            </select>
            <select
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option>Al Manamah</option>
              <option>District 1</option>
              <option>District 2</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input
              type="text"
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <input
              type="text"
              name="zipCode"
              placeholder="Zip Code"
              value={formData.zipCode}
              onChange={handleChange}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>

          <textarea
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-red-300"
          ></textarea>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SenderCreate;
