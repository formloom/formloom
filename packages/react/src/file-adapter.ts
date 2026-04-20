import type { FormloomFileValue } from "@formloom/schema";

export type UploadHandler = (file: File) => Promise<{
  url: string;
  name: string;
  mime: string;
  size: number;
}>;

/**
 * Converts a browser `File` into the Formloom representation. When an upload
 * handler is provided, the file is uploaded remotely and the returned value
 * is `{ kind: "remote", url, ... }`. Otherwise the file is read as a base64
 * data URL and wrapped as `{ kind: "inline", dataUrl, ... }`.
 *
 * File reading runs here (invoked from the `onChange` event handler) rather
 * than inside a `useEffect` so React 19 Strict Mode's double-invocation does
 * not leak a half-completed read.
 */
export async function adaptFile(
  file: File,
  handler?: UploadHandler,
): Promise<FormloomFileValue> {
  if (handler !== undefined) {
    const remote = await handler(file);
    return {
      kind: "remote",
      url: remote.url,
      name: remote.name,
      mime: remote.mime,
      size: remote.size,
    };
  }

  const dataUrl = await readAsDataURL(file);
  return {
    kind: "inline",
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    dataUrl,
  };
}

/**
 * Converts a `FileList` (multi-select) into an array of Formloom file values.
 * Files are processed in parallel.
 */
export function adaptFileList(
  files: FileList | File[],
  handler?: UploadHandler,
): Promise<FormloomFileValue[]> {
  const arr = Array.isArray(files) ? files : Array.from(files);
  return Promise.all(arr.map((f) => adaptFile(f, handler)));
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader produced a non-string result"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}
