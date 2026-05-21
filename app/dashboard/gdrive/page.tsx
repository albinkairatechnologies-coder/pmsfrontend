'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FiUpload, FiDownload, FiTrash2, FiFolder, FiFile, FiLogOut, FiRefreshCw, FiSearch } from 'react-icons/fi';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const SCOPES = 'https://www.googleapis.com/auth/drive';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
}

export default function GoogleDrivePage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [gapiReady, setGapiReady] = useState(false);
  const tokenClientRef = useRef<any>(null);
  const accessTokenRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load gapi and initialize
  useEffect(() => {
    const initGapi = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        setGapiReady(true);

        // Restore token from session
        const savedToken = sessionStorage.getItem('gd_token');
        const savedEmail = sessionStorage.getItem('gd_email');
        if (savedToken) {
          window.gapi.client.setToken({ access_token: savedToken });
          accessTokenRef.current = savedToken;
          setIsSignedIn(true);
          if (savedEmail) setUserEmail(savedEmail);
        }
      });
    };

    if (window.gapi) {
      initGapi();
    } else {
      const interval = setInterval(() => {
        if (window.gapi) { clearInterval(interval); initGapi(); }
      }, 300);
    }
  }, []);

  // Init token client
  useEffect(() => {
    const initTokenClient = () => {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          if (resp.error) return;
          accessTokenRef.current = resp.access_token;
          window.gapi.client.setToken({ access_token: resp.access_token });
          sessionStorage.setItem('gd_token', resp.access_token);

          // Get user email
          try {
            const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${resp.access_token}` },
            }).then(r => r.json());
            setUserEmail(info.email || '');
            sessionStorage.setItem('gd_email', info.email || '');
          } catch {}

          setIsSignedIn(true);
        },
      });
    };

    if (window.google?.accounts?.oauth2) {
      initTokenClient();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.oauth2) { clearInterval(interval); initTokenClient(); }
      }, 300);
    }
  }, []);

  const signIn = () => {
    tokenClientRef.current?.requestAccessToken({ prompt: 'consent' });
  };

  const signOut = () => {
    const token = accessTokenRef.current;
    if (token) window.google?.accounts?.oauth2?.revoke(token, () => {});
    window.gapi?.client?.setToken(null);
    accessTokenRef.current = '';
    sessionStorage.removeItem('gd_token');
    sessionStorage.removeItem('gd_email');
    setIsSignedIn(false);
    setFiles([]);
    setUserEmail('');
  };

  const loadFiles = useCallback(async (query = '') => {
    if (!gapiReady) return;
    setLoading(true);
    try {
      let q = "trashed = false";
      if (query) q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
      const res = await window.gapi.client.drive.files.list({
        pageSize: 50,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)',
        q,
        orderBy: 'modifiedTime desc',
      });
      setFiles(res.result.files || []);
    } catch (e: any) {
      if (e?.status === 401) { signOut(); }
    } finally {
      setLoading(false);
    }
  }, [gapiReady]);

  useEffect(() => {
    if (isSignedIn && gapiReady) loadFiles();
  }, [isSignedIn, gapiReady, loadFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const metadata = { name: file.name, mimeType: file.type };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessTokenRef.current}` },
        body: form,
      });
      await loadFiles(search);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (file: DriveFile) => {
    if (file.mimeType.includes('google-apps')) {
      window.open(file.webViewLink, '_blank');
      return;
    }
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
      { headers: { Authorization: `Bearer ${accessTokenRef.current}` } }
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Move this file to trash?')) return;
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessTokenRef.current}` },
    });
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles(search);
  };

  const formatSize = (size?: string) => {
    if (!size) return '—';
    const n = parseInt(size);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') return <FiFolder className="text-yellow-400" size={20} />;
    return <FiFile className="text-blue-400" size={20} />;
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 flex flex-col items-center gap-5 max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center">
            <svg viewBox="0 0 87.3 78" className="w-9 h-9" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Google Drive</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
            Connect your Google account to access, upload and download your Drive files.
          </p>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">📁 My Google Drive</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadFiles(search)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition"
          >
            <FiRefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            <FiUpload size={15} /> {uploading ? 'Uploading...' : 'Upload File'}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition"
          >
            <FiLogOut size={15} /> Disconnect
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="input pl-9 w-full"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); loadFiles(''); }}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-sm transition">
            Clear
          </button>
        )}
      </form>

      {/* File list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <FiRefreshCw className="animate-spin mr-2" /> Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <FiFolder size={40} />
            <p>No files found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Size</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Modified</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {files.map(file => (
                <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.mimeType)}
                      <span className="text-gray-800 dark:text-gray-200 truncate max-w-xs">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{formatSize(file.size)}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {new Date(file.modifiedTime).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(file)}
                        title="Download / Open"
                        className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition"
                      >
                        <FiDownload size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
    </div>
  );
}
