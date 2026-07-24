alter table public.comments
  add column if not exists segments jsonb not null default '[]'::jsonb;

alter table public.comments
  drop constraint if exists comments_segments_are_valid;

alter table public.comments
  add constraint comments_segments_are_valid
  check (
    jsonb_typeof(segments) = 'array'
    and jsonb_array_length(segments) <= 5
  );
