-- ============================================================================
-- StayEase – Hotel Reservation Management System
-- Final Approved Relational Database Schema (Target RDBMS: PostgreSQL 14+)
-- File: stayease_schema.sql
-- ============================================================================

-- Step 0: Enable PostgreSQL Extension for Concurrency & Range Exclusion
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Clean slate drop in reverse dependency order (for fresh installations)
DROP VIEW IF EXISTS v_hotel_ratings_summary CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_type_amenities CASCADE;
DROP TABLE IF EXISTS amenities CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- 1. USERS TABLE
-- Stores customers, hotel managers, and platform administrators.
-- ============================================================================
CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE, -- Note: Implicit unique B-Tree index created automatically
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_user_role CHECK (role IN ('customer', 'hotel_manager', 'admin'))
);

-- ============================================================================
-- 2. HOTELS TABLE
-- Stores property records and official star rating classifications.
-- ============================================================================
CREATE TABLE hotels (
    hotel_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    postal_code VARCHAR(20) NOT NULL,
    contact_email VARCHAR(150),
    contact_phone VARCHAR(20),
    star_rating INT NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Official property tier rating (1-star to 5-star property classification)
    CONSTRAINT chk_hotel_star_rating CHECK (star_rating BETWEEN 1 AND 5)
);

-- ============================================================================
-- 3. ROOM_TYPES TABLE
-- Defines categories, base rates, and maximum guest capacities per hotel.
-- ============================================================================
CREATE TABLE room_types (
    room_type_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id INT NOT NULL,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    base_price_per_night NUMERIC(10,2) NOT NULL,
    max_occupancy INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite unique key to support composite FK in rooms table
    CONSTRAINT uq_room_types_hotel_id_type_id UNIQUE (hotel_id, room_type_id),
    CONSTRAINT uq_hotel_type_name UNIQUE (hotel_id, type_name),
    CONSTRAINT fk_room_types_hotel FOREIGN KEY (hotel_id) 
        REFERENCES hotels(hotel_id) ON DELETE RESTRICT,
        
    CONSTRAINT chk_room_type_base_price CHECK (base_price_per_night > 0),
    CONSTRAINT chk_room_type_max_occupancy CHECK (max_occupancy > 0)
);

-- ============================================================================
-- 4. AMENITIES TABLE
-- Catalog of standardized hotel/room amenities (e.g., Wi-Fi, Pool, AC).
-- ============================================================================
CREATE TABLE amenities (
    amenity_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================================
-- 5. ROOM_TYPE_AMENITIES TABLE (M:N Junction)
-- Normalizes the Many-to-Many relationship between Room Types and Amenities.
-- ============================================================================
CREATE TABLE room_type_amenities (
    room_type_id INT NOT NULL,
    amenity_id INT NOT NULL,
    
    PRIMARY KEY (room_type_id, amenity_id),
    CONSTRAINT fk_rta_room_type FOREIGN KEY (room_type_id) 
        REFERENCES room_types(room_type_id) ON DELETE CASCADE,
    CONSTRAINT fk_rta_amenity FOREIGN KEY (amenity_id) 
        REFERENCES amenities(amenity_id) ON DELETE CASCADE
);

-- ============================================================================
-- 6. ROOMS TABLE (Controlled Redundancy Architecture)
-- Note on Normalization: Storing hotel_id introduces controlled redundancy
-- because room_type_id -> hotel_id. We intentionally do not claim strict 3NF
-- here. Storing hotel_id enables declarative, engine-enforced uniqueness of
-- room numbers across the entire hotel via UNIQUE (hotel_id, room_number).
-- Consistency is guaranteed by the composite foreign key referencing room_types.
-- ============================================================================
CREATE TABLE rooms (
    room_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id INT NOT NULL,
    room_type_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor_number INT,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    
    -- Composite foreign key guarantees room points strictly to a room type belonging to hotel_id
    CONSTRAINT fk_rooms_room_type FOREIGN KEY (hotel_id, room_type_id) 
        REFERENCES room_types(hotel_id, room_type_id) ON DELETE RESTRICT,
        
    -- Enforces room number uniqueness across the entire hotel
    CONSTRAINT uq_hotel_room_number UNIQUE (hotel_id, room_number),
    CONSTRAINT chk_room_status CHECK (status IN ('available', 'maintenance', 'out_of_service'))
);

-- ============================================================================
-- 7. RESERVATIONS TABLE
-- Manages bookings with price snapshotting, exact mathematical cost check,
-- and GiST temporal exclusion against concurrent double-bookings.
-- ============================================================================
CREATE TABLE reservations (
    reservation_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_guests INT NOT NULL,
    price_per_night NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    booking_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_reservations_room FOREIGN KEY (room_id) 
        REFERENCES rooms(room_id) ON DELETE RESTRICT,
        
    -- Business Domain & Mathematical Integrity Constraints
    CONSTRAINT chk_dates_order CHECK (check_out_date > check_in_date),
    CONSTRAINT chk_number_of_guests CHECK (number_of_guests > 0),
    CONSTRAINT chk_price_per_night CHECK (price_per_night > 0),
    
    -- Exact cost check: total_amount must equal price_per_night * total nights
    -- (Current pricing model excludes taxes, discounts, or additional fees)
    CONSTRAINT chk_total_amount_exact CHECK (
        total_amount = (price_per_night * (check_out_date - check_in_date))
    ),
    
    CONSTRAINT chk_booking_status CHECK (
        booking_status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')
    )
);

-- PostgreSQL GiST Temporal Exclusion Constraint:
-- Enforces physical mutual exclusion for overlapping dates on the same room.
-- Includes 'pending' to prevent race conditions during booking transactions.
ALTER TABLE reservations 
ADD CONSTRAINT no_overlapping_reservations 
EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in_date, check_out_date, '[)') WITH &&
) WHERE (booking_status IN ('pending', 'confirmed', 'checked_in'));

-- ============================================================================
-- 8. PAYMENTS TABLE
-- Tracks billing transactions decoupled from reservation cancellations.
-- ============================================================================
CREATE TABLE payments (
    payment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE, -- Note: Implicit unique B-Tree index created automatically
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    transaction_reference VARCHAR(100) UNIQUE,
    refund_reference VARCHAR(100) UNIQUE,
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    
    CONSTRAINT fk_payments_reservation FOREIGN KEY (reservation_id) 
        REFERENCES reservations(reservation_id) ON DELETE RESTRICT,
    CONSTRAINT chk_payment_amount CHECK (amount >= 0),
    CONSTRAINT chk_payment_method CHECK (
        payment_method IN ('credit_card', 'debit_card', 'upi', 'net_banking', 'cash')
    ),
    CONSTRAINT chk_payment_status CHECK (
        payment_status IN ('pending', 'completed', 'failed', 'refunded')
    )
);

-- ============================================================================
-- 9. REVIEWS TABLE
-- Verified customer reviews tied to completed reservations (1 review per booking).
-- ============================================================================
CREATE TABLE reviews (
    review_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE, -- Note: Implicit unique B-Tree index created automatically
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_reviews_reservation FOREIGN KEY (reservation_id) 
        REFERENCES reservations(reservation_id) ON DELETE RESTRICT,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
);

-- ============================================================================
-- DATABASE PERFORMANCE INDEXES
-- Redundant indexes on unique columns (users.email, payments.reservation_id,
-- reviews.reservation_id) are omitted because UNIQUE constraints automatically
-- generate underlying unique B-Tree indexes in PostgreSQL.
-- ============================================================================
CREATE INDEX idx_hotels_city ON hotels(city) WHERE is_active = true;
CREATE INDEX idx_rooms_hotel_type ON rooms(hotel_id, room_type_id);
CREATE INDEX idx_reservations_room_dates ON reservations(room_id, check_in_date, check_out_date);
CREATE INDEX idx_reservations_user ON reservations(user_id);

-- ============================================================================
-- STORED FUNCTION & TRIGGER 1: GUEST CAPACITY VALIDATION
-- Validates number_of_guests <= room_types.max_occupancy on insert/update.
-- Raises a descriptive exception if room or room type cannot be resolved.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_validate_reservation_capacity()
RETURNS TRIGGER AS $$
DECLARE
    v_max_cap INT;
BEGIN
    SELECT rt.max_occupancy INTO v_max_cap
    FROM rooms r
    JOIN room_types rt 
      ON r.hotel_id = rt.hotel_id 
     AND r.room_type_id = rt.room_type_id
    WHERE r.room_id = NEW.room_id;

    -- Verify that the room and room type exist
    IF v_max_cap IS NULL THEN
        RAISE EXCEPTION 'Room with room_id % or its associated room type does not exist.', NEW.room_id;
    END IF;

    -- Enforce capacity constraint
    IF NEW.number_of_guests > v_max_cap THEN
        RAISE EXCEPTION 'Guest count (%) exceeds maximum room capacity (%) for room_id %.', 
            NEW.number_of_guests, v_max_cap, NEW.room_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_guest_capacity
BEFORE INSERT OR UPDATE OF room_id, number_of_guests ON reservations
FOR EACH ROW
EXECUTE FUNCTION fn_validate_reservation_capacity();

-- ============================================================================
-- STORED FUNCTION & TRIGGER 2: REVIEW ELIGIBILITY VALIDATION
-- Enforces that reviews can only be submitted for completed (checked_out) stays.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_validate_review_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_status VARCHAR(20);
BEGIN
    SELECT booking_status INTO v_booking_status
    FROM reservations
    WHERE reservation_id = NEW.reservation_id;

    IF v_booking_status IS NULL THEN
        RAISE EXCEPTION 'Reservation with reservation_id % does not exist.', NEW.reservation_id;
    END IF;

    IF v_booking_status <> 'checked_out' THEN
        RAISE EXCEPTION 'Reviews can only be submitted for completed (checked_out) reservations. Current status: %', 
            v_booking_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_review_eligibility
BEFORE INSERT OR UPDATE OF reservation_id ON reviews
FOR EACH ROW
EXECUTE FUNCTION fn_validate_review_eligibility();

-- ============================================================================
-- ANALYTICAL VIEW: HOTEL RATINGS & PERFORMANCE SUMMARY
-- CTE aggregates reviews independently per hotel, avoiding row multiplication.
-- ============================================================================
CREATE OR REPLACE VIEW v_hotel_ratings_summary AS
WITH hotel_review_stats AS (
    SELECT 
        rt.hotel_id,
        COUNT(rev.review_id) AS total_customer_reviews,
        ROUND(AVG(rev.rating)::NUMERIC, 2) AS avg_customer_rating
    FROM reviews rev
    JOIN reservations res ON rev.reservation_id = res.reservation_id
    JOIN rooms r ON res.room_id = r.room_id
    JOIN room_types rt 
      ON r.hotel_id = rt.hotel_id 
     AND r.room_type_id = rt.room_type_id
    GROUP BY rt.hotel_id
)
SELECT 
    h.hotel_id,
    h.name AS hotel_name,
    h.city,
    h.star_rating AS official_property_class,
    COALESCE(hrs.total_customer_reviews, 0) AS total_customer_reviews,
    COALESCE(hrs.avg_customer_rating, 0.00) AS avg_customer_rating
FROM hotels h
LEFT JOIN hotel_review_stats hrs ON h.hotel_id = hrs.hotel_id
WHERE h.is_active = true;

-- ============================================================================
-- REFERENCE BACKEND QUERY: ROOM AVAILABILITY SEARCH
-- ============================================================================
-- This query is executed by the backend API (GET /api/hotels/:id/available-rooms).
-- It enforces all five operational requirements:
--   1. Excludes rooms with status 'maintenance' or 'out_of_service' (must be 'available')
--   2. Excludes inactive hotels (h.is_active = true)
--   3. Excludes inactive room types (rt.is_active = true)
--   4. Excludes rooms with overlapping 'pending', 'confirmed', or 'checked_in' bookings
--   5. Excludes room types with max_occupancy less than the requested guest count
--
-- Parameter Placeholders:
--   :hotel_id         -> Targeted hotel property
--   :check_in_date    -> Desired arrival date (e.g., '2026-12-01')
--   :check_out_date   -> Desired departure date (e.g., '2026-12-05')
--   :number_of_guests -> Size of guest party (e.g., 2)
--
-- Query Implementation:
/*
SELECT 
    r.room_id,
    r.room_number,
    r.floor_number,
    rt.room_type_id,
    rt.type_name,
    rt.base_price_per_night,
    rt.max_occupancy,
    h.hotel_id,
    h.name AS hotel_name,
    h.city
FROM rooms r
JOIN room_types rt 
    ON r.hotel_id = rt.hotel_id 
   AND r.room_type_id = rt.room_type_id
JOIN hotels h 
    ON rt.hotel_id = h.hotel_id
WHERE h.hotel_id = :hotel_id
  -- 1. Exclude inactive hotels and inactive room types
  AND h.is_active = true
  AND rt.is_active = true
  -- 2. Exclude rooms under maintenance or out of service
  AND r.status = 'available'
  -- 3. Exclude rooms that cannot accommodate the guest count
  AND rt.max_occupancy >= :number_of_guests
  -- 4. Exclude rooms with overlapping pending, confirmed, or checked_in reservations
  AND NOT EXISTS (
      SELECT 1
      FROM reservations res
      WHERE res.room_id = r.room_id
        AND res.booking_status IN ('pending', 'confirmed', 'checked_in')
        AND res.check_in_date < :check_out_date
        AND res.check_out_date > :check_in_date
  );
*/
