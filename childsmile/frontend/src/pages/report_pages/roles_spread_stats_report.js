import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/reports.css";
import "../../styles/roles_spread_stats_report.css";
import { hasViewPermissionForTable } from "../../components/utils";
import axios from "../../axiosConfig";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import { Pie } from "react-chartjs-2";
import { showErrorToast } from '../../components/toastUtils';
import { exportRolesSpreadChartToPDF } from "../../components/export_utils";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const RolesSpreadReport = () => {
  const chartRef = useRef();
  const { t } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const hasPermissionToView = hasViewPermissionForTable("staff");

  const fetchStats = () => {
    setLoading(true);
    axios
      .get("/api/roles_spread_stats/")
      .then((res) => setRoles(res.data.roles))
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
      <div className="roles-spread-report-main-content">
        <Sidebar />
        <InnerPageHeader title={t("Roles Spread Report")} />
        <div className="page-content">
          <div className="no-permission">
            <h2>{t("You do not have permission to view this page")}</h2>
          </div>
        </div>
      </div>
    );
  }

  const chartColors = [
    "#1f77b4", // Blue
    "#ff7f0e", // Orange
    "#2ca02c", // Green
    "#d62728", // Red
    "#9467bd", // Purple
    "#8c564b", // Brown
    "#e377c2", // Pink
    "#7f7f7f", // Gray
    "#bcbd22", // Olive
    "#17becf"  // Teal
  ];
  const chartData = {
    labels: roles.map(r => t(r.name)),
    datasets: [{
      data: roles.map(r => r.count),
      backgroundColor: chartColors,
    }]
  };

  return (
    <div className="roles-spread-report-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Roles Spread Report")} />
      <div className="roles-spread-report-page-content">
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
              className="export-button pdf-button"
              onClick={() => exportRolesSpreadChartToPDF(chartRef, roles, t)}
            >
              <img src="/assets/pdf-icon.png" alt="PDF" />
            </button>
            <button className="refresh-button" onClick={fetchStats}>
              {t("Refresh")}
            </button>
          </div>
        </div>
        {!loading && (
          <div className="roles-spread-back-to-reports">
            <button
              className="roles-spread-back-button"
              onClick={() => (window.location.href = '/reports')}
            >
              → {t('Click to return to Report page')}
            </button>
          </div>
        )}
        {loading ? (
          <div className="loader">{t("Loading data...")}</div>
        ) : (
          <div className="roles-spread-graph-container" ref={chartRef}>
            <Pie
              data={chartData}
              width={600}
              height={600}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      font: {
                        size: 20,
                        family: "Rubik",
                        weight: "bold",
                      },
                    },
                  },
                  tooltip: {
                    bodyFont: {
                      size: 18,
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

export default RolesSpreadReport;