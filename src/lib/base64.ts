export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  if (typeof Buffer !== "undefined") {
    return new Blob([Buffer.from(base64, "base64")], { type: mimeType });
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function parseApiError(response: Response): Promise<{
  code: string;
  message: string;
}> {
  const json = (await response.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
  };
  return {
    code: json.code || "UNKNOWN",
    message: json.message || `Request failed with status ${response.status}`,
  };
}
