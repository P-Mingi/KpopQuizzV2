'use client';

import { useState, useCallback, useRef } from 'react';
import { useAudioPlayer } from '@/components/game/use-audio-player';

interface Song {
  id: string;
  deezer_track_id: number;
  title: string;
  artist_name: string;
  album_name: string | null;
  album_cover_small: string | null;
  album_cover_medium: string | null;
  album_cover_big: string | null;
  preview_url: string;
  duration: number | null;
  group_id: string | null;
  gender: string | null;
  generation: string | null;
  is_title_track: boolean | null;
  year: number | null;
  wrong_answers_artist: string[];
  wrong_answers_title: string[];
  difficulty: string;
  status: string;
  play_count: number;
  created_at: string;
}

interface DeezerTrack {
  deezer_track_id: number;
  title: string;
  artist_name: string;
  artist_id: number;
  album_name: string | null;
  album_cover_small: string | null;
  album_cover_medium: string | null;
  album_cover_big: string | null;
  preview_url: string;
  duration: number;
}

interface DeezerArtist {
  id: number;
  name: string;
  picture_small: string | null;
  picture_medium: string | null;
  nb_fan: number;
}

interface Props {
  initialSongs: Song[];
  initialTotal: number;
  stats: { total: number; active: number; inactive: number; gg: number; bg: number };
  groups: Array<{ id: string; name: string; slug: string }>;
}

export function SongManager({ initialSongs, initialTotal, stats, groups }: Props): React.ReactElement {
  // DB songs state
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [searchDb, setSearchDb] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterGeneration, setFilterGeneration] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Deezer search state
  const [artistSearch, setArtistSearch] = useState('');
  const [foundArtist, setFoundArtist] = useState<DeezerArtist | null>(null);
  const [deezerTracks, setDeezerTracks] = useState<DeezerTrack[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);
  const [existingIds, setExistingIds] = useState<Set<number>>(new Set());

  // Bulk add metadata
  const [bulkGender, setBulkGender] = useState('gg');
  const [bulkGeneration, setBulkGeneration] = useState('4th');
  const [bulkGroupId, setBulkGroupId] = useState('');
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState('');

  // Import JSON
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Audio
  const { load, play, pause, isPlaying } = useAudioPlayer();
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  // ---- Audio preview ----

  const togglePreview = useCallback((url: string) => {
    if (playingUrl === url) {
      pause();
      setPlayingUrl(null);
    } else {
      load(url);
      play();
      setPlayingUrl(url);
    }
  }, [playingUrl, load, play, pause]);

  // ---- Deezer search ----

  const searchArtist = useCallback(async () => {
    if (!artistSearch.trim()) return;
    setSearching(true);
    setFoundArtist(null);
    setDeezerTracks([]);
    setSelectedTracks(new Set());
    setAddResult('');

    try {
      // Search for artist
      const artistRes = await fetch(`/api/admin/songs/search-artist?q=${encodeURIComponent(artistSearch)}`);
      const artistData = await artistRes.json();
      const artist = artistData.artists?.[0] as DeezerArtist | undefined;

      if (!artist) {
        setSearching(false);
        return;
      }

      setFoundArtist(artist);

      // Get top tracks
      const tracksRes = await fetch(`/api/admin/songs/search-deezer?artist_id=${artist.id}&limit=100`);
      const tracksData = await tracksRes.json();
      const tracks = (tracksData.tracks ?? []) as DeezerTrack[];
      setDeezerTracks(tracks);

      // Check which are already in DB
      const ids = tracks.map((t) => t.deezer_track_id);
      if (ids.length > 0) {
        const checkRes = await fetch(`/api/admin/songs/list?limit=1000`);
        const checkData = await checkRes.json();
        const dbIds = new Set(
          ((checkData.songs ?? []) as Song[]).map((s) => s.deezer_track_id),
        );
        setExistingIds(dbIds);
      }
    } catch {
      alert('Search failed.');
    } finally {
      setSearching(false);
    }
  }, [artistSearch]);

  const toggleTrack = useCallback((id: number) => {
    setSelectedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllNew = useCallback(() => {
    const newIds = deezerTracks
      .filter((t) => !existingIds.has(t.deezer_track_id))
      .map((t) => t.deezer_track_id);
    setSelectedTracks(new Set(newIds));
  }, [deezerTracks, existingIds]);

  // ---- Bulk add ----

  const bulkAdd = useCallback(async () => {
    const selected = deezerTracks.filter((t) => selectedTracks.has(t.deezer_track_id));
    if (selected.length === 0) return;

    setAdding(true);
    setAddResult('');

    try {
      const res = await fetch('/api/admin/songs/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: selected,
          group_id: bulkGroupId || null,
          gender: bulkGender || null,
          generation: bulkGeneration || null,
        }),
      });

      const data = await res.json();
      setAddResult(`Added ${data.added}, skipped ${data.skipped}${data.errors?.length ? `, ${data.errors.length} errors` : ''}`);
      setSelectedTracks(new Set());

      // Refresh existing IDs
      const newExisting = new Set(existingIds);
      for (const t of selected) newExisting.add(t.deezer_track_id);
      setExistingIds(newExisting);

      // Refresh song list
      await refreshSongList();
    } catch {
      setAddResult('Failed to add songs.');
    } finally {
      setAdding(false);
    }
  }, [deezerTracks, selectedTracks, bulkGender, bulkGeneration, bulkGroupId, existingIds]);

  // ---- Import JSON ----

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string);
    };
    reader.readAsText(file);
  }, []);

  const doImport = useCallback(async () => {
    let parsed: unknown[];
    try {
      parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) throw new Error('Not an array');
    } catch {
      setImportResult('Invalid JSON array.');
      return;
    }

    setImporting(true);
    setImportResult('');

    try {
      const res = await fetch('/api/admin/songs/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: parsed }),
      });
      const data = await res.json();
      setImportResult(`Imported ${data.totalAdded} / ${data.totalSongs} songs.${data.totalErrors ? ` ${data.totalErrors} batch errors.` : ''}`);
      await refreshSongList();
    } catch {
      setImportResult('Import failed.');
    } finally {
      setImporting(false);
    }
  }, [importJson]);

  // ---- Song list ----

  const refreshSongList = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (searchDb) params.set('search', searchDb);
    if (filterGender) params.set('gender', filterGender);
    if (filterGeneration) params.set('generation', filterGeneration);
    if (filterStatus) params.set('status', filterStatus);

    const res = await fetch(`/api/admin/songs/list?${params}`);
    const data = await res.json();
    setSongs(data.songs ?? []);
    setTotal(data.total ?? 0);
  }, [page, searchDb, filterGender, filterGeneration, filterStatus]);

  const doSearch = useCallback(() => {
    setPage(1);
    refreshSongList();
  }, [refreshSongList]);

  // ---- Edit song ----

  const saveSong = useCallback(async () => {
    if (!editSong) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/songs/${editSong.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editSong.title,
          artist_name: editSong.artist_name,
          gender: editSong.gender,
          generation: editSong.generation,
          difficulty: editSong.difficulty,
          is_title_track: editSong.is_title_track,
          year: editSong.year,
          status: editSong.status,
          wrong_answers_artist: editSong.wrong_answers_artist,
          wrong_answers_title: editSong.wrong_answers_title,
        }),
      });
      if (res.ok) {
        const { song } = await res.json();
        setSongs((prev) => prev.map((s) => (s.id === editSong.id ? (song as Song) : s)));
        setEditSong(null);
      }
    } catch {
      alert('Failed to save.');
    } finally {
      setEditSaving(false);
    }
  }, [editSong]);

  const generateWrongAnswers = useCallback(async () => {
    if (!editSong) return;
    try {
      const res = await fetch('/api/admin/songs/generate-wrong-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: editSong.id,
          artist_name: editSong.artist_name,
          title: editSong.title,
          gender: editSong.gender,
          generation: editSong.generation,
        }),
      });
      const data = await res.json();
      setEditSong({
        ...editSong,
        wrong_answers_artist: data.wrong_artists ?? [],
        wrong_answers_title: data.wrong_titles ?? [],
      });
    } catch {
      alert('Failed to generate wrong answers.');
    }
  }, [editSong]);

  const deleteSong = useCallback(async (id: string) => {
    if (!confirm('Delete this song?')) return;
    try {
      const res = await fetch(`/api/admin/songs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSongs((prev) => prev.filter((s) => s.id !== id));
        setTotal((prev) => prev - 1);
        if (editSong?.id === id) setEditSong(null);
      }
    } catch {
      alert('Failed to delete.');
    }
  }, [editSong]);

  const newTrackCount = deezerTracks.filter((t) => !existingIds.has(t.deezer_track_id)).length;
  const selectedCount = selectedTracks.size;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-[960px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Song Manager</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {stats.total} songs ({stats.active} active) - {stats.gg} GG / {stats.bg} BG
            </p>
          </div>
          <button
            onClick={() => setShowImport(!showImport)}
            className="text-sm px-4 py-2 bg-bg-secondary border border-border-default rounded-md hover:border-border-hover transition-colors"
          >
            Import JSON
          </button>
        </div>

        {/* Import JSON */}
        {showImport && (
          <div className="bg-bg-secondary border border-border-default rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold mb-3">Import songs-database.json</h2>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm px-3 py-1.5 bg-bg-tertiary border border-border-default rounded-md"
              >
                Choose file
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={doImport}
                disabled={importing || !importJson}
                className="text-sm px-3 py-1.5 bg-pink-600 text-white rounded-md disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
            {importJson && <p className="text-xs text-text-tertiary">File loaded ({Math.round(importJson.length / 1024)}KB)</p>}
            {importResult && <p className="text-sm mt-2 text-text-secondary">{importResult}</p>}
          </div>
        )}

        {/* Deezer Search */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">Search Deezer</h2>

          <div className="flex gap-2 mb-4">
            <input
              value={artistSearch}
              onChange={(e) => setArtistSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchArtist(); }}
              placeholder="Artist name (e.g. aespa)"
              className="flex-1 text-sm px-3 py-2 bg-bg-input border border-border-default rounded-md text-text-primary placeholder:text-text-ghost"
            />
            <button
              onClick={searchArtist}
              disabled={searching}
              className="text-sm px-4 py-2 bg-pink-600 text-white rounded-md disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {foundArtist && (
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                {foundArtist.picture_small && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={foundArtist.picture_small} alt="" className="w-10 h-10 rounded-full" />
                )}
                <div>
                  <p className="text-sm font-medium">{foundArtist.name}</p>
                  <p className="text-xs text-text-tertiary">
                    Deezer ID: {foundArtist.id} - {deezerTracks.length} tracks with previews
                    {newTrackCount < deezerTracks.length && ` (${deezerTracks.length - newTrackCount} already in DB)`}
                  </p>
                </div>
              </div>

              {/* Bulk metadata */}
              <div className="flex gap-3 mb-3 flex-wrap">
                <select value={bulkGender} onChange={(e) => setBulkGender(e.target.value)}
                  className="text-sm px-2 py-1.5 bg-bg-input border border-border-default rounded-md text-text-primary">
                  <option value="gg">Girl group</option>
                  <option value="bg">Boy group</option>
                  <option value="solo_female">Solo F</option>
                  <option value="solo_male">Solo M</option>
                  <option value="coed">Co-ed</option>
                </select>
                <select value={bulkGeneration} onChange={(e) => setBulkGeneration(e.target.value)}
                  className="text-sm px-2 py-1.5 bg-bg-input border border-border-default rounded-md text-text-primary">
                  <option value="1st">1st gen</option>
                  <option value="2nd">2nd gen</option>
                  <option value="3rd">3rd gen</option>
                  <option value="4th">4th gen</option>
                  <option value="5th">5th gen</option>
                </select>
                <select value={bulkGroupId} onChange={(e) => setBulkGroupId(e.target.value)}
                  className="text-sm px-2 py-1.5 bg-bg-input border border-border-default rounded-md text-text-primary">
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button onClick={selectAllNew} className="text-xs text-pink-400 hover:underline">
                  Select all new ({newTrackCount})
                </button>
              </div>

              {/* Track list */}
              {deezerTracks.length > 0 && (
                <div className="border border-border-default rounded-md overflow-hidden mb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-bg-tertiary border-b border-border-default">
                        <th className="px-3 py-2 w-8"></th>
                        <th className="text-left px-3 py-2 text-xs text-text-secondary">Title</th>
                        <th className="text-left px-3 py-2 text-xs text-text-secondary w-32">Artist</th>
                        <th className="text-left px-3 py-2 text-xs text-text-secondary w-40">Album</th>
                        <th className="text-right px-3 py-2 text-xs text-text-secondary w-16">Dur</th>
                        <th className="text-center px-3 py-2 text-xs text-text-secondary w-16">Play</th>
                        <th className="text-center px-3 py-2 text-xs text-text-secondary w-16">DB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deezerTracks.map((t) => {
                        const inDb = existingIds.has(t.deezer_track_id);
                        return (
                          <tr key={t.deezer_track_id} className={`border-b border-border-default last:border-0 ${inDb ? 'opacity-50' : ''}`}>
                            <td className="px-3 py-1.5">
                              {!inDb && (
                                <input
                                  type="checkbox"
                                  checked={selectedTracks.has(t.deezer_track_id)}
                                  onChange={() => toggleTrack(t.deezer_track_id)}
                                  className="rounded"
                                />
                              )}
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                {t.album_cover_small && (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={t.album_cover_small} alt="" className="w-8 h-8 rounded" />
                                )}
                                <span className="truncate">{t.title}</span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-text-secondary truncate">{t.artist_name}</td>
                            <td className="px-3 py-1.5 text-text-tertiary text-xs truncate">{t.album_name}</td>
                            <td className="px-3 py-1.5 text-right text-text-tertiary text-xs">
                              {t.duration ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}` : '-'}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <button
                                onClick={() => togglePreview(t.preview_url)}
                                className="text-xs text-pink-400 hover:text-pink-600"
                              >
                                {playingUrl === t.preview_url && isPlaying ? 'Stop' : 'Play'}
                              </button>
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {inDb && <span className="text-xs text-correct">In DB</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add button */}
              {selectedCount > 0 && (
                <button
                  onClick={bulkAdd}
                  disabled={adding}
                  className="text-sm px-4 py-2 bg-pink-600 text-white rounded-md disabled:opacity-50"
                >
                  {adding ? 'Adding...' : `Add ${selectedCount} new song${selectedCount !== 1 ? 's' : ''}`}
                </button>
              )}
              {addResult && <p className="text-sm text-text-secondary mt-2">{addResult}</p>}
            </div>
          )}
        </div>

        {/* Song Database */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">All Songs in Database</h2>

          <div className="flex gap-2 mb-4 flex-wrap">
            <input
              value={searchDb}
              onChange={(e) => setSearchDb(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
              placeholder="Search title or artist..."
              className="flex-1 min-w-48 text-sm px-3 py-1.5 bg-bg-input border border-border-default rounded-md text-text-primary placeholder:text-text-ghost"
            />
            <select value={filterGender} onChange={(e) => { setFilterGender(e.target.value); setPage(1); }}
              className="text-sm px-2 py-1.5 bg-bg-input border border-border-default rounded-md text-text-primary">
              <option value="">All genders</option>
              <option value="gg">Girl group</option>
              <option value="bg">Boy group</option>
              <option value="solo_female">Solo F</option>
              <option value="solo_male">Solo M</option>
            </select>
            <select value={filterGeneration} onChange={(e) => { setFilterGeneration(e.target.value); setPage(1); }}
              className="text-sm px-2 py-1.5 bg-bg-input border border-border-default rounded-md text-text-primary">
              <option value="">All gens</option>
              <option value="2nd">2nd</option>
              <option value="3rd">3rd</option>
              <option value="4th">4th</option>
              <option value="5th">5th</option>
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="text-sm px-2 py-1.5 bg-bg-input border border-border-default rounded-md text-text-primary">
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={doSearch} className="text-sm px-3 py-1.5 bg-bg-tertiary border border-border-default rounded-md">
              Filter
            </button>
          </div>

          <div className="border border-border-default rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-tertiary border-b border-border-default">
                  <th className="text-left px-3 py-2 text-xs text-text-secondary w-10">Art</th>
                  <th className="text-left px-3 py-2 text-xs text-text-secondary">Title</th>
                  <th className="text-left px-3 py-2 text-xs text-text-secondary w-32">Artist</th>
                  <th className="text-left px-3 py-2 text-xs text-text-secondary w-16">Gender</th>
                  <th className="text-left px-3 py-2 text-xs text-text-secondary w-12">Gen</th>
                  <th className="text-left px-3 py-2 text-xs text-text-secondary w-16">Status</th>
                  <th className="text-right px-3 py-2 text-xs text-text-secondary w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {songs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-text-tertiary">
                      No songs found.
                    </td>
                  </tr>
                )}
                {songs.map((s) => (
                  <tr key={s.id} className="border-b border-border-default last:border-0 hover:bg-bg-tertiary/50">
                    <td className="px-3 py-1.5">
                      {s.album_cover_small ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={s.album_cover_small} alt="" className="w-8 h-8 rounded" />
                      ) : (
                        <div className="w-8 h-8 bg-bg-tertiary rounded" />
                      )}
                    </td>
                    <td className="px-3 py-1.5 truncate max-w-48">{s.title}</td>
                    <td className="px-3 py-1.5 text-text-secondary truncate">{s.artist_name}</td>
                    <td className="px-3 py-1.5 text-xs text-text-tertiary uppercase">{s.gender ?? '-'}</td>
                    <td className="px-3 py-1.5 text-xs text-text-tertiary">{s.generation ?? '-'}</td>
                    <td className="px-3 py-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${s.status === 'active' ? 'bg-correct-bg text-correct' : 'bg-wrong-bg text-wrong'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button onClick={() => togglePreview(s.preview_url)} className="text-xs text-pink-400 hover:underline mr-2">
                        {playingUrl === s.preview_url && isPlaying ? 'Stop' : 'Play'}
                      </button>
                      <button onClick={() => setEditSong(s)} className="text-xs text-text-tertiary hover:text-text-primary mr-2">
                        Edit
                      </button>
                      <button onClick={() => deleteSong(s.id)} className="text-xs text-wrong hover:underline">
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-text-tertiary">
              Showing {(page - 1) * 50 + 1}-{Math.min(page * 50, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); refreshSongList(); }}
                disabled={page <= 1}
                className="text-xs px-3 py-1 bg-bg-tertiary border border-border-default rounded disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => { setPage((p) => p + 1); refreshSongList(); }}
                disabled={page * 50 >= total}
                className="text-xs px-3 py-1 bg-bg-tertiary border border-border-default rounded disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editSong && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary rounded-xl border border-border-default shadow-xl max-w-lg w-full max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-border-default">
              <h2 className="text-base font-semibold">Edit song</h2>
              <button onClick={() => setEditSong(null)} className="text-text-tertiary hover:text-text-primary text-lg">x</button>
            </div>
            <div className="p-4 space-y-3">
              {/* Preview */}
              <div className="flex items-center gap-3">
                {editSong.album_cover_medium && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={editSong.album_cover_medium} alt="" className="w-16 h-16 rounded" />
                )}
                <div>
                  <button
                    onClick={() => togglePreview(editSong.preview_url)}
                    className="text-sm text-pink-400 hover:underline"
                  >
                    {playingUrl === editSong.preview_url && isPlaying ? 'Stop preview' : 'Play preview'}
                  </button>
                  <p className="text-xs text-text-tertiary mt-0.5">Deezer ID: {editSong.deezer_track_id}</p>
                </div>
              </div>

              {/* Fields */}
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Title</label>
                <input value={editSong.title} onChange={(e) => setEditSong({ ...editSong, title: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-bg-input border border-border-default rounded-md text-text-primary" />
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Artist</label>
                <input value={editSong.artist_name} onChange={(e) => setEditSong({ ...editSong, artist_name: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-bg-input border border-border-default rounded-md text-text-primary" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Gender</label>
                  <select value={editSong.gender ?? ''} onChange={(e) => setEditSong({ ...editSong, gender: e.target.value || null })}
                    className="w-full text-sm px-2 py-2 bg-bg-input border border-border-default rounded-md text-text-primary">
                    <option value="">-</option>
                    <option value="gg">GG</option>
                    <option value="bg">BG</option>
                    <option value="solo_female">Solo F</option>
                    <option value="solo_male">Solo M</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Generation</label>
                  <select value={editSong.generation ?? ''} onChange={(e) => setEditSong({ ...editSong, generation: e.target.value || null })}
                    className="w-full text-sm px-2 py-2 bg-bg-input border border-border-default rounded-md text-text-primary">
                    <option value="">-</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                    <option value="5th">5th</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Difficulty</label>
                  <select value={editSong.difficulty} onChange={(e) => setEditSong({ ...editSong, difficulty: e.target.value })}
                    className="w-full text-sm px-2 py-2 bg-bg-input border border-border-default rounded-md text-text-primary">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Year</label>
                  <input type="number" value={editSong.year ?? ''} onChange={(e) => setEditSong({ ...editSong, year: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full text-sm px-3 py-2 bg-bg-input border border-border-default rounded-md text-text-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Title track?</label>
                  <select value={editSong.is_title_track === null ? '' : editSong.is_title_track ? 'yes' : 'no'}
                    onChange={(e) => setEditSong({ ...editSong, is_title_track: e.target.value === '' ? null : e.target.value === 'yes' })}
                    className="w-full text-sm px-2 py-2 bg-bg-input border border-border-default rounded-md text-text-primary">
                    <option value="">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Status</label>
                  <select value={editSong.status} onChange={(e) => setEditSong({ ...editSong, status: e.target.value })}
                    className="w-full text-sm px-2 py-2 bg-bg-input border border-border-default rounded-md text-text-primary">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="review">Review</option>
                  </select>
                </div>
              </div>

              {/* Wrong answers */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-tertiary">Wrong artist answers</label>
                  <button onClick={generateWrongAnswers} className="text-xs text-pink-400 hover:underline">
                    Auto-generate
                  </button>
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <input key={i} value={editSong.wrong_answers_artist[i] ?? ''}
                      onChange={(e) => {
                        const arr = [...editSong.wrong_answers_artist];
                        arr[i] = e.target.value;
                        setEditSong({ ...editSong, wrong_answers_artist: arr });
                      }}
                      className="flex-1 text-sm px-2 py-1.5 bg-bg-input border border-border-default rounded-md text-text-primary"
                      placeholder={`Wrong ${i + 1}`} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Wrong title answers</label>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <input key={i} value={editSong.wrong_answers_title[i] ?? ''}
                      onChange={(e) => {
                        const arr = [...editSong.wrong_answers_title];
                        arr[i] = e.target.value;
                        setEditSong({ ...editSong, wrong_answers_title: arr });
                      }}
                      className="flex-1 text-sm px-2 py-1.5 bg-bg-input border border-border-default rounded-md text-text-primary"
                      placeholder={`Wrong ${i + 1}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border-default flex items-center justify-between">
              <button onClick={() => deleteSong(editSong.id)} className="text-xs text-wrong hover:underline">Delete</button>
              <div className="flex gap-2">
                <button onClick={() => setEditSong(null)} className="text-sm px-3 py-1.5 text-text-secondary hover:text-text-primary">Cancel</button>
                <button onClick={saveSong} disabled={editSaving} className="text-sm px-4 py-1.5 bg-pink-600 text-white rounded-md disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
