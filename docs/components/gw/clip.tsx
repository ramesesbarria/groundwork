'use client';
import { useEffect, useRef } from 'react';

// A screen recording that only plays while it's on screen. Autoplaying every clip at once loads
// all of them up front; this loads metadata only, then plays and pauses with visibility.
// Reduced motion: no autoplay, the controls are there to press play.
export function Clip({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      aria-label={label}
      muted
      loop
      playsInline
      controls
      preload="metadata"
      className="block h-auto w-full bg-black"
    />
  );
}
