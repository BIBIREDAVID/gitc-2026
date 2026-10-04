-- Supabase Realtime (the equivalent of Firestore's onSnapshot) only pushes
-- changes for tables explicitly added to this publication.
--   settings -> landing page countdown/registration-open, admin live preview
--   registrations -> admin Registrations tab
--   stats -> admin Stats tab, check-in header counter
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.registrations;
alter publication supabase_realtime add table public.stats;
