import Link from 'next/link';

export default function PlayPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5">
      <p className="text-xl font-semibold mb-2">Game loading...</p>
      <p className="text-sm text-text-secondary mb-6">Gameplay coming in Prompt 3</p>
      <Link href="/" className="text-sm text-pink-400 font-medium">
        Back to home
      </Link>
    </div>
  );
}
