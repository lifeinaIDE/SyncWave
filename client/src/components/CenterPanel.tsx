'use client';

import { usePlayback, useTrackVideoBounds } from '@/lib/PlaybackContext';
import { extractYouTubeVideoId } from '@/lib/urlUtils';

export default function CenterPanel({ room, socket }: { room: any; socket: any }) {
  const {
    actualPlaying,
    hasInteracted,
    setHasInteracted,
    volume,
    setVolume,
    currentPlayedFraction,
    currentDurationMs,
    spotifyError,
    handlePlayPause,
    handleSeek,
    handleNext,
    handlePrev,
    ytPlayer,
  } = usePlayback();

  const isHost = room?.host === socket?.id;
  const playback = room?.playback;
  const videoBoundsRef = useTrackVideoBounds(playback);

  const videoId = extractYouTubeVideoId(playback?.url || '');
  const thumbnailUrl = videoId 
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` 
    : (playback?.type === 'spotify' ? '/spotify-default.jpg' : null);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fraction = parseFloat(e.target.value);
    handleSeek(fraction);
  };

  return (
    <div className="h-full bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-2xl flex flex-col items-center justify-between p-12 relative overflow-hidden">
      
      {spotifyError && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded text-sm text-center font-medium z-50">
          {spotifyError}
        </div>
      )}

      {!hasInteracted && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-white text-3xl">volume_up</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Enable Audio Playback</h3>
          <p className="text-[var(--color-on-surface-variant)] text-sm max-w-[280px] text-center mb-4">
            Browsers require you to interact with the page before audio can play automatically.
          </p>
          <button 
            onClick={() => {
              if (ytPlayer && ytPlayer.playVideo && ytPlayer.pauseVideo) {
                try {
                  ytPlayer.playVideo();
                  if (!playback?.isPlaying) {
                    ytPlayer.pauseVideo();
                  }
                } catch (e) {}
              }
              setHasInteracted(true);
            }}
            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            Click here to enable sound
          </button>
        </div>
      )}

      {/* Decorative Blur Background */}
      {thumbnailUrl && (
        <div 
          className="absolute inset-0 z-0 opacity-10 blur-[100px] scale-150 transition-all duration-1000"
          style={{ 
            backgroundImage: `url(${thumbnailUrl})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center' 
          }}
        />
      )}

      <div className="flex-1 flex items-center justify-center w-full z-10 relative mt-4">
        {playback?.url && thumbnailUrl ? (
          <div className="relative group perspective-1000 flex flex-col items-center">
            {/* Center Vinyl Container */}
            <div className="relative w-[360px] h-[360px]">
              {/* Static Tracker for YouTube Iframe */}
              <div ref={videoBoundsRef} className="absolute inset-[30%] pointer-events-none z-0" />
              
              {/* Spinning Vinyl */}
              <div className={`absolute inset-0 rounded-full border border-white/5 shadow-2xl overflow-hidden transition-transform duration-500 group-hover:scale-105 ${actualPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                   style={{ animationPlayState: actualPlaying ? 'running' : 'paused' }}>
                <div className="absolute inset-0 bg-black rounded-full">
                  <div className="absolute inset-2 border-[0.5px] border-white/10 rounded-full" />
                  <div className="absolute inset-4 border-[0.5px] border-white/10 rounded-full" />
                  <div className="absolute inset-6 border-[0.5px] border-white/10 rounded-full" />
                  <div className="absolute inset-8 border-[0.5px] border-white/10 rounded-full" />
                  <div className="absolute inset-10 border-[0.5px] border-white/10 rounded-full" />
                </div>
                <div 
                  className="absolute inset-[30%] rounded-full shadow-inner border border-white/10 z-10 bg-cover bg-center"
                  style={{ backgroundImage: `url(${thumbnailUrl})` }}
                />
                <div className="absolute inset-[48%] bg-black rounded-full border border-white/20 z-20" />
              </div>
            </div>

            {/* Track Info */}
            <div className="mt-8 flex flex-col items-center gap-2 text-center px-4 w-full max-w-[500px]">
              <h2 className="text-3xl font-bold text-white tracking-tight line-clamp-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                {playback?.metadata?.title || 'Unknown Title'}
              </h2>
              <p className="text-base font-medium text-[var(--color-on-surface-variant)] flex items-center gap-2 drop-shadow-md">
                {playback?.type === 'youtube' && <span className="material-symbols-outlined text-[18px]">play_circle</span>}
                {playback?.type === 'spotify' && <span className="material-symbols-outlined text-[18px]">library_music</span>}
                {playback?.metadata?.artist || 'Unknown Artist'}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-[360px] h-[360px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-col gap-4 text-[var(--color-on-surface-variant)] shadow-inner z-10 mt-8">
            <span className="material-symbols-outlined text-[64px] opacity-50">album</span>
            <p className="font-medium tracking-tight">Nothing playing</p>
          </div>
        )}
      </div>

      {/* Modern Controls Footer */}
      <div className="w-full max-w-xl flex flex-col gap-8 z-10 mt-12 bg-black/20 p-8 rounded-3xl backdrop-blur-xl border border-white/5">
        
        {/* Progress Bar */}
        <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-on-surface-variant)]">
          <span className="w-10 text-right">{formatTime(currentPlayedFraction * currentDurationMs)}</span>
          <div className="flex-1 relative group h-2 cursor-pointer">
            {/* Progress Track */}
            <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--color-primary)] transition-all duration-300 ease-linear"
                style={{ width: `${currentPlayedFraction * 100}%` }}
              />
            </div>
            
            {/* Invisible native range input for interaction */}
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.001"
              value={currentPlayedFraction}
              onChange={handleSeekChange}
              disabled={!isHost}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            
            {/* Custom thumb */}
            <div 
              className="absolute top-1/2 -mt-2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${currentPlayedFraction * 100}% - 8px)` }}
            />
          </div>
          <span className="w-10">{formatTime(currentDurationMs)}</span>
        </div>

        {/* Playback Controls & Volume */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-[var(--color-on-surface-variant)] w-[120px]">
            <span className="material-symbols-outlined text-[18px]">volume_down</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={handlePrev}
              disabled={!isHost}
              className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[28px]">skip_previous</span>
            </button>
            
            <button 
              onClick={handlePlayPause}
              disabled={!isHost || !playback?.url}
              className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <span className="material-symbols-outlined text-[36px] ml-1">
                {actualPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            
            <button 
              onClick={handleNext}
              disabled={!isHost}
              className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[28px]">skip_next</span>
            </button>
          </div>

          <div className="w-[120px] flex justify-end">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-[var(--color-on-surface-variant)] hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">queue_music</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
