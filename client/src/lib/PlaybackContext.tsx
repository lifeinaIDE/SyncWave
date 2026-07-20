'use client';

import React, { createContext, useContext, useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { extractSpotifyTrackId, extractYouTubeVideoId } from '@/lib/urlUtils';

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface PlaybackContextType {
  actualPlaying: boolean;
  hasInteracted: boolean;
  setHasInteracted: (v: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  currentPlayedFraction: number;
  currentDurationMs: number;
  spotifyError: string | null;
  isReady: boolean;
  handlePlayPause: () => void;
  handleManualSync: () => void;
  handleSeek: (fraction: number) => void;
  handleNext: () => void;
  handlePrev: () => void;
  ytPlayer: any;
  spotifyPlayer: any;
  videoBounds: { top: number; left: number; width: number; height: number; active: boolean };
  setVideoBounds: (bounds: { top: number; left: number; width: number; height: number; active: boolean }) => void;
  syncRequired: boolean;
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);

export function PlaybackProvider({ room, socket, children }: { room: any; socket: any; children: ReactNode }) {
  // Global States
  const [actualPlaying, setActualPlaying] = useState(false);
  const [syncRequired, setSyncRequired] = useState(false);
  const [hasInteracted, setHasInteractedState] = useState(false);
  const [videoBounds, setVideoBounds] = useState({ top: 0, left: 0, width: 0, height: 0, active: false });
  
  const setHasInteracted = useCallback((v: boolean) => {
    setHasInteractedState(v);
    if (v && typeof window !== 'undefined') {
      sessionStorage.setItem('syncwave_interacted', 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('syncwave_interacted') === 'true') {
      setHasInteractedState(true);
    }
  }, []);

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

  // CLEAR CACHE ON EMPTY QUEUE
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

  // YOUTUBE INIT
  useEffect(() => {
    if (ytPlayer) return;

    const loadYT = () => {
      const videoId = extractYouTubeVideoId(playback?.url || '');

      if (!ytPlayerContainerRef.current) return;

      const player = new window.YT.Player(ytPlayerContainerRef.current, {
        videoId: videoId || 'dQw4w9WgXcQ', // Dummy video to initialize player eagerly
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          modestbranding: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
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
              currentPlayedFractionRef.current = 0;
              isTransitioningRef.current = true;
              socket?.emit('play-next');
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
  }, []); // Eager init on mount

  // SPOTIFY INIT
  const isSpotifyInitRef = useRef(false);

  useEffect(() => {
    if (!spotifyToken) return;

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
  }, [spotifyToken, volume]);

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

  // PLAYBACK STATE SYNC
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

    // UPDATE MEDIA SESSION API FOR BACKGROUND PLAYBACK
    if ('mediaSession' in navigator && playback?.metadata) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: playback.metadata.title || 'SyncWave',
        artist: playback.metadata.artist || 'SyncWave Audio',
        artwork: playback.metadata.thumbnail ? [
          { src: playback.metadata.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });

      navigator.mediaSession.setActionHandler('play', () => {
        setActualPlaying(true);
        if (playback.type === 'youtube') ytPlayer?.playVideo?.();
        else if (playback.type === 'spotify') spotifyPlayer?.resume().catch(() => setSyncRequired(true));
        socket?.emit('playback-sync', { isPlaying: true, played: currentPlayedFractionRef.current });
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setActualPlaying(false);
        if (playback.type === 'youtube') ytPlayer?.pauseVideo?.();
        else if (playback.type === 'spotify') spotifyPlayer?.pause().catch(() => {});
        socket?.emit('playback-sync', { isPlaying: false, played: currentPlayedFractionRef.current });
      });

      if (isHost) {
        navigator.mediaSession.setActionHandler('nexttrack', () => socket?.emit('play-next'));
        navigator.mediaSession.setActionHandler('previoustrack', () => socket?.emit('play-prev'));
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    }

  }, [playback, isHost, isReady, deviceId, playSpotifyTrack, spotifyPlayer, ytPlayer, socket]); 

  // POLLING LOOP
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
                 socket?.emit('play-next');
               } else if (Math.random() < 0.1 && !isTransitioningRef.current) {
                 socket?.emit('playback-sync', { isPlaying: true, played: fraction });
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
               if (fraction > 0.995 && state.duration > 0 && !state.paused && !isTransitioningRef.current) {
                 currentPlayedFractionRef.current = 0;
                 isTransitioningRef.current = true;
                 socket?.emit('play-next');
               } else if (Math.random() < 0.1 && !isTransitioningRef.current) {
                 socket?.emit('playback-sync', { isPlaying: true, played: fraction });
               }
            }
          }
        }
        // Update Media Session Position for background scrubbing
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
          try {
            navigator.mediaSession.setPositionState({
              duration: currentDurationRef.current / 1000,
              playbackRate: 1,
              position: (currentPlayedFractionRef.current * currentDurationRef.current) / 1000
            });
          } catch (e) {}
        }
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playback, ytPlayer, spotifyPlayer, actualPlaying, socket]);

  // VOLUME SYNC
  useEffect(() => {
    if (ytPlayer && ytPlayer.setVolume) {
      ytPlayer.setVolume(volume * 100);
    }
    if (spotifyPlayer) {
      spotifyPlayer.setVolume(volume).catch(() => {});
    }
  }, [volume, ytPlayer, spotifyPlayer]);

  // BLOCKAGE DETECTION
  useEffect(() => {
    if (actualPlaying) {
      setSyncRequired(false);
    } else if (playback?.isPlaying && !actualPlaying) {
      // If the room is playing but we aren't, wait 2 seconds. If still not playing, the browser blocked it.
      const timer = setTimeout(() => {
        setSyncRequired(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [playback?.isPlaying, actualPlaying]);

  // CONTROLS
  const handlePlayPause = () => {
    if (!playback?.url) return;
    
    // Explicit user interaction unlocks audio context
    setHasInteracted(true);
    setSyncRequired(false);
    
    const newIsPlaying = !actualPlaying;
    setActualPlaying(newIsPlaying);
    
    // Synchronous execution for mobile browser gesture tracking
    if (playback?.type === 'youtube' && ytPlayer) {
      ytPlayer.unMute?.();
      if (newIsPlaying) ytPlayer.playVideo?.();
      else ytPlayer.pauseVideo?.();
    } else if (playback?.type === 'spotify' && spotifyPlayer) {
      if (newIsPlaying) spotifyPlayer.resume().catch(() => {});
      else spotifyPlayer.pause().catch(() => {});
    }
    socket?.emit('playback-sync', { isPlaying: newIsPlaying, played: currentPlayedFractionRef.current });
  };

  const handleManualSync = () => {
    // Explicitly invoked by the user clicking the "Tap to Sync" overlay on mobile
    setHasInteracted(true);
    setSyncRequired(false);
    
    if (playback?.type === 'youtube' && ytPlayer) {
      ytPlayer.unMute?.();
      ytPlayer.playVideo?.();
    } else if (playback?.type === 'spotify' && spotifyPlayer) {
      spotifyPlayer.resume().catch(() => {});
    }
    
    setActualPlaying(true);
  };

  const handleInitialUnlock = () => {
    setHasInteracted(true);
    // Explicitly force the audio context open globally for all subsequent automated calls
    if (ytPlayer) {
      ytPlayer.unMute?.();
      ytPlayer.playVideo?.();
      setTimeout(() => {
        if (!playback?.isPlaying) {
          ytPlayer.pauseVideo?.();
        }
      }, 200);
    }
  };

  const handleSeek = (fraction: number) => {
    setCurrentPlayedFraction(fraction);
    currentPlayedFractionRef.current = fraction;
    
    if (playback?.type === 'youtube' && ytPlayer) {
      const duration = ytPlayer.getDuration?.() || 0;
      ytPlayer.seekTo(fraction * duration, true);
    } else if (playback?.type === 'spotify' && spotifyPlayer) {
      spotifyPlayer.seek(fraction * currentDurationRef.current).catch(() => {});
    }
    socket?.emit('playback-sync', { isPlaying: actualPlaying, played: fraction });
  };

  const handleNext = () => socket?.emit('play-next');
  const handlePrev = () => socket?.emit('play-prev');

  const value = {
    actualPlaying,
    hasInteracted,
    setHasInteracted,
    volume,
    setVolume,
    currentPlayedFraction,
    currentDurationMs,
    spotifyError,
    isReady,
    handlePlayPause,
    handleManualSync,
    handleSeek,
    handleNext,
    handlePrev,
    ytPlayer,
    spotifyPlayer,
    videoBounds,
    setVideoBounds,
    syncRequired,
  };

  return (
    <PlaybackContext.Provider value={value}>
      {/* Hidden YouTube Player (dynamically positions over UI vinyls when active) */}
      <div 
        className="fixed pointer-events-none rounded-full overflow-hidden transition-all duration-300 ease-out"
        style={{
          top: videoBounds.active ? videoBounds.top : 0,
          left: videoBounds.active ? videoBounds.left : 0,
          width: videoBounds.active ? videoBounds.width : 200,
          height: videoBounds.active ? videoBounds.height : 200,
          zIndex: videoBounds.active ? 10 : -50,
          opacity: videoBounds.active ? 1 : 0.01,
        }}
      >
        <div ref={ytPlayerContainerRef} className="w-[300%] h-[300%] -ml-[100%] -mt-[100%] pointer-events-none"></div>
      </div>
      
      {/* Global Audio Context Initializer Overlay */}
      <AnimatePresence>
        {!hasInteracted && isReady && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-24 h-24 bg-[var(--color-primary)] rounded-full flex items-center justify-center animate-bounce shadow-[0_0_60px_rgba(30,215,96,0.5)] mb-8">
              <span className="material-symbols-outlined text-white text-5xl">headphones</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">Start Listening</h1>
            <p className="text-[var(--color-on-surface-variant)] text-lg mb-10 max-w-sm">
              SyncWave requires audio permission to perfectly synchronize your music with the room.
            </p>
            <button 
              onClick={handleInitialUnlock}
              className="px-10 py-4 bg-white text-black text-xl font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Enable Audio
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
}

export function useTrackVideoBounds(playback: any) {
  const { setVideoBounds } = usePlayback();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || playback?.type !== 'youtube') {
      setVideoBounds({ top: 0, left: 0, width: 0, height: 0, active: false });
      return;
    }

    let animationFrameId: number;
    const updateBounds = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        // Check if the element is actually visible and has dimensions
        if (rect.width > 0 && rect.height > 0) {
          setVideoBounds({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            active: true
          });
        }
      }
      animationFrameId = requestAnimationFrame(updateBounds);
    };

    animationFrameId = requestAnimationFrame(updateBounds);

    return () => {
      cancelAnimationFrame(animationFrameId);
      setVideoBounds({ top: 0, left: 0, width: 0, height: 0, active: false });
    };
  }, [playback?.url, playback?.type, setVideoBounds]);

  return ref;
}
