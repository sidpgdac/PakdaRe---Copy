/**
 * photoStorage.js — Upload/download photos via Supabase Storage.
 *
 * WHY: Storing base64 data URLs in Postgres columns is catastrophic at scale.
 * A single 500KB compressed image → 667KB of text in the DB row.
 * 10,000 resolved complaints × 2 photos each = 13GB in the DB. That's a $1000+/month surprise.
 *
 * This module moves photos to Supabase Storage (S3-compatible, CDN-backed),
 * and stores only the public URL path in the complaints row.
 *
 * SETUP (one-time, in Supabase dashboard):
 *   1. Go to Storage → New Bucket → Name: "complaint-photos"
 *   2. Set bucket to PUBLIC (for citizen-submitted evidence photos)
 *   3. Add RLS policy: Allow INSERT for authenticated + anon users
 *      (citizens file reports without auth)
 */

import { supabase } from '../supabase';

const BUCKET = 'complaint-photos';

/**
 * Upload a base64 data URL or File/Blob to Supabase Storage.
 * Returns the public URL on success, or null on failure.
 *
 * @param {string|File|Blob} source - base64 dataURL or File object
 * @param {string} folder - e.g. 'complaints' | 'resolutions'
 * @param {string} [filename] - optional custom filename
 * @returns {Promise<string|null>} public URL or null
 */
export async function uploadPhoto(source, folder = 'complaints', filename) {
  if (!supabase) return null;

  try {
    let blob;
    let ext = 'jpg';

    if (typeof source === 'string' && source.startsWith('data:')) {
      // Convert base64 dataURL to Blob
      const [header, data] = source.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      ext = mime.split('/')[1] || 'jpg';
      const binary = atob(data);
      const array  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
      blob = new Blob([array], { type: mime });
    } else if (source instanceof File || source instanceof Blob) {
      blob = source;
      if (source instanceof File) ext = source.name.split('.').pop() || 'jpg';
    } else {
      console.warn('[photoStorage] Unknown source type:', typeof source);
      return null;
    }

    const name = filename || `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(name, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: false,
        cacheControl: '2592000', // 30 days CDN cache
      });

    if (error) {
      console.error('[photoStorage] Upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
    return data?.publicUrl ?? null;
  } catch (err) {
    console.error('[photoStorage] Unexpected error:', err);
    return null;
  }
}

/**
 * Upload multiple photos and return array of public URLs.
 * Falls back gracefully: if storage upload fails, returns the original base64
 * so the UI still works (just without CDN benefits).
 *
 * @param {string[]} photos - array of base64 dataURLs
 * @param {string} complaintId - used for folder naming
 * @returns {Promise<string[]>}
 */
export async function uploadComplaintPhotos(photos, complaintId) {
  if (!photos?.length) return [];
  if (!supabase) return photos; // fallback: keep base64 in demo mode

  const results = await Promise.all(
    photos.map((photo, i) =>
      uploadPhoto(photo, `complaints/${complaintId}`, undefined)
        .then(url => url ?? photo) // fallback to base64 if upload fails
    )
  );
  return results;
}

/**
 * Upload a single resolution photo for a field officer.
 * @param {string} photoDataUrl - base64 dataURL
 * @param {string} complaintId
 * @returns {Promise<string>} URL or original base64 on failure
 */
export async function uploadResolutionPhoto(photoDataUrl, complaintId) {
  const url = await uploadPhoto(
    photoDataUrl,
    `resolutions/${complaintId}`,
    undefined
  );
  return url ?? photoDataUrl; // fallback to base64 if storage not set up
}
