import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, Sparkles, User, Bot, HelpCircle } from 'lucide-react';
import API_URL from '@/config/api';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Hello! I am the Cuvasol Support Assistant. Ask me anything about our classes, free demo bookings, or tutor recommendations!",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle closing when clicking outside the widget
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatWindowRef.current && 
        !chatWindowRef.current.contains(event.target as Node) && 
        isOpen
      ) {
        // Option to keep open or close. We'll keep it open for better user focus unless they close it explicitly.
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const newUserMessage: Message = {
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send the active message history to the backend endpoint
      const payloadMessages = [...messages, newUserMessage].map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      const res = await axios.post(`${API_URL}/chatbot`, { messages: payloadMessages });
      
      const botResponse: Message = {
        sender: 'bot',
        text: res.data.response || "I couldn't process that request. How else can I help?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (err) {
      console.error('[Chatbot error]:', err);
      const errorResponse: Message = {
        sender: 'bot',
        text: "I'm sorry, I am experiencing temporary difficulties connecting to the server. Please try again or email us at support@cuvasol.com.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputValue);
    }
  };

  const quickQueries = [
    "Who teaches Mathematics?",
    "Who teaches Science?",
    "How to book a free demo?",
    "Tell me about the AI Skills Program"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" ref={chatWindowRef}>
      {/* Floating Toggle Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-14 h-14 rounded-full text-white shadow-2xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
          isOpen ? 'bg-slate-700 rotate-90' : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 animate-bounce'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Sparkles size={18} className="text-teal-100 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Cuvasol Assistant</h3>
                <span className="text-[11px] text-teal-100 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-ping mr-1"></span>
                  Active support
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex items-start space-x-2.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar Icon */}
                <div className={`p-1.5 rounded-full flex-shrink-0 text-white ${
                  msg.sender === 'user' ? 'bg-teal-600' : 'bg-slate-700'
                }`}>
                  {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
                </div>

                {/* Bubble Content */}
                <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex items-start space-x-2.5 max-w-[85%]">
                <div className="p-1.5 rounded-full bg-slate-700 text-white flex-shrink-0">
                  <Bot size={13} />
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm flex space-x-1 items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick-Queries Chips */}
          <div className="px-3 py-2 bg-slate-100/50 border-t border-slate-100 flex flex-wrap gap-1.5 overflow-x-auto max-h-24">
            {quickQueries.map((query, index) => (
              <button
                key={index}
                disabled={isLoading}
                onClick={() => handleSendMessage(query)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full text-[10.5px] text-slate-600 font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HelpCircle size={10} className="text-teal-600" />
                <span>{query}</span>
              </button>
            ))}
          </div>

          {/* Input Panel */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2">
            <input
              type="text"
              disabled={isLoading}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about tutors, classes..."
              className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              disabled={isLoading || !inputValue.trim()}
              onClick={() => handleSendMessage(inputValue)}
              className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
