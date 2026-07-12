'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { extractSpotifyTrackId } from '../lib/urlUtils';

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function CenterPanel({ room, socket }: { room: any; socket: any }) {
  // Global States
  const [actualPlaying, setActualPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isReady, setIsReady] = useState(false);
  
  // Real-time Poll States
  const [currentPlayedFraction, setCurrentPlayedFraction] = useState(0);
  const [currentDurationMs, setCurrentDurationMs] = useState(0);
  const currentPlayedFractionRef = useRef(0);
  const currentDurationRef = useRef(0);
  const lastSpotifyTrackRef = useRef<string | null>(null);
  const lastYouTubeVideoRef = useRef<string | null>(null);
  const isTransitioningRef = useRef(false);

  // YouTube States
  const [ytPlayer, setYtPlayer] = useState<any>(null);
  const ytPlayerContainerRef = useRef<HTMLDivElement>(null);
  
  // Spotify States
  const [spotifyPlayer, setSpotifyPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  const isHost = room?.host === socket?.id;
  const isHostRef = useRef(isHost);
  const playback = room?.playback;

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    const tokenMatch = document.cookie.match(/(?:^|;\s*)spotify_access_token=([^;]*)/);
    if (tokenMatch) {
      setSpotifyToken(tokenMatch[1]);
    }
  }, []);

  // -------------------------------------------------------------
  // CLEAR CACHE ON EMPTY QUEUE
  // -------------------------------------------------------------
  useEffect(() => {
    if (!playback?.url) {
      lastSpotifyTrackRef.current = null;
      lastYouTubeVideoRef.current = null;
      isTransitioningRef.current = false;
      if (ytPlayer && ytPlayer.stopVideo) {
        try { ytPlayer.stopVideo(); } catch(e) {}
      }
    }
  }, [playback?.url, ytPlayer]);

  // -------------------------------------------------------------
  // YOUTUBE INIT
  // -------------------------------------------------------------
  useEffect(() => {
    if (playback?.type !== 'youtube' || ytPlayer) return;

    const loadYT = () => {
      const match = (playback.url || '').match(/(?:v=|youtu\.be\/)([^&]+)/);
      const videoId = match ? match[1] : null;

      if (!videoId || !ytPlayerContainerRef.current) return;

      const player = new window.YT.Player(ytPlayerContainerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            console.log('YouTube API Ready');
            setYtPlayer(event.target);
            setIsReady(true);
            event.target.setVolume(volume * 100);
          },
          onStateChange: (event: any) => {
            setActualPlaying(event.data === 1);
            if (event.data === 0 && isHostRef.current && !isTransitioningRef.current) {
              // Reset current played ref so we don't think we're still at the end
              currentPlayedFractionRef.current = 0;
              isTransitioningRef.current = true;
              socket.emit('play-next');
            }
          }
        }
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = loadYT;
    } else {
      loadYT();
    }
  }, [playback?.type, playback?.url]); 

  // -------------------------------------------------------------
  // SPOTIFY INIT
  // -------------------------------------------------------------
  const isSpotifyInitRef = useRef(false);

  useEffect(() => {
    if (playback?.type !== 'spotify' || !spotifyToken) return;

    const initSpotify = () => {
      if (isSpotifyInitRef.current) return;
      isSpotifyInitRef.current = true;

      const player = new window.Spotify.Player({
        name: 'SyncWave Player',
        getOAuthToken: (cb: any) => { cb(spotifyToken); },
        volume: volume
      });

      player.addListener('ready', ({ device_id }: any) => {
        console.log('Spotify SDK Ready:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      player.addListener('not_ready', ({ device_id }: any) => setDeviceId(null));
      player.addListener('initialization_error', ({ message }: any) => setSpotifyError(message));
      player.addListener('authentication_error', ({ message }: any) => setSpotifyError(message));
      player.addListener('account_error', () => setSpotifyError('Spotify Premium is required for Web Playback.'));
      player.addListener('playback_error', ({ message }: any) => setSpotifyError(message));

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setActualPlaying(!state.paused);
      });

      player.connect();
      setSpotifyPlayer(player);
    };

    if (window.Spotify) {
      initSpotify();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initSpotify;
      
      if (!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {};
  }, [playback?.type, spotifyToken, volume]);

  const playSpotifyTrack = useCallback(async (trackId: string, positionMs: number = 0, targetPlaying: boolean) => {
    if (!deviceId || !spotifyToken) return;
    try {
      setSpotifyError(null);
      
      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${spotifyToken}` },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`], position_ms: Math.floor(positionMs) })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403) setSpotifyError(errorData.error?.reason === 'PREMIUM_REQUIRED' ? 'Spotify Premium is required.' : 'Playback blocked.');
        else if (res.status === 404) setSpotifyError('Spotify device not found. Please refresh.');
        else setSpotifyError(errorData.error?.message || 'Failed to start Spotify playback.');
        return;
      }

      if (!targetPlaying) {
        setTimeout(() => spotifyPlayer?.pause(), 500);
      }
    } catch (e) {
      console.error('Spotify API Error:', e);
      setSpotifyError('Network error connecting to Spotify.');
    }
  }, [deviceId, spotifyToken, spotifyPlayer]);

  // -------------------------------------------------------------
  // PLAYBACK STATE SYNC
  // -------------------------------------------------------------
  useEffect(() => {
    if (!playback || !isReady) return;

    if (playback.type === 'spotify') {
      const trackId = extractSpotifyTrackId(playback.url || '');
      
      if (trackId && deviceId) {
        const isNewTrack = lastSpotifyTrackRef.current !== trackId;
        
        if (isNewTrack) {
          lastSpotifyTrackRef.current = trackId;
          isTransitioningRef.current = false;
          const initialPos = playback.played * (currentDurationRef.current || 0);
          playSpotifyTrack(trackId, initialPos, playback.isPlaying);
        } else {
          if (playback.isPlaying) spotifyPlayer?.resume().catch(() => {});
          else spotifyPlayer?.pause().catch(() => {});

          if (!isHost || playback.played === 0) {
            const targetPos = playback.played * currentDurationRef.current;
            const currentPos = currentPlayedFractionRef.current * currentDurationRef.current;
            if (Math.abs(targetPos - currentPos) > 3000 && currentDurationRef.current > 0) {
              spotifyPlayer?.seek(targetPos);
            }
          }
        }
      }
    } 
    else if (playback.type === 'youtube' && ytPlayer) {
      const match = (playback.url || '').match(/(?:v=|youtu\.be\/)([^&]+)/);
      const videoId = match ? match[1] : null;
      
      const isNewVideo = videoId && lastYouTubeVideoRef.current !== videoId;
      
      if (isNewVideo) {
        lastYouTubeVideoRef.current = videoId;
        isTransitioningRef.current = false;
        if (playback.isPlaying) {
          ytPlayer.loadVideoById({ videoId: videoId, startSeconds: 0 });
        } else {
          ytPlayer.cueVideoById({ videoId: videoId, startSeconds: 0 });
        }
      } else {
        if (playback.isPlaying) ytPlayer.playVideo?.();
        else ytPlayer.pauseVideo?.();
      }

      if (!isHost || playback.played === 0) {
        const duration = ytPlayer.getDuration?.() || 0;
        const targetTime = playback.played * duration;
        const currentTime = ytPlayer.getCurrentTime?.() || 0;
        
        if (Math.abs(currentTime - targetTime) > 2 && duration > 0) {
          ytPlayer.seekTo(targetTime, true);
        }
      }
    }
  }, [playback, isHost, isReady, deviceId, playSpotifyTrack, spotifyPlayer, ytPlayer]); 

  // -------------------------------------------------------------
  // POLLING LOOP
  // -------------------------------------------------------------
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (actualPlaying) {
      interval = setInterval(async () => {
        if (playback?.type === 'youtube' && ytPlayer) {
          const duration = ytPlayer.getDuration?.() || 0;
          const current = ytPlayer.getCurrentTime?.() || 0;
          if (duration > 0) {
            const fraction = current / duration;
            setCurrentPlayedFraction(fraction);
            currentPlayedFractionRef.current = fraction;
            setCurrentDurationMs(duration * 1000);
            currentDurationRef.current = duration * 1000;
            
            if (isHostRef.current) {
               if (fraction > 0.995 && duration > 0 && !isTransitioningRef.current) {
                 currentPlayedFractionRef.current = 0;
                 isTransitioningRef.current = true;
                 socket.emit('play-next');
               } else if (Math.random() < 0.1 && !isTransitioningRef.current) {
                 socket.emit('playback-sync', { isPlaying: true, played: fraction });
               }
            }
          }
        } 
        else if (playback?.type === 'spotify' && spotifyPlayer) {
          const state = await spotifyPlayer.getCurrentState();
          if (state) {
            const fraction = state.position / state.duration;
            setCurrentPlayedFraction(fraction);
            currentPlayedFractionRef.current = fraction;
            setCurrentDurationMs(state.duration);
            currentDurationRef.current = state.duration;
            
            if (isHostRef.current) {
               // Robust end of track detection for Spotify since it doesn't emit a reliable 'ENDED' state easily
               if (fraction > 0.995 && state.duration > 0 && !state.paused && !isTransitioningRef.current) {
                 currentPlayedFractionRef.current = 0;
                 isTransitioningRef.current = true;
                 socket.emit('play-next');
               } else if (Math.random() < 0.1 && !isTransitioningRef.current) {
                 socket.emit('playback-sync', { isPlaying: true, played: fraction });
               }
            }
          }
        }
      }, 500);
    }

    return () => clearInterval(interval);
  }, [actualPlaying, playback?.type, ytPlayer, spotifyPlayer, isHost, socket]);

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handlePlayPause = () => {
    setHasInteracted(true);
    if (!isHost || !playback) return;
    const newPlaying = !playback.isPlaying;
    socket.emit('playback-sync', { isPlaying: newPlaying, played: currentPlayedFraction });
  };

  const handleSeek = (e: any) => {
    setHasInteracted(true);
    if (!isHost || !playback) return;
    const fraction = parseFloat(e.target.value);
    setCurrentPlayedFraction(fraction);

    if (playback.type === 'youtube' && ytPlayer) {
      const duration = ytPlayer.getDuration?.() || 0;
      ytPlayer.seekTo(fraction * duration, true);
    } else if (playback.type === 'spotify' && spotifyPlayer) {
      const posMs = fraction * currentDurationRef.current;
      spotifyPlayer?.seek(posMs);
    }
    
    socket.emit('playback-sync', { isPlaying: playback.isPlaying, played: fraction });
  };

  const handleJoinAudio = () => {
    setHasInteracted(true);
    if (playback?.type === 'youtube' && ytPlayer) {
      ytPlayer.playVideo?.();
    } else if (playback?.type === 'spotify') {
      spotifyPlayer?.resume();
    }
  };

  if (!room || !playback) return <div className="card h-full flex flex-col items-center justify-center text-[var(--color-on-surface-variant)] text-sm">Loading Player...</div>;

  const needsInteraction = playback.isPlaying && !actualPlaying && !hasInteracted && isReady;

  return (
    <div className="card h-full flex flex-col relative overflow-hidden group p-8 items-center justify-center">
      
      {!playback.url && (
        <div className="flex flex-col items-center gap-4 text-[var(--color-on-surface-variant)] opacity-60">
          <span className="material-symbols-outlined text-5xl">album</span>
          <h2 className="text-xl font-bold text-white">No Track Playing</h2>
          <p className="text-sm">Host can add a track from the right panel.</p>
        </div>
      )}

      {playback.url && spotifyError && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-lg text-sm font-medium z-50 flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          {spotifyError}
        </div>
      )}

      {playback.url && playback.type === 'spotify' && !spotifyToken && (
        <div className="absolute inset-0 bg-[var(--color-surface)]/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center">
           <span className="material-symbols-outlined text-4xl mb-4 text-[#1DB954]">lock</span>
           <h3 className="text-xl font-bold text-white mb-2">Spotify Connection Required</h3>
           <p className="text-[var(--color-on-surface-variant)] text-sm mb-6 max-w-sm">Connect your Spotify Premium account to hear this track.</p>
           <button 
             onClick={() => window.location.href = `/api/spotify/login?roomId=${room.id}`}
             className="px-6 py-2 bg-[#1DB954] text-black rounded-full font-bold hover:bg-[#1ed760] transition-colors shadow-sm"
           >
             Connect Spotify
           </button>
        </div>
      )}

      {playback.url && needsInteraction && (
        <div className="absolute inset-0 bg-[var(--color-surface)]/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
           <span className="material-symbols-outlined text-4xl mb-4 text-[var(--color-primary)]">volume_off</span>
           <h3 className="text-xl font-bold text-white mb-2">Playback Paused</h3>
           <p className="text-[var(--color-on-surface-variant)] text-sm mb-6 max-w-sm">Your browser blocked audio autoplay. Click below to join the playback.</p>
           <button 
             onClick={handleJoinAudio}
             className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-full font-bold hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm flex items-center gap-2"
           >
             <span className="material-symbols-outlined text-[18px]">volume_up</span>
             Enable Audio
           </button>
        </div>
      )}

      {/* Invisible YouTube Player */}
      <div className="absolute opacity-0 pointer-events-none -z-50 w-[200px] h-[200px] left-[-9999px] top-[-9999px]">
         <div ref={ytPlayerContainerRef} className="w-full h-full" />
      </div>

      {/* Vinyl Record Display */}
      {playback?.url && (
        <div className="w-full max-w-sm aspect-square mb-8 relative flex items-center justify-center">
          <div className={`w-64 h-64 md:w-80 md:h-80 rounded-full bg-[#111] shadow-[0_0_20px_rgba(0,0,0,0.8)] border-4 border-[#222] relative flex items-center justify-center ${actualPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
            {/* Vinyl grooves */}
            <div className="absolute inset-4 rounded-full border border-white/5"></div>
            <div className="absolute inset-8 rounded-full border border-white/5"></div>
            <div className="absolute inset-12 rounded-full border border-white/5"></div>
            <div className="absolute inset-16 rounded-full border border-white/5"></div>
            
            {/* Center Label (Thumbnail or fallback) */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden relative z-10 border-4 border-black bg-[var(--color-primary)]">
              {playback.metadata?.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={playback.metadata.thumbnail} alt="Album Art" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-3xl">music_note</span>
                </div>
              )}
              {/* Spindle hole */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border border-gray-700 shadow-inner"></div>
            </div>
          </div>
        </div>
      )}

      {playback?.url && (
        <div className="w-full max-w-sm flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-1 truncate w-full text-center">
            {playback.metadata?.title || 'Unknown Title'}
          </h2>
          <p className="text-[var(--color-on-surface-variant)] text-sm mb-8 truncate w-full text-center">
            {playback.metadata?.artist || (playback.type === 'youtube' ? 'YouTube Audio' : 'Spotify Audio')}
          </p>

          <div className="w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs text-[var(--color-on-surface-variant)] font-medium">
              <span>
                {Math.floor((currentPlayedFraction * currentDurationMs) / 1000 / 60)}:
                {String(Math.floor(((currentPlayedFraction * currentDurationMs) / 1000) % 60)).padStart(2, '0')}
              </span>
              <span>
                {Math.floor((currentDurationMs / 1000) / 60)}:
                {String(Math.floor((currentDurationMs / 1000) % 60)).padStart(2, '0')}
              </span>
            </div>
            
            <input 
              type="range" 
              min={0} max={1} step="any"
              value={currentPlayedFraction || 0}
              onChange={handleSeek}
              disabled={!isHost}
              className="w-full h-1 bg-[var(--color-outline)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] focus:outline-none"
            />
            
            <div className="flex justify-center items-center gap-6 mt-6">
              <button disabled className="text-[var(--color-on-surface-variant)] hover:text-white transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined text-2xl">skip_previous</span>
              </button>
              
              <button 
                onClick={handlePlayPause}
                disabled={!isHost}
                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
              >
                <span className="material-symbols-outlined text-3xl">
                  {playback.isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>

              <button 
                onClick={() => {
                  setHasInteracted(true);
                  if (isHost) socket.emit('play-next');
                }}
                disabled={!isHost || !playback.url} 
                className="text-[var(--color-on-surface-variant)] hover:text-white transition-colors disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-2xl">skip_next</span>
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] text-sm">volume_down</span>
              <input 
                type="range" 
                min={0} max={1} step="any"
                value={volume}
                onChange={(e) => {
                  setHasInteracted(true);
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (playback.type === 'spotify') spotifyPlayer?.setVolume(val);
                  if (playback.type === 'youtube' && ytPlayer) ytPlayer.setVolume(val * 100);
                }}
                className="w-24 h-1 bg-[var(--color-outline)] rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
              />
              <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] text-sm">volume_up</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
