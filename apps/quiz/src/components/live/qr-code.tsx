import { encodeQr, qrPath, qrViewSize } from '@/lib/live/qr';

interface LiveQrProps {
  /** What the code holds (the join link). */
  text: string;
  /** Accessible name ("QR code to join room K7Q2PX"). */
  label: string;
  /** Light modules around the code, in modules. The white box around it adds the rest. */
  quiet?: number | undefined;
  className?: string | undefined;
}

/**
 * A QR code as inline SVG, from the repo's own encoder (lib/live/qr.ts). Always
 * black on white, in both themes: a reader needs the contrast. Server-safe.
 */
export function LiveQr({ text, label, quiet = 2, className }: LiveQrProps): React.ReactElement {
  const qr = encodeQr(text, { level: 'M' });
  const n = qrViewSize(qr, quiet);
  return (
    <svg className={className} viewBox={`0 0 ${n} ${n}`} role="img" aria-label={label} shapeRendering="crispEdges" focusable="false">
      <rect width={n} height={n} fill="#fff" />
      <path d={qrPath(qr, quiet)} fill="#000" />
    </svg>
  );
}
