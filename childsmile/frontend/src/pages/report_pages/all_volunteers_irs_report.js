import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import Sidebar from '../../components/Sidebar';
import InnerPageHeader from '../../components/InnerPageHeader';
import { useTranslation } from 'react-i18next';
import { hasViewPermissionForTable, navigateTo } from '../../components/utils';
import { exportAllVolunteersIRSToExcel } from '../../components/export_utils';
import '../../styles/common.css';
import '../../styles/reports.css';
import '../../styles/all_volunteers_report.css';

const PAGE_SIZE = 6;

const AllVolunteersIRSReport = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const { t } = useTranslation();

    // Permission check
    const hasPermissionToView = hasViewPermissionForTable('staff');

    // Fetch data from backend
    const fetchVolunteers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/reports/all-volunteers-irs-report/');
            if (response.data.success) {
                setVolunteers(response.data.data);
            } else {
                setError('Failed to fetch volunteer data');
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
            fetchVolunteers();
        } else {
            setLoading(false);
        }
    }, [hasPermissionToView]);

    // Filter volunteers based on search (phone, id, name)
    const getFilteredVolunteers = () => {
        let filtered = volunteers;
        
        // Filter by search term (phone, id, full_name)
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(v => {
                const fullName = `${v.first_name || ''} ${v.last_name || ''}`.toLowerCase();
                return (
                    v.volunteer_id?.toString().toLowerCase().includes(search) ||
                    fullName.includes(search) ||
                    v.phone?.toLowerCase().includes(search)
                );
            });
        }
        
        return filtered;
    };

    const filteredVolunteers = getFilteredVolunteers();
    const totalPages = Math.ceil(filteredVolunteers.length / PAGE_SIZE);
    const paginatedVolunteers = filteredVolunteers.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    // Export to Excel - export only selected volunteers from filtered list
    const handleExportToExcel = () => {
        const selectedVolunteers = filteredVolunteers.filter(v => v.selected);
        if (selectedVolunteers.length === 0) {
            return;
        }
        // Prepare data for export - 12 UNIQUE volunteer fields
        const exportData = selectedVolunteers.map(v => ({
            // SignedUp core fields (10)
            'תעודת זהות': v.volunteer_id || '',
            'שם מלא': `${v.first_name || ''} ${v.last_name || ''}`.trim() || '',
            'גיל': v.age || '',
            'תאריך לידה': v.birth_date || '',
            'מין': v.gender || '',
            'טלפון': v.phone || '',
            'עיר': v.city || '',
            'דוא"ל': v.email || '',
            'רוצה חונכות': v.want_tutor || '',
            
            // Volunteer-specific fields (2)
            'תאריך הרשמה': v.signupdate || '',
            'סטטוס': v.status || '',
            'האם בקבוצה': v.is_in_group ? 'כן' : 'לא',
            'סיבה לאי חברות בקבוצה': v.is_in_group ? '---' : (v.why_not_in_group || '---'),
        }));
        
        console.log('Export data count:', exportData.length); // DEBUG
        console.log('First export record keys:', Object.keys(exportData[0])); // DEBUG
        console.log('First export record:', exportData[0]); // DEBUG
        console.log('Total fields:', Object.keys(exportData[0]).length); // DEBUG
        
        exportAllVolunteersIRSToExcel(exportData, t);
    };

    const handleCheckboxChange = (index) => {
        const updatedVolunteers = volunteers.map((volunteer, i) => {
            if (i === index) {
                return { ...volunteer, selected: !volunteer.selected };
            }
            return volunteer;
        });
        setVolunteers(updatedVolunteers);
    };

    const handleSelectAllCheckbox = (isChecked) => {
        const updatedVolunteers = volunteers.map(volunteer => ({
            ...volunteer,
            selected: isChecked,
        }));
        setVolunteers(updatedVolunteers);
    };

    const refreshData = () => {
        setCurrentPage(1);
        setSearchTerm('');
        fetchVolunteers();
    };

    if (!hasPermissionToView) {
        return (
            <div className="all-volunteers-report-main-content">
                <Sidebar />
                <InnerPageHeader title="📋 דוח מתנדבים כללי" />
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
            <InnerPageHeader title="📋 דוח מתנדבים כללי" />
            <div className="page-content">
                <div className="filter-create-container">
                    <div className="actions">
                        <button
                            className="export-button excel-button"
                            onClick={handleExportToExcel}
                            disabled={loading || volunteers.length === 0}
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
                        {volunteers.length === 0 ? (
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
                                            <th>{t('Phone')}</th>
                                            <th>{t('Email')}</th>
                                            <th>{t('City')}</th>
                                            <th>{t('Status')}</th>
                                            <th>{t('Is In Group')}</th>
                                            <th>{t('Why Not In Group')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedVolunteers.map((volunteer, paginatedIndex) => {
                                            const globalIndex = volunteers.findIndex(v => v.volunteer_id === volunteer.volunteer_id);
                                            return (
                                            <tr key={globalIndex}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={volunteer.selected || false}
                                                        onChange={() => handleCheckboxChange(globalIndex)}
                                                    />
                                                </td>
                                                <td>{volunteer.volunteer_id || '-'}</td>
                                                <td>{`${volunteer.first_name || ''} ${volunteer.last_name || ''}`.trim() || '-'}</td>
                                                <td>{volunteer.age || '-'}</td>
                                                <td>{volunteer.gender || '-'}</td>
                                                <td>{volunteer.phone || '-'}</td>
                                                <td>{volunteer.email || '-'}</td>
                                                <td>{volunteer.city || '-'}</td>
                                                <td>{volunteer.status || '-'}</td>
                                                <td>{volunteer.is_in_group ? t('Yes') : t('No')}</td>
                                                <td>{volunteer.is_in_group ? '---' : (volunteer.why_not_in_group || '---')}</td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="pagination">
                                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="pagination-arrow">&laquo;</button>
                                    <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-arrow">&lsaquo;</button>
                                    {Array.from({ length: Math.ceil(filteredVolunteers.length / PAGE_SIZE) }, (_, i) => {
                                        const pageNum = i + 1;
                                        const totalPages = Math.ceil(filteredVolunteers.length / PAGE_SIZE);
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
                                    <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(filteredVolunteers.length / PAGE_SIZE)} className="pagination-arrow">&rsaquo;</button>
                                    <button onClick={() => setCurrentPage(Math.ceil(filteredVolunteers.length / PAGE_SIZE))} disabled={currentPage === Math.ceil(filteredVolunteers.length / PAGE_SIZE)} className="pagination-arrow">&raquo;</button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllVolunteersIRSReport;
