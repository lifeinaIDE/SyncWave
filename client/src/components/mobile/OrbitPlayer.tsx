'use client';

import React, { useRef, useState, useEffect } from 'react';
import { usePlayback, useTrackVideoBounds } from '@/lib/PlaybackContext';
import { extractYouTubeVideoId } from '@/lib/urlUtils';

export default function OrbitPlayer({ room, socket }: { room: any; socket: any }) {
  const {
    actualPlaying,
    currentPlayedFraction,
    currentDurationMs,
    volume,
    setVolume,
    handlePlayPause,
    handleSeek,
    handleNext,
    handlePrev
  } = usePlayback();

  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFraction, setDragFraction] = useState(0);

  const isHost = room?.host === socket?.id;
  const playback = room?.playback;
  const videoBoundsRef = useTrackVideoBounds(playback);
  const videoId = extractYouTubeVideoId(playback?.url || '');
  const thumbnailUrl = videoId 
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` 
    : (playback?.type === 'spotify' ? '/spotify-default.jpg' : null);

  const SIZE = 320;
  const CENTER = SIZE / 2;
  const RADIUS = 140;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const TRACK_LENGTH = 0.75 * CIRCUMFERENCE; // 270 degrees
  const GAP_LENGTH = 0.25 * CIRCUMFERENCE;

  const displayFraction = isDragging ? dragFraction : currentPlayedFraction;

  // Calculate Thumb Position
  const angleDeg = 135 + displayFraction * 270;
  const angleRad = (angleDeg * Math.PI) / 180;
  const thumbX = CENTER + RADIUS * Math.cos(angleRad);
  const thumbY = CENTER + RADIUS * Math.sin(angleRad);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isHost || !playback?.url) return;
    setIsDragging(true);
    updateDragFraction(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateDragFraction(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    handleSeek(dragFraction);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const updateDragFraction = (clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left - CENTER;
    const y = clientY - rect.top - CENTER;
    
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    
    // The track starts at 135 degrees and ends at 45 degrees (which is 360+45 = 405)
    let relativeAngle = angle - 135;
    if (relativeAngle < 0) relativeAngle += 360;

    let fraction = relativeAngle / 270;
    if (fraction > 1) {
      // If they drag into the gap, clamp it
      fraction = fraction < 1.16 ? 1 : 0; // closer to end or start?
    }
    
    fraction = Math.max(0, Math.min(1, fraction));
    setDragFraction(fraction);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none touch-none">
      
      {/* Background Decor */}
      {thumbnailUrl && (
        <div 
          className="absolute inset-0 z-0 opacity-[0.15] blur-3xl scale-150 transition-all duration-1000 transform-gpu"
          style={{ backgroundImage: `url(${thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      )}

      {/* Orbit Player Ring & Vinyl */}
      <div className="relative z-10 flex items-center justify-center mt-[-40px]">
        <svg 
          ref={svgRef}
          width={SIZE} 
          height={SIZE} 
          className="absolute"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Background Track */}
          <circle 
            cx={CENTER} 
            cy={CENTER} 
            r={RADIUS} 
            stroke="rgba(255,255,255,0.1)" 
            strokeWidth="6" 
            fill="none" 
            strokeDasharray={`${TRACK_LENGTH} ${GAP_LENGTH}`} 
            strokeLinecap="round"
            transform={`rotate(135, ${CENTER}, ${CENTER})`} 
          />
          
          {/* Progress Track */}
          <circle 
            cx={CENTER} 
            cy={CENTER} 
            r={RADIUS} 
            stroke="var(--color-primary)" 
            strokeWidth="6" 
            fill="none" 
            strokeDasharray={`${displayFraction * TRACK_LENGTH} ${CIRCUMFERENCE}`} 
            strokeLinecap="round"
            transform={`rotate(135, ${CENTER}, ${CENTER})`} 
            className="transition-all duration-200 ease-linear"
          />

          {/* Draggable Thumb */}
          {playback?.url && (
            <circle 
              cx={thumbX} 
              cy={thumbY} 
              r="12" 
              fill="white" 
              className={`transition-all ${isDragging ? 'duration-75 ease-out scale-125' : 'duration-200 ease-linear hover:scale-110'} cursor-pointer`}
              style={{ filter: 'drop-shadow(0px 0px 8px rgba(255,255,255,0.5))' }}
            />
          )}
        </svg>

        {/* Center Vinyl Container */}
        <div className="relative w-[200px] h-[200px]">
          {/* Static Tracker for YouTube Iframe */}
          <div ref={videoBoundsRef} className="absolute inset-[25%] pointer-events-none z-0" />
          
          {/* Spinning Vinyl */}
          <div className={`absolute inset-0 rounded-full shadow-2xl overflow-hidden transition-transform duration-500 ${playback?.url && actualPlaying && !isDragging ? 'animate-[spin_4s_steps(120)_infinite]' : ''}`}
               style={{ animationPlayState: playback?.url && actualPlaying && !isDragging ? 'running' : 'paused' }}>
            {playback?.url && thumbnailUrl ? (
              <>
                <div className="absolute inset-0 bg-black rounded-full border border-white/10">
                  <div className="absolute inset-2 border-[0.5px] border-white/10 rounded-full" />
                  <div className="absolute inset-4 border-[0.5px] border-white/10 rounded-full" />
                  <div className="absolute inset-6 border-[0.5px] border-white/10 rounded-full" />
                  <div className="absolute inset-8 border-[0.5px] border-white/10 rounded-full" />
                </div>
                <div 
                  className="absolute inset-[25%] rounded-full shadow-inner border border-white/10 z-10 bg-cover bg-center"
                  style={{ backgroundImage: `url(${thumbnailUrl})` }}
                />
                <div className="absolute inset-[45%] bg-black rounded-full border border-white/20 z-20" />
              </>
            ) : (
              <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-full flex flex-col items-center justify-center text-[var(--color-on-surface-variant)]">
                <span className="material-symbols-outlined text-[48px] opacity-50">album</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Song Info (Directly below vinyl) */}
      <div className="z-10 mt-10 text-center px-6 max-w-[300px]">
        {playback?.url ? (
          <>
            <h2 className="text-xl font-bold text-white truncate tracking-tight">
              {playback.title || 'Unknown Title'}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1 opacity-70">
              {playback.type === 'spotify' ? (
                <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Icon_RGB_White.png" alt="Spotify" className="w-4 h-4 opacity-70" />
              ) : (
                <span className="material-symbols-outlined text-[16px] text-white">play_circle</span>
              )}
              <p className="text-sm text-white truncate">{playback.artist || 'Unknown Artist'}</p>
            </div>
          </>
        ) : (
          <h2 className="text-lg font-medium text-[var(--color-on-surface-variant)] tracking-tight">
            Nothing playing
          </h2>
        )}
      </div>

      {/* Playback Controls Dock (Fits in the 90-degree bottom gap) */}
      <div className="z-10 mt-8 flex flex-col items-center gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={handlePrev}
            disabled={!isHost}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[28px]">skip_previous</span>
          </button>
          
          <button 
            onClick={handlePlayPause}
            disabled={!isHost || !playback?.url}
            className="w-[72px] h-[72px] flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform disabled:opacity-30 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            <span className="material-symbols-outlined text-[36px] ml-1">
              {actualPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          
          <button 
            onClick={handleNext}
            disabled={!isHost}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[28px]">skip_next</span>
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[18px]">volume_down</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
          <span className="material-symbols-outlined text-[18px]">volume_up</span>
        </div>
      </div>
    </div>
  );
}
