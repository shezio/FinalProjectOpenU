import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/feedbacks.css";
import "../../styles/reports.css";
import { exportFeedbackToExcel, exportFeedbackToPDF } from "../../components/export_utils";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import axios from "../../axiosConfig";
import { navigateTo } from "../../components/utils";

const FeedbackReport = () => {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [sortOrderEventDate, setSortOrderEventDate] = useState('asc');
  const [sortOrderFeedbackDate, setSortOrderFeedbackDate] = useState('asc');
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();
  const tbodyRef = useRef(null);
  const PAGE_SIZE = 5;
  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredFeedbacks.length / PAGE_SIZE));
    if (currentPage > tp) setCurrentPage(tp);
  }, [PAGE_SIZE, filteredFeedbacks.length, currentPage]);

  const parseDate = (dateString) => {
    if (!dateString) return new Date(0);
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const toggleSortOrderEventDate = () => {
    setSortOrderEventDate((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    const sorted = [...filteredFeedbacks].sort((a, b) => {
      const dateA = parseDate(a.event_date);
      const dateB = parseDate(b.event_date);
      return sortOrderEventDate === 'asc' ? dateB - dateA : dateA - dateB;
    });
    setFilteredFeedbacks(sorted);
  };

  const toggleSortOrderFeedbackDate = () => {
    setSortOrderFeedbackDate((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    const sorted = [...filteredFeedbacks].sort((a, b) => {
      const dateA = parseDate(a.feedback_filled_at);
      const dateB = parseDate(b.feedback_filled_at);
      return sortOrderFeedbackDate === 'asc' ? dateB - dateA : dateA - dateB;
    });
    setFilteredFeedbacks(sorted);
  };

  // Checkbox logic
  const handleCheckboxChange = (index) => {
    const actualIndex = (currentPage - 1) * PAGE_SIZE + index;
    const updatedFeedbacks = filteredFeedbacks.map((feedback, i) => {
      if (i === actualIndex) {
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
    setSortOrderFeedbackDate('desc')
    setSortOrderEventDate('desc')
    setLoading(true);
    axios
      .get("/api/reports/feedback-report/")
      .then((response) => {
        const allFeedbacks = response.data.feedback || [];
        setFeedbacks(allFeedbacks);
        setFilteredFeedbacks(allFeedbacks);
      })
      .catch((error) => {
        console.error("Error fetching feedback report:", error);
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
      const eventDate = new Date(feedback.event_date.split("/").reverse().join("-"));
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return eventDate >= from && eventDate <= to;
    });

    setFilteredFeedbacks(filtered);
    setCurrentPage(1);
  };

  const refreshData = () => {
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set zoom level when component mounts (match the feedbacks list page)
  useEffect(() => {
    document.body.style.zoom = "80%";
    return () => {
      document.body.style.zoom = "";
    };
  }, []);

  return (
    <div className="tutor-feedback-report-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Feedback Report")} />
      <div className="page-content">

        {loading ? (
          <div className="loader">{t("Loading data...")}</div>
        ) : (
          <>
            <div className="filter-create-container">
              <div className="actions">
                <button
                  className="export-button excel-button"
                  onClick={() => exportFeedbackToExcel(filteredFeedbacks, t)}
                >
                  <img src="/assets/excel-icon.png" alt="Excel" />
                </button>
                <button
                  className="export-button pdf-button"
                  onClick={() => exportFeedbackToPDF(filteredFeedbacks, t)}
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
                  onClick={() => navigateTo('/reports')}
                >
                  → {t('Click to return to Report page')}
                </button>
              </div>
            )}
            <div className="tutor-feedback-report-grid-container feedback-grid-container">
              {filteredFeedbacks.length === 0 ? (
                <div className="no-data">{t("No data to display")}</div>
              ) : (
                <>
                  <table className="feedbacks-data-grid">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            onChange={(e) => handleSelectAllCheckbox(e.target.checked)}
                          />
                        </th>
                        <th>{t("Volunteer/Tutor Name")}</th>
                        <th>{t("Tutee Name / Hospital Name")}</th>
                        <th>{t("Is It Your Tutee?")}</th>
                        <th className="feedbacks-wide-column">
                          {t("Event Date")}
                          <button
                            className="sort-button"
                            onClick={toggleSortOrderEventDate}
                          >
                            {sortOrderEventDate === 'asc' ? '▲' : '▼'}
                          </button>
                        </th>
                        <th className="feedbacks-wide-column">
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
                        <th>{t("Initial Family Data")}</th>
                      </tr>
                    </thead>
                    <tbody ref={tbodyRef}>
                      {filteredFeedbacks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((feedback, index) => (
                        <tr key={index}>
                          <td>
                            <input
                              type="checkbox"
                              checked={feedback.selected || false}
                              onChange={() => handleCheckboxChange(index)}
                            />
                          </td>
                          <td>{feedback.filler_name}</td>
                          <td>{feedback.subject_name || feedback.hospital_name}</td>
                          <td>{feedback.is_it_your_tutee ? t("Yes") : t("No")}</td>
                          <td>{feedback.event_date}</td>
                          <td>{feedback["feedback_filled_at"]}</td>
                          <td><div className="td-scroll">{feedback.description}</div></td>
                          <td>{t(feedback.feedback_type)}</td>
                          <td><div className="td-scroll">{feedback.exceptional_events}</div></td>
                          <td><div className="td-scroll">{feedback.anything_else}</div></td>
                          <td><div className="td-scroll">{feedback.comments}</div></td>
                          <td>
                            <div className="td-scroll">
                            {[
                              feedback.names,
                              feedback.phones,
                              feedback.other_information
                            ].filter(Boolean).length > 0
                              ? (
                                <>
                                  {feedback.names && <div>{t("Names")}: {feedback.names}</div>}
                                  {feedback.phones && <div>{t("Phones")}: {feedback.phones}</div>}
                                  {feedback.other_information && <div>{t("Other Information")}: {feedback.other_information}</div>}
                                </>
                              )
                              : "---"
                            }
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="pagination">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="pagination-arrow">&laquo;</button>
                    <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-arrow">&lsaquo;</button>
                    {Array.from({ length: Math.ceil(filteredFeedbacks.length / PAGE_SIZE) }, (_, i) => {
                      const pageNum = i + 1;
                      const totalPages = Math.ceil(filteredFeedbacks.length / PAGE_SIZE);
                      const maxButtons = 3;
                      const halfRange = Math.floor(maxButtons / 2);
                      let start = Math.max(1, currentPage - halfRange);
                      let end = Math.min(totalPages, start + maxButtons - 1);
                      if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
                      return pageNum >= start && pageNum <= end ? (
                        <button
                          key={pageNum}
                          className={currentPage === pageNum ? "active" : ""}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      ) : null;
                    })}
                    <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(filteredFeedbacks.length / PAGE_SIZE)} className="pagination-arrow">&rsaquo;</button>
                    <button onClick={() => setCurrentPage(Math.ceil(filteredFeedbacks.length / PAGE_SIZE))} disabled={currentPage === Math.ceil(filteredFeedbacks.length / PAGE_SIZE)} className="pagination-arrow">&raquo;</button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackReport;
