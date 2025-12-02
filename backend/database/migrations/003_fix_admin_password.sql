-- Fix admin password hash
UPDATE users
SET password_hash = '$2a$10$JwUziNHHNLFPEyPAILIXguixtu.X90QYqrwS3XbZaXEySilPYubci'
WHERE email = 'admin@kyobo.com';
