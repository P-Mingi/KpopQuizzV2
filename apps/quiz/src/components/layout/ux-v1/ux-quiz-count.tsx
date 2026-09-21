'use client';

import { useEffect, useState } from 'react';

// Sidebar "Quizzes" count badge (DESIGN-SPEC 3). Client island reading the real
// published total from the cached GET /api/quizzes/count. Renders nothing until
// the real number is in (no placeholder, no invented count).
export function UxQuizCount(): React.ReactElement | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/quizzes/count')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && typeof d.count === 'number') setCount(d.count); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (count == null) return null;
  return <span className="uxv1-nav-count">{count}</span>;
}
