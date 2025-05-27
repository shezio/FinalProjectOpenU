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
import markerIcon from '../../assets/markers/custom-marker-icon-2x-green.png';
import markerShadow from '../../assets/markers/custom-marker-shadow.png';
import { showErrorToast } from "../../components/toastUtils";

// Fix Leaflet's default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const FamiliesPerLocationReport = () => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { t } = useTranslation();
  const mapRef = useRef();
  const hasPermissionToView = hasViewPermissionForTable("children");
  const [sortOrderRegistrationDate, setSortOrderRegistrationDate] = useState('desc'); // Default to ascending

  const parseDate = (dateString) => {
    if (!dateString) return new Date(0); // Handle missing dates
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const toggleSortOrderRegistrationDate = () => {
    setSortOrderRegistrationDate((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    const sorted = [...families].sort((a, b) => {
      const dateA = parseDate(a.registration_date);
      const dateB = parseDate(b.registration_date);
      return sortOrderRegistrationDate === 'asc' ? dateB - dateA : dateA - dateB; // Reverse the logic
    });
    setFamilies(sorted);
  };

  const handleCheckboxChange = (index) => {
    const updatedFamilies = families.map((family, i) => {
      if (i === index) {
        return { ...family, selected: !family.selected };
      }
      return family;
    });
    setFamilies(updatedFamilies);
  };

  const handleSelectAllCheckbox = (isChecked) => {
    const updatedFamilies = families.map((family) => ({
      ...family,
      selected: isChecked,
    }));
    setFamilies(updatedFamilies);
  };

  const fetchData = async () => {
    setLoading(true);
    setSortOrderRegistrationDate('desc')
    setLocationsLoading(true); // Start geocoding process
    try {
      const response = await axios.get("/api/reports/families-per-location-report/", {
        params: { from_date: fromDate, to_date: toDate },
      });
      const familiesData = response.data.families_per_location || [];

      // Simulate geocoding process
      const geocodedFamilies = await Promise.all(
        familiesData.map(async (family) => {
          if (family.latitude && family.longitude) {
            return family; // Skip geocoding if already available
          }
          // Simulate geocoding delay (replace with actual geocoding logic if needed)
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { ...family, latitude: null, longitude: null }; // Default values
        })
      );

      setFamilies(geocodedFamilies);
    } catch (error) {
      console.error("Error fetching families per location report:", error);
      showErrorToast(t, 'Error fetching families per location report', error); // Use the 
    } finally {
      setLoading(false);
      setLocationsLoading(false); // Geocoding process complete
      setMapLoading(false); // Map loading complete
    }
  };

  const handleMapError = () => {
    setMapError(true); // Set mapError to true if the map fails to load
    setMapLoading(false); // Stop loading state for the map
  };

  const refreshData = () => {
    setFromDate("");
    setToDate("");
    setMapLoading(true);
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
      <div className="loc-report-main-content">
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
    <div className="loc-report-main-content">
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
        <div className="families-report-container">
          {/* Grid Section */}
          <div className="families-location-grid-container ">
            {loading ? (
              <div className="loader">{t("Loading data...")}</div>
            ) : families.length === 0 ? (
              <div className="no-data">{t("No data to display")}</div>
            ) : (
              <table className="families-data-grid">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAllCheckbox(e.target.checked)}
                      />
                    </th>
                    <th>{t("Child Full Name")}</th>
                    <th>{t("City")}</th>
                    <th className="wide-column">
                      {t("Registration Date")}
                      <button
                        className="sort-button"
                        onClick={toggleSortOrderRegistrationDate}
                      >
                        {sortOrderRegistrationDate === 'asc' ? '▲' : '▼'}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {families.map((family, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={family.selected || false} // Ensure `selected` is false if undefined
                          onChange={() => handleCheckboxChange(index)}
                        />
                      </td>
                      <td>{`${family.first_name} ${family.last_name}`}</td>
                      <td>{family.city}</td>
                      <td>{family.registration_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Map Section */}
          <div className="families-map-container">
            {mapError ? (
              <div className="map-error">{t("Failed to load the map.")}</div>
            ) : mapLoading ? (
              <div className="map-loader">{t("Loading map...")}</div>
            ) : (
              <MapContainer
                center={[31.5, 35.0]} // Adjusted coordinates to show more of the north
                zoom={7}
                style={{ height: "100%", width: "100%" }}
                whenCreated={(mapInstance) => {
                  mapRef.current = mapInstance; // Store the map instance in the ref
                }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="" // Remove attribution text
                  onError={handleMapError} // Handle tile loading error
                  bounds={[[90, -180], [-90, 180]]} /* Optional: restrict map bounds */
                />
                {families.map(
                  (family, index) =>
                    family.latitude &&
                    family.longitude && (
                      <Marker
                        key={index}
                        position={[family.latitude, family.longitude]}
                      >
                        <Popup className="popup-text">
                          {`${family.first_name} ${family.last_name}`} -   {family.city}
                        </Popup>
                      </Marker>
                    )
                )}
              </MapContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamiliesPerLocationReport;