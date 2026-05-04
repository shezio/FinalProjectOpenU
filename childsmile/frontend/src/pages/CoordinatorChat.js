import React, { useState, useEffect, useRef } from 'react';
import axios from '../axiosConfig';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { showErrorToast } from '../components/toastUtils';
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
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [messageMenuOpen, setMessageMenuOpen] = useState(null); // Track which message menu is open
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // Track which message awaits deletion confirmation
  const [replyingTo, setReplyingTo] = useState(null); // Track which message we're replying to
  const chatEndRef = useRef(null);
  const topSectionRef = useRef(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (messageMenuOpen) {
        setMessageMenuOpen(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [messageMenuOpen]);

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
      // Scroll to top after loading chat
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        { 
          message: messageText.trim(),
          reply_to_id: replyingTo?.id || null
        }
      );

      // Add message to local state immediately
      setChatHistory([...chatHistory, response.data.message]);
      setMessageText('');
      setReplyingTo(null);

      // Reload conversations to update unread count
      loadConversations();
      toast.success(t('Message sent successfully'));
    } catch (error) {
      console.error('Error sending message:', error);
      showErrorToast(t, 'Failed to send message', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await axios.delete(`/api/coordinator-chat/message/${messageId}/`);
      // Remove from local state immediately
      setChatHistory(chatHistory.filter(msg => msg.id !== messageId));
      setDeleteConfirmId(null);
      setMessageMenuOpen(null);
      // Refresh to get latest state
      loadConversations();
    } catch (error) {
      console.error('Error deleting message:', error);
      showErrorToast(t, 'Failed to delete message', error);
    }
  };

  const sendBroadcastSelected = async () => {
    if (!broadcastMessage.trim() || selectedCoordinatorIds.size === 0) {
      showErrorToast(t, 'Please select at least one coordinator and enter a message', '');
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
      const failedText = failed.length > 0 ? ` (${failed.length} ${t('failed')})` : '';
      toast.success(t('message_sent_count', { count: sent.length, failed: failedText }));

      setBroadcastMessage('');
      setSelectedCoordinatorIds(new Set());
      setCoordinatorSearch('');
      loadConversations();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      showErrorToast(t, 'Failed to send messages', error);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const sendBroadcastAll = async () => {
    if (!broadcastMessage.trim()) {
      showErrorToast(t, 'Please enter a message', '');
      return;
    }

    setSendingBroadcast(true);
    try {
      const response = await axios.post(
        '/api/coordinator-chat/send-all/',
        { message: broadcastMessage.trim() }
      );

      const { sent, failed } = response.data.results;
      const failedText = failed.length > 0 ? ` (${failed.length} ${t('failed')})` : '';
      toast.success(t('message_sent_count', { count: sent.length, failed: failedText }));

      setBroadcastMessage('');
      setSelectedCoordinatorIds(new Set());
      setCoordinatorSearch('');
      loadConversations();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      showErrorToast(t, 'Failed to send messages', error);
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
        {/* TOP SECTION: Coordinator Search for Broadcasting */}
        <div className="coordinator-broadcast-section" ref={topSectionRef}>
          <div className="broadcast-header">
            <h3>{t('broadcast_mode')}</h3>
            <span className="selection-count">
              {selectedCoordinatorIds.size > 0 ? `${selectedCoordinatorIds.size} ${t('selected')}` : ''}
            </span>
          </div>

          {/* Selected chips */}
          {selectedCoordinatorIds.size > 0 && (
            <div className="coordinator-chips">
              {Array.from(selectedCoordinatorIds)
                .map(id => conversations.find(c => c.coordinator_id === id))
                .filter(Boolean)
                .map(coord => (
                  <span key={coord.coordinator_id} className="coordinator-chip">
                    {coord.coordinator_name}
                    <button
                      type="button"
                      className="chip-remove-btn"
                      onClick={() => {
                        const newSet = new Set(selectedCoordinatorIds);
                        newSet.delete(coord.coordinator_id);
                        setSelectedCoordinatorIds(newSet);
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>
          )}

          {/* Coordinator Search */}
          <div className="coordinator-search-wrap">
            <input
              type="text"
              className="coordinator-search-input"
              placeholder={t('search_coordinator')}
              value={coordinatorSearch}
              onChange={(e) => setCoordinatorSearch(e.target.value)}
            />
            {coordinatorSearch.trim() && (() => {
              const q = coordinatorSearch.trim().toLowerCase();
              const results = conversations
                .filter(conv =>
                  conv.coordinator_name.toLowerCase().includes(q) ||
                  (conv.coordinator_phone && conv.coordinator_phone.toLowerCase().includes(q))
                )
                .slice(0, 8);
              return results.length > 0 ? (
                <div className="coordinator-dropdown">
                  {results.map(conv => {
                    const already = selectedCoordinatorIds.has(conv.coordinator_id);
                    return (
                      <div
                        key={conv.coordinator_id}
                        className={`coordinator-option${already ? ' already-added' : ''}`}
                        onClick={() => {
                          if (!already) {
                            setSelectedCoordinatorIds(prev => new Set([...prev, conv.coordinator_id]));
                          }
                          setCoordinatorSearch('');
                        }}
                      >
                        <span>{conv.coordinator_name}</span>
                        {conv.coordinator_phone && <span className="option-phone">{conv.coordinator_phone}</span>}
                        {already && <span className="option-added-badge">{t('added')}</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="coordinator-dropdown">
                  <div className="coordinator-option" style={{ color: '#aaa', cursor: 'default' }}>
                    {t('no_results')}
                  </div>
                </div>
              );
            })()}
          </div>
          {selectedCoordinatorIds.size === 0 && (
            <p className="coordinators-empty">{t('search_and_add_coordinators')}</p>
          )}

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
                  </div>
                </div>

                <div className="messages-container">
                  {chatHistory.length === 0 ? (
                    <div className="no-messages">{t('no_messages_yet')}</div>
                  ) : (
                    chatHistory.map((msg) => (
                      <div
                        key={msg.id}
                        className={`message ${msg.sender_type === 'admin' ? 'admin-message' : 'coordinator-message'}`}
                      >
                        <div className="message-content">
                          <div className="message-menu-wrapper">
                            <button
                              className="message-menu-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMessageMenuOpen(messageMenuOpen === msg.id ? null : msg.id);
                              }}
                              title={t('message_options')}
                            >
                              &gt;
                            </button>
                            {messageMenuOpen === msg.id && (
                              <div className="message-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                                <button
                                  className="menu-item reply-option"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReplyingTo(msg);
                                    setMessageMenuOpen(null);
                                  }}
                                >
                                  {t('reply')}
                                </button>
                                <button
                                  className="menu-item delete-option"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (deleteConfirmId === msg.id) {
                                      // Confirmed - delete
                                      deleteMessage(msg.id);
                                    } else {
                                      // First click - show confirmation
                                      setDeleteConfirmId(msg.id);
                                    }
                                  }}
                                >
                                  {deleteConfirmId === msg.id ? t('confirm_delete') : t('delete')}
                                </button>
                              </div>
                            )}
                          </div>
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
                  {replyingTo && (
                    <div className="reply-preview">
                      <div className="reply-preview-content">
                        <strong>📍 {t('reply_to')}: {replyingTo.sender_type === 'admin' ? '👨‍💼 ליאם' : '👤 רכז'}</strong>
                        <p>{replyingTo.message_text.substring(0, 60)}{replyingTo.message_text.length > 60 ? '...' : ''}</p>
                      </div>
                      <button 
                        className="reply-close-btn"
                        onClick={() => setReplyingTo(null)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
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
