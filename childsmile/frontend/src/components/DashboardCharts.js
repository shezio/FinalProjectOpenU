import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import axios from '../axiosConfig';
import './DashboardCharts.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const DashboardCharts = ({ data, timeframe, onTimeframeChange }) => {
  const [feedbackChartData, setFeedbackChartData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch feedback data when timeframe changes
  useEffect(() => {
    fetchFeedbackData();
  }, [timeframe]);

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
          font: { size: 12, weight: 'bold' },
          padding: 20
        }
      }
    }
  };

  const barOptionsVertical = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const barOptionsHorizontal = {
    ...chartOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="charts-section">
      <h2>📊 תצוגות בהתפלגות</h2>
      
      {/* Pie Charts Row */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>סטטוס חונכויות משפחות</h3>
          <div className="chart-container">
            <Pie data={tutorshipStatusData} options={chartOptions} />
          </div>
        </div>
        
        <div className="chart-card">
          <h3>חונכים: ממתינים מול פעילים</h3>
          <div className="chart-container">
            <Pie data={tutorsStatusData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Feedback and New Families Row */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>
            <span className="new-badge">חדש</span>
            משוב לפי סוג
          </h3>
          <div className="timeframe-selector">
            <button 
              className={`timeframe-btn ${timeframe === 'week' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('week')}
            >
              שבוע
            </button>
            <button 
              className={`timeframe-btn ${timeframe === 'month' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('month')}
            >
              חודש
            </button>
            <button 
              className={`timeframe-btn ${timeframe === 'year' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('year')}
            >
              שנה
            </button>
            <button 
              className={`timeframe-btn ${timeframe === 'all' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('all')}
            >
              הכל
            </button>
          </div>
          <div className="chart-container">
            <Pie data={feedbackData} options={chartOptions} />
          </div>
        </div>
        
        <div className="chart-card">
          <h3>משפחות חדשות בחודש זה</h3>
          <div className="new-families-card">
            <div className="big-number">{data?.kpis?.new_families_month || 0}</div>
            <div className="subtitle">משפחות חדשות</div>
            <div className="growth">+12% מהחודש שעבר</div>
          </div>
        </div>
      </div>

      {/* Bar Charts */}
      <div className="data-viz-section">
        <h2>📊 ויזואליזציה של נתונים</h2>

        <div className="full-width-chart">
          <h3>ערים עם מרבית משפחות הממתינות</h3>
          <div className="chart-container-large">
            <Bar data={citiesData} options={barOptionsHorizontal} />
          </div>
        </div>

        <div className="full-width-chart">
          <h3>חונכויות אחרונות (10 פעילויות)</h3>
          <div className="chart-container-large">
            <Bar data={recentTutorshipsData} options={barOptionsVertical} />
          </div>
        </div>

        <div className="full-width-chart">
          <h3>הזדמנויות התאמה לפי קבוצות גיל</h3>
          <div className="chart-container-large">
            <Bar data={ageGroupsData} options={barOptionsVertical} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
