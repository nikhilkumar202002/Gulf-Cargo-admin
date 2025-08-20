import React, { useState } from "react";
import "../Styles.css";

const SenderCreate = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    branch: "",
    customerType: "",
    whatsappCode: "+93",
    whatsappNumber: "",
    contactCode: "+93",
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
      whatsappCode: "+93",
      whatsappNumber: "",
      contactCode: "+93",
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
    <div className="form-container">
         {/* Heading */}
      <div className="form-header">
        <h2>Create Customer</h2>
      </div>

      <form className="new-sender-form" onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="form-row">
          <input
            type="text"
            name="name"
            placeholder="Enter Name"
            value={formData.name}
            onChange={handleChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Enter Email ID"
            value={formData.email}
            onChange={handleChange}
          />
          <select name="branch" value={formData.branch} onChange={handleChange}>
            <option value="">Select Branch</option>
            <option>Branch 1</option>
            <option>Branch 2</option>
          </select>
          <select
            name="customerType"
            value={formData.customerType}
            onChange={handleChange}
          >
            <option value="">Select Customer Type</option>
            <option>Individual</option>
            <option>Business</option>
          </select>
        </div>

        {/* Contact Info */}
        <div className="form-row">
          <select
            name="whatsappCode"
            value={formData.whatsappCode}
            onChange={handleChange}
          >
            <option>+93</option>
            <option>+91</option>
            <option>+971</option>
          </select>
          <input
            type="text"
            name="whatsappNumber"
            placeholder="Enter WhatsApp Number"
            value={formData.whatsappNumber}
            onChange={handleChange}
          />

          <select
            name="contactCode"
            value={formData.contactCode}
            onChange={handleChange}
          >
            <option>+93</option>
            <option>+91</option>
            <option>+971</option>
          </select>
          <input
            type="text"
            name="contactNumber"
            placeholder="Enter Contact Number"
            value={formData.contactNumber}
            onChange={handleChange}
          />
        </div>

        {/* ID Info */}
        <div className="form-row">
          <select
            name="senderIdType"
            value={formData.senderIdType}
            onChange={handleChange}
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
          />
          <input type="file" name="document" onChange={handleChange} />
        </div>

        <hr />

        {/* Address Info */}
        <h3>Add Address</h3>
        <div className="form-row">
          <select
            name="country"
            value={formData.country}
            onChange={handleChange}
          >
            <option>Australia</option>
            <option>India</option>
            <option>UAE</option>
          </select>
          <select name="state" value={formData.state} onChange={handleChange}>
            <option>Al Manamah</option>
            <option>Dubai</option>
            <option>Bangalore</option>
          </select>
          <select
            name="district"
            value={formData.district}
            onChange={handleChange}
          >
            <option>Al Manamah</option>
            <option>District 1</option>
            <option>District 2</option>
          </select>
        </div>

        <div className="form-row">
          <input
            type="text"
            name="city"
            placeholder="City"
            value={formData.city}
            onChange={handleChange}
          />
          <input
            type="text"
            name="zipCode"
            placeholder="Zip Code"
            value={formData.zipCode}
            onChange={handleChange}
          />
        </div>

        <textarea
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
        ></textarea>

        {/* Action Buttons */}
        <div className="button-row">
          <button type="submit" className="btn btn-success">
            Submit
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SenderCreate;
