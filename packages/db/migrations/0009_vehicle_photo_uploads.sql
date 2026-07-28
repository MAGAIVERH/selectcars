-- Photo uploads: what a dealer's own photographs need beyond a URL.
--
-- Until now every row in `vehicle_photos` pointed at a file committed to the repo
-- (`/cars/bentley-continental-gt.png`). Dealers upload their own now, and an uploaded photo
-- is two things that must be kept in step: a row in this database and an object in Supabase
-- Storage. Deleting the row without deleting the object leaves an orphan nobody will ever
-- find; deleting the object without the row leaves a listing with a broken image.
--
-- So the row remembers where the bytes are.

alter table public.vehicle_photos
  add column if not exists storage_key text;

comment on column public.vehicle_photos.storage_key is
  'Object key in the storage bucket, e.g. tenant/<id>/vehicle/<id>/<uuid>.jpg. Null for the seeded photos that ship with the repo, which have no object to delete.';

-- One primary photo per vehicle, enforced by the database.
--
-- "Primary" is the image the marketplace card and the dashboard row use. Two of them is not a
-- cosmetic problem: `photos.find(p => p.isPrimary)` would then depend on row order, so the
-- same listing could show different cars to different people. A partial unique index says it
-- once, for every writer, instead of every writer remembering to clear the old one first.
create unique index if not exists vehicle_photos_one_primary_per_vehicle
  on public.vehicle_photos (vehicle_id)
  where is_primary;

-- --- The bucket ---------------------------------------------------------------------------
--
-- Created here rather than by hand in a dashboard, so a fresh environment is one `migrate`
-- away from working and nobody has to remember a checkbox. Public read: these are listing
-- photos meant to be seen by anonymous buyers, and the object key carries a uuid, so a key
-- cannot be guessed from a listing id.
--
-- The limits are set on the bucket as well as in the API. The API check gives a dealer a
-- readable error; this one is what actually stops a crafted upload, because it is enforced by
-- storage itself and cannot be talked out of.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'vehicle-photos',
      'vehicle-photos',
      true,
      8388608, -- 8 MB, comfortably above the 5 MB the API allows
      array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    )
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;
