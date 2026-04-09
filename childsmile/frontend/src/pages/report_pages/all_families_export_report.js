import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import Sidebar from '../../components/Sidebar';
import InnerPageHeader from '../../components/InnerPageHeader';
import { useTranslation } from 'react-i18next';
import { hasViewPermissionForTable, navigateTo } from '../../components/utils';
import { exportAllFamiliesToExcel } from '../../components/export_utils';
import '../../styles/common.css';
import '../../styles/reports.css';
import '../../styles/all_volunteers_report.css';

const PAGE_SIZE = 6;

const AllFamiliesExportReport = () => {
    const [families, setFamilies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const { t } = useTranslation();

    // Permission check
    const hasPermissionToView = hasViewPermissionForTable('children');

    // Fetch data from backend
    const fetchFamilies = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/get_complete_family_details/');
            if (response.data && response.data.families) {
                setFamilies(response.data.families);
            } else {
                setError('Failed to fetch families data');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error fetching data';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasPermissionToView) {
            fetchFamilies();
        } else {
            setLoading(false);
        }
    }, [hasPermissionToView]);

    // Filter families based on search (name, id, phone)
    const getFilteredFamilies = () => {
        let filtered = families;
        
        // Filter by search term (id, name, phone)
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(f => {
                const fullName = `${f.first_name || ''} ${f.last_name || ''}`.toLowerCase();
                return (
                    f.id?.toString().toLowerCase().includes(search) ||
                    fullName.includes(search) ||
                    f.child_phone_number?.toLowerCase().includes(search) ||
                    f.father_phone?.toLowerCase().includes(search) ||
                    f.mother_phone?.toLowerCase().includes(search)
                );
            });
        }
        
        return filtered;
    };

    const filteredFamilies = getFilteredFamilies();
    const totalPages = Math.ceil(filteredFamilies.length / PAGE_SIZE);
    const paginatedFamilies = filteredFamilies.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    // Export to Excel - export only selected families from filtered list
    const handleExportToExcel = () => {
        const selectedFamilies = filteredFamilies.filter(f => f.selected);
        if (selectedFamilies.length === 0) {
            return;
        }
        
        // Prepare data for export - all family fields
        const exportData = selectedFamilies.map(f => ({
            'תעודת זהות': f.id || '',
            'שם מלא': `${f.first_name || ''} ${f.last_name || ''}`.trim() || '',
            'גיל': f.age || '',
            'מין': f.gender || '',
            'תאריך לידה': f.date_of_birth || '',
            'עיר': f.city || '',
            'כתובת': f.address || '',
            'טלפון ילד': f.child_phone_number || '',
            'טלפון אבא': f.father_phone || '',
            'שם אבא': f.father_name || '',
            'טלפון אמא': f.mother_phone || '',
            'שם אמא': f.mother_name || '',
            'מצב משפחתי': f.marital_status || '',
            'מספר אחים': f.num_of_siblings || '',
            'בית חולים': f.treating_hospital || '',
            'אבחנה רפואית': f.medical_diagnosis || '',
            'תאריך אבחנה': f.diagnosis_date || '',
            'מצב רפואי נוכחי': f.current_medical_state || '',
            'תאריך סיום טיפולים': f.when_completed_treatments || '',
            'הצפי לסיום טיפולים': f.expected_end_treatment_by_protocol || '',
            'סיים טיפולים': f.has_completed_treatments ? 'כן' : 'לא',
            'סטטוס': f.status || '',
            'סטטוס חונכות': (f.tutoring_status || '').replace(/_/g, ' ') || '',
            'תאריך הרשמה': f.registration_date || '',
            'רכז אחראי': f.responsible_coordinator || '',
            'צריך שיחת ביקורת?': f.need_review ? 'כן' : 'לא',
            'האם במסגרת': f.is_in_frame || '',
            'הערות רכז': f.coordinator_comments || '',
            'פרטים לחונכות': f.details_for_tutoring || '',
            'מידע נוסף': f.additional_info || '',
        }));
        
        console.log('Export data count:', exportData.length);
        console.log('First export record keys:', Object.keys(exportData[0]));
        console.log('Total fields:', Object.keys(exportData[0]).length);
        
        exportAllFamiliesToExcel(exportData, t);
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
        const updatedFamilies = families.map(family => ({
            ...family,
            selected: isChecked,
        }));
        setFamilies(updatedFamilies);
    };

    const refreshData = () => {
        setCurrentPage(1);
        setSearchTerm('');
        fetchFamilies();
    };

    if (!hasPermissionToView) {
        return (
            <div className="all-volunteers-report-main-content">
                <Sidebar />
                <InnerPageHeader title="📋 דוח ייצוא משפחות" />
                <div className="page-content">
                    <div className="no-permission">
                        <h2>אין לך הרשאה לצפות בדף זה</h2>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="all-volunteers-report-main-content">
            <Sidebar />
            <InnerPageHeader title="📋 דוח משפחות כללי" />
            <div className="page-content">
                <div className="filter-create-container">
                    <div className="actions">
                        <button
                            className="export-button excel-button"
                            onClick={handleExportToExcel}
                            disabled={loading || families.length === 0}
                        >
                            <img src="/assets/excel-icon.png" alt="Excel" />
                        </button>
                        <input
                            type="text"
                            placeholder="חיפוש לפי שם, טלפון, תעודת זהות..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="search-bar"
                        />
                        <button className="refresh-button" onClick={refreshData} disabled={loading}>
                            {t('Refresh')}
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
                {loading ? (
                    <div className="loader">{t("Loading data...")}</div>
                ) : (
                    <div className="grid-container">
                        {families.length === 0 ? (
                            <div className="no-data">{t("No data to display")}</div>
                        ) : (
                            <>
                                <table className="data-grid">
                                    <thead>
                                        <tr>
                                            <th>
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) => handleSelectAllCheckbox(e.target.checked)}
                                                />
                                            </th>
                                            <th>{t('ID')}</th>
                                            <th>{t('Full Name')}</th>
                                            <th>{t('Age')}</th>
                                            <th>{t('Gender')}</th>
                                            <th>{t('Parent Phone')}</th>
                                            <th>{t('City')}</th>
                                            <th>{t('Status')}</th>
                                            <th>{t('Tutorship Status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedFamilies.map((family, paginatedIndex) => {
                                            const globalIndex = families.findIndex(f => f.id === family.id);
                                            // Get parent phone (prefer mother, fall back to father)
                                            const parentPhone = family.mother_phone || family.father_phone || '-';
                                            // Get gender display (true = Female, false = Male) - TRANSLATED
                                            const genderDisplay = family.gender === true || family.gender === 'true' || family.gender === 'True' ? t('Female') : family.gender === false || family.gender === 'false' || family.gender === 'False' ? t('Male') : family.gender || '-';
                                            // Format tutoring status - replace underscores with spaces
                                            const tutorshipStatusDisplay = (family.tutoring_status || '-').replace(/_/g, ' ');
                                            return (
                                            <tr key={globalIndex}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={family.selected || false}
                                                        onChange={() => handleCheckboxChange(globalIndex)}
                                                    />
                                                </td>
                                                <td>{family.id || '-'}</td>
                                                <td>{`${family.first_name || ''} ${family.last_name || ''}`.trim() || '-'}</td>
                                                <td>{family.age || '-'}</td>
                                                <td>{genderDisplay}</td>
                                                <td>{parentPhone}</td>
                                                <td>{family.city || '-'}</td>
                                                <td>{family.status || '-'}</td>
                                                <td>{tutorshipStatusDisplay}</td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="pagination">
                                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="pagination-arrow">&laquo;</button>
                                    <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-arrow">&lsaquo;</button>
                                    {Array.from({ length: Math.ceil(filteredFamilies.length / PAGE_SIZE) }, (_, i) => {
                                        const pageNum = i + 1;
                                        const totalPages = Math.ceil(filteredFamilies.length / PAGE_SIZE);
                                        const maxButtons = 5;
                                        const halfRange = Math.floor(maxButtons / 2);
                                        let start = Math.max(1, currentPage - halfRange);
                                        let end = Math.min(totalPages, start + maxButtons - 1);
                                        if (end - start < maxButtons - 1) {
                                            start = Math.max(1, end - maxButtons + 1);
                                        }
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
                                    <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(filteredFamilies.length / PAGE_SIZE)} className="pagination-arrow">&rsaquo;</button>
                                    <button onClick={() => setCurrentPage(Math.ceil(filteredFamilies.length / PAGE_SIZE))} disabled={currentPage === Math.ceil(filteredFamilies.length / PAGE_SIZE)} className="pagination-arrow">&raquo;</button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllFamiliesExportReport;
