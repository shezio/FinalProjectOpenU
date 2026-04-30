import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import axios from '../axiosConfig';
import './DashboardCharts.css';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const DashboardCharts = ({ data, timeframe, onTimeframeChange }) => {
  const [feedbackChartData, setFeedbackChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartPage, setChartPage] = useState(1);
  const [workload, setWorkload] = useState(null);

  // Fetch feedback data when timeframe changes
  useEffect(() => {
    fetchFeedbackData();
  }, [timeframe]);

  useEffect(() => {
    axios.get('/api/dashboard/coordinator-workload/')
      .then(res => setWorkload(res.data.coordinators))
      .catch(() => setWorkload([]));
  }, []);

  const fetchFeedbackData = async () => {
    try {
      setLoading(true);
      console.log(`🔄 Fetching feedback data for timeframe: ${timeframe}`);
      const response = await axios.get(`/api/dashboard/feedback/?timeframe=${timeframe}`);
      console.log(`✅ Feedback data received:`, response.data);
      setFeedbackChartData(response.data);
    } catch (err) {
      console.error('❌ Error fetching feedback data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (tf) => {
    console.log(`📍 Timeframe button clicked: ${tf}`);
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  // Tutorship Status Chart Data
  const tutorshipStatusData = {
    labels: ['עם חונך', 'ממתינות'],
    datasets: [{
      data: [
        data?.charts?.tutorship_status?.with_tutor || 0,
        data?.charts?.tutorship_status?.waiting || 0
      ],
      backgroundColor: ['#4caf50', '#f44336'],
      borderWidth: 0
    }]
  };

  // Tutors Status Chart Data
  const tutorsStatusData = {
    labels: ['ממתינים לראיון', 'פעילים'],
    datasets: [{
      data: [
        data?.charts?.tutors_status?.pending || 0,
        data?.charts?.tutors_status?.active || 0
      ],
      backgroundColor: ['#f44336', '#4caf50'],
      borderWidth: 0
    }]
  };

  // Feedback by Type Chart Data - use fetched data if available
  const feedbackData = {
    labels: ['יום כיף חונכים', 'יום כיף מתנדבים', 'ביקור בבית חולים', 'חונכות רגילה'],
    datasets: [{
      data: [
        feedbackChartData?.tutor_fun_day || data?.charts?.feedback_by_type?.tutor_fun_day || 0,
        feedbackChartData?.general_volunteer_fun_day || data?.charts?.feedback_by_type?.general_volunteer_fun_day || 0,
        feedbackChartData?.general_volunteer_hospital_visit || data?.charts?.feedback_by_type?.general_volunteer_hospital_visit || 0,
        feedbackChartData?.tutorship || data?.charts?.feedback_by_type?.tutorship || 0
      ],
      backgroundColor: ['#667eea', '#764ba2', '#ff6b6b', '#4caf50'],
      borderWidth: 0
    }]
  };

  // Cities Chart Data
  const citiesData = {
    labels: data?.charts?.cities?.map(c => c.city) || [],
    datasets: [{
      label: 'משפחות הממתינות',
      data: data?.charts?.cities?.map(c => c.count) || [],
      backgroundColor: '#667eea',
      borderRadius: 8
    }]
  };

  // Recent Tutorships Chart Data
  const recentTutorshipsData = {
    labels: data?.charts?.recent_tutorships?.map(t => t.child_name) || [],
    datasets: [{
      label: 'ימים מהתחלה',
      data: data?.charts?.recent_tutorships?.map(t => t.days) || [],
      backgroundColor: '#764ba2',
      borderRadius: 8
    }]
  };

  // Age Groups Chart Data
  const ageGroupsData = {
    labels: ['6-8 שנים', '9-11 שנים', '12-14 שנים', '15-17 שנים'],
    datasets: [{
      label: 'הזדמנויות התאמה',
      data: [
        data?.charts?.age_groups?.['6-8'] || 0,
        data?.charts?.age_groups?.['9-11'] || 0,
        data?.charts?.age_groups?.['12-14'] || 0,
        data?.charts?.age_groups?.['15-17'] || 0
      ],
      backgroundColor: '#4caf50',
      borderRadius: 8
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: { size: 24, weight: 'bold' },
          padding: 20
        }
      },
      tooltip: {
        bodyFont: { size: 20 },
        titleFont: { size: 22, weight: 'bold' }
      }
    }
  };

  const barOptionsVertical = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { size: 20 } },
        title: { display: false }
      },
      x: {
        ticks: { font: { size: 20 } }
      }
    }
  };

  const barOptionsHorizontal = {
    ...chartOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { font: { size: 20 } }
      },
      y: {
        ticks: { font: { size: 20 } }
      }
    }
  };

  // ── Chart registry — each entry is its own page ──────────────────────────
  const allCharts = [
    {
      key: 'tutorship_status',
      title: 'סטטוס חונכויות משפחות',
      render: () => <div className="chart-container"><Pie data={tutorshipStatusData} options={chartOptions} /></div>,
    },
    {
      key: 'tutors_status',
      title: 'חונכים: ממתינים מול פעילים',
      render: () => <div className="chart-container"><Pie data={tutorsStatusData} options={chartOptions} /></div>,
    },
    {
      key: 'feedback',
      title: 'משוב לפי סוג',
      extra: (
        <div className="timeframe-selector">
          {['week','month','year','all'].map(tf => (
            <button key={tf} className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`} onClick={() => handleTimeframeChange(tf)}>
              {{ week: 'שבוע', month: 'חודש', year: 'שנה', all: 'הכל' }[tf]}
            </button>
          ))}
        </div>
      ),
      render: () => <div className="chart-container"><Pie data={feedbackData} options={chartOptions} /></div>,
    },
    {
      key: 'new_families',
      title: 'משפחות חדשות בחודש זה',
      render: () => (
        <div className="new-families-card">
          <div className="big-number">{data?.kpis?.new_families_month || 0}</div>
          <div className="subtitle">משפחות חדשות</div>
          <div className="growth">+12% מהחודש שעבר</div>
        </div>
      ),
    },
    {
      key: 'cities',
      title: 'ערים עם מרבית משפחות הממתינות',
      render: () => <div className="chart-container-large"><Bar data={citiesData} options={barOptionsHorizontal} /></div>,
    },
    {
      key: 'recent_tutorships',
      title: 'חונכויות אחרונות (10 פעילויות)',
      render: () => <div className="chart-container-large"><Bar data={recentTutorshipsData} options={barOptionsVertical} /></div>,
    },
    {
      key: 'age_groups',
      title: 'הזדמנויות התאמה לפי קבוצות גיל',
      render: () => <div className="chart-container-large"><Bar data={ageGroupsData} options={barOptionsVertical} /></div>,
    },
    {
      key: 'tutorships_table',
      title: '📋 חונכויות פעילות אחרונות',
      render: () => (
        <div className="table-card">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>שם הילד</th>
                <th>שם החונך</th>
                <th>תאריך התחלה</th>
                <th>משך חונכות</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {(data?.table || []).map((row, i) => (
                <tr key={i}>
                  <td>{row.child_name}</td>
                  <td>{row.tutor_name}</td>
                  <td>{row.start_date}</td>
                  <td>{row.duration}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      key: 'coordinator_workload',
      title: '👥 עומס רכזים',
      render: () => {
        if (!workload) return <p className="workload-loading">טוען נתונים...</p>;
        if (workload.length === 0) return <p className="workload-loading">אין נתונים</p>;

        const names = workload.map(c => c.name);
        const colors = ['#667eea','#764ba2','#ff6b6b','#4caf50','#ffa726','#26c6da','#ab47bc'];

        const familiesPie = {
          labels: names,
          datasets: [{ data: workload.map(c => c.families), backgroundColor: colors, borderWidth: 0 }]
        };
        const tasksPie = {
          labels: names,
          datasets: [{ data: workload.map(c => c.open_tasks), backgroundColor: colors, borderWidth: 0 }]
        };
        const overduePie = {
          labels: names,
          datasets: [{ data: workload.map(c => c.overdue_reviews), backgroundColor: colors, borderWidth: 0 }]
        };

        return (
          <div>
            <div className="charts-row workload-pies-row">
              <div className="chart-card">
                <h3>משפחות באחריות</h3>
                <div className="chart-container"><Pie data={familiesPie} options={chartOptions} /></div>
              </div>
              <div className="chart-card">
                <h3>משימות פתוחות</h3>
                <div className="chart-container"><Pie data={tasksPie} options={chartOptions} /></div>
              </div>
            </div>
            <div className="chart-card workload-overdue-card">
              <h3>שיחות ביקורת באיחור</h3>
              <div className="chart-container"><Pie data={overduePie} options={chartOptions} /></div>
            </div>
            <div className="table-card">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>רכז/ת</th>
                    <th>משפחות</th>
                    <th>משימות פתוחות</th>
                    <th>ביקורות באיחור</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.map((coord, i) => (
                    <tr key={i} className={coord.overdue_reviews > 0 ? 'workload-row-alert' : ''}>
                      <td>{coord.name}</td>
                      <td>{coord.families}</td>
                      <td>{coord.open_tasks}</td>
                      <td className={coord.overdue_reviews > 0 ? 'workload-overdue' : ''}>{coord.overdue_reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      },
    },
  ];

  const totalPages = allCharts.length;
  const currentChart = allCharts[chartPage - 1];

  return (
    <div className="charts-section">
      <div className="charts-header">
        <h2>📊 תצוגות בהתפלגות</h2>
        <div className="charts-pagination">
          <button
            onClick={() => setChartPage(p => Math.max(1, p - 1))}
            disabled={chartPage === 1}
            className="charts-page-btn"
          >&lsaquo;</button>
          <span className="charts-page-indicator">{chartPage} / {totalPages}</span>
          <button
            onClick={() => setChartPage(p => Math.min(totalPages, p + 1))}
            disabled={chartPage === totalPages}
            className="charts-page-btn"
          >&rsaquo;</button>
        </div>
      </div>

      {/* One item per page — key forces canvas remount on page change */}
      <div key={chartPage} className="full-width-chart">
        <h3>{currentChart.title}</h3>
        {currentChart.extra}
        {currentChart.render()}
      </div>
    </div>
  );
};

export default DashboardCharts;
