import { describe, expect, it } from 'vitest';

import { isCronAuthorized } from './cron-auth';

const req = (headers: Record<string, string>) => ({ headers: { get: (n: string) => headers[n.toLowerCase()] ?? null } });

describe('isCronAuthorized', () => {
  it('accepts the bearer secret Vercel sends', () => {
    expect(isCronAuthorized(req({ authorization: 'Bearer s3cret-value-123456' }), 's3cret-value-123456')).toBe(true);
  });

  it('refuses a wrong, missing or malformed header', () => {
    expect(isCronAuthorized(req({}), 's3cret')).toBe(false);
    expect(isCronAuthorized(req({ authorization: 'Bearer nope' }), 's3cret')).toBe(false);
    expect(isCronAuthorized(req({ authorization: 's3cret' }), 's3cret')).toBe(false);
    expect(isCronAuthorized(req({ authorization: 'bearer s3cret' }), 's3cret')).toBe(false);
  });

  it('the cron header alone is not a credential', () => {
    expect(isCronAuthorized(req({ 'x-vercel-cron': '1' }), 's3cret')).toBe(false);
  });

  it('with no secret configured nobody is authorized', () => {
    expect(isCronAuthorized(req({ authorization: 'Bearer ' }), undefined)).toBe(false);
    expect(isCronAuthorized(req({ authorization: 'Bearer undefined' }), undefined)).toBe(false);
    expect(isCronAuthorized(req({ authorization: 'Bearer ' }), '')).toBe(false);
  });
});
