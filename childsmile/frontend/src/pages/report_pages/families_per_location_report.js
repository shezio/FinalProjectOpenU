import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/reports.css";
import { hasViewPermissionForTable } from "../../components/utils";
import axios from "../../axiosConfig";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { exportFamiliesToExcel, exportFamiliesToPDF } from "../../components/export_utils";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import html2canvas from "html2canvas";
import "leaflet-easyprint";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default icon paths
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const FamiliesPerLocationReport = () => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { t } = useTranslation();
  const mapRef = useRef();

  const hasPermissionToView = hasViewPermissionForTable("children");

  const fetchData = () => {
    setLoading(true);
    axios
      .get("/api/reports/families-per-location-report/", {
        params: { from_date: fromDate, to_date: toDate },
      })
      .then((response) => {
        setFamilies(response.data.families_per_location || []);
      })
      .catch((error) => {
        console.error("Error fetching families per location report:", error);
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

  const exportMapAsImage = () => {
    const reportContainer = document.querySelector(".families-report-container");
    if (!reportContainer) {
      console.error("Report container not found");
      return;
    }
  
    // Show loader on the export button
    const exportButton = document.querySelector(".export-map-button");
    if (exportButton) {
      exportButton.disabled = true;
      exportButton.textContent = t("Exporting...");
    }
  
    // Use html2canvas to capture the entire container
    html2canvas(reportContainer, {
      useCORS: true, // Enables image capture from cross-origin tiles
      allowTaint: false,
      logging: true,
      scale: 2, // Higher scale = better quality
    })
      .then((canvas) => {
        const link = document.createElement("a");
        link.download = `${t("families_per_location_report")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      })
      .catch((err) => {
        console.error("Error exporting report:", err);
        toast.error(t("Error exporting report"));
      })
      .finally(() => {
        // Reset export button state
        if (exportButton) {
          exportButton.disabled = false;
          exportButton.textContent = t("Export Map as Image");
        }
      });
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
        <InnerPageHeader title={t("Families Per Location Report")} />
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
      <InnerPageHeader title={t("Families Per Location Report")} />
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
              onClick={() => exportFamiliesToExcel(families, t)}
            >
              <img src="/assets/excel-icon.png" alt="Excel" />
            </button>
            <button
              className="export-button pdf-button"
              onClick={() => exportFamiliesToPDF(families, t)}
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
            <button className="export-map-button" onClick={exportMapAsImage}>
              {t("Export Map as Image")}
            </button>
          </div>
        </div>
        <div className="families-report-container">
          {/* Grid Section */}
          <div className="families-grid-container">
            {loading ? (
              <div className="loader">{t("Loading data...")}</div>
            ) : families.length === 0 ? (
              <div className="no-data">{t("No data to display")}</div>
            ) : (
              <table className="families-data-grid">
                <thead>
                  <tr>
                    <th>{t("Child Full Name")}</th>
                    <th>{t("City")}</th>
                    <th>{t("Registration Date")}</th>
                    <th>{t("Select")}</th>
                  </tr>
                </thead>
                <tbody>
                  {families.map((family, index) => (
                    <tr key={index}>
                      <td>{`${family.first_name} ${family.last_name}`}</td>
                      <td>{family.city}</td>
                      <td>{family.registration_date}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={family.selected || false} // Ensure `selected` is false if undefined
                          onChange={() => {
                            const updatedFamilies = [...families];
                            updatedFamilies[index].selected = !families[index].selected;
                            setFamilies(updatedFamilies); // Update the state with the new selection
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Map Section */}
          <div className="families-map-container">
            <MapContainer
              center={[31.0461, 34.8516]}
              zoom={7}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(mapInstance) => {
                mapRef.current = mapInstance; // Store the map instance in the ref
              }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="" // Remove attribution text
              />
              {families.map(
                (family, index) =>
                  family.latitude &&
                  family.longitude && (
                    <Marker
                      key={index}
                      position={[family.latitude, family.longitude]}
                    >
                      <Popup>
                        {`${family.first_name} ${family.last_name}`} -{" "}
                        {family.city}
                      </Popup>
                    </Marker>
                  )
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamiliesPerLocationReport;