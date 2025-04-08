import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/reports.css";
import "../../styles/tutorship_pending.css";
import { exportPossibleMatchesToExcel, exportPossibleMatchesToPDF } from "../../components/export_utils";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import axios from "../../axiosConfig";

const PossibleTutorshipMatchesReport = () => {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [maxDistance, setMaxDistance] = useState(100); // Default max distance for slider
  const { t } = useTranslation();

  const fetchData = () => {
    setLoading(true);
    axios
      .get("/api/reports/possible-tutorship-matches-report/")
      .then((response) => {
        const allMatches = response.data.possible_tutorship_matches || [];
        const normalizedMatches = allMatches.map((match) => ({
          ...match,
          distance_between_cities: parseFloat(match.distance_between_cities), // Convert to number
        }));
        console.log("Normalized Matches:", normalizedMatches); // Log normalized data
        setMatches(normalizedMatches);
        setFilteredMatches(normalizedMatches); // Initially show all data
      })
      .catch((error) => {
        console.error("Error fetching possible tutorship matches report:", error);
        toast.error(t("Error fetching data"));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const applyDistanceFilter = (distance) => {
    setMaxDistance(distance); // Update the slider value
    const filtered = matches.filter((match) => {
      const distanceValue = parseFloat(match.distance_between_cities); // Convert to number
      return distanceValue <= parseFloat(distance); // Compare as numbers
    });
    setFilteredMatches(filtered); // Update the filteredMatches state
  };

  const refreshData = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title={t("Possible Tutorship Matches Report")} />
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
                  onClick={() => exportPossibleMatchesToExcel(filteredMatches, t)}
                >
                  <img src="/assets/excel-icon.png" alt="Excel" />
                </button>
                <button
                  className="export-button pdf-button"
                  onClick={() => exportPossibleMatchesToPDF(filteredMatches, t)}
                >
                  <img src="/assets/pdf-icon.png" alt="PDF" />
                </button>
                <label htmlFor="distance-slider">{t("Max Distance")}:</label>
                <input
                  type="range"
                  id="distance-slider"
                  min="0"
                  max="15"
                  value={maxDistance}
                  onChange={(e) => applyDistanceFilter(e.target.value)}
                  className="distance-slider large-slider"
                />
                <span>{maxDistance} km</span>
                <button className="refresh-button" onClick={refreshData}>
                  רענן
                </button>
              </div>
            </div>
            <div className="tutorship-pending-grid-container">
              {filteredMatches.length === 0 ? (
                <div className="no-data">{t("No data to display")}</div>
              ) : (
                <table className="tutorship-pending-data-grid">
                  <thead>
                    <tr>
                      <th>{t("Child Full Name")}</th>
                      <th>{t("Tutor Full Name")}</th>
                      <th>{t("Child City")}</th>
                      <th>{t("Tutor City")}</th>
                      <th>{t("Child Age")}</th>
                      <th>{t("Tutor Age")}</th>
                      <th>{t("Distance Between Cities (km)")}</th>
                      <th>{t("Grade")}</th>
                      <th>{t("Select")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatches.map((match, index) => (
                      <tr key={index}>
                        <td>{match.child_full_name}</td>
                        <td>{match.tutor_full_name}</td>
                        <td>{match.child_city}</td>
                        <td>{match.tutor_city}</td>
                        <td>{match.child_age}</td>
                        <td>{match.tutor_age}</td>
                        <td>{match.distance_between_cities}</td>
                        <td>{match.grade}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={match.selected || false} // Ensure `selected` is false if undefined
                            onChange={() => {
                              const updatedMatches = [...filteredMatches];
                              updatedMatches[index].selected = !filteredMatches[index].selected;
                              setFilteredMatches(updatedMatches); // Update the state with the new selection
                            }}
                          />
                        </td>
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

export default PossibleTutorshipMatchesReport;