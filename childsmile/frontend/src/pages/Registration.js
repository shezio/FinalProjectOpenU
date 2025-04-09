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

const Registration = () => {
  const { t } = useTranslation();
  const navigate = useNavigate(); // Initialize the navigate function

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    surname: "",
    age: 18,
    gender: "",
    phone: "",
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

    // Validate phone (prefix 050-059, dash, and 7 digits)
    const phoneRegex = /^05[0-9]-[0-9]{7}$/;
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = t("Phone number must start with 050-059 and follow the format 05X-XXXXXXX.");
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
    e.preventDefault();
    if (validate()) {
      // Send data to the backend
      axios
        .post("/api/create_volunteer_or_tutor/", formData)
        .then((response) => {
          // Show a success message with the username
          toast.success(
            t(
              "Welcome to Child Smile! Please log in with your credentials: Username: {{username}}, Password: 1234"
            ).replace("{{username}}", `${formData.first_name}_${formData.surname}`),
            { autoClose: 10000 } // 10 seconds
          );
  
          // Reset the form
          setFormData({
            first_name: "",
            surname: "",
            age: 18,
            gender: "",
            phone: "",
            city: "",
            comment: "",
            email: "",
            want_tutor: "",
          });
  
          // Navigate back to the login page
          navigate("/");
        })
        .catch((error) => {
          console.error("Error during registration:", error);
          showErrorToast(t, '', { message: "Registration failed. Please try again." });
        });
    }
  };

  return (
    <div className="registration-container">
      <div className="logo-container">
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

        <label>{t("Age")}</label>
        <input
          type="number"
          name="age"
          value={formData.age}
          onChange={handleChange}
          min="18"
          max="100"
        />
        {errors.age && <span className="error-message">{errors.age}</span>}

        <label>{t("Gender")}</label>
        <div>
          <label>
            <input
              type="radio"
              name="gender"
              value="true"
              checked={formData.gender === "true"}
              onChange={handleChange}
            />
            {t("Yes")}
          </label>
          <label>
            <input
              type="radio"
              name="gender"
              value="false"
              checked={formData.gender === "false"}
              onChange={handleChange}
            />
            {t("No")}
          </label>
        </div>
        {errors.gender && <span className="error-message">{errors.gender}</span>}

        <label>{t("Phone")}</label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className={errors.phone ? "error" : ""}
        />
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
        ></textarea>

        <label>{t("Email")}</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? "error" : ""}
        />
        {errors.email && <span className="error-message">{errors.email}</span>}

        <label>{t("Want to be a Tutor?")}</label>
        <div>
          <label>
            <input
              type="radio"
              name="want_tutor"
              value="true"
              checked={formData.want_tutor === "true"}
              onChange={handleChange}
            />
            {t("Yes")}
          </label>
          <label>
            <input
              type="radio"
              name="want_tutor"
              value="false"
              checked={formData.want_tutor === "false"}
              onChange={handleChange}
            />
            {t("No")}
          </label>
        </div>
        {errors.want_tutor && <span className="error-message">{errors.want_tutor}</span>}

        <button type="submit">{t("Register")}</button>
      </form>
    </div>
  );
};

export default Registration;