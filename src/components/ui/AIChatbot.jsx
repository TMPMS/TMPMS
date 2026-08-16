import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, ShoppingCart, ArrowRight, Mic, ImagePlus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { askAiChatbot, formatImageUrl } from '../../services/api';
import './AIChatbot.css';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // khớp giới hạn 5MB phía BE (MaxImageBase64Length)

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý Dược sĩ AI của TMPMS. Tôi có thể tư vấn sức khỏe Đông y, giúp bạn đặt lịch hẹn khám bệnh hoặc kết nối với Dược sĩ thật. Bạn cần tôi hỗ trợ gì?',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [attachedImage, setAttachedImage] = useState(null); // { previewUrl, base64, mimeType }
  const [imageError, setImageError] = useState('');

  const { addToCart, cartItems, removeFromCart, updateQuantity } = useCart();
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Dừng mic khi đóng cửa sổ chat, tránh mic vẫn nghe ngầm sau khi khách đã đóng.
  useEffect(() => {
    if (!isOpen && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isOpen]);

  // Cho phép dán ảnh (Ctrl+V) trực tiếp vào cửa sổ chat — chỉ lắng nghe khi chat đang mở,
  // tránh nuốt mất thao tác dán ảnh của khách ở chỗ khác trên trang (vd modal "Tìm bằng hình ảnh").
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) setImageFromFile(file);
          e.preventDefault();
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const setImageFromFile = async (file) => {
    setImageError('');
    if (!file.type.startsWith('image/')) {
      setImageError('Vui lòng chọn một tệp hình ảnh.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Ảnh quá lớn, vui lòng chọn ảnh dưới 5MB.');
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      setAttachedImage({ previewUrl: URL.createObjectURL(file), base64, mimeType: file.type || 'image/jpeg' });
    } catch {
      setImageError('Không thể đọc tệp ảnh, vui lòng thử lại.');
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setImageFromFile(file);
    e.target.value = ''; // cho phép chọn lại đúng file đó lần nữa nếu khách gỡ rồi đính kèm lại
  };

  const removeAttachedImage = () => {
    if (attachedImage?.previewUrl) URL.revokeObjectURL(attachedImage.previewUrl);
    setAttachedImage(null);
    setImageError('');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() && !attachedImage) return;
    const text = inputVal;
    const image = attachedImage;
    setInputVal('');
    setAttachedImage(null);
    await sendMessage(text, image);
  };

  // Tách riêng khỏi handleSend để voice input (kết quả nhận dạng giọng nói) có thể gửi thẳng đi
  // ngay khi có transcript, không cần đợi state inputVal cập nhật xong rồi giả lập bấm gửi.
  const sendMessage = async (text, image = null) => {
    if (!text.trim() && !image) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      image: image?.previewUrl || null,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = text;
    setIsTyping(true);

    try {
      // Build conversation history (last 8 messages, user+bot only, exclude system)
      const historySnapshot = [...messages, userMsg]
        .filter(m => m.sender === 'user' || m.sender === 'bot')
        .slice(-8)
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text }));
      // Remove the last entry (current user message — already in `text` field)
      const history = historySnapshot.slice(0, -1);

      const data = await askAiChatbot(currentInput, history, image ? { base64: image.base64, mimeType: image.mimeType } : null);
      setIsTyping(false);

      let botText = data.text;

      // ORDER_MEDICINE: server đã xác định đúng 1 sản phẩm + số lượng — tự thêm vào giỏ ngay
      // (giống hành vi "thêm vào giỏ" khách vẫn bấm tay), không cần khách bấm thêm 1 lần nữa.
      if (data.intent === 'ORDER_MEDICINE' && data.product) {
        const requestedQty = data.quantity || 1;
        // isCorrection: khách đang sửa lại số lượng đã đặt trước đó (vd "thôi 1 chai thôi" sau khi
        // vừa đặt 2 chai) — phải GHI ĐÈ số lượng trong giỏ, không cộng dồn thêm như addToCart.
        const existingItem = cartItems.find(i => i.id === data.product.id);
        if (data.isCorrection && existingItem) {
          await updateQuantity(data.product.id, requestedQty);
          botText = `Đã cập nhật "${data.product.name}" trong giỏ hàng thành ${requestedQty} sản phẩm.`;
        } else {
          await addToCart(data.product, requestedQty);
        }
      } else if (data.intent === 'REMOVE_FROM_CART' && data.product) {
        // BE không biết giỏ hàng khách vãng lai (chỉ có ở localStorage phía FE) nên không thể tự
        // xác nhận đã gỡ đúng số lượng — FE phải tự đối chiếu cartItems thực tế rồi mới thực hiện,
        // và luôn ghi đè lại lời thoại theo đúng những gì thực sự xảy ra (tránh AI "ảo tưởng" đã gỡ
        // trong khi thực chất không có gì trong giỏ, hoặc số lượng gỡ không khớp).
        const existing = cartItems.find(i => i.id === data.product.id);
        if (!existing) {
          botText = `Giỏ hàng của bạn hiện không có "${data.product.name}" nên không có gì để gỡ cả.`;
        } else if (data.removeAll || !data.quantity || data.quantity >= existing.quantity) {
          await removeFromCart(data.product.id);
          botText = `Đã gỡ toàn bộ "${data.product.name}" (${existing.quantity} sản phẩm) khỏi giỏ hàng.`;
        } else {
          const remaining = existing.quantity - data.quantity;
          await updateQuantity(data.product.id, remaining);
          botText = `Đã gỡ ${data.quantity} "${data.product.name}" khỏi giỏ hàng, còn lại ${remaining}.`;
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        intent: data.intent,
        text: botText,
        product: (data.intent === 'ORDER_MEDICINE' || data.intent === 'REMOVE_FROM_CART') ? null : data.product, // đã tự xử lý giỏ hàng — khỏi hiện lại nút "Thêm vào giỏ"
        // Giữ lại id sản phẩm vừa đặt (dù đã ẩn `product` ở trên) để khi khách bấm nút "Thanh toán",
        // CartDrawer biết chỉ nên tick chọn đúng sản phẩm này thay vì cả giỏ hàng.
        orderedProductId: data.intent === 'ORDER_MEDICINE' ? data.product?.id ?? null : null,
        appointment: data.appointment,
        suggestedAction: data.suggestedAction,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      console.error('Lỗi kết nối AI Chatbot:', err);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Có lỗi xảy ra khi kết nối tới Trợ lý Dược sĩ AI. Vui lòng thử lại sau!',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const handleActionClick = (action, message) => {
    if (!action || !action.type || action.type === 'none') return;

    if (action.type === 'navigate_to_booking') {
      // Switch main view to SelfDiagnosis appointment booking page
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: 'diagnose' }));
    } else if (action.type === 'open_pharmacist_chat') {
      // Close AI Chatbot drawer and open Live Pharmacy Chat Widget
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('open-pharmacy-chat-widget'));
    } else if (action.type === 'navigate_to_history') {
      // Navigate to patient portal / diagnosis & prescription history
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: 'history' }));
    } else if (action.type === 'add_to_cart' || action.type === 'add_to_cart_checkout' || action.type === 'remove_from_cart') {
      // Giỏ hàng đã được cập nhật ngay khi nhận phản hồi (xem sendMessage) — nút này chỉ mở giỏ.
      // Kèm theo productId để CartDrawer chỉ tick chọn ĐÚNG sản phẩm khách vừa yêu cầu mua khi
      // thanh toán ngay, tránh gộp nhầm cả những món khác đã có sẵn trong giỏ từ trước.
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('open-cart-drawer', {
        detail: {
          checkout: action.type === 'add_to_cart_checkout',
          checkoutOnlyProductId: action.type === 'add_to_cart_checkout' ? message?.orderedProductId : null
        }
      }));
    } else if (action.type === 'navigate_to_booking_checkout' && message?.appointment) {
      // Khung giờ đã được giữ chỗ ở server (xem handleSend) — điều hướng thẳng tới bước xác nhận +
      // đặt cọc (bước 3) của trang đặt lịch, mang theo token giữ chỗ để không phải chọn giờ lại.
      sessionStorage.setItem('pp_ai_hold', JSON.stringify(message.appointment));
      sessionStorage.setItem('pp_open_booking', '1');
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: 'patient-portal' }));
    } else if (action.type === 'require_login') {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'login' }));
    }
  };

  // Nhập bằng giọng nói — dùng Web Speech API của trình duyệt (Chrome/Edge), cùng cách làm với
  // ô "Tìm bằng giọng nói" ở thanh tìm kiếm (Header.jsx). Gửi thẳng đi ngay khi nhận dạng xong,
  // không cần bấm gửi thêm lần nữa — đúng trải nghiệm "nói là làm" của trợ lý giọng nói.
  const startVoiceInput = () => {
    setVoiceError('');
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceError('Trình duyệt của bạn không hỗ trợ nhập bằng giọng nói. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) {
        setVoiceError('Không nghe rõ, vui lòng thử lại.');
        return;
      }
      sendMessage(transcript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setVoiceError('Vui lòng cho phép truy cập micro để dùng tính năng này.');
      } else if (event.error === 'no-speech') {
        setVoiceError('Không nghe thấy gì. Vui lòng thử lại.');
      } else {
        setVoiceError('Không thể nhận diện giọng nói. Vui lòng thử lại.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setVoiceError('Không thể khởi động micro. Vui lòng thử lại.');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
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
                    {msg.image && <img src={msg.image} alt="Ảnh đính kèm" className="msg-user-image" />}
                    {msg.text && <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>}

                    {/* Embedded Product Suggestion */}
                    {msg.product && (
                      <div className="msg-product-card">
                        <img src={formatImageUrl(msg.product.image)} alt={msg.product.name} />
                        <div className="msg-prod-details">
                          <h5>{msg.product.name}</h5>
                          <span className="price">{msg.product.price != null ? `${msg.product.price.toLocaleString('vi-VN')}đ` : 'Liên hệ'}</span>
                          <button onClick={() => handleAddToCart(msg.product)}>
                            <ShoppingCart size={12} />
                            <span>Thêm vào giỏ</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Suggested Action Quick Button */}
                    {msg.suggestedAction && msg.suggestedAction.type !== 'none' && (
                      <div className="msg-action-box">
                        <button
                          className="msg-action-btn"
                          onClick={() => handleActionClick(msg.suggestedAction, msg)}
                        >
                          <span>{msg.suggestedAction.label}</span>
                          <ArrowRight size={14} />
                        </button>
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

          {voiceError && <p className="ai-voice-error">{voiceError}</p>}
          {imageError && <p className="ai-voice-error">{imageError}</p>}

          {attachedImage && (
            <div className="ai-image-preview-bar">
              <img src={attachedImage.previewUrl} alt="Ảnh sắp gửi" />
              <span>Sẽ gửi kèm ảnh này — bạn có thể mô tả thêm bên dưới.</span>
              <button type="button" onClick={removeAttachedImage} title="Bỏ ảnh">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input Footer Form */}
          <form onSubmit={handleSend} className="ai-chat-input-form">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="ai-mic-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Đính kèm ảnh thuốc/sản phẩm để AI nhận diện"
            >
              <ImagePlus size={16} />
            </button>
            <button
              type="button"
              className={`ai-mic-btn${isListening ? ' listening' : ''}`}
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              title={isListening ? 'Đang nghe... bấm để dừng' : 'Nhập bằng giọng nói'}
            >
              <Mic size={16} />
            </button>
            <input
              type="text"
              placeholder={isListening ? 'Đang nghe...' : 'Nhập câu hỏi (vd: đặt lịch hẹn, bị đau khớp)...'}
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
