import type { DeviceType } from '../types';

const TABLET_BREAKPOINT = 1024;
const MOBILE_BREAKPOINT = 768;

export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const width = window.innerWidth;
  const ua = window.navigator.userAgent.toLowerCase();

  const isTabletByUa = /ipad|tablet|kindle|playbook/.test(ua);
  const isMobileByUa = /iphone|android|mobile|phone/.test(ua);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;

  if (isTabletByUa || (coarsePointer && width <= TABLET_BREAKPOINT && width > MOBILE_BREAKPOINT)) {
    return 'tablet';
  }

  if (isMobileByUa || (coarsePointer && width <= MOBILE_BREAKPOINT)) {
    return 'mobile';
  }

  return 'desktop';
}
