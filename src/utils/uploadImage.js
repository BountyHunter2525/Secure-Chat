import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';

/**
 * Uploads an image to a Supabase storage bucket.
 *
 * @param {string} imageUri - Local file URI of the image to upload.
 * @param {string} bucket - Supabase storage bucket name (e.g. 'avatars' or 'chat-images').
 * @param {string} fileName - Destination file path inside the bucket (e.g. 'userId.jpg').
 * @returns {Promise<string>} The public URL of the uploaded image.
 */
export async function uploadImageToSupabase(imageUri, bucket, fileName) {
  // Read image as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: 'base64',
  });

  // Convert base64 → Uint8Array (avoids Blob/FormData corruption issues on RN)
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  // Determine MIME type from extension
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  const contentType = mimeTypes[ext] || 'image/jpeg';

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, byteArray, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // Get & return the public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
