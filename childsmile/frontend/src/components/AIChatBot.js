import React, { useState, useRef, useEffect } from 'react';
import axios from '../axiosConfig';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';
import './AIChatBot.css';

const AIChatBot = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'שלום! אני עוזר AI של מערכת חיוך של ילד. אני כאן לעזור לך עם נתוני הדשבורד, יצירת סרטונים וכל שאלה אחרת. איך אוכל לעזור?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [videoSettings, setVideoSettings] = useState({
    timeframe: 'חודש אחרון',
    duration: '2-3 דקות',
    pages: ['לוח בקרה', 'משפחות', 'חונכים', 'מתנדבים'],
    style: 'מקצועי ורשמי'
  });
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleGenerateVideo = async () => {
    try {
      // Show loading message immediately BEFORE making the request
      setMessages(prev => [...prev, {
        type: 'bot',
        text: `🎬 הסרטון שלך מיוצר כעת... אנא המתן (זה עשוי לקחת 30-60 שניות)`,
        showSpinner: true
      }]);
      
      const response = await axios.post('/api/dashboard/generate-video/', videoSettings);
      
      if (response.data.success) {
        const videoId = response.data.video_id;

        // Poll for video completion every 5 seconds
        const checkVideoInterval = setInterval(async () => {
          try {
            const statusResponse = await axios.get(`/api/dashboard/video-status/${videoId}/`);
            
            if (statusResponse.data.status === 'completed') {
              // Video is ready!
              clearInterval(checkVideoInterval);
              
              // Remove the loading message and add ready message
              setMessages(prev => {
                const filtered = prev.filter(msg => !msg.showSpinner);
                return [...filtered, {
                  type: 'bot',
                  text: `✅ הסרטון שלך מוכן! 🎉<br><br>
                         <strong>כותרת:</strong> ${response.data.title}<br>
                         <strong>משך:</strong> ${response.data.duration_text}<br>
                         <strong>סגנון:</strong> ${response.data.style}<br>
                         <strong>גודל:</strong> ${(statusResponse.data.file_size / (1024 * 1024)).toFixed(2)} MB<br><br>
                         <button class="download-video-btn" data-video-id="${videoId}">⬇️ הורד סרטון MP4</button>`
                }];
              });
              
              // Add click handler for download button
              setTimeout(() => {
                const downloadBtn = document.querySelector(`[data-video-id="${videoId}"]`);
                if (downloadBtn && !downloadBtn.dataset.listenerAdded) {
                  downloadBtn.dataset.listenerAdded = 'true';
                  downloadBtn.addEventListener('click', async () => {
                    try {
                      const fileResponse = await axios.get(
                        `/api/dashboard/download-video/${videoId}/`,
                        { responseType: 'blob' }
                      );
                      
                      // Create proper MP4 blob
                      const blob = new Blob([fileResponse.data], { type: 'video/mp4' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `ChildSmile_Marketing_${videoId.slice(0, 8)}.mp4`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                      
                      toast.success('הסרטון הורד בהצלחה!');
                    } catch (err) {
                      console.error('Error downloading video:', err);
                      toast.error('שגיאה בהורדת הסרטון');
                    }
                  });
                }
              }, 100);
              
              toast.success('הסרטון מוכן!');
            }
          } catch (err) {
            console.error('Error checking video status:', err);
            // Don't show error repeatedly - just continue polling
          }
        }, 5000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkVideoInterval);
          setMessages(prev => [...prev, {
            type: 'bot',
            text: '⏱️ תמה הזמן לייצור הסרטון. אנא נסה שוב.'
          }]);
        }, 5 * 60 * 1000);
      }
    } catch (err) {
      console.error('Error generating video:', err);
      toast.error('שגיאה ביצירת הסרטון');
      setMessages(prev => [...prev, {
        type: 'bot',
        text: 'מצטער, אירעה שגיאה ביצירת הסרטון. אנא נסה שוב.'
      }]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage.trim().toLowerCase();
    
    // Add user message
    const userMessage = { type: 'user', text: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Handle predefined responses
    setTimeout(() => {
      let botResponse = '';
      
      // Check if user wants to generate video
      if (userMsg.includes('וידאו') || userMsg.includes('סרטון')) {
        botResponse = `מצוין! אני רואה שאתה רוצה ליצור סרטון סקירה.<br><br>
                      <strong>הגדרות נוכחיות:</strong><br>
                      • טווח זמן: ${videoSettings.timeframe}<br>
                      • משך: ${videoSettings.duration}<br>
                      • עמודים: ${videoSettings.pages.join(', ')}<br>
                      • סגנון: ${videoSettings.style}<br><br>
                      האם תרצה לשנות משהו לפני שאתחיל לייצר את הסרטון?`;
        setAwaitingConfirmation(true);
      }
      // User confirms to generate
      else if (awaitingConfirmation && (userMsg.includes('כן') || userMsg.includes('התחל') || userMsg.includes('בסדר') || userMsg.includes('אישור') || userMsg.includes('לא'))) {
        if (userMsg.includes('לא')) {
          botResponse = 'מעולה! אז ממשיכים עם ההגדרות הנוכחיות. מייצר את הסרטון עכשיו... 🎬';
        } else {
          botResponse = 'נהדר! מתחיל לייצר את הסרטון עכשיו... 🎬';
        }
        setAwaitingConfirmation(false);
        setMessages(prev => [...prev, { type: 'bot', text: botResponse }]);
        setIsTyping(false);
        handleGenerateVideo();
        return;
      }
      // User wants to change settings  
      else if (awaitingConfirmation && (userMsg.includes('שנה') || userMsg.includes('עדכן'))) {
        botResponse = `בטח! מה תרצה לשנות?<br><br>
                      אפשר לשנות:<br>
                      • <strong>טווח זמן</strong>: שבוע אחרון / חודש אחרון / שנה אחרונה<br>
                      • <strong>משך</strong>: 1-2 דקות / 2-3 דקות / 3-5 דקות<br>
                      • <strong>סגנון</strong>: מקצועי / ידידותי / אנרגטי<br><br>
                      פשוט כתוב מה תרצה לשנות, למשל: "שנה למשך 3-5 דקות"`;
      }
      // Change duration
      else if (userMsg.includes('משך') || userMsg.includes('דקות')) {
        if (userMsg.includes('1-2')) {
          videoSettings.duration = '1-2 דקות';
          botResponse = 'עודכן! משך הסרטון: 1-2 דקות. מה עוד תרצה לשנות?';
        } else if (userMsg.includes('2-3')) {
          videoSettings.duration = '2-3 דקות';
          botResponse = 'עודכן! משך הסרטון: 2-3 דקות. מה עוד תרצה לשנות?';
        } else if (userMsg.includes('3-5')) {
          videoSettings.duration = '3-5 דקות';
          botResponse = 'עודכן! משך הסרטון: 3-5 דקות. מה עוד תרצה לשנות?';
        }
        setAwaitingConfirmation(true);
      }
      // Change timeframe
      else if (userMsg.includes('טווח') || userMsg.includes('זמן')) {
        if (userMsg.includes('שבוע')) {
          videoSettings.timeframe = 'שבוע אחרון';
          botResponse = 'עודכן! טווח זמן: שבוע אחרון. מה עוד תרצה לשנות?';
        } else if (userMsg.includes('חודש')) {
          videoSettings.timeframe = 'חודש אחרון';
          botResponse = 'עודכן! טווח זמן: חודש אחרון. מה עוד תרצה לשנות?';
        } else if (userMsg.includes('שנה')) {
          videoSettings.timeframe = 'שנה אחרונה';
          botResponse = 'עודכן! טווח זמן: שנה אחרונה. מה עוד תרצה לשנות?';
        }
        setAwaitingConfirmation(true);
      }
      // Ask about data
      else if (userMsg.includes('משפחות') || userMsg.includes('נתונים') || userMsg.includes('סטטיסטיקה')) {
        // Call backend to get real data
        axios.post('/api/dashboard/ai-chat/', { message: inputMessage })
          .then(response => {
            setMessages(prev => [...prev, {
              type: 'bot',
              text: response.data.response
            }]);
            setIsTyping(false);
          })
          .catch(err => {
            console.error('Error:', err);
            setMessages(prev => [...prev, {
              type: 'bot',
              text: 'מצטער, אירעה שגיאה. אנא נסה שוב.'
            }]);
            setIsTyping(false);
          });
        return;
      }
      // Default response
      else {
        botResponse = `אני כאן לעזור! אפשר לשאול אותי על:<br>
                      • <strong>נתוני המערכת</strong> - "תראה לי נתונים על משפחות"<br>
                      • <strong>יצירת סרטון</strong> - "צור לי סרטון סקירה"<br>
                      • <strong>סטטיסטיקות</strong> - "כמה משפחות יש במערכת?"<br><br>
                      מה תרצה לעשות? 😊`;
      }
      
      setMessages(prev => [...prev, { type: 'bot', text: botResponse }]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button 
        className="ai-chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={t('ai_assistant')}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-header-title">
              <span className="ai-chat-icon">🤖</span>
              <h3>{t('ai_assistant')}</h3>
            </div>
            <button 
              className="ai-chat-close"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`ai-chat-message ${msg.type}`}
              >
                <div className="ai-chat-message-bubble">
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.text) }} />
                  {msg.showSpinner && <div className="loading-spinner"></div>}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="ai-chat-message bot">
                <div className="ai-chat-message-bubble">
                  <div className="ai-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input-container">
            <textarea
              className="ai-chat-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('type_message')}
              rows="2"
            />
            <button 
              className="ai-chat-send"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
            >
              📤
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatBot;
