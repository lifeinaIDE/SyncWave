"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [roomId, setRoomId] = useState("");

  const handleCreateRoom = () => {
    // Generate a simple 6 character room ID
    const newRoomId = "SW-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    router.push(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* Navbar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[var(--color-primary)] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xl">music_note</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">SyncWave</span>
        </div>
        <div className="flex gap-4">
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 w-full max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
          Listen Together.<br className="hidden md:block" /> Wherever You Are.
        </h1>
        <p className="text-lg md:text-xl text-[var(--color-on-surface-variant)] max-w-2xl mb-12">
          Create a private room, invite your friends, paste a music link, and enjoy synchronized playback in real-time. Minimal, elegant, and completely in sync.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mx-auto">
          {isJoining ? (
            <form onSubmit={handleJoinRoom} className="w-full flex gap-2">
              <input
                type="text"
                placeholder="Enter Room ID (e.g. SW-ABX7K2)"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                autoFocus
              />
              <button 
                type="submit"
                className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-lg transition-colors"
              >
                Join
              </button>
            </form>
          ) : (
            <>
              <button 
                onClick={handleCreateRoom}
                className="w-full sm:w-auto px-8 py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-xl transition-colors shadow-lg"
              >
                Create Room
              </button>
              <button 
                onClick={() => setIsJoining(true)}
                className="w-full sm:w-auto px-8 py-4 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-outline)] text-white font-semibold rounded-xl transition-colors"
              >
                Join Room
              </button>
            </>
          )}
        </div>
      </main>

      {/* Features Section */}
      <section className="w-full bg-[var(--color-surface)] border-y border-[var(--color-outline)] py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-background)] border border-[var(--color-outline)] flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[var(--color-primary)]">add_box</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Create a Room</h3>
            <p className="text-[var(--color-on-surface-variant)] leading-relaxed">
              Instantly generate a private listening space. No signup required. Just create and start sharing.
            </p>
          </div>
          <div className="flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-background)] border border-[var(--color-outline)] flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[var(--color-primary)]">link</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Share the Link</h3>
            <p className="text-[var(--color-on-surface-variant)] leading-relaxed">
              Send your unique room link to friends. They can join immediately from any browser.
            </p>
          </div>
          <div className="flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-background)] border border-[var(--color-outline)] flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[var(--color-primary)]">headphones</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Jam Together</h3>
            <p className="text-[var(--color-on-surface-variant)] leading-relaxed">
              Paste music links to add to the collaborative queue. Playback synchronizes instantly for everyone.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full py-24 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-16">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative">
          
          <div className="flex flex-col items-center gap-4 z-10 w-48">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-primary)] flex items-center justify-center text-xl font-bold text-white">1</div>
            <span className="font-semibold text-white">Create Room</span>
          </div>
          
          <div className="hidden md:block h-[2px] bg-[var(--color-outline)] flex-1 -mt-8"></div>
          
          <div className="flex flex-col items-center gap-4 z-10 w-48">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-outline)] flex items-center justify-center text-xl font-bold text-[var(--color-on-surface-variant)]">2</div>
            <span className="font-semibold text-[var(--color-on-surface-variant)]">Share Link</span>
          </div>
          
          <div className="hidden md:block h-[2px] bg-[var(--color-outline)] flex-1 -mt-8"></div>

          <div className="flex flex-col items-center gap-4 z-10 w-48">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-outline)] flex items-center justify-center text-xl font-bold text-[var(--color-on-surface-variant)]">3</div>
            <span className="font-semibold text-[var(--color-on-surface-variant)]">Paste Music</span>
          </div>
          
          <div className="hidden md:block h-[2px] bg-[var(--color-outline)] flex-1 -mt-8"></div>

          <div className="flex flex-col items-center gap-4 z-10 w-48">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-outline)] flex items-center justify-center text-xl font-bold text-[var(--color-on-surface-variant)]">4</div>
            <span className="font-semibold text-[var(--color-on-surface-variant)]">Listen Together</span>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-[var(--color-on-surface-variant)] text-sm border-t border-[var(--color-outline)]">
        <p>&copy; {new Date().getFullYear()} SyncWave. All rights reserved.</p>
      </footer>
    </div>
  );
}
