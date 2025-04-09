import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/registration.css"; // Add styles for the registration page
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import { showErrorToast } from '../components/toastUtils'; // Import the error toast utility function
import logo from '../assets/logo.png'; // Import the logo image
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation
import "react-toastify/dist/ReactToastify.css"; // Import toast styles
import settlements from "../components/settlements.json"; // Import the settlements JSON file
import Switch from "react-switch"; // Import react-switch



const Registration = () => {
  const { t } = useTranslation();
  const navigate = useNavigate(); // Initialize the navigate function

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    surname: "",
    age: 18,
    gender: "",
    phone_prefix: "050", // Default prefix
    phone_suffix: "", // Suffix for the phone number
    city: "",
    comment: "",
    email: "",
    want_tutor: "",
  });

  // Validation state
  const [errors, setErrors] = useState({});

  // List of cities in Israel
  const cities = settlements.map((city) => city.trim()).filter((city) => city !== "");

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Add this new handler
  const handleToggleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  // Validate form fields
  const validate = () => {
    const newErrors = {};

    // Validate first_name and surname (Hebrew only, no spaces, no numbers)
    const hebrewRegex = /^[\u0590-\u05FF]+$/;
    if (!formData.first_name || !hebrewRegex.test(formData.first_name)) {
      newErrors.first_name = t("First name must be in Hebrew and cannot be empty.");
    }
    if (!formData.surname || !hebrewRegex.test(formData.surname)) {
      newErrors.surname = t("Surname must be in Hebrew and cannot be empty.");
    }

    // Validate age (18-100)
    if (formData.age < 18 || formData.age > 100) {
      newErrors.age = t("Age must be between 18 and 100.");
    }

    // Validate gender (must be selected)
    if (!formData.gender) {
      newErrors.gender = t("Please select a gender.");
    }

    // Validate phone (prefix 050-059 and 7 numeric digits)
    if (!formData.phone_prefix || !formData.phone_suffix || formData.phone_suffix.length !== 7) {
      newErrors.phone = t("Phone number must start with 050-059 and have exactly 7 digits.");
    }

    // Validate city (must be selected)
    if (!formData.city) {
      newErrors.city = t("Please select a city.");
    }

    // Validate email (basic email format)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = t("Please enter a valid email address.");
    }

    // Validate want_tutor (must be selected)
    if (!formData.want_tutor) {
      newErrors.want_tutor = t("Please select if you want to be a tutor.");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    if (validate()) {
      axios
        .post("/api/create_volunteer_or_tutor/", formData)
        .then((response) => {
          toast.success(
            t(
              "Welcome to Child Smile! Please log in with your credentials: Username: {{username}}, Password: 1234"
            ).replace("{{username}}", `${formData.first_name}_${formData.surname}`),
            { autoClose: 10000 }
          );
          setFormData({
            first_name: "",
            surname: "",
            age: 18,
            gender: "Male",
            phone: "",
            city: "",
            comment: "",
            email: "",
            want_tutor: "false",
          });
          navigate("/"); // Redirect to the login page
        })
        .catch((error) => {
          console.error("Error during registration:", error);
          showErrorToast(t, '', { message: "Registration failed. Please try again." });
        });
    }
  };

  return (
    <div className="registration-container">
      <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "20px", direction: "ltr" }} className="logo-container">
        <img src={logo} alt="Logo" className="logo" />
      </div>

      <form className="registration-form" onSubmit={handleSubmit}>
        <h2>{t("Register")}</h2>

        <label>{t("First Name")}</label>
        <input
          type="text"
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          className={errors.first_name ? "error" : ""}
        />
        {errors.first_name && <span className="error-message">{errors.first_name}</span>}

        <label>{t("Surname")}</label>
        <input
          type="text"
          name="surname"
          value={formData.surname}
          onChange={handleChange}
          className={errors.surname ? "error" : ""}
        />
        {errors.surname && <span className="error-message">{errors.surname}</span>}

        <label>{t("Age")}: {formData.age}</label>
        <input
          type="range"
          name="age"
          min="18"
          max="100"
          value={formData.age}
          onChange={handleChange}
        />
        {errors.age && <span className="error-message">{errors.age}</span>}

        {/* Gender Switch */}
        <label>{t("Gender")}</label>
        <div className="switch-container">
          <Switch
            onChange={(checked) => handleToggleChange("gender", checked ? "Female" : "Male")}
            checked={formData.gender === "Female"}
            className="custom-switch"
            checkedIcon={<div className="switch-label">{t("Female")}</div>}
            uncheckedIcon={<div className="switch-label">{t("Male")}</div>}
            offColor="#ff9aa2"
            onColor="#86d3ff"
            handleDiameter={50}
            height={50}
            width={200}
            disableDrag={true}
          />
        </div>
        {errors.gender && <span className="error-message">{errors.gender}</span>}

        {/* Phone Input */}
        <label>{t("Phone")}</label>
        <div className="phone-container">
          <input
            type="text"
            name="phone_suffix"
            value={formData.phone_suffix || ""}
            onChange={(e) => {
              // Allow only numeric input
              const value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
              handleChange({ target: { name: "phone_suffix", value } });
            }}
            maxLength="7" // Limit to 7 digits
            className={errors.phone ? "error" : ""}
          />
          <span className="dash">-</span><select
            name="phone_prefix"
            value={formData.phone_prefix || "050"} // Default to "050"
            onChange={(e) => handleChange({ target: { name: "phone_prefix", value: e.target.value } })}
            className={errors.phone ? "error" : ""}
          >
            {["050", "051", "052", "053", "054", "055", "056", "057", "058", "059"].map((prefix) => (
              <option key={prefix} value={prefix}>
                {prefix}
              </option>
            ))}
          </select>

        </div>
        {errors.phone && <span className="error-message">{errors.phone}</span>}

        <label>{t("City")}</label>
        <select
          name="city"
          value={formData.city}
          onChange={handleChange}
          className={errors.city ? "error" : ""}
        >
          <option value="">{t("Select a city")}</option>
          {cities.map((city, index) => (
            <option key={index} value={city}>
              {city}
            </option>
          ))}
        </select>
        {errors.city && <span className="error-message">{errors.city}</span>}

        <label>{t("Comment")}</label>
        <textarea
          name="comment"
          value={formData.comment}
          onChange={handleChange}
          className="no-resize"
        />

        <label>{t("Email")}</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? "error" : ""}
        />
        {errors.email && <span className="error-message">{errors.email}</span>}

        {/* Want to be a Tutor Switch */}
        <label>{t("Want to be a Tutor?")}</label>
        <div className="switch-container">
          <Switch
            onChange={(checked) => handleToggleChange("want_tutor", checked ? "true" : "false")}
            checked={formData.want_tutor === "true"}
            className="custom-switch"
            checkedIcon={<div className="switch-label">{t("Yes")}</div>}
            uncheckedIcon={<div className="switch-label">{t("No")}</div>}
            offColor="#ff9aa2"
            onColor="#86d3ff"
            handleDiameter={50}
            height={50}
            width={200}
            disableDrag={true}
          />
        </div>
        {errors.want_tutor && <span className="error-message">{errors.want_tutor}</span>}

        <button type="submit">{t("Register")}</button>
      </form>
    </div >
  );
};

export default Registration;