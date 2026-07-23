import React from 'react';
import { User, BookOpen, ShieldCheck } from 'lucide-react';

export const QueryThreadDisplay = ({ query, currentUserType }: { query: any, currentUserType: 'Customer' | 'Admin' | 'Author' }) => {
  if (!query) return null;

  const renderBubble = (sender: string, text: string, idx: number) => {
    const isCustomer = sender === 'Customer' || sender.startsWith('Customer');
    const isAuthor = sender.startsWith('Author');
    const isAdmin = sender === 'Admin' || sender.startsWith('Admin');
    const isMe = sender.startsWith(currentUserType) || 
                 (currentUserType === 'Author' && sender.startsWith('Author'));

    return (
      <div key={idx} className={`flex flex-col mb-3 ${isMe ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider mb-1 px-1">
          {isCustomer && (
            <span className="text-amber-700 flex items-center gap-1">
              <User size={12} className="stroke-[2.5]" /> {isMe ? 'You (Customer)' : 'Customer'}
            </span>
          )}
          {isAuthor && (
            <span className="text-emerald-700 flex items-center gap-1">
              <BookOpen size={12} className="stroke-[2.5]" /> {sender}
            </span>
          )}
          {isAdmin && (
            <span className="text-indigo-700 flex items-center gap-1">
              <ShieldCheck size={12} className="stroke-[2.5]" /> Support Admin
            </span>
          )}
        </div>

        <div className={`px-4 py-3 max-w-[85%] text-xs md:text-sm font-medium leading-relaxed shadow-sm transition-all ${
          isCustomer
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-2xl rounded-tr-xs border border-amber-400/60 font-semibold'
            : isAuthor
            ? 'bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-2xl rounded-tl-xs border border-emerald-700 shadow-md'
            : 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl rounded-tl-xs border border-indigo-700 shadow-md'
        }`}>
          {text}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col mt-4 bg-slate-100/80 p-4 md:p-5 rounded-2xl border-2 border-slate-200/80 w-full shadow-inner space-y-1">
      {/* Initial Message from Customer */}
      {renderBubble('Customer', query.message, -1)}
      
      {/* Replies */}
      {query.reply && query.reply.split('\n\n---\n\n').map((msg: string, idx: number) => {
        let sender = 'Admin';
        let text = msg;
        
        if (msg.startsWith('Admin: ')) {
          sender = 'Admin';
          text = msg.replace('Admin: ', '');
        } else if (msg.startsWith('Customer: ')) {
          sender = 'Customer';
          text = msg.replace('Customer: ', '');
        } else if (msg.startsWith('Author')) {
          const match = msg.match(/^Author \((.*?)\): /);
          if (match) {
            sender = `Author (${match[1]})`;
            text = msg.replace(match[0], '');
          } else {
            sender = 'Author';
            text = msg.replace('Author: ', '');
          }
        }
        
        return renderBubble(sender, text, idx);
      })}
    </div>
  );
};
