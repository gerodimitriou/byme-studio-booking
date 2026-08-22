-- ============================================================
-- DEMO DATA — One World ByME
-- Τρέξε αυτό στο Supabase SQL Editor
-- Δημιουργεί 30 μέλη, συνδρομές και ραντεβού για demo
-- ============================================================

-- ── 1. MEMBERS ──────────────────────────────────────────────
insert into members (name, email, phone, member_code, active) values
  ('Μαρία Παπαδοπούλου',  'maria.papadopoulou@gmail.com',  '6944123001', 'MP001', true),
  ('Ελένη Κωνσταντίνου',  'eleni.konstantinou@gmail.com',  '6944123002', 'EK002', true),
  ('Σοφία Αλεξίου',       'sofia.alexiou@yahoo.gr',        '6944123003', 'SA003', true),
  ('Κατερίνα Νικολάου',   'katerina.nikolaou@gmail.com',   '6944123004', 'KN004', true),
  ('Αγγελική Δημητρίου',  'aggeliki.dimitriou@gmail.com',  '6944123005', 'AD005', true),
  ('Νίκος Παπαδάκης',     'nikos.papadakis@gmail.com',     '6944123006', 'NP006', true),
  ('Γιώργος Σταματίου',   'giorgos.stamatiou@hotmail.com', '6944123007', 'GS007', true),
  ('Χριστίνα Βασιλείου',  'christina.vassiliou@gmail.com', '6944123008', 'CV008', true),
  ('Δήμητρα Ζαχαρίου',    'dimitra.zachariou@gmail.com',   '6944123009', 'DZ009', true),
  ('Ανδρέας Μανωλάς',     'andreas.manolas@outlook.com',   '6944123010', 'AM010', true),
  ('Θανάσης Γεωργίου',    'thanasis.georgiou@gmail.com',   '6944123011', 'TG011', true),
  ('Ιωάννα Αντωνίου',     'ioanna.antoniou@gmail.com',     '6944123012', 'IA012', true),
  ('Μαρία Σπανού',        'maria.spanou@gmail.com',        '6944123013', 'MS013', true),
  ('Κώστας Λαζαρίδης',    'kostas.lazaridis@gmail.com',    '6944123014', 'KL014', true),
  ('Πηνελόπη Καρακώστα',  'pinelopi.karakosta@yahoo.gr',   '6944123015', 'PK015', true),
  ('Σταύρος Μπέκας',      'stavros.bekas@gmail.com',       '6944123016', 'SB016', true),
  ('Αλεξάνδρα Ρήγα',      'alexandra.riga@gmail.com',      '6944123017', 'AR017', true),
  ('Βαγγέλης Τσιώτης',    'vaggelis.tsiotis@hotmail.com',  '6944123018', 'VT018', true),
  ('Ειρήνη Μακρή',        'eirini.makri@gmail.com',        '6944123019', 'EM019', true),
  ('Παναγιώτης Κοκκίνης', 'panagiotis.kokkinis@gmail.com', '6944123020', 'PK020', true),
  ('Λία Θεοδώρου',        'lia.theodorou@gmail.com',       '6944123021', 'LT021', true),
  ('Μάκης Βουλγαράκης',   'makis.voulgarakis@gmail.com',   '6944123022', 'MV022', true),
  ('Στέλλα Παπαγεωργίου', 'stella.papageorgiou@yahoo.gr',  '6944123023', 'SP023', true),
  ('Τάκης Σερέτης',       'takis.seretis@gmail.com',       '6944123024', 'TS024', true),
  ('Ρένα Χατζηδάκη',      'rena.chatzidaki@gmail.com',     '6944123025', 'RC025', true),
  ('Βασίλης Ορφανός',     'vassilis.orfanos@gmail.com',    '6944123026', 'VO026', true),
  ('Ζωή Μαυρίδου',        'zoe.mavridou@hotmail.com',      '6944123027', 'ZM027', true),
  ('Νικολέτα Πέτρου',     'nikoleta.petrou@gmail.com',     '6944123028', 'NP028', true),
  ('Αποστόλης Τζάνης',    'apostolis.tzanis@gmail.com',    '6944123029', 'AT029', true),
  ('Φωτεινή Μπαλάσκα',    'foteini.balaska@gmail.com',     '6944123030', 'FB030', false)
on conflict (email) do nothing;

-- ── 2. SUBSCRIPTIONS ────────────────────────────────────────
-- Χρησιμοποιούμε subquery για να πάρουμε τα member ids με το email
-- Μίξη πακέτων: active, εκπνεύσαντα, κοντά στη λήξη, λίγες συνεδρίες

-- Unlimited 1 μήνα — ενεργά (4 μέλη)
insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Unlimited 1 μήνα', 'unlimited', null, null, 130, '2026-05-01', '2026-05-31', 'active', null
from members where email = 'maria.papadopoulou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Unlimited 1 μήνα', 'unlimited', null, null, 130, '2026-05-10', '2026-06-10', 'active', null
from members where email = 'eleni.konstantinou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Unlimited 3 μήνες', 'unlimited', null, null, 350, '2026-04-01', '2026-07-01', 'active', null
from members where email = 'nikos.papadakis@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Unlimited 3 μήνες', 'unlimited', null, null, 350, '2026-03-15', '2026-06-15', 'active', null
from members where email = 'giorgos.stamatiou@hotmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

-- 12 Συνεδρίες — ενεργά με διάφορες υπόλοιπες
insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '12 Συνεδρίες', 'sessions', 12, 5, 220, '2026-04-15', '2026-08-15', 'active', null
from members where email = 'sofia.alexiou@yahoo.gr' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '12 Συνεδρίες', 'sessions', 12, 9, 220, '2026-04-01', '2026-08-01', 'active', null
from members where email = 'katerina.nikolaou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '12 Συνεδρίες', 'sessions', 12, 2, 220, '2026-05-20', '2026-09-20', 'active', null
from members where email = 'aggeliki.dimitriou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '12 Συνεδρίες', 'sessions', 12, 11, 220, '2026-02-01', '2026-06-01', 'active', 'Μόλις 1 συνεδρία απομένει'
from members where email = 'christina.vassiliou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

-- 8 Συνεδρίες
insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '8 Συνεδρίες', 'sessions', 8, 3, 160, '2026-05-01', '2026-08-01', 'active', null
from members where email = 'dimitra.zachariou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '8 Συνεδρίες', 'sessions', 8, 7, 160, '2026-03-01', '2026-06-01', 'active', null
from members where email = 'andreas.manolas@outlook.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '8 Συνεδρίες', 'sessions', 8, 1, 160, '2026-05-15', '2026-08-15', 'active', null
from members where email = 'thanasis.georgiou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '8 Συνεδρίες', 'sessions', 8, 6, 160, '2026-04-01', '2026-07-01', 'active', null
from members where email = 'ioanna.antoniou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

-- 4 Συνεδρίες
insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '4 Συνεδρίες', 'sessions', 4, 2, 90, '2026-05-10', '2026-07-10', 'active', null
from members where email = 'maria.spanou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '4 Συνεδρίες', 'sessions', 4, 3, 90, '2026-04-20', '2026-06-20', 'active', null
from members where email = 'kostas.lazaridis@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '4 Συνεδρίες', 'sessions', 4, 0, 90, '2026-05-25', '2026-07-25', 'active', null
from members where email = 'pinelopi.karakosta@yahoo.gr' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

-- Κοντά στη λήξη (λήγουν μέσα στις επόμενες 7 μέρες)
insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Unlimited 1 μήνα', 'unlimited', null, null, 130, '2026-05-02', '2026-06-02', 'active', null
from members where email = 'stavros.bekas@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '8 Συνεδρίες', 'sessions', 8, 6, 160, '2026-03-04', '2026-06-04', 'active', null
from members where email = 'alexandra.riga@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '12 Συνεδρίες', 'sessions', 12, 10, 220, '2026-02-03', '2026-06-03', 'active', null
from members where email = 'vaggelis.tsiotis@hotmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

-- Νέα μέλη (μόλις ξεκίνησαν)
insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Δοκιμαστική', 'sessions', 1, 0, 0, '2026-05-28', '2026-06-28', 'active', 'Νέο μέλος'
from members where email = 'eirini.makri@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Δοκιμαστική', 'sessions', 1, 0, 0, '2026-05-30', '2026-06-30', 'active', 'Νέο μέλος'
from members where email = 'panagiotis.kokkinis@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

-- Χωρίς ενεργή συνδρομή / εκπνευσμένα (εμφανίζονται ως "χρειάζονται ανανέωση")
insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '8 Συνεδρίες', 'sessions', 8, 8, 160, '2026-02-01', '2026-05-01', 'expired', null
from members where email = 'lia.theodorou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id);

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '4 Συνεδρίες', 'sessions', 4, 4, 90, '2026-01-15', '2026-03-15', 'expired', null
from members where email = 'makis.voulgarakis@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id);

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Unlimited 1 μήνα', 'unlimited', null, null, 130, '2026-03-01', '2026-04-01', 'expired', null
from members where email = 'stella.papageorgiou@yahoo.gr' and not exists (select 1 from subscriptions s where s.member_id = members.id);

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '12 Συνεδρίες', 'sessions', 12, 7, 220, '2025-12-01', '2026-04-01', 'expired', null
from members where email = 'takis.seretis@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id);

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '8 Συνεδρίες', 'sessions', 8, 8, 160, '2026-01-01', '2026-04-30', 'expired', null
from members where email = 'rena.chatzidaki@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id);

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Unlimited 3 μήνες', 'unlimited', null, null, 350, '2025-11-01', '2026-02-01', 'expired', null
from members where email = 'vassilis.orfanos@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id);

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '4 Συνεδρίες', 'sessions', 4, 2, 90, '2026-04-01', '2026-05-20', 'expired', null
from members where email = 'zoe.mavridou@hotmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id);

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, 'Drop-in', 'sessions', 1, 1, 25, '2026-05-10', '2026-06-10', 'active', null
from members where email = 'nikoleta.petrou@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

insert into subscriptions (member_id, plan_name, plan_type, sessions_total, sessions_used, price, start_date, end_date, status, notes)
select id, '4 Συνεδρίες', 'sessions', 4, 1, 90, '2026-05-20', '2026-07-20', 'active', null
from members where email = 'apostolis.tzanis@gmail.com' and not exists (select 1 from subscriptions s where s.member_id = members.id and s.status = 'active');

-- ── 3. BOOKINGS ─────────────────────────────────────────────
-- Ραντεβού: παρελθόν (completed), σήμερα, μέλλον, κάποια ακυρωμένα

-- Παρελθόν (Μάιος 2026)
insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-05', '09:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'maria.papadopoulou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-05', '09:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'eleni.konstantinou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Personal Training', '2026-05-06', '10:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'sofia.alexiou@yahoo.gr';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-05-07', '18:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'katerina.nikolaou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-05-07', '18:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'aggeliki.dimitriou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-08', '08:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'nikos.papadakis@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Personal Training', '2026-05-08', '11:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'giorgos.stamatiou@hotmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-12', '09:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'christina.vassiliou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-05-13', '19:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'dimitra.zachariou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Personal Training', '2026-05-14', '17:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'andreas.manolas@outlook.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-05-14', '18:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'thanasis.georgiou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-15', '10:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'ioanna.antoniou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-19', '09:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'maria.spanou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Personal Training', '2026-05-20', '08:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'kostas.lazaridis@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-05-21', '18:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'stavros.bekas@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-22', '11:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'alexandra.riga@gmail.com';

-- Ακυρωμένα
insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-20', '10:00', 'cancelled',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'vaggelis.tsiotis@hotmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Personal Training', '2026-05-16', '17:00', 'cancelled', null
from members m where m.email = 'pinelopi.karakosta@yahoo.gr';

-- Σήμερα (2026-05-31)
insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-31', '09:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'maria.papadopoulou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-05-31', '09:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'eleni.konstantinou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Personal Training', '2026-05-31', '10:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'sofia.alexiou@yahoo.gr';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-05-31', '18:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'nikos.papadakis@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-05-31', '18:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'giorgos.stamatiou@hotmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-05-31', '19:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'katerina.nikolaou@gmail.com';

-- Μέλλον (Ιούνιος 2026)
insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-06-02', '09:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'aggeliki.dimitriou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Personal Training', '2026-06-02', '10:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'christina.vassiliou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-06-03', '18:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'dimitra.zachariou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-06-03', '11:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'thanasis.georgiou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-06-04', '09:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'ioanna.antoniou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Personal Training', '2026-06-04', '08:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'andreas.manolas@outlook.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-06-05', '19:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'maria.spanou@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-06-05', '10:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'stavros.bekas@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-06-06', '17:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'eirini.makri@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Personal Training', '2026-06-09', '09:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'kostas.lazaridis@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-06-09', '11:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'alexandra.riga@gmail.com';

insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Group Training', '2026-06-10', '18:00', 'confirmed',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'apostolis.tzanis@gmail.com';

-- Standby (γεμάτη ώρα)
insert into bookings (name, email, phone, service, booking_date, booking_time, status, subscription_id)
select m.name, m.email, m.phone, 'Pilates Reformer', '2026-06-03', '09:00', 'standby',
       (select id from subscriptions s where s.member_id = m.id order by created_at desc limit 1)
from members m where m.email = 'pinelopi.karakosta@yahoo.gr';
