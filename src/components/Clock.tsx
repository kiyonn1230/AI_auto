'use client';

import { useEffect, useState } from 'react';

export default function Clock() {
  // サーバーとクライアントで時刻がずれるため、初期値はプレースホルダーにしておく。
  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('ja-JP', { hour12: false }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className="clock">{time}</span>;
}
