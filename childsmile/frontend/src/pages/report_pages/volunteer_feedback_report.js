import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/reports.css";
import { exportVolunteerFeedbackToExcel, exportVolunteerFeedbackToPDF } from "../../components/export_utils";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import axios from "../../axiosConfig";

const VolunteerFeedbackReport = () => {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [sortOrderEventDate, setSortOrderEventDate] = useState('desc');
  const [sortOrderFeedbackDate, setSortOrderFeedbackDate] = useState('desc');
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { t } = useTranslation();

  const parseDate = (dateString) => {
    if (!dateString) return new Date(0); // Handle missing dates
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  // Add toggle functions
  const toggleSortOrderEventDate = () => {
    setSortOrderEventDate((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    const sorted = [...filteredFeedbacks].sort((a, b) => {
      const dateA = parseDate(a.event_date);
      const dateB = parseDate(b.event_date);
      return sortOrderEventDate === 'asc' ? dateB - dateA : dateA - dateB; // Reverse the logic
    });
    setFilteredFeedbacks(sorted);
  };

  const toggleSortOrderFeedbackDate = () => {
    setSortOrderFeedbackDate((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    const sorted = [...filteredFeedbacks].sort((a, b) => {
      const dateA = parseDate(a.feedback_filled_at);
      const dateB = parseDate(b.feedback_filled_at);
      return sortOrderFeedbackDate === 'asc' ? dateB - dateA : dateA - dateB; // Reverse the logic
    });
    setFilteredFeedbacks(sorted);
  };

  const handleCheckboxChange = (index) => {
    const updatedFeedbacks = filteredFeedbacks.map((feedback, i) => {
      if (i === index) {
        return { ...feedback, selected: !feedback.selected };
      }
      return feedback;
    });
    setFilteredFeedbacks(updatedFeedbacks);
  };

  const handleSelectAllCheckbox = (isChecked) => {
    const updatedFeedbacks = filteredFeedbacks.map((feedback) => ({
      ...feedback,
      selected: isChecked,
    }));
    setFilteredFeedbacks(updatedFeedbacks);
  };

  const fetchData = () => {
    setLoading(true);
    setSortOrderFeedbackDate('desc');
    setSortOrderEventDate('desc');
    axios
      .get("/api/reports/volunteer-feedback-report/")
      .then((response) => {
        const allFeedbacks = response.data.volunteer_feedback || [];
        setFeedbacks(allFeedbacks);
        setFilteredFeedbacks(allFeedbacks); // Initially show all data
      })
      .catch((error) => {
        console.error("Error fetching volunteer feedback report:", error);
        toast.error(t("Error fetching data"));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const applyDateFilter = () => {
    if (!fromDate || !toDate) {
      toast.error(t("Please select both From Date and To Date"));
      return;
    }

    const filtered = feedbacks.filter((feedback) => {
      const eventDate = new Date(feedback.event_date.split("/").reverse().join("-")); // Convert to Date object
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return eventDate >= from && eventDate <= to;
    });

    setFilteredFeedbacks(filtered);
  };

  const refreshData = () => {
    setFromDate("");
    setToDate("");
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="volunteer-feedback-report-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Volunteer Feedback Report")} />
      <div className="page-content">
        <ToastContainer
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          rtl={true}
        />
        {loading ? (
          <div className="loader">{t("Loading data...")}</div>
        ) : (
          <>
            <div className="filter-create-container">
              <div className="actions">
                <button
                  className="export-button excel-button"
                  onClick={() => exportVolunteerFeedbackToExcel(filteredFeedbacks, t)}
                >
                  <img src="/assets/excel-icon.png" alt="Excel" />
                </button>
                <button
                  className="export-button pdf-button"
                  onClick={() => exportVolunteerFeedbackToPDF(filteredFeedbacks, t)}
                >
                  <img src="/assets/pdf-icon.png" alt="PDF" />
                </button>
                <label>{t("From Date")}:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="date-input"
                />
                <label>{t("To Date")}:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="date-input"
                />
                <button className="filter-button" onClick={applyDateFilter}>
                  {t("Filter")}
                </button>
                <button className="refresh-button" onClick={refreshData}>
                  {t("Refresh")}
                </button>
              </div>
            </div>
            {!loading && (
              <div className="back-to-reports">
                <button
                  className="back-button"
                  onClick={() => (window.location.href = '/reports')}
                >
                  → {t('Click to return to Report page')}
                </button>
              </div>
            )}
            <div className="grid-container">
              {filteredFeedbacks.length === 0 ? (
                <div className="no-data">{t("No data to display")}</div>
              ) : (
                <table className="data-grid">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAllCheckbox(e.target.checked)}
                        />
                      </th>
                      <th>{t("Volunteer Name")}</th>
                      <th>{t("Child Name")}</th>
                      <th className="wide-column">
                        {t("Event Date")}
                        <button
                          className="sort-button"
                          onClick={toggleSortOrderEventDate}
                        >
                          {sortOrderEventDate === 'asc' ? '▲' : '▼'}
                        </button>
                      </th>
                      <th className="wide-column">
                        {t("Feedback Filled At")}
                        <button
                          className="sort-button"
                          onClick={toggleSortOrderFeedbackDate}
                        >
                          {sortOrderFeedbackDate === 'asc' ? '▲' : '▼'}
                        </button>
                      </th>
                      <th>{t("Description")}</th>
                      <th>{t("Feedback Type")}</th>
                      <th>{t("Exceptional Events")}</th>
                      <th>{t("Anything Else")}</th>
                      <th>{t("Comments")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeedbacks.map((feedback, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="checkbox"
                            checked={feedback.selected || false}
                            onChange={() => handleCheckboxChange(index)}
                          />
                        </td>
                        <td>{feedback.volunteer_name}</td>
                        <td>{feedback.child_name}</td>
                        <td>{feedback.event_date}</td>
                        <td>{feedback.feedback_filled_at}</td>
                        <td>{feedback.description}</td>
                        <td>{t(feedback.feedback_type)}</td>
                        <td>{feedback.exceptional_events}</td>
                        <td>{feedback.anything_else}</td>
                        <td>{feedback.comments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VolunteerFeedbackReport;