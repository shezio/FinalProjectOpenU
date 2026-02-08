import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/reports.css";
import "../../styles/pending_tutors_stats.css";
import { hasViewPermissionForTable, navigateTo } from "../../components/utils";
import axios from "../../axiosConfig";
import { useTranslation } from "react-i18next";
import { Pie } from "react-chartjs-2";
import { showErrorToast } from '../../components/toastUtils';
import { exportPendingTutorsChartToPDF } from "../../components/export_utils";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const PendingTutorsStatsReport = () => {
  const chartRef = useRef();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasPermissionToView = hasViewPermissionForTable("tutors") &&
    hasViewPermissionForTable("pending_tutor");

  const fetchStats = () => {
    setLoading(true);
    axios
      .get("/api/pending_tutors_stats/")
      .then((res) => setStats(res.data))
      .catch(() => showErrorToast(t("Error fetching data")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (hasPermissionToView) {
      fetchStats();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [hasPermissionToView]);

  if (!hasPermissionToView) {
    return (
      <div className="pending-tutors-report-main-content">
        <Sidebar />
        <InnerPageHeader title={t("Pending Tutors Stats Report")} />
        <div className="page-content">
          <div className="no-permission">
            <h2>{t("You do not have permission to view this page")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pending-tutors-report-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Pending Tutors Stats Report")} />
      <div className="pending-tutors-stats-page-content">
        
        <div className="filter-create-container">
          <div className="actions">
            <button
              className="export-button pdf-button"
              onClick={() => exportPendingTutorsChartToPDF(chartRef, stats, t)}
            >
              <img src="/assets/pdf-icon.png" alt="PDF" />
            </button>
            <button className="refresh-button" onClick={fetchStats}>
              {t("Refresh")}
            </button>
          </div>
        </div>
        {!loading && (
          <div className="pending-tutors-stats-back-to-reports">
            <button
              className="pending-tutors-stats-back-button"
              onClick={() => navigateTo('/reports')}
            >
              → {t('Click to return to Report page')}
            </button>
          </div>
        )}
        {loading ? (
          <div className="loader">{t("Loading data...")}</div>
        ) : (
          <div className="pending-tutors-stats-graph-container" ref={chartRef}>
            <Pie
              data={{
                labels: [t("Pending Tutors"), t("Active Tutors")],
                datasets: [{
                  data: [stats.pending_tutors, stats.total_tutors],
                  backgroundColor: ["#f44336", "#4caf50"],
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      font: {
                        size: 24,
                        family: "Rubik",
                        weight: "bold",
                      },
                    },
                  },
                  tooltip: {
                    bodyFont: {
                      size: 22,
                      family: "Rubik",
                      weight: "bold",
                    },
                  },
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingTutorsStatsReport;