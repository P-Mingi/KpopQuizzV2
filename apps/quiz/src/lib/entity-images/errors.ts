// Run O1 (ADM back): one error type for everything an admin image route refuses, with the HTTP status and plain words.

export type ImageErrorCode =
  | 'bad_request' | 'bad_kind' | 'bad_slug' | 'bad_meta' | 'bad_focal' | 'unknown_entity' | 'no_image'
  | 'too_large' | 'unsupported_type' | 'invalid_image' | 'image_too_small'
  | 'bad_url' | 'blocked_address' | 'dns_failed' | 'too_many_redirects' | 'timeout' | 'fetch_failed'
  | 'storage_failed' | 'db_failed' | 'server_error' | 'forbidden';

export class ImageError extends Error {
  readonly code: ImageErrorCode;
  readonly status: number;
  constructor(code: ImageErrorCode, status: number, message: string) {
    super(message);
    this.name = 'ImageError';
    this.code = code;
    this.status = status;
  }
}
