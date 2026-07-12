import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || ''; // this is the roomId
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback';

  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`/?error=missing_credentials`, request.url));
  }

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      },
      body: new URLSearchParams({
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const data = await res.json();

    if (data.access_token) {
      const cookieStore = await cookies();
      cookieStore.set('spotify_access_token', data.access_token, {
        maxAge: data.expires_in,
        path: '/',
        httpOnly: false, // client needs to read it for Web Playback SDK
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      if (data.refresh_token) {
        cookieStore.set('spotify_refresh_token', data.refresh_token, {
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }

      if (state) {
        return NextResponse.redirect(new URL(`/room/${state}`, request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    } else {
      return NextResponse.redirect(new URL(`/?error=auth_failed`, request.url));
    }
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL(`/?error=server_error`, request.url));
  }
}
