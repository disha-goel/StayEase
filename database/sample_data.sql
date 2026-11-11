-- ============================================================================
-- StayEase – Hotel Reservation Management System
-- Sample Seed Data Script
-- File: database/sample_data.sql
-- ============================================================================

-- Clean existing sample data (in reverse dependency order)
TRUNCATE TABLE reviews, payments, reservations, rooms, room_type_amenities, amenities, room_types, hotels, users RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- 1. SEED USERS
-- Password hashes generated using bcrypt (Cost factor: 10)
-- Default demo password for all accounts: "Password@123"
-- ----------------------------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, phone, role, is_active) VALUES
('System Administrator', 'admin@stayease.com', '$2b$10$IdpEjgGUbWmZtmtRvSulv.66S8RvoMoVw83jQ3aWBeXv7tRQp8mFe', '+91 98765 00001', 'admin', true),
('Rajesh Sharma', 'manager.mumbai@stayease.com', '$2b$10$IdpEjgGUbWmZtmtRvSulv.66S8RvoMoVw83jQ3aWBeXv7tRQp8mFe', '+91 98765 00002', 'hotel_manager', true),
('Anita Desai', 'manager.goa@stayease.com', '$2b$10$IdpEjgGUbWmZtmtRvSulv.66S8RvoMoVw83jQ3aWBeXv7tRQp8mFe', '+91 98765 00003', 'hotel_manager', true),
('Aarav Patel', 'aarav.patel@example.com', '$2b$10$IdpEjgGUbWmZtmtRvSulv.66S8RvoMoVw83jQ3aWBeXv7tRQp8mFe', '+91 98765 11111', 'customer', true),
('Priya Nair', 'priya.nair@example.com', '$2b$10$IdpEjgGUbWmZtmtRvSulv.66S8RvoMoVw83jQ3aWBeXv7tRQp8mFe', '+91 98765 22222', 'customer', true),
('Rohan Gupta', 'rohan.gupta@example.com', '$2b$10$IdpEjgGUbWmZtmtRvSulv.66S8RvoMoVw83jQ3aWBeXv7tRQp8mFe', '+91 98765 33333', 'customer', true);

-- ----------------------------------------------------------------------------
-- 2. SEED HOTELS
-- ----------------------------------------------------------------------------
INSERT INTO hotels (name, description, address, city, state, country, postal_code, contact_email, contact_phone, star_rating, is_active) VALUES
('The Grand Palace Hotel', 'Luxury heritage property located in the heart of Mumbai, featuring world-class dining and bay views.', 'Colaba Causeway, Apollo Bandar', 'Mumbai', 'Maharashtra', 'India', '400001', 'reservations@grandpalace.com', '+91 22 2200 1000', 5, true),
('Seaside Palms Resort', 'Tranquil beachfront resort surrounded by tropical gardens with direct access to pristine sands.', 'Calangute Beach Road', 'Goa', 'Goa', 'India', '403516', 'stay@seasidepalms.com', '+91 832 245 2000', 4, true),
('Himalayan Pine Retreat', 'Cozy mountain lodge offering panoramic valley vistas and heated luxury wooden cottages.', 'Naggar Road, Aleo', 'Manali', 'Himachal Pradesh', 'India', '175131', 'info@himalayanpine.com', '+91 1902 250 300', 3, true);

-- ----------------------------------------------------------------------------
-- 3. SEED ROOM_TYPES
-- ----------------------------------------------------------------------------
-- Hotel 1: The Grand Palace (hotel_id = 1)
INSERT INTO room_types (hotel_id, type_name, description, base_price_per_night, max_occupancy, is_active) VALUES
(1, 'Deluxe City View', 'Spacious room with king bed, marble ensuite, and panoramic cityscape views.', 4500.00, 2, true),
(1, 'Executive Suite', 'Corner suite featuring separate living lounge, executive workspace, and bay panorama.', 8500.00, 3, true),
(1, 'Presidential Heritage Suite', 'Lavish multi-room suite with private terrace, personal butler service, and dining room.', 18000.00, 4, true);

-- Hotel 2: Seaside Palms Resort (hotel_id = 2)
INSERT INTO room_types (hotel_id, type_name, description, base_price_per_night, max_occupancy, is_active) VALUES
(2, 'Standard Garden Room', 'Charming garden-facing room with private patio and teak furnishings.', 2800.00, 2, true),
(2, 'Ocean Front Villa', 'Private villa situated 50 meters from the surf with private plunge pool.', 7200.00, 3, true);

-- Hotel 3: Himalayan Pine Retreat (hotel_id = 3)
INSERT INTO room_types (hotel_id, type_name, description, base_price_per_night, max_occupancy, is_active) VALUES
(3, 'Classic Cedar Room', 'Traditional wood-paneled room with radiant heating and pine forest views.', 2200.00, 2, true),
(3, 'Family Loft Cabin', 'Two-level wooden chalet with fireplace and scenic balcony overlooking snow peaks.', 4800.00, 4, true);

-- ----------------------------------------------------------------------------
-- 4. SEED AMENITIES
-- ----------------------------------------------------------------------------
INSERT INTO amenities (name) VALUES
('High-Speed Wi-Fi'),
('Swimming Pool'),
('Air Conditioning'),
('Complimentary Breakfast'),
('Fitness Center'),
('Airport Shuttle Service'),
('24/7 Room Service'),
('Spa & Wellness Center'),
('Private Balcony'),
('Heated Fireplace');

-- ----------------------------------------------------------------------------
-- 5. SEED ROOM_TYPE_AMENITIES (M:N Junction)
-- ----------------------------------------------------------------------------
-- Deluxe City View (room_type_id = 1)
INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
(1, 1), (1, 3), (1, 4), (1, 7);

-- Executive Suite (room_type_id = 2)
INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 7);

-- Presidential Heritage Suite (room_type_id = 3)
INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8);

-- Standard Garden Room (room_type_id = 4)
INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
(4, 1), (4, 3), (4, 4), (4, 9);

-- Ocean Front Villa (room_type_id = 5)
INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
(5, 1), (5, 2), (5, 3), (5, 4), (5, 8), (5, 9);

-- Classic Cedar Room (room_type_id = 6)
INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
(6, 1), (6, 4), (6, 10);

-- Family Loft Cabin (room_type_id = 7)
INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
(7, 1), (7, 4), (7, 9), (7, 10);

-- ----------------------------------------------------------------------------
-- 6. SEED ROOMS (Physical Room Units)
-- ----------------------------------------------------------------------------
-- Hotel 1: The Grand Palace
INSERT INTO rooms (hotel_id, room_type_id, room_number, floor_number, status) VALUES
(1, 1, '101', 1, 'available'),
(1, 1, '102', 1, 'available'),
(1, 2, '201', 2, 'available'),
(1, 2, '202', 2, 'available'),
(1, 3, '501', 5, 'available');

-- Hotel 2: Seaside Palms Resort
INSERT INTO rooms (hotel_id, room_type_id, room_number, floor_number, status) VALUES
(2, 4, '101', 1, 'available'),
(2, 4, '102', 1, 'available'),
(2, 5, 'V-01', 1, 'available'),
(2, 5, 'V-02', 1, 'available');

-- Hotel 3: Himalayan Pine Retreat
INSERT INTO rooms (hotel_id, room_type_id, room_number, floor_number, status) VALUES
(3, 6, '101', 1, 'available'),
(3, 6, '102', 1, 'available'),
(3, 7, 'Cabin-A', 2, 'available');

-- ----------------------------------------------------------------------------
-- 7. SEED RESERVATIONS
-- Enforces: total_amount = price_per_night * (check_out_date - check_in_date)
-- ----------------------------------------------------------------------------
-- Reservation 1: Aarav Patel stayed at Grand Palace (Room 101, Deluxe City View @ 4500.00/night)
-- 2026-10-01 to 2026-10-05 = 4 nights * 4500.00 = 18000.00. Status: checked_out
INSERT INTO reservations (user_id, room_id, check_in_date, check_out_date, number_of_guests, price_per_night, total_amount, booking_status, created_at) VALUES
(4, 1, '2026-10-01', '2026-10-05', 2, 4500.00, 18000.00, 'checked_out', '2026-09-25 10:00:00+05:30');

-- Reservation 2: Priya Nair booked Seaside Palms (Room V-01, Ocean Front Villa @ 7200.00/night)
-- 2026-11-20 to 2026-11-23 = 3 nights * 7200.00 = 21600.00. Status: confirmed
INSERT INTO reservations (user_id, room_id, check_in_date, check_out_date, number_of_guests, price_per_night, total_amount, booking_status, created_at) VALUES
(5, 8, '2026-11-20', '2026-11-23', 2, 7200.00, 21600.00, 'confirmed', '2026-11-01 14:30:00+05:30');

-- Reservation 3: Rohan Gupta stayed at Himalayan Pine Retreat (Room 101, Classic Cedar @ 2200.00/night)
-- 2026-10-15 to 2026-10-18 = 3 nights * 2200.00 = 6600.00. Status: checked_out
INSERT INTO reservations (user_id, room_id, check_in_date, check_out_date, number_of_guests, price_per_night, total_amount, booking_status, created_at) VALUES
(6, 10, '2026-10-15', '2026-10-18', 1, 2200.00, 6600.00, 'checked_out', '2026-10-10 11:15:00+05:30');

-- ----------------------------------------------------------------------------
-- 8. SEED PAYMENTS
-- ----------------------------------------------------------------------------
-- Payment for Reservation 1
INSERT INTO payments (reservation_id, amount, payment_method, payment_status, transaction_reference, paid_at) VALUES
(1, 18000.00, 'credit_card', 'completed', 'TXN_GRAND_PALACE_001', '2026-09-25 10:05:00+05:30');

-- Payment for Reservation 2
INSERT INTO payments (reservation_id, amount, payment_method, payment_status, transaction_reference, paid_at) VALUES
(2, 21600.00, 'upi', 'completed', 'TXN_SEASIDE_PALMS_002', '2026-11-01 14:35:00+05:30');

-- Payment for Reservation 3
INSERT INTO payments (reservation_id, amount, payment_method, payment_status, transaction_reference, paid_at) VALUES
(3, 6600.00, 'net_banking', 'completed', 'TXN_HIMALAYAN_003', '2026-10-10 11:20:00+05:30');

-- ----------------------------------------------------------------------------
-- 9. SEED REVIEWS
-- Note: Trigger trg_check_review_eligibility requires booking_status = 'checked_out'
-- Reservations 1 and 3 are checked_out, so their reviews are legally accepted.
-- ----------------------------------------------------------------------------
INSERT INTO reviews (reservation_id, rating, comment, created_at) VALUES
(1, 5, 'Exceptional experience at The Grand Palace. The city view from Room 101 was breathtaking and staff hospitality was top-notch.', '2026-10-06 12:00:00+05:30'),
(3, 4, 'Very cozy and peaceful wooden cabin. The fireplace kept us warm, and the morning valley view was mesmerizing.', '2026-10-19 09:30:00+05:30');
