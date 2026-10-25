'use client';

export default function IslScorebugOverlayPage() {
  return (
    <div className="w-full h-full min-h-screen bg-transparent overflow-hidden flex items-start justify-center p-6">
      <iframe
        src="/overlays/isl-scorebug.html"
        className="w-full h-screen border-0 bg-transparent"
        allowTransparency
      />
    </div>
  );
}
