import { useEffect, useRef, useState } from 'react';

const getElapsedSeconds = (startedAt: string) => Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);

export function usePolling(startedAt?: string) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => (startedAt ? getElapsedSeconds(startedAt) : 0));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateElapsed = () => {
      setElapsedSeconds(startedAt ? getElapsedSeconds(startedAt) : 0);
    };

    const timeoutId = setTimeout(updateElapsed, 0);

    if (startedAt) {
      intervalRef.current = setInterval(updateElapsed, 1000);
    }

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const formatElapsed = () => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    if (mins > 0) return `${mins} 分 ${secs} 秒`;
    return `${secs} 秒`;
  };

  return { elapsedSeconds, formattedElapsed: formatElapsed() };
}
