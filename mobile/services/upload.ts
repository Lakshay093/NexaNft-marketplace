import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { request } from './api';
export async function pickImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error('Allow photo access in device settings to choose an image.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled) return null;
  const image = result.assets[0];
  if (!image) throw new Error('No image selected');
  if (image.fileSize && image.fileSize > 8 * 1024 * 1024)
    throw new Error('Choose an image smaller than 8 MB');
  return image;
}
export async function uploadImage(
  image: ImagePicker.ImagePickerAsset,
  purpose: 'nft' | 'avatar' | 'collection',
  onProgress?: (percent: number) => void,
) {
  const form = new FormData();
  form.append('purpose', purpose);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(image.uri)).blob();
    form.append('image', blob, image.fileName ?? 'artwork.jpg');
  } else
    form.append('image', {
      uri: image.uri,
      name: image.fileName ?? 'artwork.jpg',
      type: image.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  return (
    await request<{ id: string; url: string }>('/uploads', {
      method: 'POST',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    })
  ).data;
}
