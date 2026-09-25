// UX v11 line icons, copied from the prototype's <symbol> set
// (docs/design/ux-dashboard-v1/prototype.html). 20px default, 1.5 stroke,
// round caps and joins (DESIGN-SPEC 16.4). Each entry = [viewBox, inner SVG].
// The inner markup is a trusted constant rendered by <Icon>; never feed user
// input into this map.

export const UX_ICONS = {
  "search": ['0 0 24 24', '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'],
  "plus": ['0 0 24 24', '<path d="M12 5v14M5 12h14"/>'],
  "flame": ['0 0 24 24', '<path d="M12 3c.8 3.6-3.6 5.6-3.6 9.6a3.6 3.6 0 0 0 7.2.3c0-1.8-.8-2.9-1.6-3.8.2 1.4-.4 2.4-1.2 2.6 0-3.3 1.2-5.8-.8-8.7Z"/><path d="M8.4 12.6A5.6 5.6 0 0 0 12 21a5.6 5.6 0 0 0 5.6-5.6c0-2.2-1-3.8-2-5"/>'],
  "bell": ['0 0 24 24', '<path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>'],
  "user": ['0 0 24 24', '<circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5"/>'],
  "home": ['0 0 24 24', '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z"/>'],
  "layers": ['0 0 24 24', '<path d="m12 4 8.5 4.2L12 12.4 3.5 8.2 12 4Z"/><path d="m3.5 12.2 8.5 4.2 8.5-4.2M3.5 16.2l8.5 4.2 8.5-4.2"/>'],
  "grid": ['0 0 24 24', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'],
  "music": ['0 0 24 24', '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'],
  "users": ['0 0 24 24', '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5c.4-3 2.7-5 5.5-5s5.1 2 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16 14.6c2.3.2 4 1.9 4.4 4.9"/>'],
  "trophy": ['0 0 24 24', '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4.5A1.5 1.5 0 0 0 3 7.5 3.5 3.5 0 0 0 6.5 11H7M17 6h2.5A1.5 1.5 0 0 1 21 7.5 3.5 3.5 0 0 1 17.5 11H17"/>'],
  "chev": ['0 0 24 24', '<path d="m6 9 6 6 6-6"/>'],
  "right": ['0 0 24 24', '<path d="m9 6 6 6-6 6"/>'],
  "arrow": ['0 0 24 24', '<path d="M5 12h14M13 6l6 6-6 6"/>'],
  "x": ['0 0 24 24', '<path d="M6 6l12 12M18 6 6 18"/>'],
  "check": ['0 0 24 24', '<path d="m5 12.5 4.5 4.5L19 7.5"/>'],
  "play": ['0 0 24 24', '<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>'],
  "share": ['0 0 24 24', '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/>'],
  "heart": ['0 0 24 24', '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z"/>'],
  "msg": ['0 0 24 24', '<path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3.5V6a1 1 0 0 1 1-1Z"/>'],
  "link": ['0 0 24 24', '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.4 1.4"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.4-1.4"/>'],
  "gear": ['0 0 24 24', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3.5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.4V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.2.4Z"/>'],
  "moon": ['0 0 24 24', '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>'],
  "sun": ['0 0 24 24', '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'],
  "eye": ['0 0 24 24', '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>'],
  "out": ['0 0 24 24', '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>'],
  "book": ['0 0 24 24', '<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16V4.5Z"/><path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19"/>'],
  "bulb": ['0 0 24 24', '<path d="M9 18h6M10 21h4M12 3a6.5 6.5 0 0 0-3.8 11.8c.6.5.8 1.1.8 1.7V17h6v-.5c0-.6.2-1.2.8-1.7A6.5 6.5 0 0 0 12 3Z"/>'],
  "clock": ['0 0 24 24', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
  "vol": ['0 0 24 24', '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>'],
  "mute": ['0 0 24 24', '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z"/><path d="m16 10 4 4M20 10l-4 4"/>'],
  "star": ['0 0 24 24', '<path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.8Z"/>'],
  "t-classic": ['0 0 24 24', '<circle cx="6" cy="7" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="6" cy="17" r="1.2"/><path d="M10 7h9M10 12h9M10 17h6"/>'],
  "t-tf": ['0 0 24 24', '<rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="15.5" cy="12" r="2.6"/>'],
  "t-clue": ['0 0 24 24', '<circle cx="10.5" cy="10.5" r="6"/><path d="m19.5 19.5-4.5-4.5M10.5 8v3M10.5 13.2v.3"/>'],
  "t-image": ['0 0 24 24', '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.5 5-4.5 3 2.5 3-3.5 5 5"/>'],
  "t-intruder": ['0 0 24 24', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><path d="m14.5 14.5 5 5M19.5 14.5l-5 5"/>'],
  "cal": ['0 0 24 24', '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'],
  "target": ['0 0 24 24', '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'],
  "flag": ['0 0 24 24', '<path d="M5 21V4.5M5 4.5h11l-2 4 2 4H5"/>'],
  "dots": ['0 0 24 24', '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>'],
  "copy": ['0 0 24 24', '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>'],
  "pen": ['0 0 24 24', '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'],
  "upload": ['0 0 24 24', '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/>'],
  "globe": ['0 0 24 24', '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5Z"/>'],
  "redo": ['0 0 24 24', '<path d="M19 8.5A7.5 7.5 0 1 0 19.5 14"/><path d="M19.5 4v4.5H15"/>'],
  "medal": ['0 0 24 24', '<circle cx="12" cy="14" r="5.5"/><path d="M8.5 9.5 6 3.5h4l2 4.5 2-4.5h4l-2.5 6"/>'],
  "zap": ['0 0 24 24', '<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z"/>'],
  "mail": ['0 0 24 24', '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>'],
  "hash": ['0 0 24 24', '<path d="M9 4 7 20M17 4l-2 16M4.5 9h15M3.5 15h15"/>'],
  "at": ['0 0 24 24', '<circle cx="12" cy="12" r="3.5"/><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.3 6.7"/>'],
  "img": ['0 0 24 24', '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.5 5-4.5 3 2.5 3-3.5 5 5"/>'],
  "drag": ['0 0 24 24', '<circle cx="9" cy="6" r="1.1"/><circle cx="15" cy="6" r="1.1"/><circle cx="9" cy="12" r="1.1"/><circle cx="15" cy="12" r="1.1"/><circle cx="9" cy="18" r="1.1"/><circle cx="15" cy="18" r="1.1"/>'],
  "trash": ['0 0 24 24', '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 13h9l1-13M9.5 7V4.5h5V7"/>'],
  "alert": ['0 0 24 24', '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5M12 15.8v.2"/>'],
  "enter": ['0 0 24 24', '<path d="M19 5v7a3 3 0 0 1-3 3H6M9.5 11.5 6 15l3.5 3.5"/>'],
  "shield": ['0 0 96 112', '<path d="M48 2 92 18v32c0 28-19 48-44 60C23 98 4 78 4 50V18L48 2Z"/>'],
  "note": ['0 0 24 24', '<path d="M6 3.5h8.5L19 8v12.5H6V3.5Z"/><path d="M14 3.5V8.5h5M9 12.5h6M9 16h6"/>'],
  "blog": ['0 0 24 24', '<path d="M5 4h14v16H5z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>'],
  "debate": ['0 0 24 24', '<path d="M4 6.5h9M4 12h16M4 17.5h6"/>'],
} as const satisfies Record<string, readonly [string, string]>;

export type UxIconName = keyof typeof UX_ICONS;

/** Quiz type -> glyph (prototype TYPE map: classic, tf, clue, image, intruder). */
export const QUIZ_TYPE_ICON: Record<string, UxIconName> = {
  multiple_choice: 't-classic',
  true_false: 't-tf',
  guess_from_clues: 't-clue',
  image: 't-image',
  intruder: 't-intruder',
};

/** Quiz type -> label, in the prototype's words. */
export const QUIZ_TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Classic',
  true_false: 'True/false',
  guess_from_clues: 'Clues',
  image: 'Image',
  intruder: 'Intruder',
};
