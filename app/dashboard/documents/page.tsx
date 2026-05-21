'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { documentAPI } from '../../utils/api';
import {
  FiUpload, FiDownload, FiTrash2, FiFile, FiFileText, FiImage,
  FiSearch, FiX, FiPaperclip, FiUser, FiClock, FiFilter
} from 'react-icons/fi';

const FILE_ICONS: Record<string, JSX.Element> = {
  pdf:  <FiFileText size={22} className="text-red-400" />,
  doc:  <FiFileText size={22} className="text-blue-400" />,
  docx: <FiFileText size={22} className="text-blue-400" />,
  xls:  <FiFileText size={22} className="text-emerald-400" />,
  xlsx: <FiFileText size={22} className="text-emerald-400" />,
  ppt:  <FiFileText size={22} className="text-orange-400" />,
  pptx: <FiFileText size={22} className="text-orange-400" />,
  txt:  <FiFileText size={22} className="text-gray-400" />,
  csv:  <FiFileText size={22} className="text-teal-400" />,
  png:  <FiImage size={22} className="text-purple-400" />,
  jpg:  <FiImage size={22} className="text-purple-400" />,
  jpeg: <FiImage size={22} className="text-purple-400" />,
  gif:  <FiImage size={22} className="text-pink-400" />,
  zip:  <FiFile size={22} className="text-yellow-400" />,
};

const getExt = (filename: string) => filename?.split('.').pop()?.toLowerCase() || '';

const formatSize = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const TYPE_FILTERS = ['All', 'PDF', 'Word', 'Excel', 'Image', 'Other'];

const matchesFilter = (doc: any, filter: string) => {
  const ext = getExt(doc.file_name);
  if (filter === 'All') return true;
  if (filter === 'PDF') return ext === 'pdf';
  if (filter === 'Word') return ['doc', 'docx'].includes(ext);
  if (filter === 'Excel') return ['xls', 'xlsx', 'csv'].includes(ext);
  if (filter === 'Image') return ['png', 'jpg', 'jpeg', 'gif'].includes(ext);
  return !['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'gif'].includes(ext);
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    try {
      const res = await documentAPI.getAll();
      setDocs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title || selectedFile.name);
    formData.append('description', description);
    try {
      await documentAPI.upload(formData);
      setShowUpload(false);
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      fetchDocs();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentAPI.delete(id);
      setDocs(docs.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Delete failed');
    }
  };

  const handleDownload = async (filename: string, originalName: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(documentAPI.getDownloadUrl(filename), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = originalName;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Download failed');
    }
  };

  const filtered = docs.filter(d =>
    matchesFilter(d, filter) &&
    (d.title.toLowerCase().includes(search.toLowerCase()) ||
     d.uploader_name.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Documents</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {docs.length} shared document{docs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 dark:bg-gold-500 dark:hover:bg-gold-600 dark:text-darker text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary-500/20 transition-all active:scale-95"
        >
          <FiUpload size={16} /> Upload Document
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search documents or uploader..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary-500/10 dark:focus:ring-gold-500/10 dark:text-white transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-primary-600 dark:bg-gold-500 text-white dark:text-darker shadow-md'
                  : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-primary-500/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-4">
            <FiPaperclip size={28} className="text-gray-400" />
          </div>
          <p className="font-bold text-gray-500 dark:text-gray-400">No documents found</p>
          <p className="text-sm text-gray-400 mt-1">Upload a document to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => {
            const ext = getExt(doc.file_name);
            const isOwner = doc.uploader_id === user?.id;
            const canDelete = isOwner || user?.role === 'admin';
            return (
              <div
                key={doc.id}
                className="group bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Icon + ext badge */}
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center">
                    {FILE_ICONS[ext] || <FiFile size={22} className="text-gray-400" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 rounded-lg">
                    {ext || 'file'}
                  </span>
                </div>

                {/* Title + description */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate" title={doc.title}>
                    {doc.title}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{doc.description}</p>
                  )}
                </div>

                {/* Meta */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <FiUser size={11} />
                    <span className="truncate">{doc.uploader_name}</span>
                    {isOwner && <span className="text-primary-500 dark:text-gold-500 font-bold">(you)</span>}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><FiClock size={11} />{formatDate(doc.uploaded_at)}</span>
                    <span>{formatSize(doc.file_size)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => handleDownload(doc.file_url, doc.file_name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-500/10 dark:bg-gold-500/10 text-primary-600 dark:text-gold-500 hover:bg-primary-500 dark:hover:bg-gold-500 hover:text-white dark:hover:text-darker rounded-xl text-xs font-bold transition-all"
                  >
                    <FiDownload size={13} /> Download
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Delete"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 animate-slide-up">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Upload Document</h2>
              <button onClick={() => { setShowUpload(false); setSelectedFile(null); setTitle(''); setDescription(''); }}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-5 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-primary-500 dark:border-gold-500 bg-primary-500/5 dark:bg-gold-500/5'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/5'
                    : 'border-gray-200 dark:border-white/10 hover:border-primary-400 dark:hover:border-gold-500/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.zip,.csv"
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      {FILE_ICONS[getExt(selectedFile.name)] || <FiFile size={22} className="text-emerald-500" />}
                    </div>
                    <p className="font-bold text-sm text-gray-800 dark:text-white truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <FiUpload size={28} />
                    <p className="text-sm font-semibold">Drop file here or click to browse</p>
                    <p className="text-xs">PDF, Word, Excel, Images, ZIP and more</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Document title"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Description <span className="normal-case font-normal">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 dark:bg-gold-500 dark:hover:bg-gold-600 dark:text-darker text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
                ) : (
                  <><FiUpload size={16} /> Upload Document</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
