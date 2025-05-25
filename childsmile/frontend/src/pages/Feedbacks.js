import React from "react";
import Sidebar from "../components/Sidebar";
import InnerPageHeader from "../components/InnerPageHeader";
import "../styles/common.css";
import "../styles/feedbacks.css";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { hasSomePermissions } from '../components/utils'; // Import utility functions for fetching data



const Feedbacks = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const feedbackDetails = {
    tutor_feedback: { name: t("Tutor Feedbacks"), path: "/feedbacks/TutorFeedbacks" },
    volunteer_feedback: { name: t("Volunteer Feedbacks"), path: "/feedbacks/VolunteerFeedbacks" },
  };
  
  const staff_resource = 'childsmile_app_staff';
  const general_v_feedback_resource = 'childsmile_app_general_v_feedback';
  const tutor_feedback_resource = 'childsmile_app_tutor_feedback';

  const actions = 'CREATE';
  const volunteer_feedback_report_permissions = [
    { resource: general_v_feedback_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const tutor_feedback_report_permissions = [
    { resource: tutor_feedback_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];

  const hasPermissionToVolunteerFeedback = hasSomePermissions(volunteer_feedback_report_permissions);
  const hasPermissionToTutorFeedback = hasSomePermissions(tutor_feedback_report_permissions);

  const feedbackPermissions = {
    volunteer_feedback: hasPermissionToVolunteerFeedback,
    tutor_feedback: hasPermissionToTutorFeedback,
  };


  return (
    <div className="feedbacks-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Feedbacks")} />
      <div className="feedbacks-page-content">
        {Object.keys(feedbackDetails).map((key) => {
          const feedback = feedbackDetails[key];
          if (!feedbackPermissions[key]) return null; // Only show if has permission
          return (
            <div
              key={key}
              className="feedback-card"
              onClick={() => navigate(feedback.path)}
            >
              <h2>{feedback.name}</h2>
            </div>
          );
        })}
      </div>
    </div>

  );
};

export default Feedbacks;