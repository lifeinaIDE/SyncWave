'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { usePlayback } from '@/lib/PlaybackContext';

export default function MiniPlayer({ room, socket, onClick }: { room: any; socket: any, onClick: () => void }) {
  const {
    actualPlaying,
    currentPlayedFraction,
    handlePlayPause,
    hasInteracted
  } = usePlayback();

  const isHost = room?.host === socket?.id;
  const playback = room?.playback;
  const match = (playback?.url || '').match(/(?:v=|youtu\.be\/)([^&]+)/);
  const videoId = match ? match[1] : null;
  const thumbnailUrl = videoId 
    ? `https://img.youtube.com/vi/${videoId}/default.jpg` 
    : (playback?.type === 'spotify' ? '/spotify-default.jpg' : null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute top-6 left-4 right-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-2xl z-20 cursor-pointer"
      onClick={onClick}
    >
      {/* Tiny Artwork */}
      <div className="w-12 h-12 rounded-full bg-black shrink-0 overflow-hidden border border-white/10 relative">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} className={`w-full h-full object-cover ${actualPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} style={{ animationPlayState: actualPlaying ? 'running' : 'paused' }} alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <span className="material-symbols-outlined text-[16px] opacity-50">album</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{playback?.title || 'Nothing playing'}</p>
        <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate">{playback?.artist || '—'}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0 pr-1">
        <button 
          onClick={(e) => { e.stopPropagation(); if (isHost) handlePlayPause(); }}
          disabled={!isHost || !playback?.url}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black disabled:opacity-30 disabled:bg-white/10 disabled:text-white"
        >
          <span className="material-symbols-outlined text-[20px] ml-0.5">
            {actualPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
      </div>

      {/* Progress Bar Line */}
      <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[var(--color-primary)] transition-all duration-300 ease-linear"
          style={{ width: `${currentPlayedFraction * 100}%` }}
        />
      </div>
    </motion.div>
  );
}
