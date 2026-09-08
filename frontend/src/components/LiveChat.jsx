import { useState, useEffect, useRef } from 'react';
import { BsChat, BsX, BsSend, BsCheck2All } from 'react-icons/bs';
import { chatAPI } from '../api/chat';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';

const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const lastUserMessageTimeRef = useRef(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  // Listen for custom event to open chat
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };

    window.addEventListener('openLiveChat', handleOpenChat);

    return () => {
      window.removeEventListener('openLiveChat', handleOpenChat);
    };
  }, []);

  // Generate or get session ID
  useEffect(() => {
    const storedSessionId = localStorage.getItem('chatSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
    }
  }, []);

  // Load messages when chat opens
  useEffect(() => {
    if (isOpen && sessionId) {
      // Scroll to bottom when chat opens/reopens
      shouldAutoScrollRef.current = true;
      loadMessages();

      // Poll for new messages every 5 seconds
      const interval = setInterval(loadMessages, 5000);

      return () => clearInterval(interval);
    }
  }, [isOpen, sessionId]);

  // Scroll to bottom when chat is opened/reopened
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [isOpen]);

  // Auto-scroll to bottom only when explicitly requested (user sends message or initial load)
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;

    if (currentMessageCount > previousMessageCount) {
      // Only scroll if explicitly requested (e.g., user sent message)
      if (shouldAutoScrollRef.current) {
        scrollToBottom();
        shouldAutoScrollRef.current = false; // Reset after scrolling
      }
      // Note: Scrolling for new support messages is handled in loadMessages()
    } else if (currentMessageCount === 0 && shouldAutoScrollRef.current) {
      // Only scroll on initial empty state
      scrollToBottom();
      shouldAutoScrollRef.current = false;
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages]);

  // Check if user is near bottom of chat
  const isNearBottom = () => {
    if (!messagesContainerRef.current) return true;
    const container = messagesContainerRef.current;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await chatAPI.getMessages({ sessionId, limit: 100 });
      if (response.data?.success) {
        const newMessages = response.data.data.messages || [];
        const previousMessageCount = messages.length;

        // Check if user is at bottom BEFORE updating messages
        const wasAtBottom = isNearBottom();
        const hasNewMessages = newMessages.length > previousMessageCount;

        setMessages(newMessages);

        // If user was at bottom and new messages arrived, scroll after DOM updates
        if (wasAtBottom && hasNewMessages) {
          // Use setTimeout to ensure DOM has updated
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }

        // Check if a support message was received after the last user message
        if (lastUserMessageTimeRef.current) {
          const latestSupportMessage = newMessages
            .filter(msg => msg.sender === 'support')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

          if (latestSupportMessage) {
            const supportMessageTime = new Date(latestSupportMessage.createdAt);
            const lastUserMessageTime = lastUserMessageTimeRef.current;

            // If support message came after the last user message, hide typing
            if (supportMessageTime > lastUserMessageTime) {
              setIsTyping(false);
            }
          }
        } else if (newMessages.length > 0) {
          // If no lastUserMessageTime but messages exist, check if last message is from user
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.sender === 'user') {
            // Check if there's a support message after this user message
            const supportMessagesAfter = newMessages.filter(
              msg => msg.sender === 'support' && new Date(msg.createdAt) > new Date(lastMessage.createdAt)
            );

            if (supportMessagesAfter.length === 0) {
              // No support response yet, show typing
              setIsTyping(true);
              lastUserMessageTimeRef.current = new Date(lastMessage.createdAt);
            } else {
              setIsTyping(false);
            }
          } else {
            setIsTyping(false);
          }
        }

        // Mark support messages as read
        const unreadSupportMessages = newMessages.filter(
          (msg) => msg.sender === 'support' && msg.status !== 'read'
        );
        if (unreadSupportMessages.length > 0) {
          await chatAPI.markAsRead({ sessionId });
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;
    const messageText = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    setIsTyping(true);

    // Optimistically add user message
    const tempMessage = {
      _id: `temp_${Date.now()}`,
      message: messageText,
      sender: 'user',
      status: 'sent',
      createdAt: new Date(),
      sessionId,
    };

    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await chatAPI.sendMessage({
        message: messageText,
        sessionId,
      });

      if (response.data?.success) {
        const actualMessage = {
          ...tempMessage,
          _id: response.data.data._id,
          createdAt: response.data.data.createdAt,
        };

        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempMessage._id ? actualMessage : msg
          )
        );

        // Set the last user message time and keep typing indicator showing
        // (waiting for support response)
        lastUserMessageTimeRef.current = new Date(actualMessage.createdAt);
        // Keep isTyping true - will be hidden when support response arrives
      } else {
        setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
        // Use backend error message if available, otherwise use frontend translation
        toast.error(
          response.data?.message || t.chat.errors.sendFailed
        );
        setIsTyping(false);
        lastUserMessageTimeRef.current = null;
      }
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
      setIsTyping(false);
      lastUserMessageTimeRef.current = null;
      // Use backend error message if available, otherwise use frontend translation
      toast.error(
        error.response?.data?.message || t.chat.errors.sendFailedRetry
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    setMessages([]);
    setInputMessage('');
    setIsTyping(false);
    lastUserMessageTimeRef.current = null;
    // Create new session so next open starts fresh
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    localStorage.setItem('chatSessionId', newSessionId);
  };

  const formatTime = (date) => {
    if (!date) return '';

    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return t.chat.time.justNow;
    if (minutes < 60) return `${minutes}${t.chat.time.minutesAgo}`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}${t.chat.time.hoursAgo}`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      {isOpen && (
        <div
          ref={chatContainerRef}
          className="fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[500px] sm:h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700"
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b bg-primary text-white rounded-t-2xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <BsChat className="text-xl" />
              <div>
                <h3 className="font-semibold text-base">{t.chat.title}</h3>
                <p className="text-xs opacity-90">{t.chat.subtitle}</p>
              </div>
            </div>
            <button
              onClick={handleCloseChat}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label={t.chat.closeChat}
            >
              <BsX className="text-xl" />
            </button>
          </div>

          {/* Messages Container */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <BsChat className="text-4xl text-gray-500 mb-2" />
                <p className="text-gray-500 text-sm">
                  {t.chat.emptyState}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[75%] rounded-xl p-3 sm:p-4 ${message.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-300 rounded-tl-none'
                      }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.message}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <span className="text-xs opacity-70">
                        {formatTime(message.createdAt)}
                      </span>
                      {message.sender === 'user' && (
                        <BsCheck2All
                          className={`text-xs ${message.status === 'read' ? 'text-blue-300' : 'opacity-50'
                            }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl rounded-tl-none p-3 sm:p-4">
                  <div className="flex gap-2 items-center">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 sm:p-5">
            <div className="flex gap-2 sm:gap-3 items-end">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.chat.placeholder}
                className="flex-1 min-h-[40px] max-h-[120px] p-2 sm:p-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows="1"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || loading}
                className="bg-primary text-white p-3 sm:p-4 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center"
                aria-label={t.chat.sendMessage}
              >
                <BsSend className="text-lg" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {t.chat.inputHint}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChat;

