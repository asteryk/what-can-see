'use client';

import Script from 'next/script';
import { useCallback } from 'react';

declare global {
  interface Window {
    kofiWidgetOverlay?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draw: (username: string, opts: Record<string, any>) => void;
    };
  }
}

export default function KoFiWidget() {
  const onLoad = useCallback(() => {
    console.log('loaded ko-fi', new Date())
    if (window.kofiWidgetOverlay) {
      window.kofiWidgetOverlay.draw('yorkl', {
        type: 'floating-chat',
        'floating-chat.donateButton.text': 'Support Me',
        'floating-chat.donateButton.background-color': '#323842',
        'floating-chat.donateButton.text-color': '#fff',
      });
    } else {
        console.warn('no ko-fi')
    }
  }, []);

  return (
    <Script
      src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"
      strategy="afterInteractive"
      onLoad={onLoad}
    />
  );
}
