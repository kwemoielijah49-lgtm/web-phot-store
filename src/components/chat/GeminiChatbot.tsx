import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export const GeminiChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Habari! I am your Vault Assistant. How can I help you find your event photos or navigate M-Pesa payments today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history excluding current message
      const history = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history,
        }),
      });

      if (!res.ok) {
        throw new Error('Chat service encountered an error');
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        role: 'model',
        text: data.reply || 'I am ready to assist with your photos and M-Pesa payments.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        text: 'Sorry, I had trouble reaching the concierge server. Please try again or reach out to Vault support.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-full shadow-2xl transition-all hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <Bot className="w-5 h-5" />
          <span className="text-xs hidden sm:inline">Ask Vault Concierge</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[90vw] sm:w-96 h-[500px] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Vault Concierge</h4>
                <p className="text-[10px] text-neutral-400">Powered by Gemini · Kenya Commerce</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Scrollable Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-neutral-950 font-medium rounded-tr-none'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      msg.role === 'user' ? 'text-neutral-800' : 'text-neutral-500'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-neutral-400">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-neutral-950 border-t border-neutral-800 flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about photo codes, M-Pesa..."
              disabled={isLoading}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-neutral-950 rounded-xl transition-colors shrink-0"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
};
