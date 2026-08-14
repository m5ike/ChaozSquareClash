import React, { useEffect, useState } from 'react';

// Lišta s upozorněním, když je telefon na výšku — hra je dělaná na šířku.
export default function OrientationWarning() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center py-1.5 px-4 text-xs text-white text-center font-medium"
      style={{ background: 'rgba(220,38,38,0.95)' }}
    >
      📱 Pro nejlepší zážitek otočte telefon do režimu na šířku
    </div>
  );
}
