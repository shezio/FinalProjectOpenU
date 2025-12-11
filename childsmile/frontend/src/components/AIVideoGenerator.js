import React, { useState } from 'react';
import axios from '../axiosConfig';
import './AIVideoGenerator.css';

const AIVideoGenerator = () => {
  const [chatMessages, setChatMessages] = useState([
    {
      type: 'assistant',
      text: 'שלום! אני כאן לעזור לך ליצור סרטון סקירה מקצועי של מצב המערכת. אתה יכול לבחור:\n\n• איזה עמודים לכלול (משפחות, חונכים, מתנדבים וכו\')\n• טווח זמן (שבוע, חודש, שנה)\n• מה להדגיש בסרטון\n\nרוצה שאתחיל עם הגדרות ברירת מחדל?'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Video options state
  const [videoOptions, setVideoOptions] = useState({
    timeRange: 'חודש אחרון',
    duration: '2-3 דקות',
    pages: {
      dashboard: true,
      families: true,
      tutors: true,
      volunteers: true,
      feedback: false,
      tasks: false
    },
    style: 'מקצועי ורשמי'
  });

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessage = { type: 'user', text: userInput };
    setChatMessages(prev => [...prev, newMessage]);
    setUserInput('');
    setIsTyping(true);

    try {
      const response = await axios.post('/api/dashboard/ai-chat/', {
        message: userInput
      });

      setIsTyping(false);
      const aiResponse = { type: 'assistant', text: response.data.response };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      // Fallback response
      const fallbackResponse = {
        type: 'assistant',
        text: 'אני כאן לעזור! אפשר לשאול אותי על:\n• נתוני המערכת\n• יצירת סרטון סקירה\n• התאמת אפשרויות הסרטון'
      };
      setChatMessages(prev => [...prev, fallbackResponse]);
    }
  };

  const handleGenerateVideo = async () => {
    setGenerating(true);
    setProgress(0);

    // Add confirmation message to chat
    const confirmMsg = {
      type: 'assistant',
      text: `מתחיל לייצר סרטון!\n\n📊 פרטי הסרטון:\n• טווח זמן: ${videoOptions.timeRange}\n• משך: ${videoOptions.duration}\n• עמודים: ${Object.keys(videoOptions.pages).filter(k => videoOptions.pages[k]).join(', ')}\n• סגנון: ${videoOptions.style}\n\nזה ייקח כמה שניות... 🎬`
    };
    setChatMessages(prev => [...prev, confirmMsg]);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const selectedPages = Object.keys(videoOptions.pages)
        .filter(k => videoOptions.pages[k])
        .map(k => {
          const labels = {
            dashboard: 'לוח בקרה',
            families: 'משפחות',
            tutors: 'חונכים',
            volunteers: 'מתנדבים',
            feedback: 'משוב',
            tasks: 'משימות'
          };
          return labels[k];
        });

      const response = await axios.post('/api/dashboard/generate-video/', {
        timeframe: videoOptions.timeRange,
        duration: videoOptions.duration,
        pages: selectedPages,
        style: videoOptions.style
      });

      if (response.data.success) {
        setVideoUrl(response.data.download_url);
        setTimeout(() => {
          setShowVideoModal(true);
          setGenerating(false);
        }, 500);
      }
    } catch (error) {
      console.error('Error generating video:', error);
      alert('שגיאה ביצירת הסרטון');
      setGenerating(false);
    }
  };

  const handleDownloadVideo = () => {
    if (videoUrl) {
      window.location.href = videoUrl;
    }
  };

  return (
    <div className="ai-section">
      <h2>🤖 יצירת סרטון סקירה AI</h2>
      <p>צור סרטון מקצועי שמסקר את מצב המערכת עם קול AI בטון מקצועי ועיצוב גרפי מתקדם</p>

      {/* Chat Container */}
      <div className="ai-chat-container">
        <div className="ai-chat-header">
          <div className="ai-icon">🤖</div>
          <div>
            <h3>עוזר AI לסקירת מצב</h3>
            <p>שאל אותי על הנתונים או בקש לייצר סרטון</p>
          </div>
        </div>

        <div className="ai-chat-messages">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`ai-message ${msg.type}`}>
              <strong>{msg.type === 'user' ? 'אתה:' : 'AI:'}</strong> 
              <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br>') }} />
            </div>
          ))}
          
          {isTyping && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>

        <div className="ai-input-container">
          <input
            type="text"
            className="ai-input"
            placeholder="שאל אותי משהו או בקש ליצור סרטון..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="ai-send-btn" onClick={handleSendMessage}>
            שלח
          </button>
        </div>
      </div>

      {/* Video Options */}
      <div className="video-options">
        <h4>⚙️ אפשרויות סרטון</h4>

        <div className="option-group">
          <label>טווח זמן לנתונים:</label>
          <select 
            value={videoOptions.timeRange}
            onChange={(e) => setVideoOptions({...videoOptions, timeRange: e.target.value})}
          >
            <option>שבוע אחרון</option>
            <option>חודש אחרון</option>
            <option>3 חודשים אחרונים</option>
            <option>שנה אחרונה</option>
            <option>כל הזמן</option>
          </select>
        </div>

        <div className="option-group">
          <label>משך הסרטון:</label>
          <select
            value={videoOptions.duration}
            onChange={(e) => setVideoOptions({...videoOptions, duration: e.target.value})}
          >
            <option>1 דקה</option>
            <option>2-3 דקות</option>
            <option>5 דקות</option>
            <option>10 דקות מלא</option>
          </select>
        </div>

        <div className="option-group">
          <label>בחר עמודים לכלול בסרטון:</label>
          <div className="checkbox-group">
            {Object.keys(videoOptions.pages).map(page => {
              const labels = {
                dashboard: 'לוח בקרה',
                families: 'משפחות',
                tutors: 'חונכים',
                volunteers: 'מתנדבים',
                feedback: 'משוב',
                tasks: 'משימות'
              };
              return (
                <div key={page} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={page}
                    checked={videoOptions.pages[page]}
                    onChange={(e) => setVideoOptions({
                      ...videoOptions,
                      pages: { ...videoOptions.pages, [page]: e.target.checked }
                    })}
                  />
                  <label htmlFor={page}>{labels[page]}</label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="option-group">
          <label>סגנון הסרטון:</label>
          <select
            value={videoOptions.style}
            onChange={(e) => setVideoOptions({...videoOptions, style: e.target.value})}
          >
            <option>מקצועי ורשמי</option>
            <option>ידידותי ונגיש</option>
            <option>מפורט וטכני</option>
          </select>
        </div>

        <button 
          className="generate-video-btn" 
          onClick={handleGenerateVideo}
          disabled={generating}
        >
          {generating ? '🎬 מייצר סרטון...' : '🎬 צור סרטון סקירה'}
        </button>

        {generating && (
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}>
                {progress}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="modal active" onClick={() => setShowVideoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowVideoModal(false)}>×</button>
            <h2>🎬 סרטון הסקירה שלך מוכן!</h2>

            <div className="video-preview">
              <div className="video-placeholder">
                <div className="loading">🎬</div>
                <p><strong>סרטון דוגמה:</strong> "סקירת מערכת ChildSmile - חודש דצמבר 2025"</p>
                <p>משך הסרטון: 2:34 דקות | בסגנון: מקצועי ורשמי</p>
                <p>הסרטון יכלול קריינות AI, גרפים אנימציות, נתונים חיים ומוזיקת רקע</p>
              </div>
            </div>

            <div className="video-info">
              <h3>📊 תוכן הסרטון:</h3>
              <ul>
                <li>✅ פתיחה: מבוא למערכת ChildSmile והנתונים החודשיים</li>
                <li>✅ לוח בקרה: מדדים עיקריים וסטטוסים</li>
                <li>✅ משפחות: עליה במשפחות חדשות, ניתוח לפי ערים</li>
                <li>✅ חונכים: חונכים ממתינים, התפלגות לפי קבוצות גיל</li>
                <li>✅ מתנדבים: פעילות מתנדבים, משוב וביקורים</li>
                <li>✅ סיכום: המלצות והזדמנויות לשיפור</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button className="btn btn-download" onClick={handleDownloadVideo}>
                ⬇️ הורד סרטון
              </button>
              <button className="btn btn-email" onClick={() => alert('תכונה תתווסף בקרוב!')}>
                📧 שלח במייל
              </button>
              <button className="btn btn-share" onClick={() => alert('תכונה תתווסף בקרוב!')}>
                🔗 שתף קישור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIVideoGenerator;
