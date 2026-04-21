import Link from 'next/link';

export function PackCTA({ balance }: { balance: number }) {
  if (balance < 100) return null;
  return (
    <Link href="/cards" className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors mt-3">
      <span className="text-lg">{'\uD83C\uDCCF'}</span>
      <div className="flex-1">
        <p className="text-xs font-semibold text-amber-900">You can open a pack!</p>
        <p className="text-[10px] text-amber-700">{balance.toLocaleString()} Byeol available</p>
      </div>
      <span className="text-xs font-bold text-[#D4537E]">{`Open \u2192`}</span>
    </Link>
  );
}
