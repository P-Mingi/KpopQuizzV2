'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { getLevelInfo } from '@/lib/constants';
import { formatCount, getAvatarColors } from '@/lib/utils';

// Types
interface KPIs {
  total_plays: number;
  total_plays_delta: number;
  total_quizzes: number;
  total_quizzes_new: number;
  total_users: number;
  total_users_new: number;
  avg_completion_rate: number;
  avg_completion_rate_delta: number;
  plays_today: number;
  users_today: number;
  quizzes_today: number;
  pending_reports: number;
}

interface Activity {
  dates: string[];
  plays: number[];
  users: number[];
  quizzes: number[];
}

interface TopGroup {
  name: string;
  display_color: string;
  total_plays: number;
}

interface TopQuiz {
  title: string;
  slug: string;
  group_name: string;
  creator_username: string;
  play_count: number;
}

interface TopCreator {
  username: string;
  total_quizzes: number;
  total_plays: number;
  period_plays: number;
}

interface ModerationItem {
  report_id: string;
  reason: string;
  details: string | null;
  report_date: string;
  quiz_id: string;
  quiz_title: string;
  quiz_slug: string;
  quiz_status: string;
  report_count: number;
  reporter_username: string;
}

interface QOTDItem {
  id: string;
  title: string;
  slug: string;
  date: string;
  username: string;
}

interface UserItem {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  xp: number;
  total_quizzes_created: number;
  total_plays_received: number;
  created_at: string;
  banned_at: string | null;
}

interface QuizItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  play_count: number;
  report_count: number;
  avg_score: number;
  question_count: number;
  difficulty: string;
  created_at: string;
  group_name: string;
  creator_username: string;
}

interface GameItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  play_count: number;
  like_count: number;
  matchup_count: number;
  created_at: string;
  groups: { name: string } | null;
  profiles: { username: string };
}

interface PendingGroup {
  id: number;
  name: string;
  slug: string;
  fandom_name: string;
  display_color: string;
  text_color: string;
  logo_url: string | null;
  quiz_count: number;
  total_plays: number;
  created_at: string;
  actual_quiz_count: number;
}

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  play_count: number;
  group_name: string;
  username: string;
}

interface DashboardData {
  kpis: KPIs;
  activity: Activity;
  top_groups: TopGroup[];
  top_quizzes: TopQuiz[];
  top_creators: TopCreator[];
  moderation: ModerationItem[];
  qotd_current: QOTDItem | null;
  qotd_upcoming: QOTDItem[];
  recent_users: UserItem[];
  all_quizzes: QuizItem[];
}

// Time ago helper
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Chart.js script loader
let chartJsLoaded = false;
function loadChartJs(): Promise<void> {
  if (chartJsLoaded) return Promise.resolve();
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).Chart) {
    chartJsLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
    script.onload = () => {
      chartJsLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
}

interface AdminDashboardProps {
  initialData: DashboardData;
}

export function AdminDashboard({ initialData }: AdminDashboardProps): React.ReactElement {
  const [data, setData] = useState<DashboardData>(initialData);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(false);

  // Moderation state
  const [moderationItems, setModerationItems] = useState(initialData.moderation);
  const [fadingItems, setFadingItems] = useState<Set<string>>(new Set());

  // QOTD state
  const [qotdCurrent] = useState(initialData.qotd_current);
  const [qotdUpcoming, setQotdUpcoming] = useState(initialData.qotd_upcoming);
  const [qotdSearch, setQotdSearch] = useState('');
  const [qotdResults, setQotdResults] = useState<SearchResult[]>([]);
  const [qotdSelected, setQotdSelected] = useState<SearchResult | null>(null);
  const qotdSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Users state
  const [users, setUsers] = useState(initialData.recent_users);

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editAvatarPreviewUrl, setEditAvatarPreviewUrl] = useState('');
  const [editAvatarError, setEditAvatarError] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editUsernameError, setEditUsernameError] = useState('');
  const editAvatarDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // All users state
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [allUsersTotal, setAllUsersTotal] = useState(0);
  const [allUsersSearch, setAllUsersSearch] = useState('');
  const [allUsersSort, setAllUsersSort] = useState('newest');
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [allUsersLoaded, setAllUsersLoaded] = useState(false);
  const allUsersSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { showToast } = useToast();

  // Pending groups state
  const [pendingGroups, setPendingGroups] = useState<PendingGroup[]>([]);
  const [pendingGroupsLoaded, setPendingGroupsLoaded] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupSlug, setEditGroupSlug] = useState('');
  const [editGroupFandom, setEditGroupFandom] = useState('');
  const [editGroupLogo, setEditGroupLogo] = useState('');
  const [editGroupDisplayColor, setEditGroupDisplayColor] = useState('');
  const [editGroupTextColor, setEditGroupTextColor] = useState('');
  const [mergeGroupId, setMergeGroupId] = useState<number | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [allGroupsForMerge, setAllGroupsForMerge] = useState<{ id: number; name: string }[]>([]);

  // Quizzes browser state
  const [quizzes, setQuizzes] = useState(initialData.all_quizzes);
  const [quizFilter, setQuizFilter] = useState('all');
  const [quizSort, setQuizSort] = useState('newest');
  const [quizSearchText, setQuizSearchText] = useState('');
  const [hasMoreQuizzes, setHasMoreQuizzes] = useState(initialData.all_quizzes.length === 20);

  // Games admin state
  const [games, setGames] = useState<GameItem[]>([]);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesSearch, setGamesSearch] = useState('');
  const gamesSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chart refs
  const activityChartRef = useRef<HTMLCanvasElement>(null);
  const groupsChartRef = useRef<HTMLCanvasElement>(null);
  const activityChartInstance = useRef<unknown>(null);
  const groupsChartInstance = useRef<unknown>(null);

  // Fetch data when period changes
  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${p}`);
      if (res.ok) {
        const statsData = await res.json();
        setData(prev => ({ ...prev, ...statsData }));
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period !== '7d') {
      fetchData(period);
    }
  }, [period, fetchData]);

  // Render charts
  useEffect(() => {
    loadChartJs().then(() => {
      renderActivityChart();
      renderGroupsChart();
    });

    return () => {
      // Cleanup charts
      if (activityChartInstance.current) {
        (activityChartInstance.current as { destroy: () => void }).destroy();
      }
      if (groupsChartInstance.current) {
        (groupsChartInstance.current as { destroy: () => void }).destroy();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render charts when data changes
  useEffect(() => {
    if (chartJsLoaded) {
      renderActivityChart();
      renderGroupsChart();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.activity, data.top_groups]);

  function renderActivityChart() {
    const Chart = (window as unknown as Record<string, unknown>).Chart as unknown;
    if (!Chart || !activityChartRef.current) return;

    if (activityChartInstance.current) {
      (activityChartInstance.current as { destroy: () => void }).destroy();
    }

    const ctx = activityChartRef.current.getContext('2d');
    if (!ctx) return;

    const ChartClass = Chart as new (ctx: CanvasRenderingContext2D, config: unknown) => unknown;
    activityChartInstance.current = new ChartClass(ctx, {
      type: 'line',
      data: {
        labels: data.activity.dates.map(d => {
          const date = new Date(d + 'T00:00:00');
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
          {
            label: 'Plays',
            data: data.activity.plays,
            borderColor: '#ED93B1',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            yAxisID: 'y',
          },
          {
            label: 'New users',
            data: data.activity.users,
            borderColor: '#AFA9EC',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            yAxisID: 'y1',
          },
          {
            label: 'Quizzes created',
            data: data.activity.quizzes,
            borderColor: '#5DCAA5',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#9B9B9B' } },
          y: {
            position: 'left',
            grid: { color: '#F1EFE8' },
            ticks: { font: { size: 11 }, color: '#9B9B9B' },
            beginAtZero: true,
          },
          y1: {
            position: 'right',
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#9B9B9B' },
            beginAtZero: true,
          },
        },
      },
    });
  }

  function renderGroupsChart() {
    const Chart = (window as unknown as Record<string, unknown>).Chart as unknown;
    if (!Chart || !groupsChartRef.current) return;

    if (groupsChartInstance.current) {
      (groupsChartInstance.current as { destroy: () => void }).destroy();
    }

    const ctx = groupsChartRef.current.getContext('2d');
    if (!ctx) return;

    const groups = data.top_groups;
    const ChartClass = Chart as new (ctx: CanvasRenderingContext2D, config: unknown) => unknown;
    groupsChartInstance.current = new ChartClass(ctx, {
      type: 'bar',
      data: {
        labels: groups.map(g => g.name),
        datasets: [{
          data: groups.map(g => g.total_plays),
          backgroundColor: groups.map(g => g.display_color || '#AFA9EC'),
          borderRadius: 4,
          barThickness: 18,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: '#F1EFE8' },
            ticks: {
              font: { size: 11 },
              color: '#9B9B9B',
              callback: function(value: number) {
                if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                return value;
              },
            },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#6B6B6B' },
          },
        },
      },
    });
  }

  // QOTD search
  useEffect(() => {
    if (qotdSearchTimeout.current) clearTimeout(qotdSearchTimeout.current);
    if (qotdSearch.length < 2) {
      setQotdResults([]);
      return;
    }
    qotdSearchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/search-quizzes?q=${encodeURIComponent(qotdSearch)}`);
      if (res.ok) {
        const results = await res.json();
        setQotdResults(results);
      }
    }, 300);
  }, [qotdSearch]);

  // Action handlers
  async function handleRemoveQuiz(quizId: string, reportId?: string) {
    const itemKey = reportId ?? quizId;
    setFadingItems(prev => new Set(prev).add(itemKey));
    setTimeout(() => {
      setModerationItems(prev => prev.filter(m => (reportId ? m.report_id !== reportId : m.quiz_id !== quizId)));
      setFadingItems(prev => { const next = new Set(prev); next.delete(itemKey); return next; });
    }, 300);
    await fetch(`/api/admin/quiz/${quizId}/remove`, { method: 'POST' });
  }

  async function handleDismissReport(reportId: string) {
    setFadingItems(prev => new Set(prev).add(reportId));
    setTimeout(() => {
      setModerationItems(prev => prev.filter(m => m.report_id !== reportId));
      setFadingItems(prev => { const next = new Set(prev); next.delete(reportId); return next; });
    }, 300);
    await fetch(`/api/admin/report/${reportId}/dismiss`, { method: 'POST' });
  }

  async function handleSetQotd() {
    if (!qotdSelected) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await fetch('/api/admin/set-qotd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: qotdSelected.id, date: dateStr }),
    });

    if (res.ok) {
      setQotdUpcoming(prev => [...prev, {
        id: qotdSelected.id,
        title: qotdSelected.title,
        slug: qotdSelected.slug,
        date: dateStr!,
        username: qotdSelected.username,
      }]);
      setQotdSelected(null);
      setQotdSearch('');
      setQotdResults([]);
    }
  }

  async function handleBanUser(userId: string) {
    await fetch(`/api/admin/user/${userId}/ban`, { method: 'POST' });
    const updater = (prev: UserItem[]) => prev.map(u => u.id === userId ? { ...u, banned_at: new Date().toISOString() } : u);
    setUsers(updater);
    setAllUsers(updater);
  }

  async function handleUnbanUser(userId: string) {
    await fetch(`/api/admin/user/${userId}/unban`, { method: 'POST' });
    const updater = (prev: UserItem[]) => prev.map(u => u.id === userId ? { ...u, banned_at: null } : u);
    setUsers(updater);
    setAllUsers(updater);
  }

  // Edit user handlers
  function openEditForm(user: UserItem) {
    setEditingUserId(user.id);
    setEditUsername(user.username);
    setEditDisplayName(user.display_name ?? '');
    setEditAvatarUrl(user.avatar_url ?? '');
    setEditAvatarPreviewUrl(user.avatar_url ?? '');
    setEditAvatarError(false);
    setEditSaving(false);
    setEditUsernameError('');
  }

  function closeEditForm() {
    setEditingUserId(null);
  }

  function handleEditAvatarUrlChange(url: string) {
    setEditAvatarUrl(url);
    if (editAvatarDebounce.current) clearTimeout(editAvatarDebounce.current);
    editAvatarDebounce.current = setTimeout(() => {
      setEditAvatarPreviewUrl(url);
      setEditAvatarError(false);
    }, 500);
  }

  function validateEditUsername(value: string): string {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.length < 3) return 'Username must be at least 3 characters';
    if (trimmed.length > 20) return 'Username must be at most 20 characters';
    if (!/^[a-z0-9_]+$/.test(trimmed)) return 'Only lowercase letters, numbers, and underscores';
    return '';
  }

  async function handleSaveEdit() {
    if (!editingUserId) return;

    const currentUser = [...users, ...allUsers].find(u => u.id === editingUserId);
    if (!currentUser) return;

    const usernameError = validateEditUsername(editUsername);
    if (usernameError) {
      setEditUsernameError(usernameError);
      return;
    }

    const body: Record<string, unknown> = {};
    const trimmedUsername = editUsername.trim().toLowerCase();
    const trimmedDisplayName = editDisplayName.trim();
    const trimmedAvatarUrl = editAvatarUrl.trim();

    if (trimmedUsername !== currentUser.username) {
      body.username = trimmedUsername;
    }
    if (trimmedDisplayName !== (currentUser.display_name ?? '')) {
      body.display_name = trimmedDisplayName || null;
    }
    if (trimmedAvatarUrl !== (currentUser.avatar_url ?? '')) {
      body.avatar_url = trimmedAvatarUrl || null;
    }

    if (Object.keys(body).length === 0) {
      closeEditForm();
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/user/${editingUserId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Failed to update user', 'error');
        setEditSaving(false);
        return;
      }

      // Build updated user fields
      const updatedFields: Partial<UserItem> = {};
      if (body.username) {
        updatedFields.username = trimmedUsername;
        const colors = getAvatarColors(trimmedUsername);
        updatedFields.avatar_bg = colors.bg;
        updatedFields.avatar_text = colors.text;
      }
      if (body.display_name !== undefined) {
        updatedFields.display_name = (body.display_name as string | null);
      }
      if (body.avatar_url !== undefined) {
        updatedFields.avatar_url = (body.avatar_url as string | null);
      }

      const updateList = (prev: UserItem[]) =>
        prev.map(u => u.id === editingUserId ? { ...u, ...updatedFields } : u);
      setUsers(updateList);
      setAllUsers(updateList);

      showToast('User updated', 'success');
      closeEditForm();
    } catch {
      showToast('Failed to update user', 'error');
      setEditSaving(false);
    }
  }

  // All users fetching
  const fetchAllUsers = useCallback(async (search: string, sort: string, offset: number, append: boolean) => {
    setAllUsersLoading(true);
    try {
      const params = new URLSearchParams({ offset: String(offset), sort });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setAllUsers(prev => [...prev, ...data.users]);
        } else {
          setAllUsers(data.users);
        }
        setAllUsersTotal(data.total);
        setAllUsersLoaded(true);
      }
    } catch {
      // Silently fail
    } finally {
      setAllUsersLoading(false);
    }
  }, []);

  // Load all users on mount
  useEffect(() => {
    fetchAllUsers('', 'newest', 0, false);
  }, [fetchAllUsers]);

  // Debounced search for all users
  useEffect(() => {
    if (!allUsersLoaded) return;
    if (allUsersSearchTimeout.current) clearTimeout(allUsersSearchTimeout.current);
    allUsersSearchTimeout.current = setTimeout(() => {
      fetchAllUsers(allUsersSearch, allUsersSort, 0, false);
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsersSearch, allUsersSort]);

  async function handleQuizAction(quizId: string, action: 'remove' | 'restore') {
    await fetch(`/api/admin/quiz/${quizId}/${action}`, { method: 'POST' });
    setQuizzes(prev => prev.map(q => {
      if (q.id !== quizId) return q;
      return { ...q, status: action === 'remove' ? 'removed' : 'published', report_count: action === 'restore' ? 0 : q.report_count };
    }));
  }

  async function handleQuizDifficulty(quizId: string, difficulty: string) {
    await fetch(`/api/admin/quiz/${quizId}/difficulty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty }),
    });
    setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, difficulty } : q));
  }

  async function handleQuizSetQotd(quizId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await fetch('/api/admin/set-qotd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: quizId, date: dateStr }),
    });
  }

  async function loadMoreQuizzes() {
    const res = await fetch(`/api/admin/stats?period=${period}`);
    if (!res.ok) return;
    // For now, load more isn't implemented via the stats endpoint.
    // The all_quizzes section is client-side only for the initial 20.
    setHasMoreQuizzes(false);
  }

  async function loadGames(search: string) {
    setGamesLoading(true);
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/admin/games?limit=50${q}`);
      if (res.ok) {
        const json = await res.json();
        setGames(json.games ?? []);
      }
    } catch { /* ignore */ }
    finally {
      setGamesLoading(false);
      setGamesLoaded(true);
    }
  }

  async function handleGameDelete(gameId: string) {
    if (!confirm('Remove this game? Players will no longer be able to access it.')) return;
    try {
      const res = await fetch(`/api/admin/game/${gameId}`, { method: 'DELETE' });
      if (res.ok) {
        setGames(prev => prev.map(g => g.id === gameId ? { ...g, status: 'removed' } : g));
        showToast('Game removed', 'success');
      }
    } catch { showToast('Failed to remove game', 'error'); }
  }

  async function handleGameRestore(gameId: string) {
    try {
      const res = await fetch(`/api/admin/game/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      if (res.ok) {
        setGames(prev => prev.map(g => g.id === gameId ? { ...g, status: 'published' } : g));
        showToast('Game restored', 'success');
      }
    } catch { showToast('Failed to restore game', 'error'); }
  }

  // Fetch pending groups on mount
  useEffect(() => {
    async function fetchPendingGroups() {
      try {
        const res = await fetch('/api/admin/pending-groups');
        if (res.ok) {
          const json = await res.json();
          setPendingGroups(json.groups ?? []);
          setAllGroupsForMerge(json.all_groups ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setPendingGroupsLoaded(true);
      }
    }
    fetchPendingGroups();
  }, []);

  async function handleApproveGroup(groupId: number, updates?: Record<string, string>) {
    try {
      const res = await fetch(`/api/admin/group/${groupId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates ?? {}),
      });
      if (res.ok) {
        setPendingGroups(prev => prev.filter(g => g.id !== groupId));
        setEditingGroupId(null);
        showToast('Group approved', 'success');
      } else {
        showToast('Failed to approve group', 'error');
      }
    } catch {
      showToast('Failed to approve group', 'error');
    }
  }

  async function handleMergeGroup(sourceId: number, targetId: number) {
    try {
      const res = await fetch(`/api/admin/group/${sourceId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_group_id: targetId }),
      });
      if (res.ok) {
        setPendingGroups(prev => prev.filter(g => g.id !== sourceId));
        setMergeGroupId(null);
        setMergeTargetId('');
        showToast('Group merged', 'success');
      } else {
        const json = await res.json();
        showToast(json.error || 'Failed to merge group', 'error');
      }
    } catch {
      showToast('Failed to merge group', 'error');
    }
  }

  async function handleDeleteGroup(groupId: number) {
    if (!confirm('Delete this group? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/group/${groupId}`, { method: 'DELETE' });
      if (res.ok) {
        setPendingGroups(prev => prev.filter(g => g.id !== groupId));
        showToast('Group deleted', 'success');
      } else {
        const json = await res.json();
        showToast(json.error || 'Failed to delete group', 'error');
      }
    } catch {
      showToast('Failed to delete group', 'error');
    }
  }

  function startEditGroup(g: PendingGroup) {
    setEditingGroupId(g.id);
    setEditGroupName(g.name);
    setEditGroupSlug(g.slug);
    setEditGroupFandom(g.fandom_name);
    setEditGroupLogo(g.logo_url ?? '');
    setEditGroupDisplayColor(g.display_color);
    setEditGroupTextColor(g.text_color);
    setMergeGroupId(null);
  }

  // Filter and sort quizzes
  const filteredQuizzes = quizzes
    .filter(q => {
      if (quizFilter === 'published') return q.status === 'published';
      if (quizFilter === 'flagged') return q.status === 'flagged';
      if (quizFilter === 'removed') return q.status === 'removed';
      return true;
    })
    .filter(q => {
      if (!quizSearchText) return true;
      return q.title.toLowerCase().includes(quizSearchText.toLowerCase());
    })
    .sort((a, b) => {
      if (quizSort === 'most_played') return b.play_count - a.play_count;
      if (quizSort === 'most_reported') return b.report_count - a.report_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const pendingCount = moderationItems.length;

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-txt-primary">Admin dashboard</h1>
          <p className="text-sm text-txt-secondary">kpopquiz.org</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-txt-tertiary">Loading...</span>}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* KPI Row 1 - Primary metrics */}
      <div className="grid grid-cols-4 gap-2.5">
        <KPICard label="Total plays" value={data.kpis.total_plays} delta={`${data.kpis.total_plays_delta >= 0 ? '+' : ''}${data.kpis.total_plays_delta}%`} deltaPositive={data.kpis.total_plays_delta >= 0} />
        <KPICard label="Total quizzes" value={data.kpis.total_quizzes} delta={`+${data.kpis.total_quizzes_new} this ${period === '7d' ? 'week' : period === '30d' ? 'month' : 'period'}`} deltaPositive />
        <KPICard label="Registered users" value={data.kpis.total_users} delta={`+${data.kpis.total_users_new} this ${period === '7d' ? 'week' : period === '30d' ? 'month' : 'period'}`} deltaPositive />
        <KPICard label="Avg completion rate" value={`${data.kpis.avg_completion_rate}%`} delta={data.kpis.avg_completion_rate_delta !== 0 ? `${data.kpis.avg_completion_rate_delta >= 0 ? '+' : ''}${data.kpis.avg_completion_rate_delta}%` : ''} deltaPositive={data.kpis.avg_completion_rate_delta >= 0} />
      </div>

      {/* KPI Row 2 - Today's snapshot */}
      <div className="grid grid-cols-4 gap-2.5">
        <KPICard label="Plays today" value={data.kpis.plays_today} />
        <KPICard label="New users today" value={data.kpis.users_today} />
        <KPICard label="Quizzes created today" value={data.kpis.quizzes_today} />
        <KPICard label="Pending reports" value={data.kpis.pending_reports} highlight={data.kpis.pending_reports > 0} />
      </div>

      {/* Activity Chart */}
      <div className="bg-surface-primary border border-border-light rounded-lg p-4">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-sm font-medium text-txt-primary">Activity</span>
          <div className="flex items-center gap-4 ml-auto">
            <span className="flex items-center gap-1.5 text-xs text-txt-secondary">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: '#ED93B1' }} /> Plays
            </span>
            <span className="flex items-center gap-1.5 text-xs text-txt-secondary">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: '#AFA9EC' }} /> New users
            </span>
            <span className="flex items-center gap-1.5 text-xs text-txt-secondary">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: '#5DCAA5' }} /> Quizzes
            </span>
          </div>
        </div>
        <div style={{ height: 220 }}>
          <canvas ref={activityChartRef} />
        </div>
      </div>

      {/* Top Groups by Plays */}
      <div className="bg-surface-primary border border-border-light rounded-lg p-4">
        <h2 className="text-sm font-medium text-txt-primary mb-3">Top groups by plays</h2>
        <div style={{ height: 260 }}>
          <canvas ref={groupsChartRef} />
        </div>
      </div>

      {/* Top Quizzes + Top Creators */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top Quizzes */}
        <div className="bg-surface-primary border border-border-light rounded-lg p-4">
          <h2 className="text-sm font-medium text-txt-primary mb-3">Top quizzes</h2>
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {data.top_quizzes.length === 0 && (
              <p className="text-xs text-txt-secondary py-2">No quizzes in this period</p>
            )}
            {data.top_quizzes.map((q, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <a href={`/q/${q.slug}`} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-txt-primary hover:underline truncate block">
                    {q.title}
                  </a>
                  <p className="text-[11px] text-txt-secondary">{q.group_name} &middot; {q.creator_username}</p>
                </div>
                <span className="text-[13px] font-medium text-txt-primary ml-3 flex-shrink-0">{q.play_count.toLocaleString('en-US')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Creators */}
        <div className="bg-surface-primary border border-border-light rounded-lg p-4">
          <h2 className="text-sm font-medium text-txt-primary mb-3">Top creators</h2>
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {data.top_creators.length === 0 && (
              <p className="text-xs text-txt-secondary py-2">No creators in this period</p>
            )}
            {data.top_creators.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-txt-primary">{c.username}</span>
                    {i === 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-correct-bg text-correct-text">Top creator</span>
                    )}
                  </div>
                  <p className="text-[11px] text-txt-secondary">{c.total_quizzes} quizzes &middot; {c.total_plays.toLocaleString('en-US')} plays</p>
                </div>
                <span className="text-[13px] font-medium text-txt-primary ml-3 flex-shrink-0">{c.period_plays.toLocaleString('en-US')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Moderation Queue */}
      <div className="bg-surface-primary border border-border-light rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-medium text-txt-primary">Moderation queue</h2>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-wrong-bg text-wrong-text">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
          {moderationItems.length === 0 && (
            <p className="text-xs text-txt-secondary py-2">No pending reports</p>
          )}
          {moderationItems.map((m) => (
            <div
              key={m.report_id}
              className="flex items-center justify-between py-3 transition-opacity duration-300"
              style={{ opacity: fadingItems.has(m.report_id) ? 0 : 1 }}
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-txt-primary">
                  Report: {m.reason}
                  {m.report_count > 1 && <span className="text-wrong-text ml-1">({m.report_count} reports)</span>}
                </p>
                <p className="text-[11px] text-txt-secondary mt-0.5">
                  {m.quiz_title} &middot; {timeAgo(m.report_date)} &middot; {m.details || 'No details'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-3">
                <a
                  href={`/q/${m.quiz_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-full text-[12px] font-medium border text-info-text"
                  style={{ borderColor: 'var(--info-text)' }}
                >
                  View quiz
                </a>
                <button
                  onClick={() => handleRemoveQuiz(m.quiz_id, m.report_id)}
                  className="px-3 py-1 rounded-full text-[12px] font-medium border border-wrong-border text-wrong-text"
                >
                  Remove
                </button>
                <button
                  onClick={() => handleDismissReport(m.report_id)}
                  className="px-3 py-1 rounded-full text-[12px] font-medium border border-border-light text-txt-secondary"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Groups */}
      {pendingGroupsLoaded && pendingGroups.length > 0 && (
        <div className="bg-surface-primary border border-border-light rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-txt-primary">Pending groups</h2>
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-timeout-bg text-timeout-text">
              {pendingGroups.length} pending
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {pendingGroups.map((g) => (
              <div key={g.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: g.display_color, color: g.text_color }}
                      >
                        {g.name.slice(0, 3).toUpperCase()}
                      </span>
                      <span className="text-[13px] font-medium text-txt-primary">{g.name}</span>
                    </div>
                    <p className="text-[11px] text-txt-secondary mt-0.5 ml-9">
                      {g.actual_quiz_count} quiz{g.actual_quiz_count !== 1 ? 'zes' : ''} &middot; {g.total_plays} plays &middot; {timeAgo(g.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 ml-3">
                    <button
                      onClick={() => startEditGroup(g)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-border-light text-txt-secondary hover:bg-surface-secondary transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleApproveGroup(g.id)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-correct-border text-correct-text hover:bg-correct-bg transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => { setMergeGroupId(g.id); setEditingGroupId(null); setMergeTargetId(''); }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-info-text text-info-text hover:opacity-80 transition-opacity"
                    >
                      Merge
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(g.id)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-wrong-border text-wrong-text hover:bg-wrong-bg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {editingGroupId === g.id && (
                  <div className="mt-3 ml-9 bg-surface-secondary rounded-md p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-txt-secondary mb-0.5">Name</label>
                        <input
                          type="text"
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-border-light bg-surface-primary text-[12px] text-txt-primary focus:outline-none focus:border-accent-pink"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-txt-secondary mb-0.5">Slug</label>
                        <input
                          type="text"
                          value={editGroupSlug}
                          onChange={(e) => setEditGroupSlug(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-border-light bg-surface-primary text-[12px] text-txt-primary focus:outline-none focus:border-accent-pink"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-txt-secondary mb-0.5">Fandom name</label>
                        <input
                          type="text"
                          value={editGroupFandom}
                          onChange={(e) => setEditGroupFandom(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-border-light bg-surface-primary text-[12px] text-txt-primary focus:outline-none focus:border-accent-pink"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-txt-secondary mb-0.5">Logo URL</label>
                        <input
                          type="text"
                          value={editGroupLogo}
                          onChange={(e) => setEditGroupLogo(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-2.5 py-1.5 rounded-md border border-border-light bg-surface-primary text-[12px] text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent-pink"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-txt-secondary mb-0.5">Display color</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={editGroupDisplayColor}
                            onChange={(e) => setEditGroupDisplayColor(e.target.value)}
                            className="w-6 h-6 rounded border border-border-light cursor-pointer"
                          />
                          <input
                            type="text"
                            value={editGroupDisplayColor}
                            onChange={(e) => setEditGroupDisplayColor(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-md border border-border-light bg-surface-primary text-[12px] text-txt-primary focus:outline-none focus:border-accent-pink"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-txt-secondary mb-0.5">Text color</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={editGroupTextColor}
                            onChange={(e) => setEditGroupTextColor(e.target.value)}
                            className="w-6 h-6 rounded border border-border-light cursor-pointer"
                          />
                          <input
                            type="text"
                            value={editGroupTextColor}
                            onChange={(e) => setEditGroupTextColor(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-md border border-border-light bg-surface-primary text-[12px] text-txt-primary focus:outline-none focus:border-accent-pink"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setEditingGroupId(null)}
                        className="px-3 py-1 rounded-full text-[11px] font-medium border border-border-light text-txt-secondary hover:bg-surface-primary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleApproveGroup(g.id, {
                          name: editGroupName,
                          slug: editGroupSlug,
                          fandom_name: editGroupFandom,
                          logo_url: editGroupLogo || '',
                          display_color: editGroupDisplayColor,
                          text_color: editGroupTextColor,
                        })}
                        className="px-3 py-1 rounded-full text-[11px] font-medium border border-correct-border text-correct-text bg-correct-bg hover:opacity-90 transition-opacity"
                      >
                        Save & Approve
                      </button>
                    </div>
                  </div>
                )}

                {/* Merge dropdown */}
                {mergeGroupId === g.id && (
                  <div className="mt-3 ml-9 bg-surface-secondary rounded-md p-3">
                    <p className="text-[11px] text-txt-secondary mb-2">Merge into existing group (moves all quizzes, then deletes &quot;{g.name}&quot;)</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={mergeTargetId}
                        onChange={(e) => setMergeTargetId(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-md border border-border-light bg-surface-primary text-[12px] text-txt-primary focus:outline-none focus:border-accent-pink"
                      >
                        <option value="">Select target group...</option>
                        {allGroupsForMerge.filter(mg => mg.id !== g.id).map(mg => (
                          <option key={mg.id} value={mg.id}>{mg.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { setMergeGroupId(null); setMergeTargetId(''); }}
                        className="px-3 py-1 rounded-full text-[11px] font-medium border border-border-light text-txt-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => mergeTargetId && handleMergeGroup(g.id, parseInt(mergeTargetId, 10))}
                        disabled={!mergeTargetId}
                        className="px-3 py-1 rounded-full text-[11px] font-medium border border-info-text text-info-text disabled:opacity-40"
                      >
                        Merge
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz of the Day Manager */}
      <div className="bg-surface-primary border border-border-light rounded-lg p-4">
        <h2 className="text-sm font-medium text-txt-primary mb-3">Quiz of the Day</h2>

        {/* Current QOTD */}
        {qotdCurrent ? (
          <div className="flex items-center justify-between py-2 mb-3 bg-surface-secondary rounded-md px-3">
            <div>
              <p className="text-[13px] font-medium text-txt-primary">Today: {qotdCurrent.title}</p>
              <p className="text-[11px] text-txt-secondary">by {qotdCurrent.username}</p>
            </div>
            <a href={`/q/${qotdCurrent.slug}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-info-text hover:underline">
              View
            </a>
          </div>
        ) : (
          <div className="py-2 mb-3 bg-timeout-bg rounded-md px-3">
            <p className="text-[13px] font-medium text-timeout-text">No quiz of the day set for today</p>
          </div>
        )}

        {/* Set tomorrow's QOTD */}
        <div className="mb-3">
          <p className="text-xs text-txt-secondary mb-1.5">Set tomorrow&apos;s QOTD</p>
          <div className="relative">
            <input
              type="text"
              value={qotdSearch}
              onChange={(e) => { setQotdSearch(e.target.value); setQotdSelected(null); }}
              placeholder="Search quizzes by title..."
              className="w-full px-3 py-2 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent-pink"
            />
            {qotdResults.length > 0 && !qotdSelected && (
              <div className="absolute z-10 w-full mt-1 bg-surface-primary border border-border-light rounded-md shadow-lg max-h-60 overflow-auto">
                {qotdResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setQotdSelected(r); setQotdResults([]); setQotdSearch(r.title); }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-secondary transition-colors"
                  >
                    <p className="text-[13px] font-medium text-txt-primary">{r.title}</p>
                    <p className="text-[11px] text-txt-secondary">{r.group_name} &middot; {r.play_count.toLocaleString('en-US')} plays &middot; {r.username}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {qotdSelected && (
            <button
              onClick={handleSetQotd}
              className="mt-2 px-4 py-1.5 rounded-full text-[12px] font-medium border border-correct-border text-correct-text hover:bg-correct-bg transition-colors"
            >
              Set as QOTD
            </button>
          )}
        </div>

        {/* Upcoming schedule */}
        {qotdUpcoming.length > 0 && (
          <div>
            <p className="text-xs text-txt-secondary mb-1.5">Upcoming schedule</p>
            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {qotdUpcoming.map((q) => (
                <div key={q.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-[13px] font-medium text-txt-primary">{q.title}</p>
                    <p className="text-[11px] text-txt-secondary">by {q.username}</p>
                  </div>
                  <span className="text-[12px] text-txt-secondary">{q.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Users */}
      <div className="bg-surface-primary border border-border-light rounded-lg p-4">
        <h2 className="text-sm font-medium text-txt-primary mb-3">Recent users</h2>
        <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
          {users.map((u) => (
            <div key={u.id}>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
                      style={{ backgroundColor: u.avatar_bg, color: u.avatar_text }}
                    >
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-txt-primary">{u.username}</span>
                      {u.banned_at && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-wrong-bg text-wrong-text">Banned</span>
                      )}
                    </div>
                    <p className="text-[11px] text-txt-secondary">
                      Joined {timeAgo(u.created_at)} &middot; {u.total_quizzes_created} quizzes &middot; {u.total_plays_received.toLocaleString('en-US')} plays
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => editingUserId === u.id ? closeEditForm() : openEditForm(u)}
                    style={{ padding: '3px 10px', borderRadius: 16, border: '0.5px solid var(--border-light)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    className="text-xs"
                  >
                    Edit
                  </button>
                  {u.banned_at ? (
                    <button
                      onClick={() => handleUnbanUser(u.id)}
                      className="px-3 py-1 rounded-full text-[12px] font-medium border border-correct-border text-correct-text"
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBanUser(u.id)}
                      className="px-3 py-1 rounded-full text-[12px] font-medium border border-wrong-border text-wrong-text"
                    >
                      Ban
                    </button>
                  )}
                </div>
              </div>
              {editingUserId === u.id && (
                <UserEditForm
                  editUsername={editUsername}
                  editDisplayName={editDisplayName}
                  editAvatarUrl={editAvatarUrl}
                  editAvatarPreviewUrl={editAvatarPreviewUrl}
                  editAvatarError={editAvatarError}
                  editUsernameError={editUsernameError}
                  editSaving={editSaving}
                  avatarBg={u.avatar_bg}
                  avatarText={u.avatar_text}
                  onUsernameChange={(v) => { setEditUsername(v); setEditUsernameError(''); }}
                  onDisplayNameChange={setEditDisplayName}
                  onAvatarUrlChange={handleEditAvatarUrlChange}
                  onAvatarError={() => setEditAvatarError(true)}
                  onCancel={closeEditForm}
                  onSave={handleSaveEdit}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* All Users */}
      <div className="bg-surface-primary border border-border-light rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-txt-primary">All users</h2>
          <span className="text-xs text-txt-secondary">{allUsersTotal} total</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <input
            type="text"
            value={allUsersSearch}
            onChange={(e) => setAllUsersSearch(e.target.value)}
            placeholder="Search users..."
            className="px-3 py-1.5 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent-pink flex-1 max-w-xs"
          />
          <select
            value={allUsersSort}
            onChange={(e) => setAllUsersSort(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-border-light bg-surface-primary text-[12px] text-txt-primary"
          >
            <option value="newest">Newest</option>
            <option value="most_plays">Most plays</option>
            <option value="most_quizzes">Most quizzes</option>
          </select>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
          {allUsersLoading && allUsers.length === 0 && (
            <p className="text-xs text-txt-secondary py-3">Loading users...</p>
          )}
          {allUsers.map((u) => {
            const level = getLevelInfo(u.xp);
            return (
              <div key={u.id}>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
                        style={{ backgroundColor: u.avatar_bg, color: u.avatar_text }}
                      >
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[13px] font-medium text-txt-primary">{u.username}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-surface-secondary text-txt-secondary">
                        Lv.{level.level} {level.name}
                      </span>
                      {u.banned_at && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-wrong-bg text-wrong-text">Banned</span>
                      )}
                    </div>
                    <span className="text-[11px] text-txt-secondary flex-shrink-0">{u.total_quizzes_created} quizzes</span>
                    <span className="text-[11px] text-txt-secondary flex-shrink-0">{formatCount(u.total_plays_received)} plays</span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => editingUserId === u.id ? closeEditForm() : openEditForm(u)}
                      style={{ padding: '3px 10px', borderRadius: 16, border: '0.5px solid var(--border-light)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      className="text-xs"
                    >
                      Edit
                    </button>
                    {u.banned_at ? (
                      <button
                        onClick={() => handleUnbanUser(u.id)}
                        className="px-3 py-1 rounded-full text-[12px] font-medium border border-correct-border text-correct-text"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBanUser(u.id)}
                        className="px-3 py-1 rounded-full text-[12px] font-medium border border-wrong-border text-wrong-text"
                      >
                        Ban
                      </button>
                    )}
                  </div>
                </div>
                {editingUserId === u.id && (
                  <UserEditForm
                    editUsername={editUsername}
                    editDisplayName={editDisplayName}
                    editAvatarUrl={editAvatarUrl}
                    editAvatarPreviewUrl={editAvatarPreviewUrl}
                    editAvatarError={editAvatarError}
                    editUsernameError={editUsernameError}
                    editSaving={editSaving}
                    avatarBg={u.avatar_bg}
                    avatarText={u.avatar_text}
                    onUsernameChange={(v) => { setEditUsername(v); setEditUsernameError(''); }}
                    onDisplayNameChange={setEditDisplayName}
                    onAvatarUrlChange={handleEditAvatarUrlChange}
                    onAvatarError={() => setEditAvatarError(true)}
                    onCancel={closeEditForm}
                    onSave={handleSaveEdit}
                  />
                )}
              </div>
            );
          })}
        </div>

        {allUsers.length < allUsersTotal && (
          <button
            onClick={() => fetchAllUsers(allUsersSearch, allUsersSort, allUsers.length, true)}
            disabled={allUsersLoading}
            className="mt-3 w-full py-2 text-sm font-medium text-txt-secondary border border-border-light rounded-md hover:bg-surface-secondary transition-colors"
          >
            {allUsersLoading ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>

      {/* All Quizzes Browser */}
      <div className="bg-surface-primary border border-border-light rounded-lg p-4">
        <h2 className="text-sm font-medium text-txt-primary mb-3">All quizzes</h2>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-3">
          <input
            type="text"
            value={quizSearchText}
            onChange={(e) => setQuizSearchText(e.target.value)}
            placeholder="Search by title..."
            className="px-3 py-1.5 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent-pink flex-1 max-w-xs"
          />
          <div className="flex gap-1">
            {(['all', 'published', 'flagged', 'removed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setQuizFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                  quizFilter === f
                    ? 'bg-txt-primary text-white border-txt-primary'
                    : 'text-txt-secondary border-border-light hover:border-border-medium'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={quizSort}
            onChange={(e) => setQuizSort(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-border-light bg-surface-primary text-[12px] text-txt-primary"
          >
            <option value="newest">Newest</option>
            <option value="most_played">Most played</option>
            <option value="most_reported">Most reported</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] text-txt-secondary border-b" style={{ borderColor: 'var(--border-light)' }}>
                <th className="text-left py-2 font-medium">Title</th>
                <th className="text-left py-2 font-medium">Group</th>
                <th className="text-left py-2 font-medium">Creator</th>
                <th className="text-right py-2 font-medium">Plays</th>
                <th className="text-right py-2 font-medium">Avg score</th>
                <th className="text-right py-2 font-medium">Reports</th>
                <th className="text-left py-2 font-medium">Difficulty</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map((q) => (
                <tr key={q.id} className="border-b text-[13px]" style={{ borderColor: 'var(--border-light)' }}>
                  <td className="py-2.5 pr-3">
                    <a href={`/q/${q.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium text-txt-primary hover:underline">
                      {q.title}
                    </a>
                  </td>
                  <td className="py-2.5 pr-3 text-txt-secondary">{q.group_name}</td>
                  <td className="py-2.5 pr-3 text-txt-secondary">{q.creator_username}</td>
                  <td className="py-2.5 text-right text-txt-primary">{q.play_count.toLocaleString('en-US')}</td>
                  <td className="py-2.5 text-right text-txt-primary">{q.avg_score}%</td>
                  <td className="py-2.5 text-right text-txt-primary">{q.report_count}</td>
                  <td className="py-2.5">
                    <div className="flex gap-0.5">
                      {(['easy', 'medium', 'hard'] as const).map(level => (
                        <button
                          key={level}
                          onClick={() => handleQuizDifficulty(q.id, level)}
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                            q.difficulty === level
                              ? `bg-difficulty-${level}-bg text-difficulty-${level}-text`
                              : 'text-txt-tertiary hover:text-txt-secondary'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex gap-1 justify-end">
                      <a
                        href={`/q/${q.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-border-light text-txt-secondary hover:border-border-medium"
                      >
                        View
                      </a>
                      {q.status === 'published' || q.status === 'flagged' ? (
                        <button
                          onClick={() => handleQuizAction(q.id, 'remove')}
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-wrong-border text-wrong-text"
                        >
                          Remove
                        </button>
                      ) : q.status === 'removed' ? (
                        <button
                          onClick={() => handleQuizAction(q.id, 'restore')}
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-correct-border text-correct-text"
                        >
                          Restore
                        </button>
                      ) : null}
                      {q.status === 'published' && (
                        <button
                          onClick={() => handleQuizSetQotd(q.id)}
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-correct-border text-correct-text"
                        >
                          Set QOTD
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasMoreQuizzes && (
          <button
            onClick={loadMoreQuizzes}
            className="mt-3 w-full py-2 text-sm font-medium text-txt-secondary border border-border-light rounded-md hover:bg-surface-secondary transition-colors"
          >
            Load more
          </button>
        )}
      </div>

      {/* Games Browser */}
      <div className="bg-surface-primary border border-border-light rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-txt-primary">All games</h2>
          {!gamesLoaded && (
            <button
              onClick={() => loadGames('')}
              className="text-xs font-medium text-txt-secondary border border-border-light rounded-full px-3 py-1 hover:border-border-medium transition-colors"
            >
              Load games
            </button>
          )}
        </div>

        {gamesLoaded && (
          <>
            <div className="mb-3">
              <input
                type="text"
                value={gamesSearch}
                onChange={(e) => {
                  setGamesSearch(e.target.value);
                  if (gamesSearchTimeout.current) clearTimeout(gamesSearchTimeout.current);
                  gamesSearchTimeout.current = setTimeout(() => loadGames(e.target.value), 400);
                }}
                placeholder="Search games..."
                className="px-3 py-1.5 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent-pink max-w-xs w-full"
              />
            </div>

            {gamesLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-4 h-4 border-2 border-border-light border-t-accent-pink rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] text-txt-secondary border-b" style={{ borderColor: 'var(--border-light)' }}>
                      <th className="text-left py-2 font-medium">Title</th>
                      <th className="text-left py-2 font-medium">Group</th>
                      <th className="text-left py-2 font-medium">Creator</th>
                      <th className="text-right py-2 font-medium">Plays</th>
                      <th className="text-right py-2 font-medium">Matchups</th>
                      <th className="text-left py-2 font-medium">Status</th>
                      <th className="text-right py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((g) => (
                      <tr key={g.id} className="border-b text-[13px]" style={{ borderColor: 'var(--border-light)' }}>
                        <td className="py-2.5 pr-3">
                          <a href={`/g/${g.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium text-txt-primary hover:underline">
                            {g.title}
                          </a>
                        </td>
                        <td className="py-2.5 pr-3 text-txt-secondary">{g.groups?.name ?? 'General'}</td>
                        <td className="py-2.5 pr-3 text-txt-secondary">{g.profiles.username}</td>
                        <td className="py-2.5 text-right text-txt-primary">{g.play_count.toLocaleString('en-US')}</td>
                        <td className="py-2.5 text-right text-txt-primary">{g.matchup_count}</td>
                        <td className="py-2.5">
                          <StatusBadge status={g.status} />
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex gap-1 justify-end">
                            <a
                              href={`/g/${g.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-border-light text-txt-secondary hover:border-border-medium"
                            >
                              View
                            </a>
                            {g.status !== 'removed' ? (
                              <button
                                onClick={() => handleGameDelete(g.id)}
                                className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-wrong-border text-wrong-text"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={() => handleGameRestore(g.id)}
                                className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-correct-border text-correct-text"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {games.length === 0 && !gamesLoading && (
                  <p className="text-center text-sm text-txt-tertiary py-6">No games found</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Sub-components
function KPICard({ label, value, delta, deltaPositive, highlight }: {
  label: string;
  value: number | string;
  delta?: string;
  deltaPositive?: boolean;
  highlight?: boolean;
}): React.ReactElement {
  const displayValue = typeof value === 'number' ? value.toLocaleString('en-US') : value;

  return (
    <div className="bg-surface-secondary rounded-md" style={{ padding: '14px 16px' }}>
      <p className="text-xs text-txt-secondary">{label}</p>
      <p className={`text-2xl font-medium mt-0.5 ${highlight ? 'text-wrong-text' : 'text-txt-primary'}`}>
        {displayValue}
      </p>
      {delta && (
        <p className={`text-xs mt-0.5 ${deltaPositive ? 'text-correct-text' : 'text-wrong-text'}`}>
          {delta}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const styles: Record<string, string> = {
    published: 'bg-correct-bg text-correct-text',
    flagged: 'bg-timeout-bg text-timeout-text',
    removed: 'bg-wrong-bg text-wrong-text',
    draft: 'bg-surface-secondary text-txt-secondary',
  };

  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${styles[status] ?? styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function UserEditForm({
  editUsername,
  editDisplayName,
  editAvatarUrl,
  editAvatarPreviewUrl,
  editAvatarError,
  editUsernameError,
  editSaving,
  avatarBg,
  avatarText,
  onUsernameChange,
  onDisplayNameChange,
  onAvatarUrlChange,
  onAvatarError,
  onCancel,
  onSave,
}: {
  editUsername: string;
  editDisplayName: string;
  editAvatarUrl: string;
  editAvatarPreviewUrl: string;
  editAvatarError: boolean;
  editUsernameError: string;
  editSaving: boolean;
  avatarBg: string;
  avatarText: string;
  onUsernameChange: (v: string) => void;
  onDisplayNameChange: (v: string) => void;
  onAvatarUrlChange: (v: string) => void;
  onAvatarError: () => void;
  onCancel: () => void;
  onSave: () => void;
}): React.ReactElement {
  const previewInitials = editUsername.slice(0, 2).toUpperCase();
  const showImage = editAvatarPreviewUrl && !editAvatarError;

  return (
    <div
      className="overflow-hidden"
      style={{ animation: 'fadeSlideIn 250ms ease-out forwards' }}
    >
      <div className="px-3 py-4 mb-2 bg-surface-secondary rounded-lg space-y-3">
        {/* Avatar preview */}
        <div className="flex justify-center">
          {showImage ? (
            <div className="w-20 h-20 rounded-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editAvatarPreviewUrl}
                alt="Preview"
                onError={onAvatarError}
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center font-medium"
              style={{ backgroundColor: avatarBg, color: avatarText, fontSize: 32 }}
            >
              {previewInitials}
            </div>
          )}
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-1">Username</label>
          <input
            type="text"
            value={editUsername}
            onChange={(e) => onUsernameChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary focus:outline-none focus:border-accent-pink"
          />
          {editUsernameError && (
            <p className="text-xs text-wrong-text mt-1">{editUsernameError}</p>
          )}
        </div>

        {/* Display name */}
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-1">Display name</label>
          <input
            type="text"
            value={editDisplayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary focus:outline-none focus:border-accent-pink"
          />
        </div>

        {/* Avatar URL */}
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-1">Avatar URL</label>
          <input
            type="text"
            value={editAvatarUrl}
            onChange={(e) => onAvatarUrlChange(e.target.value)}
            placeholder="https://example.com/pic.jpg"
            className="w-full px-3 py-1.5 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent-pink"
          />
          <p className="text-[11px] text-txt-tertiary mt-1">Paste a direct image URL. Leave empty for initials.</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-full text-[12px] font-medium border border-border-light text-txt-secondary hover:bg-surface-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={editSaving}
            className="px-4 py-1.5 rounded-full text-[12px] font-medium border border-accent-pink bg-accent-pink-light text-accent-pink-dark hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {editSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
