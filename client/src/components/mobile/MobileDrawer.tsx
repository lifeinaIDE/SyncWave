'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileDrawer({ 
  room, 
  isOpen, 
  onClose 
}: { 
  room: any; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (!room) return;
    const link = `${window.location.origin}/room/${room.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[80vw] max-w-[320px] bg-[var(--color-surface)] border-r border-[var(--color-outline)] z-50 flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-[var(--color-outline)]">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-primary)]">group</span>
                Room Info
              </h2>
              <p className="text-sm text-[var(--color-on-surface-variant)] mt-1 font-mono">{room?.id}</p>
            </div>

            <div className="p-6">
              <button 
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span className="font-medium text-sm">{copied ? 'Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <h3 className="text-sm font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-4">
                Participants ({room?.participants?.length || 0})
              </h3>
              
              <div className="flex flex-col gap-3">
                {room?.participants?.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white text-sm">{p.name}</span>
                    </div>
                    {room.host === p.id && (
                      <span className="text-[10px] uppercase font-bold bg-[var(--color-primary)] text-white px-2 py-1 rounded">Host</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
