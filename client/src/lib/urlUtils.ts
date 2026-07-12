export type PlatformType = 'youtube' | 'spotify' | null;

export interface SongMetadata {
  title: string;
  artist: string;
  thumbnail: string;
}

export function detectPlatform(url: string): PlatformType {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('spotify.com/track')) return 'spotify';
  return null;
}

export function extractSpotifyTrackId(url: string): string | null {
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export async function fetchYouTubeMetadata(url: string): Promise<SongMetadata | null> {
  try {
    // using youtube oembed endpoint
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || 'Unknown Title',
      artist: data.author_name || 'Unknown Artist',
      thumbnail: data.thumbnail_url || ''
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return null;
  }
}

export async function fetchSpotifyMetadata(url: string, accessToken: string): Promise<SongMetadata | null> {
  const trackId = extractSpotifyTrackId(url);
  if (!trackId) return null;

  try {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.name,
      artist: data.artists.map((a: any) => a.name).join(', '),
      thumbnail: data.album.images[0]?.url || ''
    };
  } catch (error) {
    console.error('Error fetching Spotify metadata:', error);
    return null;
  }
}
