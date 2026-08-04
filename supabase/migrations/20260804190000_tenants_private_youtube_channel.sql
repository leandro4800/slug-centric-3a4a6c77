-- Canal YouTube do coach para sincronização automática de vídeos em vlog_posts
ALTER TABLE public.tenants_private
  ADD COLUMN IF NOT EXISTS youtube_channel_id text;
