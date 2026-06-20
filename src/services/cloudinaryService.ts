// src/services/cloudinaryService.ts
import { CLOUDINARY_CONFIG } from '../config/cloudinaryConfig';

export interface CloudinaryResponse {
    secure_url: string;
    public_id: string;
    [key: string]: any;
}

/**
 * Upload an image to Cloudinary using Expo FileSystem.
 * @param fileUri Local URI of the file to upload.
 * @returns The Cloudinary response or null if failed.
 */
export async function uploadToCloudinary(fileUri: string): Promise<CloudinaryResponse | null> {
    try {
        if (CLOUDINARY_CONFIG.CLOUD_NAME === 'dtxwzqs5r' && CLOUDINARY_CONFIG.UPLOAD_PRESET === 'facedetector') {
            // Already configured, proceed
        } else if (CLOUDINARY_CONFIG.CLOUD_NAME === 'your_cloud_name') {
            console.warn('[CloudinaryService] Cloud name is not configured.');
            return null;
        }

        const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`;

        const formData = new FormData();
        // @ts-ignore
        formData.append('file', {
            uri: fileUri,
            type: 'image/jpeg',
            name: 'upload.jpg',
        });
        formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);

        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const responseData = await response.json();
            console.log('[CloudinaryService] Upload successful:', responseData.secure_url);
            return responseData;
        } else {
            const errorText = await response.text();
            console.error('[CloudinaryService] Upload failed:', response.status, errorText);
            return null;
        }
    } catch (error) {
        console.error('[CloudinaryService] Error uploading to Cloudinary:', error);
        return null;
    }
}

/**
 * Upload a base64 image string to Cloudinary.
 * Useful if the image is only available in memory.
 */
export async function uploadBase64ToCloudinary(base64Data: string): Promise<CloudinaryResponse | null> {
    try {
        const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`;

        // Cloudinary expects data:image/jpeg;base64,... format for base64 uploads
        const base64Tag = base64Data.startsWith('data:') ? '' : 'data:image/jpeg;base64,';

        const formData = new FormData();
        formData.append('file', `${base64Tag}${base64Data}`);
        formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);

        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.ok) {
            console.log('[CloudinaryService] Base64 upload successful:', result.secure_url);
            return result;
        } else {
            console.error('[CloudinaryService] Base64 upload failed:', result);
            return null;
        }
    } catch (error) {
        console.error('[CloudinaryService] Error uploading base64 to Cloudinary:', error);
        return null;
    }
}
