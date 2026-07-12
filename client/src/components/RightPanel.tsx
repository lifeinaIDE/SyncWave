import { useState } from 'react';
import { detectPlatform, fetchYouTubeMetadata, fetchSpotifyMetadata } from '@/lib/urlUtils';

export default function RightPanel({ room, socket, isHost }: { room: any, socket: any, isHost: boolean }) {
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!room) return null;

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = url.trim();
    if (!rawUrl) return;

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

  const handlePlayQueued = (index: number) => {
    if (isHost) {
      socket.emit('play-queued-song', index);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white tracking-tight mb-4">Add to Queue</h2>
        <form onSubmit={handleAddSong} className="flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Paste YouTube or Spotify link..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-outline)] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
          />
          <button 
            type="submit"
            disabled={!url.trim() || isAdding}
            className="w-full py-3 bg-white text-black hover:bg-gray-200 disabled:opacity-50 rounded-lg font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <><span className="material-symbols-outlined animate-spin">sync</span> Adding...</>
            ) : (
              'Add Song'
            )}
          </button>
        </form>
      </div>

      <div className="card p-6 flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Up Next</h2>
          <span className="text-sm font-medium text-[var(--color-on-surface-variant)] bg-[var(--color-background)] px-3 py-1 rounded-full border border-[var(--color-outline)]">
            {room.queue.length} songs
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
          {room.queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center border-2 border-dashed border-[var(--color-outline)] rounded-xl bg-[var(--color-background)] opacity-70">
              <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] text-3xl mb-2">queue_music</span>
              <p className="text-sm text-[var(--color-on-surface-variant)]">Queue is empty</p>
            </div>
          ) : (
            room.queue.map((song: any, index: number) => (
              <div 
                key={index} 
                onClick={() => handlePlayQueued(index)}
                className={`flex items-center gap-4 p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-outline)] transition-colors group ${isHost ? 'cursor-pointer hover:border-[var(--color-primary)]' : ''}`}
                title={isHost ? "Click to play immediately" : ""}
              >
                {song.metadata?.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={song.metadata.thumbnail} alt="thumbnail" className="w-12 h-12 rounded object-cover shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded bg-[var(--color-surface)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--color-on-surface-variant)]">music_note</span>
                  </div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="font-semibold text-white truncate text-sm">
                    {song.metadata?.title || 'Unknown Title'}
                  </span>
                  <span className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
                    {song.metadata?.artist || 'Unknown Artist'}
                  </span>
                </div>
                {isHost && (
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-xl">play_circle</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
