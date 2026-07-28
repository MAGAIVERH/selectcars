import { randomUUID } from "node:crypto";
import { StorageClient } from "@supabase/storage-js";
import type { PhotoContentType, PhotoUploadTicket } from "@selectcars/shared";
import { env } from "../env";

/**
 * Photo storage: Supabase Storage, reached only from here.
 *
 * The shape of this module is the security decision. A dealer's browser uploads the bytes
 * **directly** to storage, so a 5 MB photo never travels through this API, but it does so
 * with a ticket that this module signs: a short-lived permission to write one object at one
 * key that the API chose. The service-role credential stays on the server. The browser never
 * holds a storage credential, and cannot write anywhere it was not sent.
 *
 * See docs/adr/003-direct-to-storage-uploads.md.
 */

const EXTENSIONS: Record<PhotoContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Storage is optional at boot on purpose.
 *
 * Without the credential the API still starts and serves everything else; only the photo
 * endpoints answer 503 with a message that names what is missing. The alternative, refusing
 * to boot, would take the whole marketplace down over a feature nobody is using yet.
 */
export function isStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: StorageClient | null = null;

function storage(): StorageClient {
  if (!isStorageConfigured()) {
    throw new Error("Photo storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  if (!client) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY as string;
    client = new StorageClient(`${env.SUPABASE_URL as string}/storage/v1`, {
      apikey: key,
      Authorization: `Bearer ${key}`,
    });
  }
  return client;
}

/**
 * The key an object gets. Three things it does, all deliberate:
 *
 * - `tenant/<id>/` first, so one dealership's objects sort and list together, and a storage
 *   policy could later be written against that prefix.
 * - `vehicle/<id>/` next, so deleting a listing's photos is a prefix operation.
 * - a `uuid` filename, so the key cannot be guessed from a listing id. The bucket is public
 *   read, which is what a marketplace photo needs to be, and an unguessable key is what keeps
 *   "public" from meaning "enumerable".
 *
 * The dealer's original filename is deliberately dropped: it is user input in a path, and it
 * routinely carries spaces, accents, and someone's directory structure.
 */
export function buildStorageKey(
  tenantId: string,
  vehicleId: string,
  contentType: PhotoContentType,
): string {
  return `tenant/${tenantId}/vehicle/${vehicleId}/${randomUUID()}.${EXTENSIONS[contentType]}`;
}

/** Where an object is readable once uploaded. The bucket is public, so this needs no token. */
export function publicUrlFor(storageKey: string): string {
  return `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${storageKey}`;
}

/** Sign a one-object, short-lived upload permission for the browser. */
export async function createUploadTicket(storageKey: string): Promise<PhotoUploadTicket> {
  const { data, error } = await storage()
    .from(env.SUPABASE_STORAGE_BUCKET)
    .createSignedUploadUrl(storageKey);

  if (error || !data) {
    throw new Error(`Could not sign an upload: ${error?.message ?? "no data returned"}`);
  }

  return {
    // storage-js returns an absolute signed URL; the browser PUTs the file body straight to it.
    uploadUrl: data.signedUrl.startsWith("http")
      ? data.signedUrl
      : `${env.SUPABASE_URL}/storage/v1${data.signedUrl}`,
    storageKey,
    publicUrl: publicUrlFor(storageKey),
  };
}

/**
 * Delete objects, best effort.
 *
 * Called after the database row is gone. A failure here leaves an orphaned object, which
 * costs a little storage and shows to nobody, while throwing would tell the dealer their
 * delete failed when the listing has in fact already lost the photo. So it is logged by the
 * caller, not raised.
 */
export async function removeObjects(storageKeys: string[]): Promise<{ error: string | null }> {
  if (storageKeys.length === 0) return { error: null };

  const { error } = await storage().from(env.SUPABASE_STORAGE_BUCKET).remove(storageKeys);
  return { error: error ? error.message : null };
}
