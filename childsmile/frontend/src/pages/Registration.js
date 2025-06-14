import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "../styles/registration.css"; // Add styles for the registration page
import axios from "../axiosConfig";
import { toast, ToastContainer } from "react-toastify";
import { showErrorToast } from '../components/toastUtils'; // Import the error toast utility function
import logo from '../assets/logo.png'; // Import the logo image
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation
import "react-toastify/dist/ReactToastify.css"; // Import toast styles
import settlements from "../components/settlements.json"; // Import the settlements JSON file
import Switch from "react-switch"; // Import react-switch



const Registration = () => {
  // useEffect(() => {
  //   toast.info("זוהי הודעת טוסט לבדיקה\nThis is a test toast for CSS!", {
  //     className: "registration-toast",
  //     bodyClassName: "registration-toast-body-inner"
  //   });
  // }, []);
  const { t } = useTranslation();
  const navigate = useNavigate(); // Initialize the navigate function
  const [registrationButtonDisabled, setRegistrationButtonDisabled] = useState(false);
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    first_name: "",
    surname: "",
    age: 18,
    gender: "Male", // Default value for the switch
    phone_prefix: "050", // Default prefix
    phone_suffix: "", // Suffix for the phone number
    city: "",
    comment: "",
    email: "",
    want_tutor: false, // Default value for the switch
  });

  // Validation state
  const [errors, setErrors] = useState({});

  const cities = settlements.map((city) => city.trim()).filter((city) => city !== "");

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Add this new handler
  const handleToggleChange = (name, value) => {
    console.log(`DEBUG: ${name} changed to ${value}`); // Log the changes
    setFormData({ ...formData, [name]: value });
  };

  // Validate form fields
  const validate = () => {
    const newErrors = {};
    if (!formData.id || isNaN(formData.id) || formData.id.length !== 9) {
      newErrors.id = t('ID must be 9 digits long.');
    }
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
    // Validate gender (must be selected)
    if (!formData.gender || (formData.gender !== "Male" && formData.gender !== "Female")) {
      newErrors.gender = t("Please select a valid gender.");
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
    const wantTutorValue = String(formData.want_tutor);
    if (wantTutorValue !== "true" && wantTutorValue !== "false") {
      newErrors.want_tutor = t("Please select if you want to be a tutor.");
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const switchProps = {
    handleDiameter: 60,
    height: 80,
    width: 180,
    offColor: "#d9534f",
    onColor: "#0275d8",
    className: "custom-switch",
  };
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent the default form submission behavior
    console.log("DEBUG: Form data being submitted:", formData); // Log the form data

    if (validate()) {
      axios
        .post("/api/create_volunteer_or_tutor/", formData)
        .then((response) => {
          const username = response.data.username; // Extract the username from the response
          setRegistrationButtonDisabled(true); // Disable the registration button
          toast.success(
            t(
              "Welcome to Child Smile! Please log in with your credentials: Username: {{username}}, Password: 1234"
            ).replace("{{username}}", username),
            { autoClose: 5000 }
          );

          // Delay navigation to allow the toaster to display
          // Refresh the browser and navigate
          setTimeout(() => {
            window.location.replace("/"); // Refresh and navigate to the login page
          }, 5000); // 5-second delay
        })
        .catch((error) => {
          console.error("Error during registration:", error);
          showErrorToast(t, 'Registration failed. Please try again.', error);
        });
    }
  };


  // useEffect(() => {
  //   document.body.style.zoom = "105%";
  //   return () => {
  //     document.body.style.zoom = "";
  //   };
  // }, []);

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={10000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        pauseOnHover
      />
      <form className="registration-form" onSubmit={handleSubmit}>
        <img src={logo} alt="Logo" className="regisration-logo" />
        <h2>{t("Registration")}</h2>
        <div className="form-columns">
          {/* עמודה ימנית */}
          <div className="column">
            <div className="label-error-row">
              <label>{t("First Name")}</label>
              {errors.first_name && <span className="error-message">{errors.first_name}</span>}
            </div>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={errors.first_name ? "error" : ""}
            />

            <div className="label-error-row">
              <label>{t("Surname")}</label>
              {errors.surname && <span className="error-message">{errors.surname}</span>}
            </div>
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              className={errors.surname ? "error" : ""}
            />

            <div className="label-error-row">
              <label>{t("Age")}: {formData.age}</label>
              {errors.age && <span className="error-message">{errors.age}</span>}
            </div>
            <input
              type="range"
              name="age"
              min="18"
              max="100"
              value={formData.age}
              onChange={handleChange}
            />

            <div className="label-error-row">
              <label>{t("Gender")}</label>
              {errors.gender && <span className="error-message">{errors.gender}</span>}
            </div>
            <div className="switch-container">
              <Switch
                onChange={(checked) => handleToggleChange("gender", checked ? "Female" : "Male")}
                checked={formData.gender === "Female"}
                checkedIcon={<div className="switch-label">{t("Female")}</div>}
                uncheckedIcon={<div className="switch-label">{t("Male")}</div>}
                {...switchProps}
              />
            </div>

            <div className="label-error-row">
              <label>{t("ID")}</label>
              {errors.id && <span className="error-message">{errors.id}</span>}
            </div>
            <input
              type="text"
              name="id"
              value={formData.id}
              onChange={handleChange}
              maxLength="9"
              className={errors.id ? 'error' : ''}
            />
          </div>

          {/* עמודה שמאלית */}
          <div className="column">
            <div className="label-error-row">
              <label>{t("Phone")}</label>
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>
            <div className="phone-container">
              <input
                type="text"
                name="phone_suffix"
                value={formData.phone_suffix || ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  handleChange({ target: { name: "phone_suffix", value } });
                }}
                maxLength="7"
                className={errors.phone ? "error" : ""}
              />
              <span className="dash">-</span>
              <select
                name="phone_prefix"
                value={formData.phone_prefix || "050"}
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

            <div className="label-error-row">
              <label>{t("City")}</label>
              {errors.city && <span className="error-message">{errors.city}</span>}
            </div>
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


            <label>{t("Comment")}</label>
            <textarea
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              className="no-resize"
            />

            <div className="label-error-row">
              <label>{t("Email")}</label>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
            />


            <div className="label-error-row">
              <label>{t("Want to be a Tutor?")}</label>
              {errors.want_tutor && <span className="error-message">{errors.want_tutor}</span>}
            </div>
            <div className="switch-container">
              <Switch
                onChange={(checked) => handleToggleChange("want_tutor", checked ? "true" : "false")}
                checked={formData.want_tutor === "true"}
                checkedIcon={<div className="switch-label">{t("Yes")}</div>}
                uncheckedIcon={<div className="switch-label">{t("No")}</div>}
                {...switchProps}
              />
            </div>
          </div>
        </div>
        <button type="submit" disabled={registrationButtonDisabled}>{t("Register")}</button>
      </form>
    </>
  );
};

export default Registration;