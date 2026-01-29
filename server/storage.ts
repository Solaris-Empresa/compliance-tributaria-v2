/**
 * S3 Storage helpers
 * 
 * These functions provide a simple interface to upload and retrieve files from S3.
 * Credentials are automatically injected from the platform.
 */

import { ENV } from "./_core/env";

export type StoragePutResult = {
  key: string;
  url: string;
};

/**
 * Upload file bytes to S3
 * @param relKey - Relative key/path for the file (e.g., "uploads/image.png")
 * @param data - File data as Buffer, Uint8Array, or string
 * @param contentType - MIME type (e.g., "image/png")
 * @returns Object with key and public URL
 */
export async function storagePut(
  relKey: string,
  data: any,
  contentType?: string
): Promise<StoragePutResult> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Convert data to base64
  const base64Data = Buffer.isBuffer(data) 
    ? data.toString("base64")
    : Buffer.from(data).toString("base64");

  // Build the full URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("storage.v1.StorageService/Put", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      key: relKey,
      data: base64Data,
      content_type: contentType || "application/octet-stream",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Storage put request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    key: string;
    url: string;
  };

  return {
    key: result.key,
    url: result.url,
  };
}

/**
 * Get a presigned URL for a file in S3
 * @param relKey - Relative key/path for the file
 * @param expiresIn - Expiration time in seconds (default: 3600)
 * @returns Object with key and presigned URL
 */
export async function storageGet(
  relKey: string,
  expiresIn: number = 3600
): Promise<StoragePutResult> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("storage.v1.StorageService/Get", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      key: relKey,
      expires_in: expiresIn,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Storage get request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    key: string;
    url: string;
  };

  return {
    key: result.key,
    url: result.url,
  };
}
