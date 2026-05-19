import { useState, useEffect } from 'react';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

// sm  < 640
// md  640 – 1023
// lg  1024 – 1279
// xl  ≥ 1280
function getBreakpoint(w: number): Breakpoint {
  if (w < 640) return 'sm';
  if (w < 1024) return 'md';
  if (w < 1280) return 'lg';
  return 'xl';
}

export function useBreakpoint() {
  const [bp, setBp] = useState<Breakpoint>(() => getBreakpoint(window.innerWidth));

  useEffect(() => {
    const handler = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    bp,
    isSm:     bp === 'sm',
    isMobile: bp === 'sm',
    isTablet: bp === 'md',
    isDesktop: bp === 'lg' || bp === 'xl',
    isWide:   bp === 'xl',
    lte: (b: Breakpoint) => {
      const order: Breakpoint[] = ['sm', 'md', 'lg', 'xl'];
      return order.indexOf(bp) <= order.indexOf(b);
    },
    gte: (b: Breakpoint) => {
      const order: Breakpoint[] = ['sm', 'md', 'lg', 'xl'];
      return order.indexOf(bp) >= order.indexOf(b);
    },
  };
}
