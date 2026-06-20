import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadToCloudinary } from './cloudinaryService';

/**
 * Save a base64 JPEG image to the device gallery.
 * Returns the local file URI.
 */
export async function saveImageToGallery(base64Data: string): Promise<string | null> {
    try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            console.warn('[StorageService] Media library permission denied.');
            return null;
        }

        const filename = `crowdvision_${Date.now()}.jpg`;
        // @ts-ignore
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        // @ts-ignore
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });

        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync('CrowdVision', asset, false);

        return asset.uri;
    } catch (error) {
        console.warn('[StorageService] Failed to save image:', error);
        return null;
    }
}

/**
 * Save an image URI to the device gallery.
 */
export async function saveUriToGallery(uri: string): Promise<string | null> {
    try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') return null;

        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('CrowdVision', asset, false);
        return asset.uri;
    } catch (error) {
        console.warn('[StorageService] Failed to save URI to gallery:', error);
        return null;
    }
}


/**
 * Save any text content to documents directory.
 */
export async function saveTextFile(
    filename: string,
    content: string,
): Promise<string> {
    // @ts-ignore
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content);
    return fileUri;
}

/**
 * Request camera and media library permissions.
 */
export async function requestAllPermissions(): Promise<boolean> {
    try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.warn('[StorageService] Permission request failed:', error);
        return false;
    }
}


/**
 * Upload a locally saved image to Cloudinary.
 */
export async function uploadLocalImageToCloud(fileUri: string): Promise<string | null> {
    const result = await uploadToCloudinary(fileUri);
    return result ? result.secure_url : null;
}

