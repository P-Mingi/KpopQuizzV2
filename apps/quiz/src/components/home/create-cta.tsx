import Link from 'next/link';

/**
 * "Got quiz ideas?" promo card. Dashed accent border with a tinted pink
 * background and a solid accent button. Rendered inside the home feed
 * after the first batch of quizzes to catch readers mid-scroll.
 */
export function CreateCTA(): React.ReactElement {
  return (
    <div className="bg-accent-bg border-[1.5px] border-dashed border-accent rounded-2xl p-5 text-center">
      <p className="text-[15px] font-bold text-accent-hover">
        Got quiz ideas? Create one!
      </p>
      <p className="text-[12px] text-accent mt-1">
        Earn XP when fans play your quizzes
      </p>
      <Link
        href="/create"
        className="inline-block mt-4 px-6 py-2.5 rounded-full bg-accent text-white text-[13px] font-bold hover:bg-accent-hover active:scale-[0.97] transition-all"
      >
        Create a quiz
      </Link>
    </div>
  );
}
