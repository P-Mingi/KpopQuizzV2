import { Spinner } from '@/components/ui/spinner';

export default function Loading(): React.ReactElement {
  return (
    <div className="flex justify-center py-20">
      <Spinner />
    </div>
  );
}
