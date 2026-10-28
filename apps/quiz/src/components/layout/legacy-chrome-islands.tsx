'use client';

import dynamic from 'next/dynamic';

// The client parts of the flag-off site chrome (both site layouts after `if (UX_V1)`, and TopNav),
// loaded through next/dynamic (SEO phase 1, 2026-10-27). Static imports put them in the first-load
// chunks of every flag-on page, where the UX v1 shell renders instead. A flag-off page still renders
// them on the server (dynamic keeps SSR) and loads their chunks only there. MobileTabBar is not here:
// the UX v1 chrome gate renders it on Verse routes, so it stays a static import.

export const MobileTopBar = dynamic(() => import('./mobile-top-bar').then((m) => m.MobileTopBar));
export const SiteFooter = dynamic(() => import('./site-footer').then((m) => m.SiteFooter));
export const TopNavBar = dynamic(() => import('./top-nav-bar').then((m) => m.TopNavBar));
export const TopNavProfile = dynamic(() => import('./top-nav-profile').then((m) => m.TopNavProfile));
export const NotificationBell = dynamic(() => import('./notification-bell').then((m) => m.NotificationBell));
export const ThemeToggle = dynamic(() => import('./theme-toggle').then((m) => m.ThemeToggle));
