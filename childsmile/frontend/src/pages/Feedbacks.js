import React from "react";
import Sidebar from "../components/Sidebar";
import InnerPageHeader from "../components/InnerPageHeader";
import "../styles/common.css";
import "../styles/feedbacks.css";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { hasViewPermissionForTable } from "../components/utils";


const Feedbacks = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const hasPermissionToAnyFeedback = hasViewPermissionForTable("tutor_feedback") || hasViewPermissionForTable("general_v_feedback");

  const feedbackDetails = {
    tutor_feedback: { name: t("Tutor Feedbacks"), path: "/feedbacks/TutorFeedbacks" },
    volunteer_feedback: { name: t("Volunteer Feedbacks"), path: "/feedbacks/VolunteerFeedbacks" },
  };

  if (!hasPermissionToAnyFeedback) {
    return (
      <div className="feedbacks-main-content">
        <Sidebar />
        <InnerPageHeader title={t("Feedbacks")} />
        <div className="feedbacks-page-content">
          <div className="no-permission">
            <h2>{t("You do not have permission to view this page")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedbacks-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Feedbacks")} />
      <div className="feedbacks-page-content">
        {Object.keys(feedbackDetails).map((key) => {
          const feedback = feedbackDetails[key];
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