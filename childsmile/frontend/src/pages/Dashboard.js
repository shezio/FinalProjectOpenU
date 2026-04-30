import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import './Dashboard.css';
import DashboardCharts from '../components/DashboardCharts';
import AIChatBot from '../components/AIChatBot';
import PptxGenJS from 'pptxgenjs';

const Dashboard = () => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackTimeframe, setFeedbackTimeframe] = useState('month');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/dashboard/data/?timeframe=month`);
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(t('error_loading_dashboard'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPPT = async () => {
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.rtlMode = true;

      // Slide 1: Title
      const slide1 = pptx.addSlide();
      slide1.background = { color: '0066CC' };
      slide1.addText('ChildSmile Dashboard', {
        x: 1.0,
        y: 2.0,
        w: 8.0,
        h: 1.5,
        fontSize: 44,
        bold: true,
        color: 'FFFFFF',
        align: 'center'
      });
      slide1.addText(new Date().toLocaleDateString('he-IL'), {
        x: 1.0,
        y: 3.5,
        w: 8.0,
        fontSize: 24,
        color: 'FFFFFF',
        align: 'center'
      });

      // Slide 2: KPIs
      if (dashboardData?.kpis) {
        const slide2 = pptx.addSlide();
        slide2.background = { color: 'FFFFFF' };
        slide2.addText('מדדים עיקריים', {
          x: 0.5,
          y: 0.5,
          fontSize: 36,
          bold: true,
          color: '0066CC'
        });

        const kpiRows = [
          [
            { text: 'מדד', options: { bold: true, fontSize: 22, color: 'FFFFFF', fill: { color: '0066CC' } } },
            { text: 'ערך', options: { bold: true, fontSize: 22, color: 'FFFFFF', fill: { color: '0066CC' } } }
          ],
          [
            { text: 'סה"כ משפחות', options: { fontSize: 20, color: '333333' } },
            { text: String(dashboardData.kpis.total_families || 0), options: { fontSize: 24, bold: true, color: '0066CC' } }
          ],
          [
            { text: 'משפחות ממתינות', options: { fontSize: 20, color: '333333' } },
            { text: String(dashboardData.kpis.waiting_families || 0), options: { fontSize: 24, bold: true, color: 'FF6B6B' } }
          ],
          [
            { text: 'חונכויות פעילות', options: { fontSize: 20, color: '333333' } },
            { text: String(dashboardData.kpis.active_tutorships || 0), options: { fontSize: 24, bold: true, color: '4CAF50' } }
          ],
          [
            { text: 'חונכים ממתינים', options: { fontSize: 20, color: '333333' } },
            { text: String(dashboardData.kpis.pending_tutors || 0), options: { fontSize: 24, bold: true, color: 'FFA726' } }
          ],
          [
            { text: 'צוות', options: { fontSize: 20, color: '333333' } },
            { text: String(dashboardData.kpis.staff_count || 0), options: { fontSize: 24, bold: true, color: '0066CC' } }
          ]
        ];

        slide2.addTable(kpiRows, {
          x: 1.5,
          y: 1.5,
          w: 7.0,
          rowH: 0.8,
          border: { pt: 2, color: 'DDDDDD' },
          fill: { color: 'F8F9FA' }
        });
      }

      // Slide 3: Charts Summary
      if (dashboardData?.charts) {
        const slide3 = pptx.addSlide();
        slide3.background = { color: 'FFFFFF' };
        slide3.addText('נתונים חזותיים', {
          x: 0.5,
          y: 0.5,
          fontSize: 36,
          bold: true,
          color: '0066CC'
        });

        const newRegTotal = dashboardData.charts.new_registrations?.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const newTutorshipsTotal = dashboardData.charts.new_tutorships?.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        
        const chartRows = [
          [
            { text: 'נושא', options: { bold: true, fontSize: 22, color: 'FFFFFF', fill: { color: '0066CC' } } },
            { text: 'סה"כ', options: { bold: true, fontSize: 22, color: 'FFFFFF', fill: { color: '0066CC' } } }
          ],
          [
            { text: 'רישומי משפחות חדשות', options: { fontSize: 20, color: '333333' } },
            { text: String(newRegTotal), options: { fontSize: 24, bold: true, color: '4CAF50' } }
          ],
          [
            { text: 'חונכויות חדשות', options: { fontSize: 20, color: '333333' } },
            { text: String(newTutorshipsTotal), options: { fontSize: 24, bold: true, color: '0066CC' } }
          ]
        ];

        slide3.addTable(chartRows, {
          x: 1.5,
          y: 1.5,
          w: 7.0,
          rowH: 0.8,
          border: { pt: 2, color: 'DDDDDD' },
          fill: { color: 'F8F9FA' }
        });
      }

      // Slide 4: Recent Tutorships
      if (dashboardData?.table?.length > 0) {
        const slide4 = pptx.addSlide();
        slide4.background = { color: 'FFFFFF' };
        slide4.addText('חונכויות פעילות אחרונות', {
          x: 0.5,
          y: 0.5,
          fontSize: 36,
          bold: true,
          color: '0066CC'
        });

        const tableRows = [
          [
            { text: 'חונך', options: { bold: true, fontSize: 18, color: 'FFFFFF', fill: { color: '0066CC' } } },
            { text: 'ילד', options: { bold: true, fontSize: 18, color: 'FFFFFF', fill: { color: '0066CC' } } },
            { text: 'תאריך התחלה', options: { bold: true, fontSize: 18, color: 'FFFFFF', fill: { color: '0066CC' } } }
          ]
        ];

        dashboardData.table.slice(0, 10).forEach(row => {
          tableRows.push([
            { text: row.tutor_name || '-', options: { fontSize: 16, color: '333333' } },
            { text: row.child_name || '-', options: { fontSize: 16, color: '333333' } },
            { text: row.start_date || '-', options: { fontSize: 16, color: '333333' } }
          ]);
        });

        slide4.addTable(tableRows, {
          x: 0.5,
          y: 1.5,
          w: 9.0,
          rowH: 0.5,
          border: { pt: 1, color: 'DDDDDD' },
          fill: { color: 'FFFFFF' },
          align: 'right'
        });
      }

      await pptx.writeFile({ fileName: `ChildSmile_Dashboard_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.pptx` });
      
      toast.success('PPT הורד בהצלחה!');
    } catch (err) {
      console.error('Error exporting PPT:', err);
      toast.error('שגיאה בייצוא PPT');
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <InnerPageHeader title={t('advanced_dashboard')} />
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>{t('loading_data')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <Sidebar />
        <InnerPageHeader title={t('advanced_dashboard')} />
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={handleRefresh}>{t('try_again')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar />
      <InnerPageHeader title={t('advanced_dashboard')} />
      <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-header-buttons">
          <button className="btn btn-refresh" onClick={handleRefresh}>
            🔄 {t('refresh')}
          </button>
          <button className="btn btn-export" onClick={handleExportPPT}>
            📊 ייצוא PPT
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-section">
        <h2>📈 {t('key_metrics')}</h2>
        <div className="kpi-cards">
          <div className="kpi-card">
            <div className="kpi-label">{t('total_families')}</div>
            <div className="kpi-value">{dashboardData?.kpis?.total_families || 0}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t('waiting_families')}</div>
            <div className="kpi-value">{dashboardData?.kpis?.waiting_families || 0}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t('active_tutorships')}</div>
            <div className="kpi-value">{dashboardData?.kpis?.active_tutorships || 0}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t('pending_tutors')}</div>
            <div className="kpi-value">{dashboardData?.kpis?.pending_tutors || 0}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">{t('staff_count')}</div>
            <div className="kpi-value">{dashboardData?.kpis?.staff_count || 0}</div>
          </div>
        </div>
      </div>

      {/* Charts Section — includes table as last page */}
      <DashboardCharts 
        data={dashboardData} 
        timeframe={feedbackTimeframe}
        onTimeframeChange={setFeedbackTimeframe}
      />

      </div>
      <AIChatBot />
    </div>
  );
};

export default Dashboard;
