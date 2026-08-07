import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";
import { supabase } from "./supabase";

type UploadResult = {
  canceled: boolean;
  url: string | null;
  error: string | null;
};

export async function pickAndUploadListingImage(
  userId?: string | null
): Promise<UploadResult> {
  if (!userId || !supabase) {
    return {
      canceled: false,
      url: null,
      error: "Sign in and configure Supabase to upload a photo.",
    };
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { canceled: false, url: null, error: "Permission denied." };
  }

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
      ...(Platform.OS === "android" ? { legacy: true } : {}),
    });
  } catch (error: any) {
    return {
      canceled: false,
      url: null,
      error: error?.message ?? "Unable to pick image.",
    };
  }

  if (result.canceled || !result.assets?.[0]) {
    return { canceled: true, url: null, error: null };
  }

  const asset = result.assets[0];
  const inferredExt =
    asset.mimeType?.split("/").pop() ||
    asset.fileName?.split(".").pop() ||
    asset.uri.split(".").pop() ||
    "jpg";
  const fileExt = inferredExt.toLowerCase();
  const filePath = `${userId}/listing-${Date.now()}.${fileExt}`;
  let uploadError: { message: string } | null = null;
  if (Platform.OS === "web") {
    try {
      const webFile = (asset as any).file as File | undefined;
      const payload =
        webFile ??
        (await (await fetch(asset.uri)).blob());
      const upload = await supabase.storage
        .from("avatars")
        .upload(filePath, payload, {
          cacheControl: "3600",
          upsert: true,
          contentType: asset.mimeType ?? "image/jpeg",
        });
      uploadError = upload.error;
    } catch (error: any) {
      return {
        canceled: false,
        url: null,
        error: error?.message ?? "Unable to read image on web.",
      };
    }
  } else {
    let fileBuffer: Uint8Array;
    try {
      // content:// URIs (common on Android) can't be read directly — copy to cache first
      let readableUri = asset.uri;
      if (asset.uri.startsWith("content://")) {
        const localPath = `${LegacyFileSystem.cacheDirectory}upload-${Date.now()}.${fileExt}`;
        await LegacyFileSystem.copyAsync({ from: asset.uri, to: localPath });
        readableUri = localPath;
      }
      const base64 = await LegacyFileSystem.readAsStringAsync(readableUri, {
        encoding: "base64",
      });
      fileBuffer = Buffer.from(base64, "base64");
    } catch (error: any) {
      return {
        canceled: false,
        url: null,
        error: error?.message ?? "Unable to read image.",
      };
    }

    const upload = await supabase.storage
      .from("avatars")
      .upload(filePath, fileBuffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: asset.mimeType ?? "image/jpeg",
      });
    uploadError = upload.error;
  }

  if (uploadError) {
    return { canceled: false, url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return { canceled: false, url: data?.publicUrl ?? null, error: null };
}

export async function pickAndUploadDocumentImage(
  userId?: string | null
): Promise<UploadResult> {
  if (!userId || !supabase) {
    return { canceled: false, url: null, error: "Sign in and configure Supabase to upload a document." };
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { canceled: false, url: null, error: "Permission denied." };
  }

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
      ...(Platform.OS === "android" ? { legacy: true } : {}),
    });
  } catch (error: any) {
    return { canceled: false, url: null, error: error?.message ?? "Unable to pick image." };
  }

  if (result.canceled || !result.assets?.[0]) {
    return { canceled: true, url: null, error: null };
  }

  const asset = result.assets[0];
  const inferredExt =
    asset.mimeType?.split("/").pop() ||
    asset.fileName?.split(".").pop() ||
    asset.uri.split(".").pop() ||
    "jpg";
  const fileExt = inferredExt.toLowerCase();
  const filePath = `${userId}/doc-${Date.now()}.${fileExt}`;
  let uploadError: { message: string } | null = null;

  if (Platform.OS === "web") {
    try {
      const payload = (asset as any).file ?? (await (await fetch(asset.uri)).blob());
      const upload = await supabase.storage.from("avatars").upload(filePath, payload, {
        cacheControl: "3600", upsert: true, contentType: asset.mimeType ?? "image/jpeg",
      });
      uploadError = upload.error;
    } catch (error: any) {
      return { canceled: false, url: null, error: error?.message ?? "Unable to read document on web." };
    }
  } else {
    let fileBuffer: Uint8Array;
    try {
      let readableUri = asset.uri;
      if (asset.uri.startsWith("content://")) {
        const localPath = `${LegacyFileSystem.cacheDirectory}doc-upload-${Date.now()}.${fileExt}`;
        await LegacyFileSystem.copyAsync({ from: asset.uri, to: localPath });
        readableUri = localPath;
      }
      const base64 = await LegacyFileSystem.readAsStringAsync(readableUri, { encoding: "base64" });
      fileBuffer = Buffer.from(base64, "base64");
    } catch (error: any) {
      return { canceled: false, url: null, error: error?.message ?? "Unable to read document." };
    }
    const upload = await supabase.storage.from("avatars").upload(filePath, fileBuffer, {
      cacheControl: "3600", upsert: true, contentType: asset.mimeType ?? "image/jpeg",
    });
    uploadError = upload.error;
  }

  if (uploadError) {
    return { canceled: false, url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return { canceled: false, url: data?.publicUrl ?? null, error: null };
}
