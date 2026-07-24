grant delete on public.comments to anon;
grant delete on public.comments to authenticated;

drop policy if exists "prototype users can delete comments" on public.comments;
create policy "prototype users can delete comments"
  on public.comments
  for delete
  to anon, authenticated
  using (true);
