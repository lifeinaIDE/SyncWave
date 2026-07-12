export default function LeftPanel({ room }: { room: any }) {
  if (!room) return null;

  const copyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Invite link copied to clipboard!");
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="card p-6 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Participants</h2>
          <span className="text-sm font-medium text-[var(--color-on-surface-variant)] bg-[var(--color-background)] px-3 py-1 rounded-full border border-[var(--color-outline)]">
            {room.participants.length} / 3
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
          {room.participants.map((p: any) => {
            const isHost = p.id === room.host;
            return (
              <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--color-background)] transition-colors border border-transparent hover:border-[var(--color-outline)]">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-outline)] flex items-center justify-center text-white font-bold text-lg">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--color-surface)]"></div>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-white">{p.name}</span>
                  <span className="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1">
                    {isHost ? (
                      <><span className="material-symbols-outlined text-[14px]">stars</span> Host</>
                    ) : (
                      <><span className="material-symbols-outlined text-[14px]">headphones</span> Listening</>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-[var(--color-on-surface-variant)] mb-4 uppercase tracking-wider">Invite Friends</h3>
        <button 
          onClick={copyInviteLink}
          className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">content_copy</span>
          Copy Invite Link
        </button>
      </div>
    </div>
  );
}
