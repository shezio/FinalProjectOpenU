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
import leafletImage from 'leaflet-image';
import "leaflet-easyprint";
import L, { map } from "leaflet";
import markerIcon from '../../assets/markers/marker-icon.png';
import markerShadow from '../../assets/markers/marker-shadow.png';
import { showErrorToast } from "../../components/toastUtils";

const familyMarkerIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
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
  const [isExporting, setIsExporting] = useState(false);

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

  const exportMapAndGrid = async () => {
    if (!mapRef.current) return;
    setIsExporting(true);

    const gridElement = document.querySelector('.families-location-grid-container');
    const mapElement = mapRef.current.getContainer();

    if (!gridElement || !mapElement) {
      toast.error(t("Grid or map not found"));
      setIsExporting(false);
      return;
    }

    let tempMapDiv = null;
    let tempMap = null;

    try {
      // Create hidden map container
      tempMapDiv = document.createElement("div");
      tempMapDiv.style.width = "2000px";
      tempMapDiv.style.height = "2000px";
      tempMapDiv.style.position = "absolute";
      tempMapDiv.style.top = "-9999px";
      tempMapDiv.style.left = "-9999px";
      document.body.appendChild(tempMapDiv);

      // Initialize hidden Leaflet map
      tempMap = L.map(tempMapDiv, {
        center: mapRef.current.getCenter(),
        zoom: mapRef.current.getZoom() + 2,
        zoomControl: false,
        attributionControl: false,
      });

      // Copy base tile layer
      const originalLayers = mapRef.current._layers;
      Object.values(originalLayers).forEach(layer => {
        if (layer instanceof L.TileLayer) {
          L.tileLayer(layer._url, layer.options).addTo(tempMap);
        }
      });

      // Copy markers and overlays
      Object.values(originalLayers).forEach(layer => {
        // Handle markers
        if (layer instanceof L.Marker) {
          const marker = L.marker(layer.getLatLng(), { icon: layer.options.icon });
          marker.addTo(tempMap);
        }

        // Optional: handle other types like L.Circle, L.Polygon etc.
        else if (layer instanceof L.Circle) {
          const circle = L.circle(layer.getLatLng(), layer.options);
          circle.addTo(tempMap);
        } else if (layer instanceof L.Polygon) {
          const polygon = L.polygon(layer.getLatLngs(), layer.options);
          polygon.addTo(tempMap);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500)); // allow render

      const mapCanvas = await new Promise((resolve, reject) => {
        leafletImage(tempMap, (err, canvas) => {
          if (err || !canvas) reject(err);
          else resolve(canvas);
        });
      });

      // Clone and render grid
      const gridClone = gridElement.cloneNode(true);
      gridClone.classList.add('grid-export-mode');
      gridClone.style.position = 'absolute';
      gridClone.style.top = '-9999px';
      gridClone.style.left = '-9999px';
      document.body.appendChild(gridClone);

      const gridCanvas = await html2canvas(gridClone, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
      });

      document.body.removeChild(gridClone);

      // Combine both
      const totalWidth = mapCanvas.width + gridCanvas.width;
      const totalHeight = Math.max(mapCanvas.height, gridCanvas.height);

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = totalWidth;
      finalCanvas.height = totalHeight;

      const ctx = finalCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalWidth, totalHeight);
      ctx.drawImage(mapCanvas, 0, 0);
      ctx.drawImage(gridCanvas, mapCanvas.width, 0);

      // Download result
      const link = document.createElement('a');
      link.download = `${t("families_per_location_report")}.png`;
      link.href = finalCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      toast.error(t("Error exporting report"));
    } finally {
      try {
        if (tempMap) {
          tempMap.off();
          tempMap.remove();
        }
        if (tempMapDiv?.parentNode) {
          tempMapDiv.parentNode.removeChild(tempMapDiv);
        }
      } catch (e) {
        console.warn("Temp map cleanup failed", e);
      }
      setIsExporting(false);
    }
  };


  useEffect(() => {
    if (hasPermissionToView) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [hasPermissionToView]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
        mapRef.current.eachLayer(layer => {
          if (layer instanceof L.TileLayer) {
            layer.redraw();
          }
        });
        L.DomUtil.setSize(mapRef.current.getContainer(), L.point(750, 1500));
      }, 3000); // Wait for DOM to update
    }
  }, [families]); // Re-run when families data changes

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
            <button className="export-map-button" onClick={exportMapAndGrid} disabled={isExporting}>
              {isExporting && <span className="loader-export-spinner" />} {t("Export Map and Grid")}
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
              <div className="families-grid-container-loader">{t("Loading data...")}</div>
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
                center={[31.5, 34.8]} // Adjusted coordinates to show more of the north
                zoom={8}
                scrollWheelZoom={true}
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
                        icon={familyMarkerIcon}
                      >
                        <Popup className="popup-text">
                          {`${family.first_name} ${family.last_name}`} - {family.city}
                        </Popup>
                      </Marker>
                    )
                )}
              </MapContainer>
            )}
          </div>
        </div>
        <div id="export-map-container" style={{ display: "none" }}></div>
      </div>
    </div>
  );
};

export default FamiliesPerLocationReport;