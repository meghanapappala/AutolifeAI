import { supabase } from './supabase';

const BUCKET = 'documents';

export async function uploadFile(userId: string, file: File): Promise<{ path: string; url: string; error: string | null }> {
  const ext = file.name.split('.').pop() || 'bin';
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) return { path: '', url: '', error: uploadError.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return { path: filePath, url: data.publicUrl, error: null };
}

export async function getSignedUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteFile(filePath: string): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  return !error;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'sheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slides';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  return 'file';
}
