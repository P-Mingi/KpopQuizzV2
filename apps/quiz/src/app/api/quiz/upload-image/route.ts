import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer.length > 11 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  return false;
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to upload images' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const externalUrl = formData.get('external_url') as string | null;

  const adminDb = createServiceRoleClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  if (file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid type. Use JPG, PNG, WebP, or GIF.` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidImageBuffer(buffer)) {
      return NextResponse.json({ error: 'Not a valid image' }, { status: 400 });
    }

    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : (file.type.split('/')[1] ?? 'jpg');
    const filename = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `quiz-images/${year}/${month}/${filename}`;

    const { error: uploadError } = await adminDb.storage
      .from('quiz-images')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = adminDb.storage.from('quiz-images').getPublicUrl(storagePath);
    return NextResponse.json({ url: urlData.publicUrl });
  }

  if (externalUrl) {
    try {
      const url = new URL(externalUrl);
      if (url.protocol !== 'https:') return NextResponse.json({ error: 'Only HTTPS URLs' }, { status: 400 });
      if (['localhost', '127.0.0.1', '0.0.0.0'].some((d) => url.hostname.includes(d))) {
        return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    try {
      const res = await fetch(externalUrl, {
        headers: { 'User-Agent': 'KpopQuiz/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return NextResponse.json({ error: `Fetch failed: HTTP ${res.status}` }, { status: 400 });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.startsWith('image/')) return NextResponse.json({ error: 'Not an image' }, { status: 400 });

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > MAX_FILE_SIZE) return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
      if (!isValidImageBuffer(buffer)) return NextResponse.json({ error: 'Not a valid image' }, { status: 400 });

      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'jpg';
      const filename = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `quiz-images/${year}/${month}/${filename}`;

      const { error: uploadError } = await adminDb.storage
        .from('quiz-images')
        .upload(storagePath, buffer, { contentType: contentType.split(';')[0]!, upsert: false });

      if (uploadError) return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });

      const { data: urlData } = adminDb.storage.from('quiz-images').getPublicUrl(storagePath);
      return NextResponse.json({ url: urlData.publicUrl });
    } catch (err) {
      return NextResponse.json({ error: `Failed: ${err instanceof Error ? err.message : 'Unknown'}` }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Provide file or external_url' }, { status: 400 });
}
