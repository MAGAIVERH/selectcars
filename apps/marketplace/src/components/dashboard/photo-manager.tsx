"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_VEHICLE,
  photoContentTypeSchema,
  type VehiclePhoto,
} from "@selectcars/shared";
import {
  attachPhotoAction,
  deletePhotoAction,
  requestPhotoUploadAction,
  setPrimaryPhotoAction,
} from "@/app/dashboard/actions";

const MB = 1024 * 1024;

/**
 * The gallery of one listing, and the only place a dealer adds to it.
 *
 * Uploading is three steps and the middle one skips this app entirely:
 *
 *   1. ask the server for a ticket (it validates the dealer, the car, and the gallery size);
 *   2. PUT the file straight to storage with that ticket;
 *   3. tell the server the bytes landed, so it records the row.
 *
 * That is why a 5 MB photo does not travel through the Next server or the API, and why the
 * browser is never handed a storage credential: the ticket it receives covers exactly one
 * object key that the server chose.
 */
export function PhotoManager({
  vehicleId,
  photos,
  alt,
}: {
  vehicleId: string;
  photos: VehiclePhoto[];
  alt: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const remaining = MAX_PHOTOS_PER_VEHICLE - photos.length;

  async function uploadOne(file: File): Promise<void> {
    // Checked here so a dealer hears about a 20 MB file instantly instead of after sending
    // it. The API and the storage bucket check again: this one is courtesy, not defence.
    const type = photoContentTypeSchema.safeParse(file.type);
    if (!type.success) throw new Error(`${file.name}: use a JPG, PNG, WebP, or AVIF image.`);
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error(`${file.name} is ${(file.size / MB).toFixed(1)} MB. The limit is 5 MB.`);
    }

    const ticket = await requestPhotoUploadAction(vehicleId, {
      fileName: file.name,
      contentType: type.data,
      sizeBytes: file.size,
    });
    if (!ticket.ok) throw new Error(ticket.error);

    const sent = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!sent.ok) throw new Error(`${file.name}: the upload was refused by storage.`);

    const recorded = await attachPhotoAction(vehicleId, ticket.storageKey, alt);
    if (!recorded.ok) throw new Error(recorded.error);
  }

  async function onFiles(files: FileList | null): Promise<void> {
    if (!files?.length) return;
    setError(null);

    const chosen = Array.from(files).slice(0, Math.max(0, remaining));
    if (files.length > chosen.length) {
      setError(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} fit on this listing.`);
    }

    for (const file of chosen) {
      setUploading((current) => [...current, file.name]);
      try {
        await uploadOne(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "The upload failed.");
      } finally {
        setUploading((current) => current.filter((name) => name !== file.name));
      }
    }

    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>): void {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div>
      {photos.length === 0 ? (
        <p className="text-muted mt-3 text-sm">
          No photos yet. A listing with no photo still publishes, but it will not hold a buyer.
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-4">
          {photos.map((photo) => (
            <li key={photo.id} className="w-40">
              <div className="border-border bg-background relative h-24 w-40 overflow-hidden rounded-[10px] border">
                <Image
                  src={photo.url}
                  alt={photo.alt ?? alt}
                  fill
                  sizes="160px"
                  className="object-contain p-1"
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                {photo.isPrimary ? (
                  <span className="text-faint font-mono text-[10px] tracking-[0.12em] uppercase">
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setPrimaryPhotoAction(vehicleId, photo.id))}
                    className="text-muted hover:text-foreground text-xs underline-offset-2 transition-colors hover:underline disabled:opacity-40"
                  >
                    Make primary
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deletePhotoAction(vehicleId, photo.id))}
                  className="text-muted text-xs underline-offset-2 transition-colors hover:text-red-600 hover:underline disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id="photos"
          type="file"
          multiple
          accept={ALLOWED_PHOTO_TYPES.join(",")}
          disabled={remaining <= 0 || uploading.length > 0}
          onChange={(e) => void onFiles(e.target.files)}
          className="text-muted file:border-border-strong file:text-foreground hover:file:border-foreground text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border file:bg-transparent file:px-4 file:py-2 file:text-sm file:font-medium file:transition-colors disabled:opacity-50"
        />
        <p className="text-faint text-xs">
          {remaining > 0
            ? `JPG, PNG, WebP or AVIF · up to 5 MB · ${remaining} slot${remaining === 1 ? "" : "s"} left`
            : "This listing is full. Remove a photo to add another."}
        </p>
      </div>

      {uploading.length > 0 && (
        <p role="status" className="text-muted mt-3 text-sm">
          Uploading {uploading.join(", ")}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
