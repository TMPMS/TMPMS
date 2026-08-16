import React, { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import * as api from '../../services/api';
import { formatTimeVN } from '../../utils/dateUtils';
import './PharmacyChatDashboard.css';

const PharmacyChatDashboard = ({ loggedInUser }) => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [hubConnection, setHubConnection] = useState(null);
  // Trước đây handleSendReply/handleAssign/handleClose nuốt lỗi khi kết nối SignalR chưa sẵn sàng
  // (WebSocket bị chặn/rớt) — Dược sĩ bấm Gửi mà không có gì xảy ra, không rõ vì sao. Giờ báo lỗi
  // kèm nút Thử lại kết nối.
  const [hubError, setHubError] = useState(false);
  const [sendError, setSendError] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const messagesEndRef = useRef(null);
  // Đọc trong closure của handler SignalR đăng ký 1 lần lúc mount — state activeSessionId ở đó
  // sẽ luôn là giá trị cũ (null) nếu đọc trực tiếp, nên phải dùng ref để luôn thấy giá trị mới nhất.
  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load list of sessions
  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.fetchPharmacyChatSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách phiên tư vấn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Xác thực qua httpOnly cookie (access_token) được trình duyệt tự đính kèm khi withCredentials.
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL ?? ''}/hubs/pharmacy-chat`, {
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    connection.on('SessionUpdated', (data) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === data.sessionId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessage: data.lastMessage || updated[idx].lastMessage,
            lastMessageAt: data.lastMessageAt || updated[idx].lastMessageAt,
            status: data.status || updated[idx].status,
            assignedPharmacistId: data.assignedPharmacistId || updated[idx].assignedPharmacistId,
            assignedPharmacistName: data.assignedPharmacistName || updated[idx].assignedPharmacistName
          };
          return updated;
        } else {
          // Refresh list if new session
          loadSessions();
          return prev;
        }
      });
    });

    connection.on('ReceiveMessage', (msg) => {
      // Trước đây so sánh msg.sessionId với prev[0].sessionId để biết tin nhắn có thuộc session
      // đang mở hay không — nhưng nếu session đang mở chưa có tin nhắn nào (mảng messages rỗng),
      // prev[0] không tồn tại nên điều kiện luôn sai, khiến tin nhắn đầu tiên của khách hàng bị rơi
      // mất khỏi khung chat cho tới khi Dược sĩ chuyển tab rồi quay lại (loadMessages chạy lại).
      // Dùng ref theo dõi activeSessionId trực tiếp để không phụ thuộc vào nội dung mảng messages.
      if (msg.sessionId === activeSessionIdRef.current) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }

      if (msg.sessionId !== activeSessionIdRef.current && msg.senderRole === 'User') {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === msg.sessionId ? { ...s, unreadCount: (s.unreadCount || 0) + 1 } : s
          )
        );
      }
    });

    connection.on('PharmacistAssigned', (data) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === data.sessionId
            ? { ...s, status: 'Assigned', assignedPharmacistName: data.pharmacistName }
            : s
        )
      );
    });

    connection.on('SessionClosed', (data) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === data.sessionId ? { ...s, status: 'Closed' } : s))
      );
    });

    connection
      .start()
      .then(() => {
        console.log('SignalR Dashboard connected to PharmacyChatHub');
        setHubError(false);
      })
      .catch((err) => {
        console.error('Dashboard SignalR Error:', err);
        setHubError(true);
      });

    setHubConnection(connection);

    return () => {
      connection.stop();
    };
  }, [retryTick]);

  const handleRetryConnect = () => {
    setHubError(false);
    setSendError('');
    setRetryTick((t) => t + 1);
  };

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) return;

    const loadMessages = async () => {
      try {
        const msgs = await api.fetchPharmacyChatMessages(activeSessionId);
        setMessages(msgs);
        scrollToBottom();
        // Backend đã đánh dấu IsRead khi trả về danh sách tin nhắn này, đồng bộ lại badge chưa đọc.
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, unreadCount: 0 } : s))
        );
      } catch (err) {
        console.error('Lỗi tải lịch sử tin nhắn:', err);
      }
    };

    loadMessages();
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const filteredSessions = sessions.filter((s) => {
    if (filterStatus === 'All') return true;
    return s.status === filterStatus;
  });

  const handleAssign = async () => {
    if (!activeSessionId) return;
    try {
      if (hubConnection) {
        // Kết nối có thể vẫn đang ở trạng thái "Connecting" (start() chưa resolve) ngay sau khi
        // dashboard vừa mở — invoke() ngay lúc đó sẽ ném lỗi dù kết nối không thực sự mất.
        if (hubConnection.state !== signalR.HubConnectionState.Connected) {
          await hubConnection.start();
        }
        await hubConnection.invoke('AssignPharmacist', activeSessionId);
      } else {
        await api.assignPharmacyChatSession(activeSessionId);
        loadSessions();
      }
    } catch (err) {
      console.error('Lỗi tiếp nhận tư vấn:', err);
      setSendError('Tiếp nhận tư vấn thất bại (mất kết nối). Vui lòng thử lại.');
    }
  };

  const handleClose = async () => {
    if (!activeSessionId || !hubConnection) return;
    if (!window.confirm('Bạn có chắc chắn muốn kết thúc phiên tư vấn này?')) return;
    try {
      if (hubConnection.state !== signalR.HubConnectionState.Connected) {
        await hubConnection.start();
      }
      await hubConnection.invoke('CloseSession', activeSessionId);
    } catch (err) {
      console.error('Lỗi đóng phiên tư vấn:', err);
      setSendError('Kết thúc tư vấn thất bại (mất kết nối). Vui lòng thử lại.');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSessionId) return;
    if (!hubConnection) {
      setSendError('Chưa kết nối được tới máy chủ tư vấn. Vui lòng thử lại.');
      return;
    }

    const text = inputText.trim();
    setInputText('');
    setSendError('');

    try {
      if (hubConnection.state !== signalR.HubConnectionState.Connected) {
        await hubConnection.start();
      }
      await hubConnection.invoke('SendMessage', activeSessionId, text);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn trả lời:', err);
      setInputText(text);
      setSendError('Gửi tin nhắn thất bại (mất kết nối). Vui lòng thử lại.');
    }
  };

  return (
    <div className="pharmacy-dashboard-container">
      {/* Sidebar List */}
      <div className="pharmacy-dash-sidebar">
        <div className="dash-sidebar-header">
          <h3>💬 Tư vấn Dược sĩ Trực tuyến</h3>
          <div className="dash-filter-tabs">
            <button
              className={`filter-btn ${filterStatus === 'All' ? 'active' : ''}`}
              onClick={() => setFilterStatus('All')}
            >
              Tất cả ({sessions.length})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'Open' ? 'active' : ''}`}
              onClick={() => setFilterStatus('Open')}
            >
              Đang chờ ({sessions.filter((s) => s.status === 'Open').length})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'Assigned' ? 'active' : ''}`}
              onClick={() => setFilterStatus('Assigned')}
            >
              Đang tư vấn ({sessions.filter((s) => s.status === 'Assigned').length})
            </button>
          </div>
        </div>

        <div className="dash-session-list">
          {filteredSessions.length === 0 ? (
            <div className="empty-sessions">Không có phiên tư vấn nào.</div>
          ) : (
            filteredSessions.map((s) => (
              <div
                key={s.id}
                className={`session-card ${s.id === activeSessionId ? 'active' : ''}`}
                onClick={() => setActiveSessionId(s.id)}
              >
                <div className="session-card-top">
                  <span className="session-user-name">{s.userName}</span>
                  <span className={`status-badge status-${s.status.toLowerCase()}`}>
                    {s.status === 'Open' ? 'Đang chờ' : s.status === 'Assigned' ? 'Đang hỗ trợ' : 'Đã đóng'}
                  </span>
                </div>
                <div className="session-card-msg">{s.lastMessage || 'Chưa có tin nhắn'}</div>
                <div className="session-card-meta">
                  <span>{s.lastMessageAt ? formatTimeVN(s.lastMessageAt) : ''}</span>
                  {s.userPhone && <span className="user-phone">📞 {s.userPhone}</span>}
                  {s.unreadCount > 0 && <span className="unread-badge">{s.unreadCount}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Content */}
      <div className="pharmacy-dash-main">
        {hubError && (
          <div className="dash-hub-error">
            <span>⚠️ Mất kết nối tới máy chủ chat theo thời gian thực. Tin nhắn có thể không gửi/nhận được.</span>
            <button type="button" onClick={handleRetryConnect}>Thử lại</button>
          </div>
        )}
        {activeSession ? (
          <>
            {/* Header */}
            <div className="dash-main-header">
              <div className="dash-user-info">
                <h4>Khách hàng: {activeSession.userName}</h4>
                <div className="dash-user-sub">
                  {activeSession.userPhone && <span>SĐT: {activeSession.userPhone} | </span>}
                  {activeSession.userEmail && <span>Email: {activeSession.userEmail} | </span>}
                  <span>Trạng thái: <strong>{activeSession.status}</strong></span>
                </div>
              </div>
              <div className="dash-actions">
                {activeSession.status === 'Open' && (
                  <button className="dash-btn btn-assign" onClick={handleAssign}>
                    ✋ Tiếp nhận tư vấn
                  </button>
                )}
                {activeSession.status !== 'Closed' && (
                  <button className="dash-btn btn-close" onClick={handleClose}>
                    🔒 Kết thúc tư vấn
                  </button>
                )}
              </div>
            </div>

            {/* Messages Log */}
            <div className="dash-messages-body">
              {messages.map((m, idx) => {
                const isCustomer = m.senderRole === 'User';
                return (
                  <div
                    key={m.id || idx}
                    className={`dash-msg-row ${isCustomer ? 'msg-cust' : 'msg-pharm'}`}
                  >
                    <div className="dash-msg-header">
                      <strong>{m.senderName}</strong> ({m.senderRole === 'User' ? 'Khách hàng' : m.senderRole === 'Admin' ? 'Quản trị' : 'Dược sĩ'})
                    </div>
                    <div className="dash-msg-bubble">
                      <p>{m.content}</p>
                      <span className="dash-msg-time">
                        {m.sentAt ? formatTimeVN(m.sentAt) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            {sendError && <p className="dash-send-error">{sendError}</p>}
            <form className="dash-reply-footer" onSubmit={handleSendReply}>
              <input
                type="text"
                placeholder={
                  activeSession.status === 'Closed'
                    ? 'Phiên tư vấn này đã đóng.'
                    : 'Nhập câu trả lời chuyên môn gửi cho khách hàng...'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={activeSession.status === 'Closed'}
              />
              <button
                type="submit"
                className="dash-send-reply-btn"
                disabled={!inputText.trim() || activeSession.status === 'Closed'}
              >
                Gửi trả lời ➔
              </button>
            </form>
          </>
        ) : (
          <div className="no-active-session">
            <h3>Vui lòng chọn một phiên tư vấn từ danh sách bên trái</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyChatDashboard;
