"use client"

import React from 'react';

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
    setMounted(true);
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
    <div style={{
      display: 'inline-block',
      marginLeft: '15px',
      color: '#c3c4c7',
      fontSize: '13px',
      fontStyle: 'italic',
      userSelect: 'none'
    }}>
      <span aria-hidden="true">🎵</span> {lyric}
    </div>
  );
}
