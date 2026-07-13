'use client';

import React, { useState } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { usePlayback } from '@/lib/PlaybackContext';

import { detectPlatform, fetchYouTubeMetadata, fetchSpotifyMetadata } from '@/lib/urlUtils';

type SheetState = 'COLLAPSED' | 'HALF' | 'FULL';

export default function MobileBottomSheet({ room, socket, sheetState, setSheetState }: { room: any; socket: any, sheetState: SheetState, setSheetState: (s: SheetState) => void }) {
  const isHost = room?.host === socket?.id;
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const controls = useAnimation();

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = url.trim();
    if (!rawUrl || !socket) return;
    
    setIsAdding(true);
    const type = detectPlatform(rawUrl);
    let metadata = null;

    if (type === 'youtube') {
      metadata = await fetchYouTubeMetadata(rawUrl);
    } else if (type === 'spotify') {
      const tokenMatch = document.cookie.match(/(?:^|;\s*)spotify_access_token=([^;]*)/);
      if (tokenMatch) {
        metadata = await fetchSpotifyMetadata(rawUrl, tokenMatch[1]);
      } else {
        alert("You must be logged into Spotify to add Spotify tracks.");
        setIsAdding(false);
        return;
      }
    }

    if (type) {
      socket.emit('add-song', { url: rawUrl, type, metadata });
      setUrl('');
    } else {
      alert("Unsupported URL. Please use YouTube or Spotify.");
    }
    
    setIsAdding(false);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocityY = info.velocity.y;
    const offsetY = info.offset.y;

    if (sheetState === 'COLLAPSED') {
      if (velocityY < -100 || offsetY < -50) setSheetState('HALF');
    } else if (sheetState === 'HALF') {
      if (velocityY < -500 || offsetY < -100) setSheetState('FULL');
      else if (velocityY > 500 || offsetY > 100) setSheetState('COLLAPSED');
    } else if (sheetState === 'FULL') {
      if (velocityY > 500 || offsetY > 100) setSheetState('HALF');
    }
  };

  const getHeight = () => {
    if (sheetState === 'COLLAPSED') return '80px';
    if (sheetState === 'HALF') return '50vh';
    return '85vh';
  };

  return (
    <>
      {/* Backdrop for full state */}
      {sheetState === 'FULL' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setSheetState('HALF')}
        />
      )}

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ height: getHeight() }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] rounded-t-3xl border-t border-[var(--color-outline)] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40 flex flex-col overflow-hidden touch-none"
      >
        {/* Drag Handle */}
        <div 
          className="w-full pt-4 pb-2 flex justify-center cursor-grab active:cursor-grabbing shrink-0"
          onClick={() => setSheetState(sheetState === 'COLLAPSED' ? 'HALF' : (sheetState === 'HALF' ? 'FULL' : 'HALF'))}
        >
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {sheetState === 'COLLAPSED' && (
          <div className="px-6 pb-6 flex items-center justify-between text-[var(--color-on-surface-variant)] cursor-pointer" onClick={() => setSheetState('HALF')}>
            <span className="font-medium text-sm text-white">Up Next</span>
            <span className="text-sm bg-white/10 px-2 py-1 rounded">{room?.queue?.length || 0} tracks</span>
          </div>
        )}

        {(sheetState === 'HALF' || sheetState === 'FULL') && (
          <div className="px-6 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="font-bold text-lg text-white">Queue</h3>
              <span className="text-sm bg-white/10 text-white px-2 py-1 rounded">{room?.queue?.length || 0} tracks</span>
            </div>

            {/* Add Song Form */}
            <form onSubmit={handleAddSong} className="flex gap-2 mb-6 shrink-0">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube or Spotify link..." 
                className="flex-1 px-4 py-3 bg-black/20 border border-[var(--color-outline)] rounded-xl text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              <button 
                type="submit"
                disabled={!url.trim() || isAdding}
                className="px-4 py-3 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </form>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto pb-6 -mr-2 pr-2 touch-pan-y">
              {room?.queue?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--color-on-surface-variant)] gap-3">
                  <span className="material-symbols-outlined text-[48px] opacity-20">queue_music</span>
                  <p className="text-sm">The queue is empty.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {room?.queue?.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl group relative">
                      <div className="w-10 h-10 rounded bg-black overflow-hidden shrink-0 border border-white/10">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <span className="material-symbols-outlined text-[16px] text-white/50">music_note</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{item.title}</p>
                        <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate">{item.artist}</p>
                      </div>

                      {isHost && (
                        <button 
                          onClick={() => socket.emit('remove-song', index)}
                          className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
