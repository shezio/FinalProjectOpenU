import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/reports.css";
import "../../styles/tutorship_pending.css";
import { hasViewPermissionForTable } from "../../components/utils";
import axios from "../../axiosConfig";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { exportTutorshipPendingToExcel, exportTutorshipPendingToPDF } from "../../components/export_utils";
import { useTranslation } from "react-i18next";

const FamiliesWaitingForTutorshipReport = () => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { t } = useTranslation();

  const hasPermissionToView = hasViewPermissionForTable("children");

  const fetchData = () => {
    setLoading(true);
    axios
      .get("/api/reports/families-waiting-for-tutorship-report/", {
        params: { from_date: fromDate, to_date: toDate },
      })
      .then((response) => {
        setFamilies(response.data.families_waiting_for_tutorship || []);
      })
      .catch((error) => {
        console.error("Error fetching families waiting for tutorship report:", error);
        toast.error(t("Error fetching data"));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const refreshData = () => {
    setFromDate("");
    setToDate("");
    fetchData();
  };

  useEffect(() => {
    if (hasPermissionToView) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [hasPermissionToView]);

  if (!hasPermissionToView) {
    return (
      <div className="main-content">
        <Sidebar />
        <InnerPageHeader title={t("Families Waiting for Tutorship Report")} />
        <div className="page-content">
          <div className="no-permission">
            <h2>{t("You do not have permission to view this page")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title={t("Families Waiting for Tutorship Report")} />
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
        <div className="filter-create-container">
          <div className="actions">
            <button
              className="export-button excel-button"
              onClick={() => exportTutorshipPendingToExcel(families, t)}
            >
              <img src="/assets/excel-icon.png" alt="Excel" />
            </button>
            <button
              className="export-button pdf-button"
              onClick={() => exportTutorshipPendingToPDF(families, t)}
            >
              <img src="/assets/pdf-icon.png" alt="PDF" />
            </button>
            <label htmlFor="date-from">{t("From Date")}:</label>
            <input
              type="date"
              id="date-from"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="date-input"
            />
            <label htmlFor="date-to">{t("To Date")}:</label>
            <input
              type="date"
              id="date-to"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="date-input"
            />
            <button className="filter-button" onClick={fetchData}>
              {t("Filter")}
            </button>
            <button className="refresh-button" onClick={refreshData}>
              {t("Refresh")}
            </button>
          </div>
        </div>
        {loading ? (
          <div className="loader">{t("Loading data...")}</div>
        ) : (
          <div className="tutorship-pending-grid-container">
            {families.length === 0 ? (
              <div className="no-data">{t("No data to display")}</div>
            ) : (
              <table className="tutorship-pending-data-grid">
                <thead>
                  <tr>
                    <th>{t("Child Full Name")}</th>
                    <th>{t("Father Name")}</th>
                    <th>{t("Father Phone")}</th>
                    <th>{t("Mother Name")}</th>
                    <th>{t("Mother Phone")}</th>
                    <th>{t("Tutoring Status")}</th>
                    <th>{t("Registration Date")}</th>
                    <th>{t("Select")}</th> {/* Added Action column */}
                  </tr>
                </thead>
                <tbody>
                  {families.map((family, index) => (
                    <tr key={index}>
                      <td>{family.first_name} {family.last_name}</td> {/* Use correct keys */}
                      <td>{family.father_name}</td>
                      <td>{family.father_phone}</td>
                      <td>{family.mother_name}</td>
                      <td>{family.mother_phone}</td>
                      <td>{family.tutoring_status}</td>
                      <td>{family.registration_date}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={family.selected || false}
                          onChange={() => {
                            const updatedFamilies = [...families];
                            updatedFamilies[index].selected = !updatedFamilies[index].selected;
                            setFamilies(updatedFamilies);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FamiliesWaitingForTutorshipReport;