"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { BLUR_DATA_URL } from "@/lib/utils";

function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m?.[1] ?? null;
}

/**
 * "Watch Our Process" card. Shows only the poster image until clicked;
 * the YouTube iframe / MP4 is created on demand (no video bytes on load).
 */
export function VideoCard({
  poster,
  videoUrl,
  label,
  fallbackHref,
}: {
  poster: string;
  videoUrl: string | null;
  label: string;
  fallbackHref: string;
}) {
  const [playing, setPlaying] = useState(false);
  const yt = videoUrl ? youtubeId(videoUrl) : null;

  const inner = (
    <>
      <Image src={poster} alt="" fill sizes="(max-width: 768px) 100vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
      <div className="absolute inset-0 bg-[#1f1a17]/25" />
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#F6EEE7]">
        <span className="inline-flex size-16 items-center justify-center rounded-full border border-[#F6EEE7]/80 bg-[#1f1a17]/20 backdrop-blur-sm transition-transform group-hover:scale-105">
          <Play className="ml-1 size-6 fill-current stroke-0" aria-hidden="true" />
        </span>
        <span className="text-sm tracking-wide">{label}</span>
      </span>
    </>
  );

  if (playing && videoUrl) {
    return (
      <div className="relative min-h-[320px] overflow-hidden rounded-2xl bg-black md:min-h-[400px]">
        {yt ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1`}
            title={label}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <video src={videoUrl} poster={poster} controls autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
    );
  }

  if (!videoUrl) {
    // No video configured yet (Admin → Content → Banners) — link to the process story instead.
    return (
      <Link href={fallbackHref} className="group relative block min-h-[320px] overflow-hidden rounded-2xl md:min-h-[400px]" aria-label={`${label} — read about our process`}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block min-h-[320px] w-full overflow-hidden rounded-2xl text-left md:min-h-[400px]"
      aria-label={`Play video: ${label}`}
    >
      {inner}
    </button>
  );
}
