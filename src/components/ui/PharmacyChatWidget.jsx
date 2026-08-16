import React, { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import * as api from '../../services/api';
import { formatTimeVN } from '../../utils/dateUtils';
import './PharmacyChatWidget.css';

const PharmacyChatWidget = ({ isOpen, onClose, user, initialMessage }) => {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [hubConnection, setHubConnection] = useState(null);
  const [assignedPharmacistName, setAssignedPharmacistName] = useState(null);
  const [systemNotice, setSystemNotice] = useState('');
  // Trước đây init() thất bại (mất mạng, server quá tải...) chỉ log console.error mà không báo gì
  // cho khách — khách gõ tin nhắn, bấm Gửi, không có gì xảy ra và cũng không biết vì sao (session
  // vẫn null nên handleSendMessage tự thoát sớm). Giờ hiển thị banner lỗi kèm nút Thử lại.
  const [connectError, setConnectError] = useState(false);
  const [sendError, setSendError] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && initialMessage) {
      setInputText(initialMessage);
    }
  }, [isOpen, initialMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Chỉ phụ thuộc user?.id (không phải cả object `user`) — AuthContext tạo lại object `user`
  // với reference mới mỗi khi xác thực lại /auth/me (vd sau khi access_token hết hạn được tự
  // làm mới ngầm), dù id không đổi. Nếu effect phụ thuộc cả object, mỗi lần đó sẽ đóng kết nối
  // SignalR đang chạy/đang mở rồi mở lại ngay, gây lỗi đua "Failed to start ... before stop() was
  // called" hiện trong console dù tính năng chat vẫn hoạt động được nhờ auto-reconnect.
  const userId = user?.id;

  useEffect(() => {
    if (!isOpen || !userId) return;

    setConnectError(false);

    // sessionIdRef giữ id session mới nhất để dùng trong onreconnected (closure của handler được
    // đăng ký 1 lần lúc mount, không thấy state session cập nhật sau đó nếu đọc trực tiếp).
    const sessionIdRef = { current: null };

    // Xác thực qua httpOnly cookie (access_token) được trình duyệt tự đính kèm khi withCredentials.
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL ?? ''}/hubs/pharmacy-chat`, {
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    connection.on('PharmacistAssigned', (data) => {
      setAssignedPharmacistName(data.pharmacistName);
      setSystemNotice(data.systemNotice);
      scrollToBottom();
    });

    connection.on('SessionClosed', (data) => {
      setSystemNotice(data.systemNotice || 'Phiên tư vấn đã kết thúc.');
      setSession((prev) => prev ? { ...prev, status: 'Closed' } : prev);
      scrollToBottom();
    });

    // SignalR không tự nhớ lại group đã join sau khi reconnect — phải join lại thủ công.
    connection.onreconnected(() => {
      if (sessionIdRef.current) {
        connection.invoke('JoinSession', sessionIdRef.current).catch((err) =>
          console.error('Lỗi tham gia lại phiên chat sau khi kết nối lại:', err)
        );
      }
    });

    // Lấy session thật qua REST rồi mới join đúng group của session đó qua SignalR — tránh trường
    // hợp trước đây REST và Hub.OnConnectedAsync cùng tự tạo session song song, có thể ra 2 session
    // khác nhau khiến tin nhắn gửi đi rơi vào group mà chính mình không ở trong đó.
    const init = async () => {
      try {
        const [sessData] = await Promise.all([
          api.fetchMyPharmacyChatSession(),
          connection.start()
        ]);
        sessionIdRef.current = sessData.id;
        setSession(sessData);
        setMessages(sessData.messages || []);
        if (sessData.assignedPharmacistName) {
          setAssignedPharmacistName(sessData.assignedPharmacistName);
        }
        await connection.invoke('JoinSession', sessData.id);
      } catch (err) {
        console.error('Lỗi khởi tạo phiên chat dược sĩ:', err);
        setConnectError(true);
      }
    };

    init();

    setHubConnection(connection);

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [isOpen, userId, retryTick]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, systemNotice]);

  if (!isOpen) return null;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (!session || !hubConnection) {
      setSendError('Chưa kết nối được tới máy chủ tư vấn. Vui lòng thử lại.');
      return;
    }

    const text = inputText.trim();
    setInputText('');
    setSendError('');

    try {
      if (hubConnection.state !== signalR.HubConnectionState.Connected) {
        console.warn('SignalR connection is not connected. Attempting to reconnect...');
        await hubConnection.start();
      }
      await hubConnection.invoke('SendMessage', session.id, text);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
      setInputText(text);
      setSendError('Gửi tin nhắn thất bại (mất kết nối). Vui lòng thử lại.');
    }
  };

  const handleRetryConnect = () => {
    setConnectError(false);
    setSendError('');
    setRetryTick((t) => t + 1);
  };

  return (
    <div className="pharmacy-chat-widget">
      {/* Header */}
      <div className="pharmacy-chat-header">
        <div className="pharmacist-avatar-wrap">
          <span className="pharmacist-avatar-icon">💊</span>
          <span className="online-indicator"></span>
        </div>
        <div className="pharmacy-chat-title-wrap">
          <h3>Tư vấn Dược sĩ Trực tuyến</h3>
          <p className="pharmacy-chat-sub">
            {assignedPharmacistName
              ? `Dược sĩ phụ trách: ${assignedPharmacistName}`
              : 'Đang kết nối với Dược sĩ trực ban...'}
          </p>
        </div>
        <button className="pharmacy-chat-close-btn" onClick={onClose} title="Đóng">
          ✕
        </button>
      </div>

      {/* Notice bar */}
      {session && session.status === 'Open' && !assignedPharmacistName && (
        <div className="pharmacy-chat-notice">
          ℹ️ Vui lòng đặt câu hỏi, Dược sĩ chuyên môn sẽ tiếp nhận và phản hồi ngay.
        </div>
      )}

      {connectError && (
        <div className="pharmacy-chat-error">
          <span>⚠️ Không thể kết nối tới máy chủ tư vấn. Vui lòng kiểm tra mạng và thử lại.</span>
          <button type="button" onClick={handleRetryConnect}>Thử lại</button>
        </div>
      )}

      {/* Messages Body */}
      <div className="pharmacy-chat-body">
        <div className="chat-intro-card">
          <p>🌿 <strong>Nhà thuốc TMPMS kính chào quý khách!</strong></p>
          <p>Dược sĩ chuyên môn sẵn sàng tư vấn liều dùng, tương tác thuốc và bài thuốc Đông Y phù hợp với bạn.</p>
        </div>

        {messages.map((m, idx) => {
          const isMe = m.senderRole === 'User';
          return (
            <div
              key={m.id || idx}
              className={`pharmacy-msg-row ${isMe ? 'msg-me' : 'msg-pharmacist'}`}
            >
              {!isMe && (
                <div className="msg-sender-role">
                  {m.senderRole === 'Admin' ? 'Quản trị viên' : 'Dược sĩ'}
                </div>
              )}
              <div className="pharmacy-msg-bubble">
                <p>{m.content}</p>
                <span className="msg-time">
                  {m.sentAt ? formatTimeVN(m.sentAt) : ''}
                </span>
              </div>
            </div>
          );
        })}

        {systemNotice && (
          <div className="pharmacy-system-notice">
            <span>{systemNotice}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Input form */}
      {sendError && <p className="pharmacy-chat-send-error">{sendError}</p>}
      <form className="pharmacy-chat-footer" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder={session?.status === 'Closed' ? 'Phiên tư vấn đã kết thúc' : 'Nhập câu hỏi cần tư vấn Dược sĩ...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={session?.status === 'Closed'}
        />
        <button
          type="submit"
          className="pharmacy-send-btn"
          disabled={!inputText.trim() || session?.status === 'Closed'}
        >
          Gửi ➔
        </button>
      </form>
    </div>
  );
};

export default PharmacyChatWidget;
