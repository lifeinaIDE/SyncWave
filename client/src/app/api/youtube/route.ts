import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch metadata from YouTube' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({
      title: data.title || 'Unknown Title',
      artist: data.author_name || 'Unknown Artist',
      thumbnail: data.thumbnail_url || ''
    });
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
