import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import nextConfig from '../../../../next.config';
import { buildUxStylesheet, uxStylesheetVersion } from './stylesheet';
import { UX_STYLESHEET_PATH, uxStylesheetHref } from './stylesheet-href';

// The flag-on stylesheet is cached immutable for a year, so its link must change with its
// content. 2026-10-06: a command-line deploy has VERCEL_GIT_COMMIT_SHA = '', the old `??`
// chain kept it and every such deploy linked `?v=`, one address serving the first deploy's CSS.

const here = path.dirname(fileURLToPath(import.meta.url));
const on = (v: string | undefined): boolean => v === '1' || v === 'true';

describe('stylesheet link version', () => {
  it('never ends with an empty v=', () => {
    for (const v of [undefined, null, '', '   ']) expect(uxStylesheetHref(v)).not.toMatch(/[?&]v=$/);
    expect(uxStylesheetHref('abc123def456')).toBe(`${UX_STYLESHEET_PATH}?v=abc123def456`);
  });

  it('the build inlines a hash of the very bytes the route serves', () => {
    const version = (nextConfig.env ?? {}).UX_CSS_VERSION;
    expect(version).toMatch(/^[0-9a-f]{12}$/);
    const v12 = on(process.env.NEXT_PUBLIC_UX_V1) && on(process.env.NEXT_PUBLIC_UX_V12);
    expect(version).toBe(uxStylesheetVersion(buildUxStylesheet({ v12 })));
    expect(uxStylesheetHref(version)).toMatch(/\?v=[0-9a-f]{12}$/);
  });

  it('a different sheet gets a different address', () => {
    expect(uxStylesheetVersion(buildUxStylesheet({ v12: true }))).not.toBe(uxStylesheetVersion(buildUxStylesheet({ v12: false })));
    expect(uxStylesheetVersion('.a{color:red}')).not.toBe(uxStylesheetVersion('.a{color:blue}'));
  });

  it('the root layout links it with the build hash, never with deploy variables', () => {
    const layout = fs.readFileSync(path.resolve(here, '../../../app/layout.tsx'), 'utf8');
    expect(layout).toContain('uxStylesheetHref(process.env.UX_CSS_VERSION)');
    expect(layout).not.toMatch(/VERCEL_GIT_COMMIT_SHA|VERCEL_DEPLOYMENT_ID/);
  });
});
