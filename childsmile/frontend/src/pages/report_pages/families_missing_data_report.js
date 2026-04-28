import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import Select from "react-select";
import "../../styles/common.css";
import "../../styles/reports.css";
import "../../styles/tutorship_pending.css";
import "../../styles/families_missing_data_report.css";
import "../../styles/reviewer.css";
import { hasUpdatePermissionForTable, hasSomePermissions, navigateTo } from "../../components/utils";
import axios from "../../axiosConfig";
import { toast } from "react-toastify";
import { showErrorToast } from "../../components/toastUtils";
import { useTranslation } from "react-i18next";
import hospitals from "../../components/hospitals.json";

const PAGE_SIZE = 5;

const MISSING_FILTERS = ["all", "phone", "diagnosis_date", "diagnosis", "parent_name", "medical_state", "child_phone", "details_tutoring", "additional_info"];

const FamiliesMissingDataReport = () => {
  const { t } = useTranslation();
  const [allFamilies, setAllFamilies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("all");

  // --- same edit-family state as ReviewerPage ---
  const [editFamily,   setEditFamily]   = useState(null);
  const [newFamily,    setNewFamily]    = useState({});
  const [errors,       setErrors]       = useState({});
  const [maritalStatuses,  setMaritalStatuses]  = useState([]);
  const [tutoringStatuses, setTutoringStatuses] = useState([]);
  const statuses = ['טיפולים','מעקבים','אחזקה','ז״ל','בריא','עזב'];
  const [streets, setStreets] = useState([]);
  const [settlementsAndStreets, setSettlementsAndStreets] = useState({});
  const [availableCoordinators, setAvailableCoordinators] = useState([]);
  const [autoAssignedCoordinator, setAutoAssignedCoordinator] = useState(null);
  const hospitalsList = hospitals.map(h => h.trim()).filter(Boolean);

  const preprocessSettlements = useCallback((data) => {
    if (!data || typeof data !== 'object') return {};
    const out = {};
    Object.keys(data).forEach(k => { out[k.trim()] = data[k]; });
    return out;
  }, []);
  const processedSettlementsAndStreets = preprocessSettlements(settlementsAndStreets);
  const cityOptions   = Object.keys(processedSettlementsAndStreets).map(c => ({ value: c, label: c }));
  const streetOptions = streets.map(s => ({ value: s, label: s }));

  const families_resource = "childsmile_app_children";
  const staff_resource = "childsmile_app_staff";
  const hasPermission = hasSomePermissions([
    { resource: families_resource, action: "CREATE" },
    { resource: staff_resource, action: "CREATE" },
  ]);
  const canEdit = hasUpdatePermissionForTable("children");

  // Parent phones: at least one required → flag only when BOTH are missing
  const isMissingPhone = (f) => !f.mother_phone && !f.father_phone;
  const isMissingDiagnosis = (f) => !f.diagnosis_date;
  const isMissingMedicalDiagnosis = (f) => !f.medical_diagnosis;
  const isMissingParentName = (f) => !f.father_name && !f.mother_name;
  const isMissingMedicalState = (f) => !f.current_medical_state;
  const isMissingChildPhone = (f) => !f.child_phone_number;
  const isMissingDetailsTutoring = (f) => !f.details_for_tutoring;
  const isMissingAdditionalInfo = (f) => !f.additional_info;

  const isAnyMissing = (f) =>
    isMissingPhone(f) || isMissingDiagnosis(f) || isMissingMedicalDiagnosis(f) ||
    isMissingParentName(f) || isMissingMedicalState(f) || isMissingChildPhone(f) ||
    isMissingDetailsTutoring(f) || isMissingAdditionalInfo(f);

  const applyFilter = useCallback(
    (families, filter) => {
      switch (filter) {
        case "phone":            return families.filter(isMissingPhone);
        case "diagnosis_date":   return families.filter(isMissingDiagnosis);
        case "diagnosis":        return families.filter(isMissingMedicalDiagnosis);
        case "parent_name":      return families.filter(isMissingParentName);
        case "medical_state":    return families.filter(isMissingMedicalState);
        case "child_phone":      return families.filter(isMissingChildPhone);
        case "details_tutoring": return families.filter(isMissingDetailsTutoring);
        case "additional_info":  return families.filter(isMissingAdditionalInfo);
        default:                 return families.filter(isAnyMissing);
      }
    },
    [] // eslint-disable-line
  );

  const fetchData = useCallback(() => {
    setLoading(true);
    axios
      .get("/api/get_complete_family_details/")
      .then((res) => {
        const families = res.data.families || [];
        setAllFamilies(families);
        setFiltered(applyFilter(families, activeFilter));
        setMaritalStatuses((res.data.marital_statuses  || []).map(i => i.status));
        setTutoringStatuses((res.data.tutoring_statuses || []).map(i => i.status));
        setCurrentPage(1);
      })
      .catch((err) => {
        console.error("Error fetching families:", err);
        toast.error(t("Error fetching data"));
      })
      .finally(() => setLoading(false));
  }, [activeFilter, applyFilter, t]);

  const fetchCoordinators = useCallback(async () => {
    try {
      const res = await axios.get('/api/get_available_coordinators/');
      const all = [...(res.data?.families_coordinators || []), ...(res.data?.tutored_coordinators || [])];
      setAvailableCoordinators(all);
    } catch { /* ignore */ }
  }, []);

  const fetchSettlements = useCallback(async () => {
    try {
      const res = await axios.get('/api/settlements/');
      setSettlementsAndStreets(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (hasPermission) { fetchData(); fetchCoordinators(); fetchSettlements(); }
    else setLoading(false);
  }, [hasPermission]); // eslint-disable-line

  useEffect(() => {
    setFiltered(applyFilter(allFamilies, activeFilter));
    setCurrentPage(1);
  }, [activeFilter, allFamilies, applyFilter]);

  // --- exact same helpers as ReviewerPage ---
  const formatDateForInput = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [d, m, y] = date.split('/'); return `${y}-${m}-${d}`;
    }
    return '';
  };

  const handleAddFamilyChange = (e) => {
    const { name, value } = e.target;
    const TREATMENT_COMPLETION_STATUSES = ['מעקבים', 'אחזקה', 'בריא'];
    const todayStr = new Date().toISOString().split('T')[0];
    setNewFamily(prev => {
      const updates = { [name]: value };
      if (name === 'status' && TREATMENT_COMPLETION_STATUSES.includes(value) && prev.status === 'טיפולים') {
        updates.when_completed_treatments = todayStr;
      }
      return { ...prev, ...updates };
    });
    if (name === 'city') setStreets(processedSettlementsAndStreets[value.trim()] || []);
  };

  const openFamilyEditModal = (family) => {
    const parts     = family.street_and_apartment_number ? family.street_and_apartment_number.split(' ') : ['',''];
    const aptNumber = parts.pop();
    const street    = parts.join(' ');
    setStreets(processedSettlementsAndStreets[(family.city || '').trim()] || []);
    setAutoAssignedCoordinator(null);
    setErrors({});
    setNewFamily({
      child_id:                           family.id?.toString() || '',
      childfirstname:                     family.first_name || '',
      childsurname:                       family.last_name  || '',
      gender:                             family.gender ? 'נקבה' : 'זכר',
      city:                               family.city || '',
      street,
      apartment_number:                   aptNumber || '',
      child_phone_number:                 family.child_phone_number || '',
      treating_hospital:                  family.treating_hospital  || '',
      date_of_birth:                      formatDateForInput(family.date_of_birth),
      registration_date:                  formatDateForInput(family.registration_date),
      marital_status:                     family.marital_status || '',
      num_of_siblings:                    family.num_of_siblings !== undefined ? family.num_of_siblings.toString() : '0',
      details_for_tutoring:               family.details_for_tutoring || '',
      tutoring_status:                    family.tutoring_status || '',
      medical_diagnosis:                  family.medical_diagnosis || '',
      diagnosis_date:                     formatDateForInput(family.diagnosis_date),
      additional_info:                    family.additional_info || '',
      is_in_frame:                        family.is_in_frame || '',
      coordinator_comments:               family.coordinator_comments || '',
      current_medical_state:              family.current_medical_state || '',
      when_completed_treatments:          formatDateForInput(family.when_completed_treatments),
      father_name:                        family.father_name  || '',
      father_phone:                       family.father_phone || '',
      mother_name:                        family.mother_name  || '',
      mother_phone:                       family.mother_phone || '',
      expected_end_treatment_by_protocol: formatDateForInput(family.expected_end_treatment_by_protocol),
      has_completed_treatments:           family.has_completed_treatments || false,
      status:                             family.status || 'טיפולים',
      responsible_coordinator:            family.responsible_coordinator || '',
      need_review:                        family.need_review !== undefined ? family.need_review : true,
    });
    setEditFamily(family);
  };

  const closeEditModal = () => { setEditFamily(null); setErrors({}); };
  const formatStatus = (s) => (s || '---').replace(/_/g, ' ');

  const validateFamilyForm = () => {
    const errs = {};
    if (!newFamily.child_id || isNaN(newFamily.child_id) || newFamily.child_id.toString().length !== 9) errs.child_id = 'מספר זהות חייב להיות 9 ספרות';
    if (!newFamily.childfirstname) errs.childfirstname = 'שם פרטי הוא שדה חובה';
    if (!newFamily.childsurname)   errs.childsurname   = 'שם משפחה הוא שדה חובה';
    if (!newFamily.city)           errs.city           = 'עיר היא שדה חובה';
    if (!newFamily.street)         errs.street         = 'רחוב הוא שדה חובה';
    if (!newFamily.apartment_number?.toString().trim()) errs.apartment_number = 'מספר דירה הוא שדה חובה';
    if (!newFamily.treating_hospital) errs.treating_hospital = 'בית חולים הוא שדה חובה';
    if (!newFamily.date_of_birth)     errs.date_of_birth     = 'תאריך לידה הוא שדה חובה';
    if (!newFamily.marital_status)    errs.marital_status    = 'מצב משפחתי הוא שדה חובה';
    if (!newFamily.num_of_siblings || isNaN(newFamily.num_of_siblings)) errs.num_of_siblings = 'מספר אחים חייב להיות מספר';
    if (!newFamily.tutoring_status)   errs.tutoring_status   = 'סטטוס חונכות הוא שדה חובה';
    if (!newFamily.status)            errs.status            = 'סטטוס הוא שדה חובה';
    const fp = newFamily.father_phone ? newFamily.father_phone.replace(/\D/g,'') : '';
    const mp = newFamily.mother_phone ? newFamily.mother_phone.replace(/\D/g,'') : '';
    if (!fp && !mp) { errs.father_phone = 'יש לספק לפחות מספר טלפון אחד של הורה'; errs.mother_phone = 'יש לספק לפחות מספר טלפון אחד של הורה'; }
    if (!newFamily.responsible_coordinator) errs.responsible_coordinator = 'רכז אחראי הוא שדה חובה';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEditFamilySubmit = async (e) => {
    e.preventDefault();
    if (!validateFamilyForm()) return;
    const combinedStreet = `${newFamily.street} ${newFamily.apartment_number}`;
    const payload = { ...newFamily, street_and_apartment_number: combinedStreet };
    try {
      await axios.put(`/api/update_family/${editFamily.id}/`, payload);
      toast.success(t('Family details updated successfully!'));
      setEditFamily(null);
      fetchData();
    } catch (err) {
      showErrorToast(t, 'שגיאה בעדכון משפחה', err);
    }
  };

  const missingBadges = (family) => {
    const badges = [];
    if (isMissingPhone(family))
      badges.push(<span key="phone" className="missing-badge missing-phone">{t("No Phone")}</span>);
    if (isMissingDiagnosis(family))
      badges.push(<span key="diag" className="missing-badge missing-diagnosis">{t("No Diagnosis Date")}</span>);
    if (isMissingMedicalDiagnosis(family))
      badges.push(<span key="meddiag" className="missing-badge missing-med-diagnosis">{t("No Medical Diagnosis")}</span>);
    if (isMissingParentName(family))
      badges.push(<span key="pname" className="missing-badge missing-parent-name">{t("No Parent Name")}</span>);
    if (isMissingMedicalState(family))
      badges.push(<span key="medstate" className="missing-badge missing-medical-state">{t("No Medical State")}</span>);
    if (isMissingChildPhone(family))
      badges.push(<span key="cphone" className="missing-badge missing-child-phone">{t("No Child Phone")}</span>);
    if (isMissingDetailsTutoring(family))
      badges.push(<span key="details" className="missing-badge missing-details">{t("No Tutoring Details")}</span>);
    if (isMissingAdditionalInfo(family))
      badges.push(<span key="addinfo" className="missing-badge missing-additional">{t("No Additional Info")}</span>);
    return badges;
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (!hasPermission) {
    return (
      <div className="families-missing-main-content">
        <Sidebar />
        <InnerPageHeader title={t("Families Missing Data Report")} />
        <div className="page-content">
          <div className="no-permission">
            <h2>{t("You do not have permission to view this page")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="families-missing-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Families Missing Data Report")} />
      <div className="page-content">
        {/* Filter chips */}
        <div className="missing-filter-card">
          <div className="missing-filter-row">
            <span className="missing-filter-label">{t("Show")}:</span>
            {MISSING_FILTERS.map((f) => (
              <button
                key={f}
                className={`missing-filter-chip${activeFilter === f ? " active" : ""}`}
                onClick={() => setActiveFilter(f)}
              >
                {f === "all"             && t("All Missing")}
                {f === "phone"           && t("Missing Phone")}
                {f === "diagnosis_date"  && t("Missing Diagnosis Date")}
                {f === "diagnosis"       && t("Missing Medical Diagnosis")}
                {f === "parent_name"     && t("Missing Parent Name")}
                {f === "medical_state"   && t("Missing Medical State")}
                {f === "child_phone"     && t("Missing Child Phone")}
                {f === "details_tutoring"&& t("Missing Tutoring Details")}
                {f === "additional_info" && t("Missing Additional Info")}
                {allFamilies.length > 0 && (
                  <span className="missing-chip-count">
                    {f === "all"              ? allFamilies.filter(isAnyMissing).length
                    : f === "phone"           ? allFamilies.filter(isMissingPhone).length
                    : f === "diagnosis_date"  ? allFamilies.filter(isMissingDiagnosis).length
                    : f === "diagnosis"       ? allFamilies.filter(isMissingMedicalDiagnosis).length
                    : f === "parent_name"     ? allFamilies.filter(isMissingParentName).length
                    : f === "medical_state"   ? allFamilies.filter(isMissingMedicalState).length
                    : f === "child_phone"     ? allFamilies.filter(isMissingChildPhone).length
                    : f === "details_tutoring"? allFamilies.filter(isMissingDetailsTutoring).length
                    :                           allFamilies.filter(isMissingAdditionalInfo).length}
                  </span>
                )}
              </button>
            ))}
            <button className="refresh-button" onClick={fetchData}>
              {t("Refresh")}
            </button>
          </div>
        </div>

        {!loading && (
          <div className="back-to-reports">
            <button className="back-button" onClick={() => navigateTo("/reports")}>
              → {t("Click to return to Report page")}
            </button>
          </div>
        )}

        {loading ? (
          <div className="loader">{t("Loading data...")}</div>
        ) : filtered.length === 0 ? (
          <div className="no-data missing-all-good">
            {activeFilter === "all"
              ? <>✅ {t("No families with missing data")}</>
              : <>✅ {t("No families missing")} {
                  activeFilter === "phone"            ? t("Missing Phone") :
                  activeFilter === "diagnosis_date"   ? t("Missing Diagnosis Date") :
                  activeFilter === "diagnosis"        ? t("Missing Medical Diagnosis") :
                  activeFilter === "parent_name"      ? t("Missing Parent Name") :
                  activeFilter === "medical_state"    ? t("Missing Medical State") :
                  activeFilter === "child_phone"      ? t("Missing Child Phone") :
                  activeFilter === "details_tutoring" ? t("Missing Tutoring Details") :
                                                        t("Missing Additional Info")
                }</>
            }
          </div>
        ) : (
          <div className="missing-table-container">
              <table className="missing-compact-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Child Full Name")}</th>
                  <th>{t("Missing Fields")}</th>
                  {canEdit && <th>{t("Actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map((family, idx) => (
                  <tr key={family.id} className="missing-data-row">
                    <td className="missing-idx">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="missing-name">{family.first_name} {family.last_name}</td>
                    <td className="missing-badges-cell">{missingBadges(family)}</td>
                    {canEdit && (
                      <td>
                        <button
                          className="edit-button missing-edit-btn"
                          onClick={() => openFamilyEditModal(family)}
                        >
                          ✏️ {t("Edit")}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>            {/* Pagination */}
            <div className="pagination">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="pagination-arrow"
                >
                  &laquo;
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-arrow"
                >
                  &lsaquo;
                </button>
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;
                  const halfRange = 2;
                  const start = Math.max(1, currentPage - halfRange);
                  const end = Math.min(totalPages, currentPage + halfRange);
                  if (pageNum < start || pageNum > end) return null;
                  return (
                    <button
                      key={pageNum}
                      className={currentPage === pageNum ? "active" : ""}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-arrow"
                >
                  &rsaquo;
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="pagination-arrow"
                >
                  &raquo;
                </button>
              </div>
          </div>
        )}
      </div>

      {/* Edit family modal — exact same as ReviewerPage */}
      {editFamily && (
        <div className="reviewers-modal">
          <div className="reviewers-modal-content">
            <span className="reviewers-close" onClick={closeEditModal}>&times;</span>
            <h2>{t('Edit Family')} {editFamily.last_name}</h2>
            <form onSubmit={handleEditFamilySubmit} className="reviewers-form-grid">
              <div className="reviewers-form-column">
                <label>{t('First Name')}</label>
                <input type="text" name="childfirstname" value={newFamily.childfirstname} onChange={handleAddFamilyChange} className={errors.childfirstname ? 'reviewers-input-error' : ''} />
                {errors.childfirstname && <span className="reviewers-error-msg">{errors.childfirstname}</span>}
                <label>{t('Last Name')}</label>
                <input type="text" name="childsurname" value={newFamily.childsurname} onChange={handleAddFamilyChange} className={errors.childsurname ? 'reviewers-input-error' : ''} />
                {errors.childsurname && <span className="reviewers-error-msg">{errors.childsurname}</span>}
                <label>{t('City')}</label>
                <Select options={cityOptions} value={cityOptions.find(o => o.value === newFamily.city)} onChange={sel => { const city = sel ? sel.value : ''; setStreets(processedSettlementsAndStreets[city] || []); setNewFamily(prev => ({ ...prev, city, street: '', apartment_number: '' })); }} placeholder={t('Select a city')} isClearable noOptionsMessage={() => t('No city available')} className={errors.city ? 'reviewers-input-error' : ''} />
                {errors.city && <span className="reviewers-error-msg">{errors.city}</span>}
                <label>{t('Street')}</label>
                <Select options={streetOptions} value={newFamily.street ? streetOptions.find(o => o.value === newFamily.street) : null} onChange={sel => setNewFamily(prev => ({ ...prev, street: sel ? sel.value : '' }))} placeholder={t('Select a street')} isClearable noOptionsMessage={() => t('No street available')} className={errors.street ? 'reviewers-input-error' : ''} />
                {errors.street && <span className="reviewers-error-msg">{errors.street}</span>}
              </div>
              <div className="reviewers-form-column">
                <label>{t('Apartment Number')}</label>
                <input type="text" name="apartment_number" value={newFamily.apartment_number} onChange={handleAddFamilyChange} className={errors.apartment_number ? 'reviewers-input-error' : ''} />
                {errors.apartment_number && <span className="reviewers-error-msg">{errors.apartment_number}</span>}
                <label>{t('Child Phone Number')}</label>
                <input type="text" name="child_phone_number" value={newFamily.child_phone_number} onChange={handleAddFamilyChange} maxLength="10" />
                <label>{t('Treating Hospital')}</label>
                <Select options={hospitalsList.map(h => ({ value: h, label: h }))} value={hospitalsList.map(h => ({ value: h, label: h })).find(o => o.value === newFamily.treating_hospital)} onChange={sel => setNewFamily(prev => ({ ...prev, treating_hospital: sel ? sel.value : '' }))} placeholder={t('Select a hospital')} isClearable noOptionsMessage={() => t('No hospital available')} className={errors.treating_hospital ? 'reviewers-input-error' : ''} />
                {errors.treating_hospital && <span className="reviewers-error-msg">{errors.treating_hospital}</span>}
                <label>{t('Date of Birth')}</label>
                <input type="date" name="date_of_birth" value={newFamily.date_of_birth} onChange={handleAddFamilyChange} className={errors.date_of_birth ? 'reviewers-input-error' : ''} />
                {errors.date_of_birth && <span className="reviewers-error-msg">{errors.date_of_birth}</span>}
              </div>
              <div className="reviewers-form-column">
                <label>{t('Marital Status')}</label>
                <select name="marital_status" value={newFamily.marital_status} onChange={handleAddFamilyChange} className={errors.marital_status ? 'reviewers-input-error' : ''}>
                  <option value="">{t('Select a marital status')}</option>
                  {maritalStatuses.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </select>
                {errors.marital_status && <span className="reviewers-error-msg">{errors.marital_status}</span>}
                <label>{t('Number of Siblings')}</label>
                <input type="number" name="num_of_siblings" min="0" value={newFamily.num_of_siblings} onChange={handleAddFamilyChange} className={errors.num_of_siblings ? 'reviewers-input-error' : ''} />
                {errors.num_of_siblings && <span className="reviewers-error-msg">{errors.num_of_siblings}</span>}
                <label>{t('Gender')}</label>
                <select name="gender" value={newFamily.gender} onChange={handleAddFamilyChange}>
                  <option value="נקבה">{t('Female')}</option>
                  <option value="זכר">{t('Male')}</option>
                </select>
                <label>{t('ID')}</label>
                <input type="text" name="child_id" value={newFamily.child_id?.toString() || ''} onChange={handleAddFamilyChange} maxLength="9" placeholder="123456789" className={errors.child_id ? 'reviewers-input-error' : ''} />
                {errors.child_id && <span className="reviewers-error-msg">{errors.child_id}</span>}
                <label>{t('Registration Date')}</label>
                <input type="date" name="registration_date" value={newFamily.registration_date} onChange={handleAddFamilyChange} />
              </div>
              <div className="reviewers-form-column">
                <label>{t('Medical Diagnosis')}</label>
                <input type="text" name="medical_diagnosis" value={newFamily.medical_diagnosis} onChange={handleAddFamilyChange} />
                <label>{t('Diagnosis Date')}</label>
                <input type="date" name="diagnosis_date" value={newFamily.diagnosis_date} onChange={handleAddFamilyChange} />
                <label>{t('Current Medical State')}</label>
                <textarea name="current_medical_state" value={newFamily.current_medical_state} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
                <label>{t('When Completed Treatments')}</label>
                <input type="date" name="when_completed_treatments" value={newFamily.when_completed_treatments} onChange={handleAddFamilyChange} />
                <label>{t('Additional Info')}</label>
                <textarea name="additional_info" value={newFamily.additional_info} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
                <label>{t('Is In Frame')}</label>
                <textarea name="is_in_frame" value={newFamily.is_in_frame} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
                <label>{t('Coordinator Comments')}</label>
                <textarea name="coordinator_comments" value={newFamily.coordinator_comments} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
              </div>
              <div className="reviewers-form-column">
                <label>{t('Father Name')}</label>
                <input type="text" name="father_name" value={newFamily.father_name} onChange={handleAddFamilyChange} className={errors.father_name ? 'reviewers-input-error' : ''} />
                {errors.father_name && <span className="reviewers-error-msg">{errors.father_name}</span>}
                <label>{t('Father Phone')}</label>
                <input type="text" name="father_phone" value={newFamily.father_phone} onChange={handleAddFamilyChange} maxLength="10" className={errors.father_phone ? 'reviewers-input-error' : ''} />
                {errors.father_phone && <span className="reviewers-error-msg">{errors.father_phone}</span>}
                <label>{t('Mother Name')}</label>
                <input type="text" name="mother_name" value={newFamily.mother_name} onChange={handleAddFamilyChange} />
                <label>{t('Mother Phone')}</label>
                <input type="text" name="mother_phone" value={newFamily.mother_phone} onChange={handleAddFamilyChange} maxLength="10" className={errors.mother_phone ? 'reviewers-input-error' : ''} />
                {errors.mother_phone && <span className="reviewers-error-msg">{errors.mother_phone}</span>}
              </div>
              <div className="reviewers-form-column">
                <label>{t('Has Completed Treatments')}</label>
                <select name="has_completed_treatments" value={newFamily.has_completed_treatments ? 'Yes' : 'No'} onChange={e => handleAddFamilyChange({ target: { name: 'has_completed_treatments', value: e.target.value === 'Yes' } })}>
                  <option value="No">{t('No')}</option>
                  <option value="Yes">{t('Yes')}</option>
                </select>
                <label>{t('Need Review')}</label>
                <select name="need_review" value={newFamily.need_review ? 'Yes' : 'No'} onChange={e => handleAddFamilyChange({ target: { name: 'need_review', value: e.target.value === 'Yes' } })}>
                  <option value="Yes">{t('Yes')}</option>
                  <option value="No">{t('No')}</option>
                </select>
                <label>{t('Details for Tutoring')}</label>
                <textarea name="details_for_tutoring" value={newFamily.details_for_tutoring} onChange={handleAddFamilyChange} className="reviewers-scrollable-textarea" />
                <label>{t('Tutoring Status')}</label>
                <select name="tutoring_status" value={newFamily.tutoring_status} onChange={handleAddFamilyChange} className={errors.tutoring_status ? 'reviewers-input-error' : ''}>
                  <option value="">{t('Select a tutoring status')}</option>
                  {tutoringStatuses.map((s, i) => <option key={i} value={s}>{formatStatus(s)}</option>)}
                </select>
                {errors.tutoring_status && <span className="reviewers-error-msg">{errors.tutoring_status}</span>}
                <label>{t('Responsible Coordinator')}</label>
                {autoAssignedCoordinator && <div className="reviewers-auto-assigned-note">✨ שויך אוטומטית</div>}
                <select name="responsible_coordinator" value={newFamily.responsible_coordinator} onChange={handleAddFamilyChange} className={errors.responsible_coordinator ? 'reviewers-input-error' : ''} required>
                  <option value="ללא">ללא (אין רכז)</option>
                  {availableCoordinators.map((c, i) => <option key={i} value={c.staff_id}>{c.name}</option>)}
                </select>
                {errors.responsible_coordinator && <span className="reviewers-error-msg">{errors.responsible_coordinator}</span>}
                <label>{t('Status')}</label>
                <select name="status" value={newFamily.status} onChange={handleAddFamilyChange} className={errors.status ? 'reviewers-input-error' : ''}>
                  {statuses.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </select>
                {errors.status && <span className="reviewers-error-msg">{errors.status}</span>}
              </div>
              <div className="reviewers-form-actions">
                <button type="submit">{t('Update Family')}</button>
                <button type="button" onClick={closeEditModal}>{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamiliesMissingDataReport;
