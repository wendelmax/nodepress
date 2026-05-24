"use client"

import React, { useEffect, useState } from 'react';
import { Music } from 'lucide-react';

const lyrics = [
  "I said hello, Dolly",
  "Well, hello, Dolly",
  "It's so nice to have you back where you belong",
  "You're lookin' swell, Dolly",
  "I can tell, Dolly",
  "You're still glowin', you're still crowin'",
  "You're still goin' strong",
  "We feel the room swayin'",
  "While the band's playin'",
  "One of your old favourite songs from way back when",
  "So, take her wrap, fellas",
  "Find her an empty lap, fellas",
  "Dolly'll never go away again"
];

export function HelloDollyWidget() {
  const [mounted, setMounted] = React.useState(false);
  const [lyric, setLyric] = React.useState("");

  React.useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
    Promise.resolve().then(async () => {
      try {
        const res = await fetch("/api/options?keys=active_plugins")
        if (res.ok) {
          const data = await res.json()
          const activePlugins = data.active_plugins ? JSON.parse(data.active_plugins) : ['hello-dolly', 'seo-optimizer']
          if (!activePlugins.includes('hello-dolly')) {
            return
          }
        }
      } catch (e) {}
      setLyric(lyrics[Math.floor(Math.random() * lyrics.length)]);
    })
  }, []);

  if (!mounted || !lyric) return null;

  return (
    <div className="flex items-center justify-center p-3 text-sm text-text-secondary bg-surface-elevated border border-border rounded-xl shadow-soft">
      <Music size={16} className="mr-2 text-primary-light" aria-hidden="true" /> {lyric}
    </div>
  );
}
