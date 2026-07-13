'use client';
import { use, useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import LeftPanel from '@/components/LeftPanel';
import CenterPanel from '@/components/CenterPanel';
import RightPanel from '@/components/RightPanel';
import { useRouter } from 'next/navigation';
import { PlaybackProvider } from '@/lib/PlaybackContext';
import MobileRoomLayout from '@/components/mobile/MobileRoomLayout';

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  
  const [room, setRoom] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [joined, setJoined] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    s.on('room-state', (state) => {
      setRoom(state);
    });

    s.on('playback-update', (playback) => {
      setRoom((prev: any) => prev ? { ...prev, playback } : prev);
    });

    return () => {
      s.off('room-state');
      s.off('playback-update');
    };
  }, []);

  const handleJoin = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!userName.trim() || !socket) return;
    
    socket.emit('join-room', { roomId, name: userName.trim() }, (response: any) => {
      if (response.success) {
        setRoom(response.room);
        setJoined(true);
      } else {
        alert(response.error);
      }
    });
  };

  const handleLeave = () => {
    if (socket) socket.disconnect();
    router.push('/');
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-background)]">
        <div className="w-full max-w-md card p-8 flex flex-col gap-6 text-center">
          <div className="w-12 h-12 rounded bg-[var(--color-primary)] flex items-center justify-center mx-auto mb-2">
            <span className="material-symbols-outlined text-white text-2xl">music_note</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Join Room</h2>
          <p className="text-[var(--color-on-surface-variant)] text-sm mb-2">Room ID: <span className="font-mono text-white">{roomId}</span></p>
          
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input 
              type="text"
              placeholder="Enter your display name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-outline)] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
            <button 
              type="submit"
              onClick={handleJoin}
              disabled={!userName.trim()}
              className="w-full py-3 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 rounded-lg font-bold transition-colors shadow-sm"
            >
              Join Session
            </button>
          </form>
          <button onClick={() => router.push('/')} className="text-sm text-[var(--color-on-surface-variant)] hover:text-white mt-2 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const isHost = room?.host === socket?.id;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)] overflow-hidden">
      {/* Top Navbar */}
      <header className="h-[72px] border-b border-[var(--color-outline)] bg-[var(--color-surface)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[var(--color-primary)] flex items-center justify-center cursor-pointer" onClick={() => router.push('/')}>
            <span className="material-symbols-outlined text-white text-xl">music_note</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">SyncWave</span>
          <span className="text-[var(--color-outline)] mx-2">|</span>
          <span className="text-sm font-medium text-[var(--color-on-surface-variant)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Room: {roomId}
          </span>
        </div>
        
        <button onClick={handleLeave} className="text-sm font-medium text-[var(--color-on-surface-variant)] hover:text-white transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Leave Room
        </button>
      </header>
      
      <PlaybackProvider room={room} socket={socket}>
        {/* Desktop Layout (Hidden on mobile) */}
        <main className="hidden lg:grid flex-1 w-full max-w-[1600px] mx-auto p-6 grid-cols-12 gap-6 h-[calc(100vh-72px)] overflow-hidden">
          {/* Left Panel: 3/12 */}
          <div className="col-span-3 h-full overflow-hidden">
            <LeftPanel room={room} />
          </div>
          
          {/* Center Panel: 6/12 */}
          <div className="col-span-6 h-full overflow-hidden">
            <CenterPanel room={room} socket={socket} />
          </div>

          {/* Right Panel: 3/12 */}
          <div className="col-span-3 h-full overflow-hidden">
            <RightPanel room={room} socket={socket} isHost={isHost} />
          </div>
        </main>

        {/* Mobile Layout (Hidden on desktop) */}
        <div className="block lg:hidden flex-1 h-[calc(100vh-72px)] overflow-hidden relative">
          <MobileRoomLayout room={room} socket={socket} />
        </div>
      </PlaybackProvider>
    </div>
  );
}
