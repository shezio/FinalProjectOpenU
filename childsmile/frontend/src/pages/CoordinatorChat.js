import React, { useState, useEffect, useRef } from 'react';
import axios from '../axiosConfig';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/CoordinatorChat.css';

const CoordinatorChat = () => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedCoordinatorIds, setSelectedCoordinatorIds] = useState(new Set());
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);

  // Helper function to get background class based on coordinator role
  const getBackgroundClass = (coordinator) => {
    if (!coordinator || !coordinator.role) return '';
    
    const role = coordinator.role.toLowerCase();
    if (role.includes('tutored')) {
      return 'bg-tutored-coordinator';
    } else if (role.includes('families')) {
      return 'bg-families-coordinator';
    } else if (role.includes('volunteer')) {
      return 'bg-volunteer-coordinator';
    }
    return '';
  };

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when chat updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadConversations = async () => {
    try {
      const response = await axios.get('/api/coordinator-chat/conversations/');
      console.log('API Response:', response.data);
      setConversations(response.data.conversations);
      setLoading(false);
      if (response.data.conversations.length === 0) {
        console.warn('No coordinators returned from API');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      if (error.response?.status === 503) {
        // Feature disabled
      }
      setLoading(false);
    }
  };

  const loadChatHistory = async (coordinatorId) => {
    try {
      console.log('Loading chat history for coordinator ID:', coordinatorId);
      const response = await axios.get(`/api/coordinator-chat/${coordinatorId}/`);
      console.log('Chat history response:', response.data);
      console.log('Coordinator object:', response.data.coordinator);
      console.log('Messages:', response.data.messages);
      setChatHistory(response.data.messages);
      setSelectedCoordinator(response.data.coordinator);
      setMessageText('');
    } catch (error) {
      console.error('Error loading chat history:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedCoordinator) return;

    setSendingMessage(true);
    try {
      const response = await axios.post(
        `/api/coordinator-chat/${selectedCoordinator.id}/send/`,
        { message: messageText.trim() }
      );

      // Add message to local state immediately
      setChatHistory([...chatHistory, response.data.message]);
      setMessageText('');

      // Reload conversations to update unread count
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleCoordinatorSelection = (coordinatorId) => {
    const newSelected = new Set(selectedCoordinatorIds);
    if (newSelected.has(coordinatorId)) {
      newSelected.delete(coordinatorId);
    } else {
      newSelected.add(coordinatorId);
    }
    setSelectedCoordinatorIds(newSelected);
  };

  const sendBroadcastSelected = async () => {
    if (!broadcastMessage.trim() || selectedCoordinatorIds.size === 0) {
      alert('Please select at least one coordinator and enter a message');
      return;
    }

    setSendingBroadcast(true);
    try {
      const response = await axios.post(
        '/api/coordinator-chat/send-many/',
        {
          message: broadcastMessage.trim(),
          coordinator_ids: Array.from(selectedCoordinatorIds)
        }
      );

      const { sent, failed } = response.data.results;
      alert(
        `Message sent to ${sent.length} coordinators. ` +
        (failed.length > 0 ? `${failed.length} failed.` : '')
      );

      setBroadcastMessage('');
      setSelectedCoordinatorIds(new Set());
      loadConversations();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert(error.response?.data?.error || 'Failed to send messages');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const sendBroadcastAll = async () => {
    if (!broadcastMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    if (!window.confirm('Send this message to ALL coordinators?')) return;

    setSendingBroadcast(true);
    try {
      const response = await axios.post(
        '/api/coordinator-chat/send-all/',
        { message: broadcastMessage.trim() }
      );

      const { sent, failed } = response.data.results;
      alert(
        `Message sent to ${sent.length} coordinators. ` +
        (failed.length > 0 ? `${failed.length} failed.` : '')
      );

      setBroadcastMessage('');
      setSelectedCoordinatorIds(new Set());
      loadConversations();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert(error.response?.data?.error || 'Failed to send messages');
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <InnerPageHeader title={t('Team Updates')} />
        <div className="coordinator-chat-page">
          <div className="coordinator-loading">
            {t('loading')}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <InnerPageHeader title={t('Team Updates')} />
      <div className="coordinator-chat-page">
        {/* TOP SECTION: Coordinator Selector for Broadcasting */}
        <div className="coordinator-broadcast-section">
          <div className="broadcast-header">
            <h3>{t('broadcast_mode')}</h3>
            <span className="selection-count">
              {selectedCoordinatorIds.size > 0 ? `${selectedCoordinatorIds.size} ${t('selected')}` : ''}
            </span>
          </div>

          <div className="coordinators-selector">
            {conversations.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                {t('no_coordinators') || 'No coordinators found'}
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.coordinator_id}
                  className={`coordinator-selection-item ${selectedCoordinatorIds.has(conv.coordinator_id) ? 'selected' : ''}`}
                  onClick={() => toggleCoordinatorSelection(conv.coordinator_id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCoordinatorIds.has(conv.coordinator_id)}
                    onChange={() => toggleCoordinatorSelection(conv.coordinator_id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="coordinator-name">{conv.coordinator_name}</span>
                </div>
              ))
            )}
          </div>

          <div className="broadcast-message-section">
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder={t('message_placeholder')}
              className="broadcast-message-input"
            />
            <div className="broadcast-buttons">
              <button
                onClick={sendBroadcastAll}
                disabled={sendingBroadcast || !broadcastMessage.trim()}
                className="btn-broadcast-all"
              >
                {sendingBroadcast ? t('sending_ellipsis') : t('send_all')}
              </button>
              <button
                onClick={sendBroadcastSelected}
                disabled={selectedCoordinatorIds.size === 0 || sendingBroadcast || !broadcastMessage.trim()}
                className="btn-broadcast-selected"
              >
                {t('send')} {selectedCoordinatorIds.size > 0 ? selectedCoordinatorIds.size : ''} {sendingBroadcast ? t('sending_ellipsis') : ''}
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Chat History with Selected Coordinator */}
        <div className="chat-main">
          {/* Left Column: Conversations List */}
          <div className="conversations-list">
            <h3>{t('conversations')} ({conversations.length})</h3>
            <div className="conversations-scroll">
              {conversations.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  {t('no_coordinators') || 'No coordinators found'}
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.coordinator_id}
                    className={`conversation-item ${selectedCoordinator?.id === conv.coordinator_id ? 'active' : ''} ${conv.unread_count > 0 ? 'unread' : ''}`}
                    onClick={() => loadChatHistory(conv.coordinator_id)}
                  >
                    <div className="conversation-header">
                      <div className="manager-name">{conv.coordinator_name}</div>
                      {conv.unread_count > 0 && (
                        <span className="unread-badge">{conv.unread_count}</span>
                      )}
                    </div>
                    {conv.last_message && (
                      <div className="last-message">
                        {conv.last_message.sender_type === 'coordinator' ? '👤' : '👨‍💼'}{' '}
                        {conv.last_message.message_text.substring(0, 40)}...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div className={`chat-window ${getBackgroundClass(selectedCoordinator)}`}>
            {selectedCoordinator ? (
              <>
                <div className="chat-header">
                  <h3>{selectedCoordinator.name}</h3>
                  <div className="coordinator-info">
                    <small>📱 {selectedCoordinator.phone || 'N/A'}</small>
                    <small>📧 {selectedCoordinator.email || 'N/A'}</small>
                  </div>
                </div>

                <div className="messages-container">
                  {chatHistory.length === 0 ? (
                    <div className="no-messages">{t('no_messages_yet') || 'אין הודעות עדיין בשיחה זו'}</div>
                  ) : (
                    chatHistory.map((msg) => (
                      <div
                        key={msg.id}
                        className={`message ${msg.sender_type === 'admin' ? 'admin-message' : 'coordinator-message'}`}
                      >
                        <div className="message-content">
                          <strong>{msg.sender_type === 'admin' ? '👨‍💼 ליאם' : '👤 רכז'}</strong>
                          <p>{msg.message_text}</p>
                          <small>{new Date(msg.created_at).toLocaleString('he-IL')}</small>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="message-input-container">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={t('type_message')}
                    className="message-input"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                    className="send-button"
                  >
                    {sendingMessage ? t('sending_ellipsis') : t('send')}
                  </button>
                </div>
              </>
            ) : (
              <div className="no-selection">
                {t('select_coordinator')}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CoordinatorChat;
