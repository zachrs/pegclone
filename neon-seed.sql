-- ============================================================
-- PART 2: SEED DATA
-- Paste this into Neon SQL Editor AFTER the schema runs
-- ============================================================

-- Organizations
INSERT INTO organizations (id, name, slug, primary_color, secondary_color, settings) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Acme Women''s Health', 'acme-womens', '#7c3aed', '#059669', '{"reminders":{"enabled":true,"default_max":3,"default_interval_hours":24},"message_templates":{"sms":"[Organization Name] has sent you a message: [link]","email_subject":"[Organization Name] has sent you a message","email_body":"[Organization Name] has sent you a message. Click the link below to view it: [link]"}}'),
  ('a0000000-0000-0000-0000-000000000002', 'Metro Family Practice', 'metro-family', '#059669', NULL, '{}');

-- Users (all passwords are "password123")
INSERT INTO users (id, tenant_id, password_hash, email, full_name, role, is_admin, title, is_active, activated_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '$2b$10$0ri7MMoy/oeFD2epT/SvoOEzll8NZ98ZWmzKCe9BAHcZ1jrV/Es/y', 'superadmin@peg.test', 'Super Admin', 'super_admin', true, NULL, true, '2025-06-01'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '$2b$10$0ri7MMoy/oeFD2epT/SvoOEzll8NZ98ZWmzKCe9BAHcZ1jrV/Es/y', 'provider@acme.test', 'Dr. Sarah Chen', 'provider', true, 'OB/GYN, MD', true, '2025-06-15'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '$2b$10$0ri7MMoy/oeFD2epT/SvoOEzll8NZ98ZWmzKCe9BAHcZ1jrV/Es/y', 'admin@acme.test', 'Jane Smith', 'org_user', true, 'Office Manager', true, '2025-06-20'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '$2b$10$0ri7MMoy/oeFD2epT/SvoOEzll8NZ98ZWmzKCe9BAHcZ1jrV/Es/y', 'james.lee@acme.test', 'Dr. James Lee', 'provider', false, 'Family Medicine, DO', true, '2025-07-01'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '$2b$10$0ri7MMoy/oeFD2epT/SvoOEzll8NZ98ZWmzKCe9BAHcZ1jrV/Es/y', 'maria.johnson@acme.test', 'Maria Johnson', 'org_user', false, 'Medical Assistant', true, '2025-08-10');

-- Content Items
INSERT INTO content_items (id, tenant_id, source, title, type, url, storage_path) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'org_upload', 'Achilles Tendonitis', 'link', 'https://example.com/achilles', NULL),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'org_upload', 'Missed Birth Control', 'link', 'https://example.com/birth-control', NULL),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'org_upload', 'Post-Op Knee Exercises', 'pdf', NULL, '/uploads/knee-exercises.pdf'),
  ('c0000000-0000-0000-0000-000000000004', NULL, 'system_library', 'Understanding Type 2 Diabetes', 'link', 'https://peg.library/diabetes-type2', NULL),
  ('c0000000-0000-0000-0000-000000000005', NULL, 'system_library', 'Heart-Healthy Eating', 'link', 'https://peg.library/heart-healthy', NULL),
  ('c0000000-0000-0000-0000-000000000006', NULL, 'system_library', 'Asthma Overview', 'link', 'https://peg.library/asthma', NULL),
  ('c0000000-0000-0000-0000-000000000007', NULL, 'system_library', 'Childhood Immunization Schedule', 'pdf', 'https://peg.library/immunizations', NULL),
  ('c0000000-0000-0000-0000-000000000008', NULL, 'system_library', 'Prenatal Care Basics', 'link', 'https://peg.library/prenatal', NULL);

-- Folders
INSERT INTO folders (id, tenant_id, owner_id, name, type, is_published, published_by, published_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Favorites', 'favorites', false, NULL, NULL),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'My Uploads', 'personal', false, NULL, NULL),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Speech Therapy', 'personal', false, NULL, NULL);

-- Folder Items
INSERT INTO folder_items (tenant_id, folder_id, content_item_id, added_by, "order") VALUES
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 0),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 1),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 0);

-- Recipients
INSERT INTO recipients (id, tenant_id, first_name, last_name, contact, contact_type) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '', '', 'maria.garcia@email.com', 'email'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '', '', '+15551234567', 'phone'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '', '', 'sarah.chen.patient@email.com', 'email'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '', '', '+15559876543', 'phone'),
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '', '', 'john.doe@email.com', 'email'),
  ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '', '', '+15554567890', 'phone'),
  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '', '', 'pat.williams@email.com', 'email'),
  ('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '', '', 'lisa.m@email.com', 'email');

-- Messages
INSERT INTO messages (tenant_id, sender_id, recipient_id, content_blocks, delivery_channel, status, sent_at, delivered_at, opened_at, access_token_hash, access_token_expires_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', '[{"type":"content_item","content_item_id":"c0000000-0000-0000-0000-000000000001","order":1}]', 'email', 'delivered', '2025-12-01 10:30:00+00', '2025-12-01 10:30:30+00', '2025-12-01 14:22:00+00', encode(sha256(gen_random_bytes(16)), 'hex'), NOW() + INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '[{"type":"content_item","content_item_id":"c0000000-0000-0000-0000-000000000004","order":1}]', 'sms', 'delivered', '2025-11-28 09:15:00+00', '2025-11-28 09:15:30+00', NULL, encode(sha256(gen_random_bytes(16)), 'hex'), NOW() + INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', '[{"type":"content_item","content_item_id":"c0000000-0000-0000-0000-000000000003","order":1}]', 'email', 'delivered', '2025-12-05 14:00:00+00', '2025-12-05 14:00:30+00', '2025-12-05 16:45:00+00', encode(sha256(gen_random_bytes(16)), 'hex'), NOW() + INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', '[{"type":"content_item","content_item_id":"c0000000-0000-0000-0000-000000000006","order":1}]', 'email', 'delivered', '2025-12-08 11:20:00+00', '2025-12-08 11:20:30+00', NULL, encode(sha256(gen_random_bytes(16)), 'hex'), NOW() + INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', '[{"type":"content_item","content_item_id":"c0000000-0000-0000-0000-000000000007","order":1}]', 'sms', 'failed', '2025-12-12 15:30:00+00', NULL, NULL, encode(sha256(gen_random_bytes(16)), 'hex'), NOW() + INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', '[{"type":"content_item","content_item_id":"c0000000-0000-0000-0000-000000000004","order":1}]', 'email', 'delivered', '2025-12-10 09:00:00+00', '2025-12-10 09:00:30+00', '2025-12-10 11:30:00+00', encode(sha256(gen_random_bytes(16)), 'hex'), NOW() + INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', '[{"type":"content_item","content_item_id":"c0000000-0000-0000-0000-000000000003","order":1}]', 'sms', 'delivered', '2025-12-11 14:30:00+00', '2025-12-11 14:30:30+00', '2025-12-11 18:00:00+00', encode(sha256(gen_random_bytes(16)), 'hex'), NOW() + INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000007', '[{"type":"content_item","content_item_id":"c0000000-0000-0000-0000-000000000006","order":1}]', 'email', 'delivered', '2025-12-14 10:00:00+00', '2025-12-14 10:00:30+00', '2025-12-14 13:20:00+00', encode(sha256(gen_random_bytes(16)), 'hex'), NOW() + INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000008', '[{"type":"content_item","content_item_id":"c0000000-0000-0000-0000-000000000001","order":1}]', 'email', 'delivered', '2025-12-16 11:00:00+00', '2025-12-16 11:00:30+00', '2025-12-17 09:15:00+00', encode(sha256(gen_random_bytes(16)), 'hex'), NOW() + INTERVAL '30 days');
