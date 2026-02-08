import React, { useEffect, useState ,useRef} from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/reports.css";
import "../../styles/families_tutorship_stats.css";
import { hasViewPermissionForTable, navigateTo } from "../../components/utils";
import axios from "../../axiosConfig";
import { useTranslation } from "react-i18next";
import { Pie } from "react-chartjs-2";
import { showErrorToast } from '../../components/toastUtils'; // Toast 
import { exportFamiliesTutorshipChartToPDF } from "../../components/export_utils";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const FamiliesTutorshipStatsReport = () => {
  const chartRef = useRef();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasPermissionToView = hasViewPermissionForTable("children");

  const fetchStats = () => {
    setLoading(true);
    axios
      .get("/api/families_tutorships_stats/")
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
      <div className="families-waiting-report-main-content">
        <Sidebar />
        <InnerPageHeader title={t("Families Tutorship Stats Report")} />
        <div className="page-content">
          <div className="no-permission">
            <h2>{t("You do not have permission to view this page")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="families-waiting-report-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Families Tutorship Stats Report")} />
      <div className="families-tutorship-stats-page-content">
        
        <div className="filter-create-container">
          <div className="actions">
            <button
              className="export-button pdf-button"
              onClick={() => exportFamiliesTutorshipChartToPDF(chartRef, stats, t)}
            >
              <img src="/assets/pdf-icon.png" alt="PDF" />
            </button>
            <button className="refresh-button" onClick={fetchStats}>
              {t("Refresh")}
            </button>
          </div>
        </div>
        {!loading && (
          <div className="families-tutorship-stats-back-to-reports">
            <button
              className="families-tutorship-stats-back-button"
              onClick={() => navigateTo('/reports')}
            >
              → {t('Click to return to Report page')}
            </button>
          </div>
        )}
        {loading ? (
          <div className="loader">{t("Loading data...")}</div>
        ) : (
          <div className="families-stats-graph-container" ref={chartRef}>
            <Pie
              data={{
                labels: [t("With Tutorship"), t("Waiting")],
                datasets: [{
                  data: [stats.with_tutorship, stats.waiting],
                  backgroundColor: ["#4caf50", "#f44336"],
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
                      size: 22, // Bigger tooltip text
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

export default FamiliesTutorshipStatsReport;