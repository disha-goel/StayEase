const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'stayease_super_secure_jwt_secret_key_2026';

app.use(cors());
app.use(express.json());

// ============================================================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ============================================================================

// Verify JSON Web Token from Authorization header (Bearer <token>)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to continue.',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Session expired or invalid token. Please log in again.',
      });
    }
    req.user = decodedUser;
    next();
  });
}

// Enforce Administrator role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrator privileges required.',
    });
  }
  next();
}

// Server health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// Database connectivity check
app.get('/api/db-health', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        NOW() AS current_time,
        current_database() AS database_name,
        current_user AS connected_user,
        split_part(version(), ' ', 1) || ' ' || split_part(version(), ' ', 2) AS pg_version;
    `);

    res.status(200).json({
      success: true,
      message: 'PostgreSQL database connected successfully.',
      data: {
        status: 'CONNECTED',
        database: result.rows[0].database_name,
        user: result.rows[0].connected_user,
        postgres_version: result.rows[0].pg_version,
        server_time: result.rows[0].current_time,
      },
    });
  } catch (error) {
    console.error('Database connection check error:', error.message);
    res.status(503).json({
      success: false,
      message: 'Unable to connect to database. Please verify database service status.',
    });
  }
});

// Retrieve all active hotels, with optional city filter
app.get('/api/hotels', async (req, res) => {
  try {
    const { city } = req.query;
    const cityFilter = city && city.trim() ? `%${city.trim()}%` : null;

    const sqlText = `
      SELECT 
        h.hotel_id,
        h.name,
        h.description,
        h.address,
        h.city,
        h.state,
        h.country,
        h.postal_code,
        h.contact_email,
        h.contact_phone,
        h.star_rating,
        MIN(rt.base_price_per_night) AS starting_price,
        COALESCE(v.total_customer_reviews, 0) AS total_customer_reviews,
        COALESCE(v.avg_customer_rating, 0.00) AS avg_customer_rating
      FROM hotels h
      LEFT JOIN room_types rt 
        ON h.hotel_id = rt.hotel_id AND rt.is_active = true
      LEFT JOIN v_hotel_ratings_summary v 
        ON h.hotel_id = v.hotel_id
      WHERE h.is_active = true
        AND ($1::text IS NULL OR LOWER(h.city) LIKE LOWER($1::text))
      GROUP BY h.hotel_id, v.total_customer_reviews, v.avg_customer_rating
      ORDER BY h.star_rating DESC, h.name ASC;
    `;

    const result = await db.query(sqlText, [cityFilter]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Retrieve single hotel details by ID
app.get('/api/hotels/:id', async (req, res) => {
  try {
    const hotelId = Number(req.params.id);
    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid hotel ID' });
    }

    const sqlText = `
      SELECT 
        h.hotel_id,
        h.name,
        h.description,
        h.address,
        h.city,
        h.state,
        h.country,
        h.postal_code,
        h.contact_email,
        h.contact_phone,
        h.star_rating,
        MIN(rt.base_price_per_night) AS starting_price,
        COALESCE(v.total_customer_reviews, 0) AS total_customer_reviews,
        COALESCE(v.avg_customer_rating, 0.00) AS avg_customer_rating
      FROM hotels h
      LEFT JOIN room_types rt 
        ON h.hotel_id = rt.hotel_id AND rt.is_active = true
      LEFT JOIN v_hotel_ratings_summary v 
        ON h.hotel_id = v.hotel_id
      WHERE h.hotel_id = $1 AND h.is_active = true
      GROUP BY h.hotel_id, v.total_customer_reviews, v.avg_customer_rating;
    `;

    const result = await db.query(sqlText, [hotelId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Hotel not found or inactive' });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching hotel details:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Retrieve active room types and amenities for a hotel
app.get('/api/hotels/:id/rooms', async (req, res) => {
  try {
    const hotelId = Number(req.params.id);
    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid hotel ID' });
    }

    const hotelCheck = await db.query(
      'SELECT hotel_id, name FROM hotels WHERE hotel_id = $1 AND is_active = true;',
      [hotelId]
    );

    if (hotelCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Hotel not found or inactive' });
    }

    const sqlText = `
      SELECT 
        rt.room_type_id,
        rt.hotel_id,
        rt.type_name,
        rt.description,
        rt.base_price_per_night,
        rt.max_occupancy,
        COALESCE(
          json_agg(
            json_build_object('amenity_id', a.amenity_id, 'name', a.name)
            ORDER BY a.name
          ) FILTER (WHERE a.amenity_id IS NOT NULL),
          '[]'::json
        ) AS amenities
      FROM room_types rt
      LEFT JOIN room_type_amenities rta 
        ON rt.room_type_id = rta.room_type_id
      LEFT JOIN amenities a 
        ON rta.amenity_id = a.amenity_id
      WHERE rt.hotel_id = $1 AND rt.is_active = true
      GROUP BY rt.room_type_id
      ORDER BY rt.base_price_per_night ASC;
    `;

    const result = await db.query(sqlText, [hotelId]);

    res.status(200).json({
      success: true,
      hotel_name: hotelCheck.rows[0].name,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching room types:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// Customer Registration (Role is strictly forced to 'customer')
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, email, password, confirm_password } = req.body;

    // 1. Validation
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    if (confirm_password !== undefined && password !== confirm_password) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    // 2. Prevent duplicate email registration
    const existingCheck = await db.query(
      'SELECT user_id FROM users WHERE LOWER(email) = $1;',
      [trimmedEmail]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in.',
      });
    }

    // 3. Hash password securely using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert user - role is strictly set to 'customer' on the server
    const insertSql = `
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, 'customer', true)
      RETURNING user_id, full_name, email, role, is_active, created_at;
    `;

    const result = await db.query(insertSql, [
      full_name.trim(),
      trimmedEmail,
      passwordHash,
    ]);

    const newUser = result.rows[0];

    // 5. Generate signed JWT token
    const token = jwt.sign(
      {
        user_id: newUser.user_id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please sign in with your credentials.',
      token,
      user: {
        user_id: newUser.user_id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while creating your account.',
    });
  }
});

// User Login (Authenticates credentials, verifies DB role, supports require_admin check)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, require_admin } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const result = await db.query(
      `SELECT user_id, full_name, email, password_hash, role, is_active 
       FROM users 
       WHERE LOWER(email) = $1;`,
      [trimmedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'This account is deactivated. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Role verification: If signing in through the admin portal, ensure actual database role is 'admin'
    if (require_admin && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Administrator privileges required.',
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return safe user object (NEVER expose password_hash)
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during authentication.' });
  }
});

// Current User Profile Verification
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT user_id, full_name, email, phone, role, is_active 
       FROM users 
       WHERE user_id = $1;`,
      [req.user.user_id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(404).json({ success: false, error: 'User not found or inactive.' });
    }

    res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// ============================================================================
// ADMINISTRATOR DASHBOARD ENDPOINTS
// ============================================================================

// Admin: Overview Metrics
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM reservations) AS total_reservations,
        (SELECT COALESCE(SUM(total_amount), 0) FROM reservations WHERE booking_status != 'cancelled') AS total_revenue,
        (SELECT COUNT(*) FROM reservations WHERE booking_status IN ('confirmed', 'checked_in')) AS active_stays,
        (SELECT COUNT(*) FROM hotels WHERE is_active = true) AS total_hotels,
        (SELECT COUNT(*) FROM rooms WHERE status = 'available') AS available_rooms,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers;
    `;

    const result = await db.query(statsQuery);

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: Retrieve all reservations across all properties with filters
app.get('/api/admin/reservations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, hotel_id } = req.query;

    const sqlText = `
      SELECT 
        r.reservation_id,
        r.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        h.hotel_id,
        h.name AS hotel_name,
        h.city,
        rm.room_id,
        rm.room_number,
        rm.floor_number,
        rt.type_name AS room_type,
        to_char(r.check_in_date, 'YYYY-MM-DD') AS check_in_date,
        to_char(r.check_out_date, 'YYYY-MM-DD') AS check_out_date,
        (r.check_out_date - r.check_in_date) AS nights,
        r.number_of_guests,
        r.price_per_night,
        r.total_amount,
        r.booking_status,
        r.created_at
      FROM reservations r
      JOIN users u ON r.user_id = u.user_id
      JOIN rooms rm ON r.room_id = rm.room_id
      JOIN room_types rt ON rm.room_type_id = rt.room_type_id
      JOIN hotels h ON rm.hotel_id = h.hotel_id
      WHERE ($1::varchar IS NULL OR r.booking_status = $1::varchar)
        AND ($2::int IS NULL OR h.hotel_id = $2::int)
      ORDER BY r.created_at DESC;
    `;

    const statusParam = status && status.trim() ? status.trim() : null;
    const hotelParam = hotel_id && Number(hotel_id) > 0 ? Number(hotel_id) : null;

    const result = await db.query(sqlText, [statusParam, hotelParam]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Admin reservations error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: Update Reservation Status (e.g., check_in, check_out, cancelled)
app.patch('/api/admin/reservations/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const { booking_status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
    if (!validStatuses.includes(booking_status)) {
      return res.status(400).json({ success: false, error: 'Invalid booking status.' });
    }

    const result = await db.query(
      `UPDATE reservations 
       SET booking_status = $1 
       WHERE reservation_id = $2 
       RETURNING reservation_id, booking_status;`,
      [booking_status, reservationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reservation not found.' });
    }

    res.status(200).json({
      success: true,
      message: `Reservation status updated to ${booking_status}.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Admin status update error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// TASK 3 ENDPOINTS: Room Availability & Reservation Management
// ============================================================================

// Retrieve active users (customers) for booking selection
app.get('/api/users', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT user_id, full_name, email, phone, role 
      FROM users 
      WHERE is_active = true 
      ORDER BY user_id ASC;
    `);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Check Room Availability
// Uses NOT EXISTS to exclude physical rooms having overlapping pending, confirmed, or checked_in reservations
app.post('/api/availability', async (req, res) => {
  try {
    const { room_type_id, check_in_date, check_out_date, guests } = req.body;

    // 1. Validate room_type_id
    const roomTypeId = Number(room_type_id);
    if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
      return res.status(400).json({ success: false, error: 'Valid room_type_id is required.' });
    }

    // 2. Validate dates
    if (!check_in_date || !check_out_date) {
      return res.status(400).json({ success: false, error: 'Both check_in_date and check_out_date are required.' });
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    // Strictly enforce check_out_date > check_in_date
    if (checkOut <= checkIn) {
      return res.status(400).json({ success: false, error: 'Check-out date must be strictly after check-in date.' });
    }

    const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (nights <= 0) {
      return res.status(400).json({ success: false, error: 'Reservation duration must be at least 1 night.' });
    }

    // 3. Validate guest count
    const guestCount = guests !== undefined ? Number(guests) : 1;
    if (!Number.isInteger(guestCount) || guestCount <= 0 || guestCount > 10) {
      return res.status(400).json({ success: false, error: 'Guest count must be an integer between 1 and 10.' });
    }

    // 4. Verify room category and hotel are active, and verify capacity
    const roomTypeQuery = `
      SELECT 
        rt.room_type_id,
        rt.hotel_id,
        rt.type_name,
        rt.base_price_per_night,
        rt.max_occupancy,
        h.name AS hotel_name,
        h.city
      FROM room_types rt
      JOIN hotels h ON rt.hotel_id = h.hotel_id
      WHERE rt.room_type_id = $1 
        AND rt.is_active = true 
        AND h.is_active = true;
    `;
    const rtResult = await db.query(roomTypeQuery, [roomTypeId]);

    if (rtResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Room category not found or is currently inactive.' });
    }

    const roomType = rtResult.rows[0];

    if (guestCount > roomType.max_occupancy) {
      return res.status(400).json({
        success: false,
        error: `Requested ${guestCount} guest(s) exceeds maximum capacity of ${roomType.max_occupancy} for ${roomType.type_name}.`,
      });
    }

    // 5. Query for available physical room using NOT EXISTS for date overlap
    const availabilityQuery = `
      SELECT 
        r.room_id,
        r.room_number,
        r.floor_number,
        r.status,
        rt.room_type_id,
        rt.type_name,
        rt.base_price_per_night,
        rt.max_occupancy,
        h.hotel_id,
        h.name AS hotel_name,
        h.city
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.room_type_id
      JOIN hotels h ON r.hotel_id = h.hotel_id
      WHERE r.room_type_id = $1
        AND r.status = 'available'
        AND rt.is_active = true
        AND h.is_active = true
        AND NOT EXISTS (
          SELECT 1 
          FROM reservations res
          WHERE res.room_id = r.room_id
            AND res.booking_status IN ('pending', 'confirmed', 'checked_in')
            AND res.check_in_date < $3::date
            AND res.check_out_date > $2::date
        )
      ORDER BY r.room_number ASC
      LIMIT 1;
    `;

    const availResult = await db.query(availabilityQuery, [roomTypeId, check_in_date, check_out_date]);

    if (availResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        available: false,
        message: 'No rooms available for the selected room type and dates.',
      });
    }

    const room = availResult.rows[0];
    const pricePerNight = Number(room.base_price_per_night);
    const totalAmount = Number((pricePerNight * nights).toFixed(2));

    return res.status(200).json({
      success: true,
      available: true,
      data: {
        room_id: room.room_id,
        room_number: room.room_number,
        floor_number: room.floor_number,
        room_type_id: room.room_type_id,
        type_name: room.type_name,
        hotel_id: room.hotel_id,
        hotel_name: room.hotel_name,
        city: room.city,
        price_per_night: pricePerNight,
        check_in_date,
        check_out_date,
        nights,
        guests: guestCount,
        total_amount: totalAmount,
        max_occupancy: room.max_occupancy,
      },
    });
  } catch (error) {
    console.error('Error checking room availability:', error);
    res.status(500).json({ success: false, error: 'Internal server error while checking availability.' });
  }
});

// Create Hotel Reservation
// Requires authenticated session. Uses PostgreSQL Transaction (BEGIN/COMMIT/ROLLBACK) and catches exclusion constraint (23P01)
app.post('/api/reservations', authenticateToken, async (req, res) => {
  const { room_id, check_in_date, check_out_date, number_of_guests } = req.body;

  // Customers can only create reservations under their own authenticated account.
  // Admins may optionally book on behalf of an existing user if user_id is provided.
  const userId = (req.user.role === 'admin' && req.body.user_id)
    ? Number(req.body.user_id)
    : Number(req.user.user_id);

  // 1. Validate inputs
  const roomId = Number(room_id);
  const guestCount = Number(number_of_guests);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, error: 'Valid user account is required.' });
  }

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return res.status(400).json({ success: false, error: 'Valid room_id is required.' });
  }

  if (!Number.isInteger(guestCount) || guestCount <= 0 || guestCount > 10) {
    return res.status(400).json({ success: false, error: 'Number of guests must be an integer between 1 and 10.' });
  }

  if (!check_in_date || !check_out_date) {
    return res.status(400).json({ success: false, error: 'Both check_in_date and check_out_date are required.' });
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return res.status(400).json({ success: false, error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  if (checkOut <= checkIn) {
    return res.status(400).json({ success: false, error: 'Check-out date must be strictly after check-in date.' });
  }

  const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  if (nights <= 0) {
    return res.status(400).json({ success: false, error: 'Reservation duration must be at least 1 night.' });
  }

  // 2. Verify user exists and is active
  const userCheck = await db.query(
    'SELECT user_id, full_name, email, is_active FROM users WHERE user_id = $1;',
    [userId]
  );

  if (userCheck.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'User does not exist.' });
  }

  if (!userCheck.rows[0].is_active) {
    return res.status(400).json({ success: false, error: 'User account is inactive and cannot create reservations.' });
  }

  const user = userCheck.rows[0];

  // 3. Verify room exists, is available, and verify capacity
  const roomQuery = `
    SELECT 
      r.room_id,
      r.room_number,
      r.floor_number,
      r.status AS room_status,
      rt.room_type_id,
      rt.type_name,
      rt.base_price_per_night,
      rt.max_occupancy,
      rt.is_active AS room_type_active,
      h.hotel_id,
      h.name AS hotel_name,
      h.city,
      h.is_active AS hotel_active
    FROM rooms r
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    JOIN hotels h ON r.hotel_id = h.hotel_id
    WHERE r.room_id = $1;
  `;
  const roomResult = await db.query(roomQuery, [roomId]);

  if (roomResult.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Room does not exist.' });
  }

  const room = roomResult.rows[0];

  if (!room.hotel_active || !room.room_type_active) {
    return res.status(400).json({ success: false, error: 'The requested hotel or room category is currently inactive.' });
  }

  if (room.room_status !== 'available') {
    return res.status(400).json({ success: false, error: `Room ${room.room_number} is currently ${room.room_status} and cannot be booked.` });
  }

  if (guestCount > room.max_occupancy) {
    return res.status(400).json({
      success: false,
      error: `Number of guests (${guestCount}) exceeds maximum capacity of ${room.max_occupancy} for ${room.type_name}.`,
    });
  }

  const pricePerNight = Number(room.base_price_per_night);
  const totalAmount = Number((pricePerNight * nights).toFixed(2));

  // 4. PostgreSQL Transaction
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Pre-check for overlapping active reservations on this room
    const overlapSql = `
      SELECT reservation_id 
      FROM reservations
      WHERE room_id = $1
        AND booking_status IN ('pending', 'confirmed', 'checked_in')
        AND check_in_date < $3::date
        AND check_out_date > $2::date
      FOR UPDATE;
    `;
    const overlapResult = await client.query(overlapSql, [roomId, check_in_date, check_out_date]);

    if (overlapResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: `Room ${room.room_number} is already booked for the selected date range.`,
      });
    }

    // Insert reservation
    const insertSql = `
      INSERT INTO reservations (
        user_id,
        room_id,
        check_in_date,
        check_out_date,
        number_of_guests,
        price_per_night,
        total_amount,
        booking_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
      RETURNING 
        reservation_id, 
        user_id, 
        room_id, 
        to_char(check_in_date, 'YYYY-MM-DD') AS check_in_date, 
        to_char(check_out_date, 'YYYY-MM-DD') AS check_out_date, 
        number_of_guests, 
        price_per_night, 
        total_amount, 
        booking_status, 
        created_at;
    `;

    const insertResult = await client.query(insertSql, [
      userId,
      roomId,
      check_in_date,
      check_out_date,
      guestCount,
      pricePerNight,
      totalAmount,
    ]);

    await client.query('COMMIT');

    const reservation = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Reservation confirmed successfully.',
      data: {
        reservation_id: reservation.reservation_id,
        user_id: reservation.user_id,
        customer_name: user.full_name,
        customer_email: user.email,
        hotel_id: room.hotel_id,
        hotel_name: room.hotel_name,
        city: room.city,
        room_id: reservation.room_id,
        room_number: room.room_number,
        floor_number: room.floor_number,
        room_type: room.type_name,
        check_in_date: reservation.check_in_date,
        check_out_date: reservation.check_out_date,
        nights,
        number_of_guests: reservation.number_of_guests,
        price_per_night: Number(reservation.price_per_night),
        total_amount: Number(reservation.total_amount),
        booking_status: reservation.booking_status,
        created_at: reservation.created_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');

    // GiST exclusion constraint code '23P01' (exclusion_violation)
    if (err.code === '23P01') {
      return res.status(409).json({
        success: false,
        error: 'Booking conflict: Overlapping reservation detected by database exclusion constraint.',
      });
    }

    // Check constraint code '23514' (check_violation)
    if (err.code === '23514') {
      return res.status(400).json({
        success: false,
        error: `Database check constraint violation: ${err.constraint || 'Invalid booking values.'}`,
      });
    }

    // Trigger capacity validation error
    if (err.message && err.message.includes('exceeds maximum room capacity')) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }

    console.error('Reservation transaction error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal database error occurred while creating the reservation.',
    });
  } finally {
    client.release();
  }
});

// Retrieve single reservation by ID (Protected: Customer can only view own; Admin can view all)
app.get('/api/reservations/:id', authenticateToken, async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid reservation ID.' });
    }

    const sqlText = `
      SELECT 
        r.reservation_id,
        r.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        h.hotel_id,
        h.name AS hotel_name,
        h.city,
        rm.room_id,
        rm.room_number,
        rm.floor_number,
        rt.type_name AS room_type,
        to_char(r.check_in_date, 'YYYY-MM-DD') AS check_in_date,
        to_char(r.check_out_date, 'YYYY-MM-DD') AS check_out_date,
        (r.check_out_date - r.check_in_date) AS nights,
        r.number_of_guests,
        r.price_per_night,
        r.total_amount,
        r.booking_status,
        r.created_at
      FROM reservations r
      JOIN users u ON r.user_id = u.user_id
      JOIN rooms rm ON r.room_id = rm.room_id
      JOIN room_types rt ON rm.room_type_id = rt.room_type_id
      JOIN hotels h ON rm.hotel_id = h.hotel_id
      WHERE r.reservation_id = $1;
    `;

    const result = await db.query(sqlText, [reservationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reservation not found.' });
    }

    const reservation = result.rows[0];

    // Customer data isolation: Non-admin can only view their own reservation
    if (req.user.role !== 'admin' && reservation.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own reservation details.',
      });
    }

    res.status(200).json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Retrieve all reservations for a specific user (Protected: Customer can only view own; Admin can view all)
app.get('/api/reservations/user/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    // Customer data isolation: Non-admin can only view their own reservations
    if (req.user.role !== 'admin' && req.user.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own bookings.',
      });
    }

    const sqlText = `
      SELECT 
        r.reservation_id,
        r.user_id,
        u.full_name AS customer_name,
        h.hotel_id,
        h.name AS hotel_name,
        h.city,
        rm.room_id,
        rm.room_number,
        rt.type_name AS room_type,
        to_char(r.check_in_date, 'YYYY-MM-DD') AS check_in_date,
        to_char(r.check_out_date, 'YYYY-MM-DD') AS check_out_date,
        (r.check_out_date - r.check_in_date) AS nights,
        r.number_of_guests,
        r.price_per_night,
        r.total_amount,
        r.booking_status,
        r.created_at
      FROM reservations r
      JOIN users u ON r.user_id = u.user_id
      JOIN rooms rm ON r.room_id = rm.room_id
      JOIN room_types rt ON rm.room_type_id = rt.room_type_id
      JOIN hotels h ON rm.hotel_id = h.hotel_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC;
    `;

    const result = await db.query(sqlText, [userId]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 404 Route Catch-all
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`StayEase backend listening on http://localhost:${PORT}`);
});
