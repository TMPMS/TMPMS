import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { askAiChatbot } from '../../services/api';
import './AIChatbot.css';

const MOCK_PRODUCTS = {
  khop: { id: 601, name: 'TPBVSK Khương Thảo Đan Gold', price: 170000, image: 'https://tmp.vn/storage/media/c03d3ce6-2187-43ca-a3ef-b32c1c3fca93.webp', unit: 'Hộp' },
  daday: { id: 611, name: 'TPBVSK Bình Vị Thái Minh', price: 165000, image: 'https://tmp.vn/storage/media/caeb95d2-f674-4b5f-8f83-d5d14dfbb500.webp', unit: 'Hộp' },
  sam: { id: 620, name: 'Trà sâm 1700 Thái Minh', price: 180000, image: 'https://tmp.vn/storage/media/ddfa6c2b-ea32-4467-b864-4e789bc44d03.webp', unit: 'Hộp' },
  taobon: { id: 631, name: 'Cốm Nhuận Tràng Gokids Thái Minh', price: 255000, image: 'https://tmp.vn/storage/media/dd0f6dbe-907c-4e58-9352-82bffe5f842d.webp', unit: 'Hộp' }
};

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý Dược sĩ AI của Long Châu. Tôi có thể tư vấn sức khỏe và khuyên dùng sản phẩm Thái Minh/Đông Y phù hợp cho bạn. Bạn đang có triệu chứng gì thế?',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const { addToCart } = useCart();
  const chatEndRef = useRef(null);
 
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputVal,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputVal;
    setInputVal('');
    setIsTyping(true);

    try {
      const data = await askAiChatbot(currentInput);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.text,
        product: data.product,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Có lỗi xảy ra khi kết nối tới Trợ lý Dược sĩ AI. Xin vui lòng thử lại sau!',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    // Add custom system msg indicating item added
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'system',
      text: `Đã thêm thành công "${product.name}" vào giỏ hàng của bạn!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  return (
    <div className="ai-chatbot-wrapper">
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button className="ai-chat-bubble" onClick={() => setIsOpen(true)}>
          <MessageSquare size={24} />
          <span className="pulse-dot" />
          <span className="tooltip-text">Tư vấn AI Dược sĩ</span>
        </button>
      )}

      {/* Chat Drawer Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-bot-avatar">
              <Bot size={20} />
            </div>
            <div className="ai-header-info">
              <h4>Dược Sĩ Trợ Lý AI</h4>
              <span className="status-online">● Hoạt động 24/7</span>
            </div>
            <button className="ai-close-window-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages List */}
          <div className="ai-chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`ai-message-row ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <div className="msg-avatar">
                    <Bot size={14} />
                  </div>
                )}
                <div className="msg-bubble-wrap">
                  <div className="msg-bubble">
                    <p>{msg.text}</p>
                    
                    {/* Embedded Product Suggestion */}
                    {msg.product && (
                      <div className="msg-product-card">
                        <img src={msg.product.image} alt={msg.product.name} />
                        <div className="msg-prod-details">
                          <h5>{msg.product.name}</h5>
                          <span className="price">{msg.product.price.toLocaleString('vi-VN')}đ</span>
                          <button onClick={() => handleAddToCart(msg.product)}>
                            <ShoppingCart size={12} />
                            <span>Thêm vào giỏ</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="msg-time">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            
            {/* Bot Typing Indicator */}
            {isTyping && (
              <div className="ai-message-row bot">
                <div className="msg-avatar">
                  <Bot size={14} />
                </div>
                <div className="msg-bubble-wrap">
                  <div className="msg-bubble typing">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Footer Form */}
          <form onSubmit={handleSend} className="ai-chat-input-form">
            <input 
              type="text" 
              placeholder="Nhập câu hỏi của bạn (vd: bị đau khớp)..." 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <button type="submit" className="ai-send-btn">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChatbot;
