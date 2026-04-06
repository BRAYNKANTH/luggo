'use client'

// This page is served by the service worker when the user is offline
// and navigates to a page not in the cache.
// It must be fully self-contained — no data fetching, no server actions.

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-ocean-900 text-white flex flex-col items-center justify-center px-6 text-center">
      {/* Animated luggage icon */}
      <div className="mb-8 relative">
        <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center">
          <svg
            width="52"
            height="52"
            viewBox="0 0 22 22"
            fill="none"
            className="opacity-80"
          >
            <path
              d="M8 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
              stroke="#038cc9"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <rect x="2" y="7" width="18" height="13" rx="2" fill="#038cc9" />
            <rect x="2" y="12" width="18" height="2" fill="#011a2e" opacity="0.4" />
            <rect x="9" y="10" width="4" height="4" rx="1" fill="#f0c040" />
          </svg>
        </div>

        {/* Wifi-off badge */}
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M2 2l20 20M8.5 8.5A7 7 0 0 1 19.5 12M5 5a11 11 0 0 0-3 7M12 17h.01"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-extrabold mb-2">You&apos;re offline</h1>
      <p className="text-white/60 text-sm mb-8 max-w-xs leading-relaxed">
        Looks like you&apos;ve lost your internet connection.
        Check your Wi-Fi or mobile data and try again.
      </p>

      {/* Retry button — pure client-side reload */}
      <button
        onClick={() => window.location.reload()}
        className="bg-brand text-white font-semibold px-8 py-3 rounded-2xl text-sm active:scale-95 transition-transform"
      >
        Try again
      </button>

      <p className="text-white/30 text-xs mt-8">
        Pages you&apos;ve visited recently may still be available.
      </p>
    </div>
  )
}
