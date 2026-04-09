import Link from 'next/link';

export function CreateCTA(): React.ReactElement {
  return (
    <div className="bg-surface rounded-lg p-5 text-center mt-6 mb-8">
      <p className="text-base font-medium text-primary">
        Think you know your group better than anyone?
      </p>
      <p className="text-sm text-secondary mt-1">
        Create a quiz in under 3 minutes and challenge your mutuals.
      </p>
      <Link
        href="/create"
        className="inline-block mt-4 px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Create a quiz
      </Link>
    </div>
  );
}
