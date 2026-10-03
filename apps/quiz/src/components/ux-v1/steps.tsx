interface Step {
  title: string;
  body: React.ReactNode;
}

interface Steps3Props {
  /** The steps in order (three in every v12 view; any count renders). */
  steps: readonly Step[];
  titleAs?: 'h3' | 'h4' | undefined;
  id?: string | undefined;
  lang?: string | undefined;
  className?: string | undefined;
}

/**
 * v12 three steps (prototype `.steps3`): numbered cards, three across, stacked on
 * phones. An ordered list, so the order is in the markup and not only in the
 * numbers. Server-safe.
 */
export function Steps3({ steps, titleAs: T = 'h3', id, lang, className }: Steps3Props): React.ReactElement {
  return (
    <ol id={id} lang={lang} className={['ux-steps3', className ?? ''].filter(Boolean).join(' ')}>
      {steps.map((s, i) => (
        <li key={s.title}>
          <span className="ux-steps3-n" aria-hidden="true">{i + 1}</span>
          <T className="ux-steps3-t">{s.title}</T>
          <p className="ux-steps3-d">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}
