
import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: number;
}

export const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateUsername = () => {
    const randomId = Math.random().toString(36).substring(2, 8);
    return `Guest_${randomId}`;
  };

  const canSendMessage = () => {
    const now = Date.now();
    return now - lastMessageTime >= 10000; // 10 seconds cooldown
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    if (inputValue.length > 100) {
      toast({
        title: "Message too long!",
        description: "Messages must be 100 characters or less.",
        variant: "destructive"
      });
      return;
    }

    if (!canSendMessage()) {
      const remainingTime = Math.ceil((10000 - (Date.now() - lastMessageTime)) / 1000);
      toast({
        title: "Slow down!",
        description: `Wait ${remainingTime} more seconds before sending another message.`,
        variant: "destructive"
      });
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      username: generateUsername(),
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev.slice(-19), newMessage]); // Keep last 20 messages
    setInputValue('');
    setLastMessageTime(Date.now());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-80 bg-white rounded-lg shadow-lg flex flex-col h-64">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-700">Global Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No messages yet. Be the first to chat!</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="text-sm">
              <span className="font-semibold text-blue-600">[{message.username}]:</span>
              <span className="text-gray-800 ml-1">{message.content}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (max 100 chars)"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={100}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !canSendMessage()}
            className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {inputValue.length}/100 characters
        </div>
      </div>
    </div>
  );
};
