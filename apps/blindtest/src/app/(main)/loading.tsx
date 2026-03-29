function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-bg-tertiary rounded-lg animate-pulse ${className ?? ''}`} />;
}

export default function MainLoading() {
  return (
    <div className="pt-5 pb-8 space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-3 w-24" />
      <div className="flex gap-2">
        <Skeleton className="h-32 w-[130px] rounded-[14px]" />
        <Skeleton className="h-32 w-[130px] rounded-[14px]" />
        <Skeleton className="h-32 w-[130px] rounded-[14px]" />
      </div>
      <Skeleton className="h-3 w-20" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  );
}
