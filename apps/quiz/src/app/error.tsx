'use client';

interface ErrorPageProps {
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps): React.ReactElement {
  return (
    <div className="mt-20 text-center">
      <p className="text-lg font-medium text-primary">Something went wrong</p>
      <p className="text-sm text-secondary mt-2">Please try refreshing the page.</p>
      <button
        onClick={reset}
        className="mt-4 px-6 py-3 rounded-full bg-accent text-white text-sm font-medium cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
