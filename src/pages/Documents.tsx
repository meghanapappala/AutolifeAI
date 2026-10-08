import { useEffect, useRef, useState } from 'react';
import {
  Plus, FileText, Trash2, Download, Eye, Search, Tag, Upload, File as FileIcon,
  FileType, ImageIcon, FileArchive, Paperclip, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, EmptyState, toast } from '@/components/ui/Feedback';
import { createNotification } from '@/lib/notifications';
import { uploadFile, getSignedUrl, deleteFile, formatFileSize, fileIcon } from '@/lib/storage';
import type { DocumentItem } from '@/types';

const docTypes = ['note', 'invoice', 'contract', 'resume', 'report', 'file', 'other'];

function FileIconFor({ mimeType, className }: { mimeType: string; className?: string }) {
  const kind = fileIcon(mimeType);
  switch (kind) {
    case 'image': return <ImageIcon className={className} />;
    case 'pdf': return <FileType className={className} />;
    case 'archive': return <FileArchive className={className} />;
    default: return <FileIcon className={className} />;
  }
}

export function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewDoc, setViewDoc] = useState<DocumentItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', type: 'note', content: '', tags: '' });
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('documents').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    setDocs((data as DocumentItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleFileSelect = (file: File) => {
    setPendingFile(file);
    if (!form.name) setForm((f) => ({ ...f, name: file.name.replace(/\.[^.]+$/, '') }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!pendingFile && !form.name.trim()) { toast('Add a file or a name', 'error'); return; }

    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (pendingFile) {
      setUploading(true);
      const { path, url, error: upErr } = await uploadFile(user.id, pendingFile);
      setUploading(false);
      if (upErr) { toast(`Upload failed: ${upErr}`, 'error'); return; }
      const { data, error } = await supabase.from('documents').insert({
        user_id: user.id,
        name: form.name || pendingFile.name,
        type: form.type === 'note' ? 'file' : form.type,
        content: '',
        size_bytes: pendingFile.size,
        tags,
        file_url: url,
        file_path: path,
        mime_type: pendingFile.type || 'application/octet-stream',
        is_file: true,
      }).select().single();
      if (error) { toast('Failed to save document', 'error'); return; }
      setDocs((prev) => [data as DocumentItem, ...prev]);
      await createNotification(user.id, 'File uploaded', `"${form.name || pendingFile.name}" (${formatFileSize(pendingFile.size)}) has been uploaded.`, 'system');
      toast('File uploaded');
    } else {
      const { data, error } = await supabase.from('documents').insert({
        user_id: user.id, name: form.name, type: form.type, content: form.content, size_bytes: new Blob([form.content]).size, tags,
      }).select().single();
      if (error) { toast('Failed to add document', 'error'); return; }
      setDocs((prev) => [data as DocumentItem, ...prev]);
      await createNotification(user.id, 'Document created', `"${form.name}" has been saved.`, 'system');
      toast('Document saved');
    }
    setForm({ name: '', type: 'note', content: '', tags: '' });
    setPendingFile(null);
    setShowAdd(false);
  };

  const updateContent = async (doc: DocumentItem, content: string) => {
    await supabase.from('documents').update({ content, size_bytes: new Blob([content]).size, updated_at: new Date().toISOString() }).eq('id', doc.id);
    setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, content, updated_at: new Date().toISOString() } : d));
  };

  const remove = async () => {
    if (!deleteId) return;
    const doc = docs.find((d) => d.id === deleteId);
    if (doc?.is_file && doc.file_path) await deleteFile(doc.file_path);
    await supabase.from('documents').delete().eq('id', deleteId);
    setDocs((prev) => prev.filter((d) => d.id !== deleteId));
    setDeleteId(null);
    toast('Document deleted');
  };

  const download = async (doc: DocumentItem) => {
    if (doc.is_file && doc.file_path) {
      const signed = await getSignedUrl(doc.file_path);
      if (signed) {
        window.open(signed, '_blank', 'noopener,noreferrer');
        toast('File opened');
        return;
      }
      toast('Could not generate download link', 'error');
      return;
    }
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${doc.name}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded');
  };

  const filtered = docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));

  const typeColor = (t: string) => {
    const map: Record<string, string> = { note: 'default', invoice: 'warning', contract: 'primary', resume: 'accent', report: 'success', file: 'accent', other: 'default' };
    return (map[t] || 'default') as 'default' | 'warning' | 'primary' | 'accent' | 'success';
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{docs.length} documents · {docs.filter((d) => d.is_file).length} files uploaded</p>
        </div>
        <Button onClick={() => { setForm({ name: '', type: 'note', content: '', tags: '' }); setPendingFile(null); setShowAdd(true); }}><Plus className="h-4 w-4" /> New Document</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents or tags..." className="pl-9" />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<FileText className="h-7 w-7" />} title="No documents" description="Upload files or create text documents — invoices, contracts, resumes, and more." action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> New Document</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className="p-4 hover:card-shadow-lg transition-all duration-200 cursor-pointer" onClick={() => setViewDoc(doc)}>
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${doc.is_file ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400' : 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'}`}>
                  {doc.is_file ? <FileIconFor mimeType={doc.mime_type} className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={typeColor(doc.type)}>{doc.is_file ? 'file' : doc.type}</Badge>
                    <span className="text-xs text-gray-400">{formatFileSize(doc.size_bytes)}</span>
                  </div>
                  {doc.is_file ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">{doc.mime_type || 'File'} · {doc.file_path?.split('/').pop()}</p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{doc.content || 'No content'}</p>
                  )}
                  {doc.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {doc.tags.slice(0, 3).map((t) => <span key={t} className="text-xs text-gray-400 flex items-center gap-0.5"><Tag className="h-2.5 w-2.5" />{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setViewDoc(doc); }}><Eye className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); download(doc); }}><Download className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={(e) => { e.stopPropagation(); setDeleteId(doc.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setPendingFile(null); }} title="New Document">
        <form onSubmit={add} className="space-y-4">
          {/* Upload dropzone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {pendingFile ? (
              <div className="flex items-center justify-center gap-2">
                <Paperclip className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{pendingFile.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(pendingFile.size)})</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setPendingFile(null); }} className="text-gray-400 hover:text-error-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload or drag & drop</p>
                <p className="text-xs text-gray-400 mt-1">PDF, images, docs, spreadsheets — any file up to 50 MB</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            <span>or create a text document</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
          </div>

          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q1 Invoice" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
            <div className="flex flex-wrap gap-2">
              {docTypes.map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${form.type === t ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{t}</button>
              ))}
            </div>
          </div>
          {!pendingFile && (
            <Textarea label="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} placeholder="Write your document content here..." />
          )}
          <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="work, important, draft" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setPendingFile(null); }}>Cancel</Button>
            <Button type="submit" disabled={uploading}>{uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : pendingFile ? 'Upload File' : 'Save Document'}</Button>
          </div>
        </form>
      </Modal>

      {/* View modal */}
      <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.name ?? ''} size="lg">
        {viewDoc && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={typeColor(viewDoc.type)}>{viewDoc.is_file ? 'file' : viewDoc.type}</Badge>
              {viewDoc.is_file && <Badge variant="accent">{viewDoc.mime_type || 'file'}</Badge>}
              <span className="text-xs text-gray-400">{formatFileSize(viewDoc.size_bytes)} · Updated {new Date(viewDoc.updated_at).toLocaleString()}</span>
            </div>
            {viewDoc.is_file ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <FileIconFor mimeType={viewDoc.mime_type} className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-300">{viewDoc.mime_type || 'File'}</p>
                <p className="text-xs text-gray-400 mt-1">{viewDoc.file_path?.split('/').pop()}</p>
                <Button className="mt-4" onClick={() => download(viewDoc)}><Download className="h-4 w-4" /> Download File</Button>
              </div>
            ) : (
              <Textarea value={viewDoc.content} onChange={(e) => { const c = e.target.value; setViewDoc({ ...viewDoc, content: c }); updateContent(viewDoc, c); }} rows={12} className="font-mono text-sm" placeholder="Document content..." />
            )}
            {viewDoc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {viewDoc.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"><Tag className="h-2.5 w-2.5" />{t}</span>)}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => download(viewDoc)}><Download className="h-4 w-4" /> Download</Button>
              <Button variant="ghost" onClick={() => setViewDoc(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete document?" message={docs.find((d) => d.id === deleteId)?.is_file ? 'This file will be permanently removed from storage.' : 'This document will be permanently removed.'} onConfirm={remove} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
