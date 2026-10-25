import { REPORT_CHARTS, chartPath } from '@/lib/report/charts';

// SEO Mission 3, part F.3: the Knowledge Report charts as files (credit and licence drawn
// into each image). Plain links to static files, listed in the licence block and on /press.
export function ChartDownloads({ withPreview = false }: { withPreview?: boolean }): React.ReactElement {
  const A = 'font-medium text-[var(--accent)] hover:underline';
  return (
    <div className="mt-3">
      <p className="font-semibold text-[var(--text-primary)]">Charts from the report, credit included</p>
      <ul className={withPreview ? 'mt-3 grid gap-5 text-[14px]' : 'mt-1 space-y-1 text-[14px]'}>
        {REPORT_CHARTS.map((c) => (
          <li key={c.id}>
            {withPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- a static chart file, shown as is
              <img src={chartPath(c.id, 'svg')} alt={c.alt} width={600} loading="lazy" className="mb-2 w-full max-w-[600px] rounded-lg border border-[var(--border)]" />
            ) : null}
            <span>{c.title}: </span>
            <a href={chartPath(c.id, 'png')} className={A}>PNG</a>
            {' · '}
            <a href={chartPath(c.id, 'svg')} className={A}>SVG</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
