interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height, borderRadius = 4, style }: SkeletonProps) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: '#f0ede8',
      animation: 'skeletonShimmer 1.5s infinite',
      ...style,
    }} />
  );
}
