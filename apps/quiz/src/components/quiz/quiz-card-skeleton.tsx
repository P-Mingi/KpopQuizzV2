import { Skeleton } from '@/components/ui/skeleton';

export function QuizCardSkeleton() {
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12,
      background: '#fff', border: '1px solid #e8e6e0',
    }}>
      <Skeleton width={56} height={56} borderRadius={8} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
        <Skeleton width="70%" height={12} borderRadius={4} />
        <Skeleton width="45%" height={9} borderRadius={3} style={{ animationDelay: '0.1s' }} />
      </div>
    </div>
  );
}
