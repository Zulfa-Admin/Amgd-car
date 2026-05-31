
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "listing-images public read" ON storage.objects;
CREATE POLICY "listing-images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "listing-images user upload" ON storage.objects;
CREATE POLICY "listing-images user upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "listing-images user update" ON storage.objects;
CREATE POLICY "listing-images user update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "listing-images user delete" ON storage.objects;
CREATE POLICY "listing-images user delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
