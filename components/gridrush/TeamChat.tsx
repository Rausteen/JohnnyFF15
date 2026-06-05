import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../services/gridrush/gridrushTypes';
import { Send, MessageCircle } from 'lucide-react';

interface Props { messages: ChatMessage[]; playerName: string; onSendMessage: (msg: string) => void; }

const TeamChat: React.FC<Props> = ({ messages, playerName, onSendMessage }) => {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!input.trim()) return; onSendMessage(input); setInput(''); };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
        <MessageCircle className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-bold text-zinc-300">Chat équipe</span>
        {messages.length > 0 && <span className="ml-auto bg-violet-500/20 text-violet-300 text-xs font-bold px-2 py-0.5 rounded-full">{messages.length}</span>}
      </button>
      {open && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px] max-h-[300px]">
            {messages.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">Pas encore de messages</p>}
            {messages.map((msg) => {
              const me = msg.playerName === playerName;
              return (
                <div key={msg.id} className={`flex flex-col ${me ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-zinc-600 mb-0.5">{msg.playerName}</span>
                  <div className={`px-3 py-1.5 rounded-xl text-sm max-w-[85%] break-words ${me ? 'bg-violet-600/30 text-violet-200 rounded-br-sm' : 'bg-zinc-800 text-zinc-300 rounded-bl-sm'}`}>{msg.message}</div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-800">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message..."
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none focus:border-violet-500/50" maxLength={200} />
              <button type="submit" disabled={!input.trim()} className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 transition-colors">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default TeamChat;
