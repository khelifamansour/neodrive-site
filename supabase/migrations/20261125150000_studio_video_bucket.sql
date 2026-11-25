-- Studio vidéo : stockage privé des vidéos sources, voix off, plans de montage (projects/*.json) et rendus.
-- Idempotent. La route /api/studio/video crée aussi ce bucket si absent (clé service).
insert into storage.buckets (id, name, public, file_size_limit)
values ('studio-video', 'studio-video', false, 262144000)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
