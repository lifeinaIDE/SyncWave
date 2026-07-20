'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayback } from '@/lib/PlaybackContext';
import OrbitPlayer from './OrbitPlayer';
import MobileBottomSheet from './MobileBottomSheet';
import MobileDrawer from './MobileDrawer';
import MiniPlayer from './MiniPlayer';

type SheetState = 'COLLAPSED' | 'HALF' | 'FULL';

export default function MobileRoomLayout({ room, socket }: { room: any; socket: any }) {
  const { syncRequired, handleManualSync } = usePlayback();
  const [sheetState, setSheetState] = useState<SheetState>('COLLAPSED');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Swipe detection for Drawer
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchEnd - touchStart;
    
    // Swipe right to open drawer
    if (distance > 100 && !drawerOpen && sheetState === 'COLLAPSED') {
      setDrawerOpen(true);
    }
  };

  const isPlayerCollapsed = sheetState !== 'COLLAPSED' || drawerOpen;

  return (
    <div 
      className="w-full h-full relative overflow-hidden bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drawer Toggle Button (If they don't know how to swipe) */}
      <button 
        onClick={() => setDrawerOpen(true)}
        className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Main Player Area */}
      <div className="flex-1 relative flex flex-col justify-center">
        <AnimatePresence>
          {!isPlayerCollapsed && (
            <motion.div 
              key="orbit-player"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0"
            >
              <OrbitPlayer room={room} socket={socket} />
            </motion.div>
          )}

          {isPlayerCollapsed && (
            <motion.div 
              key="mini-player"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full z-20"
            >
              <MiniPlayer 
                room={room} 
                socket={socket} 
                onClick={() => {
                  setSheetState('COLLAPSED');
                  setDrawerOpen(false);
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Overlays */}
      <MobileBottomSheet 
        room={room} 
        socket={socket} 
        sheetState={sheetState} 
        setSheetState={setSheetState} 
      />
      
      <MobileDrawer 
        room={room} 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
      />

      {/* Sync Required Overlay */}
      <AnimatePresence>
        {syncRequired && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleManualSync}
            className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center cursor-pointer"
          >
            <div className="w-24 h-24 bg-[var(--color-primary)] rounded-full flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(30,215,96,0.4)] mb-6">
              <span className="material-symbols-outlined text-white text-5xl">volume_up</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Tap to Sync Audio</h2>
            <p className="text-[var(--color-on-surface-variant)] text-lg">Your browser paused the music. Tap anywhere to resume playback.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
