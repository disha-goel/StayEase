import React, { useEffect, useState } from 'react';

// Sample hotel images for visual representation
const HOTEL_IMAGES = {
  1: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  2: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  3: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
};
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';

// Date helpers
const getTomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const getFutureDate = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

// ----------------------------------------------------------------------------
// Navbar Component
// ----------------------------------------------------------------------------
function Navbar({ activeView, onNavigate, currentUser, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="brand" onClick={() => onNavigate('home')}>
          <span className="brand-logo">StayEase</span>
        </div>

        <div className="nav-links">
          <button 
            type="button"
            className={`nav-link ${activeView === 'home' ? 'active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button 
            type="button"
            className={`nav-link ${activeView === 'hotels' ? 'active' : ''}`}
            onClick={() => onNavigate('hotels')}
          >
            Hotels
          </button>

          {!currentUser ? (
            <button 
              type="button"
              className={`nav-btn-primary ${activeView === 'login' ? 'active' : ''}`}
              onClick={() => onNavigate('login')}
            >
              Login
            </button>
          ) : currentUser.role === 'admin' ? (
            <>
              <button 
                type="button"
                className={`nav-link ${activeView === 'admin-dashboard' ? 'active' : ''}`}
                onClick={() => onNavigate('admin-dashboard')}
              >
                Admin Dashboard
              </button>
              <div className="nav-user-chip admin-chip" title={`Signed in as Administrator: ${currentUser.email}`}>
                <span>{currentUser.full_name} (Admin)</span>
              </div>
              <button 
                type="button"
                className="nav-btn-outline"
                onClick={onLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button 
                type="button"
                className={`nav-link ${activeView === 'my-bookings' ? 'active' : ''}`}
                onClick={() => onNavigate('my-bookings')}
              >
                My Bookings
              </button>
              <div className="nav-user-chip" title={`Signed in as Customer: ${currentUser.email}`}>
                <span>{currentUser.full_name}</span>
              </div>
              <button 
                type="button"
                className="nav-btn-outline"
                onClick={onLogout}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ----------------------------------------------------------------------------
// Hero & Search Component
// ----------------------------------------------------------------------------
function HeroSearch({ onSearch, onReset, activeCityFilter }) {
  const [city, setCity] = useState(activeCityFilter || '');
  const [checkIn, setCheckIn] = useState(getTomorrowDate());
  const [checkOut, setCheckOut] = useState(getFutureDate(4));
  const [guests, setGuests] = useState(2);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (new Date(checkOut) <= new Date(checkIn)) {
      setValidationError('Check-out date must be strictly after check-in date.');
      return;
    }

    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10) {
      setValidationError('Number of guests must be an integer between 1 and 10.');
      return;
    }

    onSearch({ city: city.trim(), checkIn, checkOut, guests: guestCount });
  };

  const handleClear = () => {
    setCity('');
    setCheckIn(getTomorrowDate());
    setCheckOut(getFutureDate(4));
    setGuests(2);
    setValidationError('');
    onReset();
  };

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-heading">Find your perfect stay.</h1>
        <p className="hero-subheading">
          Explore luxury suites, authentic beach villas, and cozy mountain lodges across premier destinations.
        </p>

        <form className="search-box" onSubmit={handleSubmit}>
          <div className="search-field">
            <label htmlFor="city-input">Destination / City</label>
            <input
              id="city-input"
              type="text"
              placeholder="e.g. Mumbai, Goa, Manali"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="search-field">
            <label htmlFor="checkin-input">Check-in Date</label>
            <input
              id="checkin-input"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
            />
          </div>

          <div className="search-field">
            <label htmlFor="checkout-input">Check-out Date</label>
            <input
              id="checkout-input"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </div>

          <div className="search-field">
            <label htmlFor="guests-input">Guests</label>
            <input
              id="guests-input"
              type="number"
              min="1"
              max="10"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              required
            />
          </div>

          <div className="search-actions">
            <button type="submit" className="btn-primary">
              Search Hotels
            </button>
            {(activeCityFilter || city) && (
              <button type="button" className="btn-secondary" onClick={handleClear}>
                Reset
              </button>
            )}
          </div>
        </form>

        {validationError && (
          <div className="search-error-banner" role="alert">
            {validationError}
          </div>
        )}

        <div className="quick-destinations">
          <span className="quick-label">Popular Destinations:</span>
          {['All Destinations', 'Mumbai', 'Goa', 'Manali'].map((dest) => (
            <button
              key={dest}
              type="button"
              className={`quick-pill ${
                (dest === 'All Destinations' && !activeCityFilter) || activeCityFilter?.toLowerCase() === dest.toLowerCase()
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                const target = dest === 'All Destinations' ? '' : dest;
                setCity(target);
                setValidationError('');
                if (target) {
                  const validGuests = Number(guests);
                  const guestCount = Number.isInteger(validGuests) && validGuests >= 1 && validGuests <= 10 ? validGuests : 2;
                  onSearch({ city: target, checkIn, checkOut, guests: guestCount });
                } else {
                  onReset();
                }
              }}
            >
              {dest}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// HotelCard Component
// ----------------------------------------------------------------------------
function HotelCard({ hotel, onViewDetails }) {
  const [imageSrc, setImageSrc] = useState(HOTEL_IMAGES[hotel.hotel_id] || DEFAULT_IMAGE);

  const handleImageError = (e) => {
    e.currentTarget.onerror = null;
    if (imageSrc !== DEFAULT_IMAGE) {
      setImageSrc(DEFAULT_IMAGE);
    }
  };

  const formattedPrice = hotel.starting_price 
    ? `₹${Number(hotel.starting_price).toLocaleString('en-IN')}` 
    : 'Inquire';

  const customerRating = Number(hotel.avg_customer_rating || 0);
  const totalReviews = Number(hotel.total_customer_reviews || 0);

  return (
    <article className="hotel-card">
      <div className="hotel-card-media">
        <img
          src={imageSrc}
          alt={hotel.name}
          className="hotel-card-img"
          onError={handleImageError}
          loading="lazy"
        />
        <div className="hotel-card-badge">
          {'★'.repeat(hotel.star_rating)} {hotel.star_rating}-Star
        </div>
      </div>

      <div className="hotel-card-body">
        <div className="hotel-card-header">
          <div>
            <h3 className="hotel-card-title">{hotel.name}</h3>
            <p className="hotel-card-location">{hotel.city}, {hotel.state}</p>
          </div>
          {totalReviews > 0 ? (
            <div className="hotel-card-rating" title={`${totalReviews} customer reviews`}>
              <span className="rating-score">★ {customerRating.toFixed(1)}</span>
              <span className="rating-count">({totalReviews})</span>
            </div>
          ) : (
            <span className="hotel-card-unrated">Hotel Property</span>
          )}
        </div>

        <p className="hotel-card-desc">{hotel.description}</p>

        <div className="hotel-card-footer">
          <div className="hotel-card-price">
            <span className="price-label">Starting from</span>
            <span className="price-val">{formattedPrice}</span>
            <span className="price-period">/ night</span>
          </div>

          <button
            type="button"
            className="btn-outline"
            onClick={() => onViewDetails(hotel.hotel_id)}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

// ----------------------------------------------------------------------------
// HotelDetails Component
// ----------------------------------------------------------------------------
function HotelDetails({ hotelId, onBack, currentUser, authToken, onRequireLogin }) {
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Availability & Reservation State
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(null);
  const [checkInDate, setCheckInDate] = useState(getTomorrowDate());
  const [checkOutDate, setCheckOutDate] = useState(getFutureDate(4));
  const [guestCount, setGuestCount] = useState(2);

  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [availabilityError, setAvailabilityError] = useState(null);

  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/hotels/${hotelId}`).then((res) => {
        if (!res.ok) throw new Error(`Failed to load hotel (Status: ${res.status})`);
        return res.json();
      }),
      fetch(`/api/hotels/${hotelId}/rooms`).then((res) => {
        if (!res.ok) throw new Error(`Failed to load room types (Status: ${res.status})`);
        return res.json();
      }),
    ])
      .then(([hotelRes, roomsRes]) => {
        if (isMounted) {
          setHotel(hotelRes.data);
          const roomList = roomsRes.data || [];
          setRooms(roomList);
          if (roomList.length > 0) {
            setSelectedRoomTypeId(roomList[0].room_type_id);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to retrieve property details.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [hotelId]);

  const handleRoomTypeChange = (newTypeId) => {
    setSelectedRoomTypeId(Number(newTypeId));
    setAvailabilityResult(null);
    setAvailabilityError(null);
    setConfirmedReservation(null);
    setBookingError(null);
  };

  const handleDateOrGuestChange = () => {
    setAvailabilityResult(null);
    setAvailabilityError(null);
    setConfirmedReservation(null);
    setBookingError(null);
  };

  // Step 1: Check Availability (Public to all visitors)
  const handleCheckAvailability = async (e) => {
    if (e) e.preventDefault();
    setAvailabilityError(null);
    setBookingError(null);
    setAvailabilityResult(null);
    setConfirmedReservation(null);

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setAvailabilityError('Check-out date must be strictly after check-in date.');
      return;
    }

    const guests = Number(guestCount);
    if (!Number.isInteger(guests) || guests < 1 || guests > 10) {
      setAvailabilityError('Guests must be an integer between 1 and 10.');
      return;
    }

    const selectedRoom = rooms.find((r) => r.room_type_id === selectedRoomTypeId);
    if (selectedRoom && guests > selectedRoom.max_occupancy) {
      setAvailabilityError(
        `Selected category "${selectedRoom.type_name}" accommodates at most ${selectedRoom.max_occupancy} guest(s).`
      );
      return;
    }

    try {
      setCheckingAvailability(true);
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_type_id: selectedRoomTypeId,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          guests: guests,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to check room availability.');
      }

      setAvailabilityResult(data);
    } catch (err) {
      setAvailabilityError(err.message || 'Error checking availability.');
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Step 2: Confirm Reservation (Requires Authentication)
  const handleConfirmReservation = async () => {
    if (!availabilityResult || !availabilityResult.available || !availabilityResult.data) {
      setBookingError('Please verify room availability first.');
      return;
    }

    // Enforce login requirement before confirming reservation
    if (!currentUser || !authToken) {
      onRequireLogin('Please log in with your account to confirm this reservation.');
      return;
    }

    setBookingError(null);
    setBookingInProgress(true);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          room_id: availabilityResult.data.room_id,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          number_of_guests: Number(guestCount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm reservation.');
      }

      setConfirmedReservation(data.data);
      setAvailabilityResult(null);
    } catch (err) {
      setBookingError(err.message || 'An error occurred during reservation processing.');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="details-container">
        <button type="button" className="btn-back" onClick={onBack}>
          &larr; Back to Listings
        </button>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="details-container">
        <button type="button" className="btn-back" onClick={onBack}>
          &larr; Back to Listings
        </button>
        <div className="error-card">
          <h3>Error Loading Hotel</h3>
          <p>{error || 'Hotel details could not be found.'}</p>
          <button type="button" className="btn-primary" onClick={onBack}>
            Return to Hotel Catalog
          </button>
        </div>
      </div>
    );
  }

  const heroImage = HOTEL_IMAGES[hotel.hotel_id] || DEFAULT_IMAGE;
  const avgRating = Number(hotel.avg_customer_rating || 0);
  const totalReviews = Number(hotel.total_customer_reviews || 0);

  return (
    <div className="details-container">
      <nav className="details-breadcrumb">
        <button type="button" className="btn-back" onClick={onBack}>
          &larr; Back to all hotels
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{hotel.name}</span>
      </nav>

      {/* Property Hero Header */}
      <section className="property-header">
        <div className="property-media">
          <img
            src={heroImage}
            alt={hotel.name}
            className="property-hero-img"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_IMAGE;
            }}
          />
          <div className="property-class-badge">
            {'★'.repeat(hotel.star_rating)} {hotel.star_rating}-Star Hotel
          </div>
        </div>

        <div className="property-info">
          <div className="property-title-group">
            <h1 className="property-title">{hotel.name}</h1>
            <p className="property-address">
              {hotel.address}, {hotel.city}, {hotel.state}, {hotel.country} - {hotel.postal_code}
            </p>
          </div>

          <div className="property-meta-row">
            <div className="meta-item">
              <span className="meta-label">Customer Reviews:</span>
              <span className="meta-value">
                {totalReviews > 0 ? (
                  <><strong>★ {avgRating.toFixed(1)}</strong> ({totalReviews} review{totalReviews > 1 ? 's' : ''})</>
                ) : (
                  'No reviews recorded yet'
                )}
              </span>
            </div>

            {hotel.contact_phone && (
              <div className="meta-item">
                <span className="meta-label">Direct Phone:</span>
                <span className="meta-value">{hotel.contact_phone}</span>
              </div>
            )}

            {hotel.contact_email && (
              <div className="meta-item">
                <span className="meta-label">Email:</span>
                <span className="meta-value">{hotel.contact_email}</span>
              </div>
            )}
          </div>

          <div className="property-description">
            <h3>About the Property</h3>
            <p>{hotel.description}</p>
          </div>
        </div>
      </section>

      {/* Availability & Booking Card */}
      <section id="booking-section" className="booking-panel-section">
        <div className="booking-card">
          <div className="booking-card-header">
            <div>
              <h2 className="booking-card-title">Check Room Availability & Book</h2>
              <p className="booking-card-subtitle">
                Select your dates and preferred room type to verify real-time room availability.
              </p>
            </div>
            {currentUser && (
              <div className="booking-user-tag">
                Booking as: <strong>{currentUser.full_name}</strong>
              </div>
            )}
          </div>

          {confirmedReservation ? (
            <div className="voucher-container">
              <div className="voucher-badge-success">
                <span className="voucher-icon">✓</span> Reservation Confirmed
              </div>
              <h3 className="voucher-heading">Your Booking is Confirmed!</h3>
              <p className="voucher-sub">
                Your reservation details are recorded below:
              </p>

              <div className="voucher-grid">
                <div className="voucher-item">
                  <span className="v-label">Booking ID</span>
                  <span className="v-val highlight">#{confirmedReservation.reservation_id}</span>
                </div>
                <div className="voucher-item">
                  <span className="v-label">Status</span>
                  <span className="v-val status-confirmed">{confirmedReservation.booking_status.toUpperCase()}</span>
                </div>
                <div className="voucher-item">
                  <span className="v-label">Guest Name</span>
                  <span className="v-val">{confirmedReservation.customer_name}</span>
                </div>
                <div className="voucher-item">
                  <span className="v-label">Hotel & Destination</span>
                  <span className="v-val">{confirmedReservation.hotel_name} ({confirmedReservation.city})</span>
                </div>
                <div className="voucher-item">
                  <span className="v-label">Room Details</span>
                  <span className="v-val">Room {confirmedReservation.room_number} ({confirmedReservation.room_type})</span>
                </div>
                <div className="voucher-item">
                  <span className="v-label">Stay Dates</span>
                  <span className="v-val">
                    {confirmedReservation.check_in_date} &rarr; {confirmedReservation.check_out_date} ({confirmedReservation.nights} night{confirmedReservation.nights > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="voucher-item">
                  <span className="v-label">Guests</span>
                  <span className="v-val">{confirmedReservation.number_of_guests} guest(s)</span>
                </div>
                <div className="voucher-item">
                  <span className="v-label">Nightly Rate</span>
                  <span className="v-val">₹{Number(confirmedReservation.price_per_night).toLocaleString('en-IN')} / night</span>
                </div>
                <div className="voucher-item voucher-total">
                  <span className="v-label">Total Amount</span>
                  <span className="v-val total-price">₹{Number(confirmedReservation.total_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="voucher-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setConfirmedReservation(null);
                    setAvailabilityResult(null);
                  }}
                >
                  Book Another Room
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCheckAvailability} className="booking-form">
              <div className="booking-form-grid">
                <div className="form-group">
                  <label htmlFor="select-room-type">Room Type</label>
                  <select
                    id="select-room-type"
                    value={selectedRoomTypeId || ''}
                    onChange={(e) => handleRoomTypeChange(e.target.value)}
                    required
                  >
                    {rooms.map((r) => (
                      <option key={r.room_type_id} value={r.room_type_id}>
                        {r.type_name} (₹{Number(r.base_price_per_night).toLocaleString('en-IN')}/night, max {r.max_occupancy} guests)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="book-checkin">Check-in Date</label>
                  <input
                    id="book-checkin"
                    type="date"
                    value={checkInDate}
                    onChange={(e) => {
                      setCheckInDate(e.target.value);
                      handleDateOrGuestChange();
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="book-checkout">Check-out Date</label>
                  <input
                    id="book-checkout"
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => {
                      setCheckOutDate(e.target.value);
                      handleDateOrGuestChange();
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="book-guests">Guests</label>
                  <input
                    id="book-guests"
                    type="number"
                    min="1"
                    max="10"
                    value={guestCount}
                    onChange={(e) => {
                      setGuestCount(e.target.value);
                      handleDateOrGuestChange();
                    }}
                    required
                  />
                </div>
              </div>

              <div className="booking-action-row">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={checkingAvailability}
                >
                  {checkingAvailability ? 'Checking Availability...' : 'Check Availability'}
                </button>
              </div>

              {availabilityError && (
                <div className="booking-alert alert-error" role="alert">
                  <strong>Notice:</strong> {availabilityError}
                </div>
              )}

              {availabilityResult && (
                <div className="availability-result-card">
                  {availabilityResult.available ? (
                    <div className="available-box">
                      <div className="available-header">
                        <span className="status-indicator-dot online"></span>
                        <strong>Room Available for Selected Dates!</strong>
                      </div>

                      <div className="available-details-grid">
                        <div className="detail-item">
                          <span className="d-label">Assigned Room:</span>
                          <span className="d-val">Room {availabilityResult.data.room_number} (Floor {availabilityResult.data.floor_number})</span>
                        </div>
                        <div className="detail-item">
                          <span className="d-label">Category:</span>
                          <span className="d-val">{availabilityResult.data.type_name}</span>
                        </div>
                        <div className="detail-item">
                          <span className="d-label">Duration:</span>
                          <span className="d-val">{availabilityResult.data.nights} night(s)</span>
                        </div>
                        <div className="detail-item">
                          <span className="d-label">Nightly Rate:</span>
                          <span className="d-val">₹{availabilityResult.data.price_per_night.toLocaleString('en-IN')} / night</span>
                        </div>
                        <div className="detail-item detail-total">
                          <span className="d-label">Total Amount:</span>
                          <span className="d-val price-highlight">
                            ₹{availabilityResult.data.total_amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {bookingError && (
                        <div className="booking-alert alert-error" role="alert">
                          <strong>Booking Error:</strong> {bookingError}
                        </div>
                      )}

                      <div className="confirm-booking-row">
                        <button
                          type="button"
                          className="btn-success"
                          onClick={handleConfirmReservation}
                          disabled={bookingInProgress}
                        >
                          {bookingInProgress 
                            ? 'Processing Reservation...' 
                            : !currentUser 
                              ? 'Sign In to Confirm Reservation' 
                              : 'Confirm Reservation'}
                        </button>
                        {!currentUser && (
                          <span className="login-prompt-note">
                            * Please sign in to confirm and finalize your reservation.
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="unavailable-box">
                      <div className="unavailable-header">
                        <span className="status-indicator-dot offline"></span>
                        <strong>No Rooms Available</strong>
                      </div>
                      <p className="unavailable-msg">
                        {availabilityResult.message || 'All rooms of this category are booked for the chosen dates.'}
                      </p>
                      <p className="unavailable-hint">
                        Please try selecting alternative dates or choosing another room category below.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </div>
      </section>

      {/* Room Categories Catalog */}
      <section className="rooms-section">
        <div className="rooms-section-header">
          <div>
            <h2 className="section-title">All Room Categories</h2>
            <p className="section-subtitle">
              Browse options and click "Select Category" to populate the availability checker above.
            </p>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="empty-rooms-note">
            <p>No active room categories are currently registered for this property.</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => {
              const isSelected = selectedRoomTypeId === room.room_type_id;
              return (
                <article
                  key={room.room_type_id}
                  className={`room-card ${isSelected ? 'room-card-selected' : ''}`}
                >
                  <div className="room-card-header">
                    <div>
                      <h3 className="room-title">{room.type_name}</h3>
                      {isSelected && <span className="selected-tag">Selected</span>}
                    </div>
                    <div className="room-price">
                      <span className="price-amount">₹{Number(room.base_price_per_night).toLocaleString('en-IN')}</span>
                      <span className="price-unit">/ night</span>
                    </div>
                  </div>

                  <div className="room-capacity">
                    <span>Maximum Occupancy: <strong>{room.max_occupancy} guest{room.max_occupancy > 1 ? 's' : ''}</strong></span>
                  </div>

                  <p className="room-desc">{room.description}</p>

                  <div className="room-amenities">
                    <h4 className="amenities-title">Room Amenities:</h4>
                    {room.amenities && room.amenities.length > 0 ? (
                      <ul className="amenities-list">
                        {room.amenities.map((amenity) => (
                          <li key={amenity.amenity_id} className="amenity-pill">
                            {amenity.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted">Standard room amenities included</span>
                    )}
                  </div>

                  <div className="room-card-action">
                    <button
                      type="button"
                      className={`btn-block ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => {
                        handleRoomTypeChange(room.room_type_id);
                        const bookingElement = document.getElementById('booking-section');
                        if (bookingElement) {
                          bookingElement.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      {isSelected ? 'Selected Category' : 'Select Category'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------------
// LoginPage Component (Unified for Customer & Admin)
// ----------------------------------------------------------------------------
function LoginPage({ onLoginSuccess, noticeMessage }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'register' | 'admin'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleModeChange = (mode) => {
    setAuthMode(mode);
    setErrorMessage('');
    if (mode === 'register') {
      setSuccessMessage('');
    }
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    // 1. Customer Registration
    if (authMode === 'register') {
      const cleanName = fullName.trim();
      if (!cleanName) {
        setErrorMessage('Please enter your full name.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setErrorMessage('Please enter a valid email address (e.g. name@example.com).');
        return;
      }

      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify your password.');
        return;
      }

      try {
        setSubmitting(true);
        setSuccessMessage('');

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: cleanName,
            email: cleanEmail,
            password,
            confirm_password: confirmPassword,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create your account.');
        }

        // Successfully inserted in PostgreSQL:
        // Show success message, clear password fields, and redirect customer to Sign In
        setSuccessMessage(data.message || 'Account created successfully! Please sign in with your credentials.');
        setErrorMessage('');
        setFullName('');
        setPassword('');
        setConfirmPassword('');
        setAuthMode('signin');
      } catch (err) {
        setErrorMessage(err.message || 'Unable to complete registration. Please try again.');
        setSuccessMessage('');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 2. Customer Sign In or Admin Sign In
    try {
      setSubmitting(true);
      setSuccessMessage('');

      const payload = {
        email: cleanEmail,
        password,
      };

      if (authMode === 'admin') {
        payload.require_admin = true;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to connect to authentication service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        {authMode === 'admin' ? (
          <div className="login-header">
            <span className="admin-badge-indicator">Administrator Portal</span>
            <h1 className="login-title">Admin Sign In</h1>
            <p className="login-subtitle">
              Sign in with authorized administrator credentials to manage properties and view platform records.
            </p>
          </div>
        ) : (
          <>
            <div className="login-header">
              <h1 className="login-title">
                {authMode === 'signin' ? 'Welcome back' : 'Create an account'}
              </h1>
              <p className="login-subtitle">
                {authMode === 'signin'
                  ? 'Sign in to access your bookings and manage your stay details.'
                  : 'Join StayEase to reserve rooms and manage your travel bookings.'}
              </p>
            </div>

            <div className="auth-tab-group" role="tablist" aria-label="Customer authentication options">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signin'}
                className={`auth-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
                onClick={() => handleModeChange('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'register'}
                className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => handleModeChange('register')}
              >
                Create Account
              </button>
            </div>
          </>
        )}

        {successMessage && (
          <div className="booking-alert alert-success" role="status">
            {successMessage}
          </div>
        )}

        {noticeMessage && (
          <div className="login-notice-banner" role="alert">
            {noticeMessage}
          </div>
        )}

        {errorMessage && (
          <div className="booking-alert alert-error" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {authMode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-fullname">Full Name</label>
              <input
                id="auth-fullname"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder={authMode === 'admin' ? 'admin@stayease.com' : 'name@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={authMode === 'register' ? 'At least 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {authMode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary btn-block btn-login"
            disabled={submitting}
          >
            {submitting
              ? authMode === 'register'
                ? 'Creating account...'
                : 'Signing in...'
              : authMode === 'register'
              ? 'Create Account'
              : authMode === 'admin'
              ? 'Sign In as Admin'
              : 'Sign In'}
          </button>
        </form>

        <div className="admin-access-link-wrapper">
          {authMode === 'admin' ? (
            <button
              type="button"
              className="btn-text-link"
              onClick={() => handleModeChange('signin')}
            >
              &larr; Back to customer sign in
            </button>
          ) : (
            <p className="admin-access-text">
              Administrator?{' '}
              <button
                type="button"
                className="btn-text-link"
                onClick={() => handleModeChange('admin')}
              >
                Admin sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// MyBookings Component (Customers view only their own reservations)
// ----------------------------------------------------------------------------
function MyBookings({ currentUser, authToken, onExploreHotels }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserBookings = async () => {
    if (!currentUser || !authToken) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/reservations/user/${currentUser.user_id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch bookings (Status: ${res.status})`);
      }

      const data = await res.json();
      setReservations(data.data || []);
    } catch (err) {
      setError(err.message || 'Unable to retrieve your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserBookings();
  }, [currentUser, authToken]);

  return (
    <div className="details-container">
      <div className="reservations-header">
        <div>
          <h1 className="section-title">My Bookings</h1>
          <p className="section-subtitle">
            Showing confirmed reservations for <strong>{currentUser.full_name}</strong> ({currentUser.email})
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={fetchUserBookings}>
          Refresh Bookings
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your reservations...</p>
        </div>
      )}

      {error && (
        <div className="error-card">
          <h3>Error Loading Bookings</h3>
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={fetchUserBookings}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && reservations.length === 0 && (
        <div className="empty-state">
          <h3 className="empty-state-title">No bookings found</h3>
          <p className="empty-state-desc">
            You do not currently have any active or past reservations recorded.
          </p>
          <button type="button" className="btn-primary" onClick={onExploreHotels}>
            Explore Hotels to Book
          </button>
        </div>
      )}

      {!loading && !error && reservations.length > 0 && (
        <div className="reservations-table-wrapper">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Hotel & City</th>
                <th>Room</th>
                <th>Stay Dates</th>
                <th>Nights</th>
                <th>Guests</th>
                <th>Total Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((res) => (
                <tr key={res.reservation_id}>
                  <td>
                    <strong className="res-id-cell">#{res.reservation_id}</strong>
                  </td>
                  <td>
                    <strong>{res.hotel_name}</strong>
                    <div className="table-subtext">{res.city}</div>
                  </td>
                  <td>
                    Room {res.room_number}
                    <div className="table-subtext">{res.room_type}</div>
                  </td>
                  <td>
                    {res.check_in_date} &rarr; {res.check_out_date}
                  </td>
                  <td>{res.nights}</td>
                  <td>{res.number_of_guests}</td>
                  <td>
                    <strong>₹{Number(res.total_amount).toLocaleString('en-IN')}</strong>
                  </td>
                  <td>
                    <span className={`status-pill status-${res.booking_status}`}>
                      {res.booking_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// AdminDashboard Component (Administrative oversight of all properties & bookings)
// ----------------------------------------------------------------------------
function AdminDashboard({ authToken }) {
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const loadAdminData = async (status = '') => {
    if (!authToken) return;
    try {
      setLoading(true);
      setError(null);

      const statusQuery = status ? `?status=${encodeURIComponent(status)}` : '';

      const [statsRes, resRes] = await Promise.all([
        fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }),
        fetch(`/api/admin/reservations${statusQuery}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }),
      ]);

      if (!statsRes.ok || !resRes.ok) {
        throw new Error('Failed to load administrative data.');
      }

      const statsData = await statsRes.json();
      const resData = await resRes.json();

      setStats(statsData.data);
      setReservations(resData.data || []);
    } catch (err) {
      setError(err.message || 'Error communicating with administrative endpoints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData(statusFilter);
  }, [statusFilter, authToken]);

  const handleUpdateStatus = async (reservationId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ booking_status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update reservation status.');
      }

      setActionNotice(`Reservation #${reservationId} status changed to "${newStatus}".`);
      loadAdminData(statusFilter);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert(`Error updating reservation: ${err.message}`);
    }
  };

  return (
    <div className="details-container">
      <div className="reservations-header">
        <div>
          <h1 className="section-title">Admin Dashboard</h1>
          <p className="section-subtitle">
            System overview, key metrics, and real-time reservation control across all hotel properties.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => loadAdminData(statusFilter)}>
          Refresh Dashboard
        </button>
      </div>

      {actionNotice && (
        <div className="admin-action-banner" role="alert">
          ✓ {actionNotice}
        </div>
      )}

      {/* KPI Metric Cards */}
      {stats && (
        <div className="admin-metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Total Reservations</span>
            <span className="metric-val">{stats.total_reservations}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Gross Revenue</span>
            <span className="metric-val revenue">₹{Number(stats.total_revenue).toLocaleString('en-IN')}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Active / Stays</span>
            <span className="metric-val">{stats.active_stays}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Registered Customers</span>
            <span className="metric-val">{stats.total_customers}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Active Hotels</span>
            <span className="metric-val">{stats.total_hotels}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Available Rooms</span>
            <span className="metric-val">{stats.available_rooms}</span>
          </div>
        </div>
      )}

      {/* Table Filter Bar */}
      <div className="admin-filter-bar">
        <span className="filter-label">Filter Bookings by Status:</span>
        <div className="filter-buttons">
          {['', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((st) => (
            <button
              key={st || 'all'}
              type="button"
              className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st ? st.replace('_', ' ').toUpperCase() : 'ALL STATUSES'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Querying administrative records...</p>
        </div>
      )}

      {error && (
        <div className="error-card">
          <h3>Administrative Error</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && reservations.length === 0 && (
        <div className="empty-state">
          <h3 className="empty-state-title">No matching reservations</h3>
          <p className="empty-state-desc">No bookings matched the selected status filter.</p>
        </div>
      )}

      {!loading && !error && reservations.length > 0 && (
        <div className="reservations-table-wrapper">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Hotel & City</th>
                <th>Room Unit</th>
                <th>Stay Dates</th>
                <th>Nights</th>
                <th>Total</th>
                <th>Status</th>
                <th>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((res) => (
                <tr key={res.reservation_id}>
                  <td>
                    <strong className="res-id-cell">#{res.reservation_id}</strong>
                  </td>
                  <td>
                    <strong>{res.customer_name}</strong>
                    <div className="table-subtext">{res.customer_email}</div>
                  </td>
                  <td>
                    <strong>{res.hotel_name}</strong>
                    <div className="table-subtext">{res.city}</div>
                  </td>
                  <td>
                    Room {res.room_number}
                    <div className="table-subtext">{res.room_type}</div>
                  </td>
                  <td>
                    {res.check_in_date} &rarr; {res.check_out_date}
                  </td>
                  <td>{res.nights}</td>
                  <td>
                    <strong>₹{Number(res.total_amount).toLocaleString('en-IN')}</strong>
                  </td>
                  <td>
                    <span className={`status-pill status-${res.booking_status}`}>
                      {res.booking_status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="admin-status-dropdown"
                      value={res.booking_status}
                      onChange={(e) => handleUpdateStatus(res.reservation_id, e.target.value)}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// EmptyState Component
// ----------------------------------------------------------------------------
function EmptyState({ cityQuery, onReset }) {
  return (
    <div className="empty-state">
      <h3 className="empty-state-title">No hotels found</h3>
      <p className="empty-state-desc">
        {cityQuery 
          ? `We couldn't find any available properties in "${cityQuery}".`
          : 'There are currently no active properties matching your filters.'}
      </p>
      <p className="empty-state-hint">
        Try searching for popular destinations like <strong>Mumbai</strong>, <strong>Goa</strong>, or <strong>Manali</strong>.
      </p>
      <button type="button" className="btn-primary" onClick={onReset}>
        View All Hotels
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main App Component
// ----------------------------------------------------------------------------
function App() {
  const [activeView, setActiveView] = useState('home');
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCityFilter, setActiveCityFilter] = useState('');

  // Authentication State (Maintained in localStorage for session persistence)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stayease_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('stayease_token') || null;
  });

  const [loginNotice, setLoginNotice] = useState(null);
  const [pendingHotelReturnId, setPendingHotelReturnId] = useState(null);

  // Validate session on initial load
  useEffect(() => {
    if (authToken) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Token expired');
          return res.json();
        })
        .then((data) => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('stayease_user', JSON.stringify(data.user));
          }
        })
        .catch(() => {
          // Token invalid or expired: clear storage
          localStorage.removeItem('stayease_token');
          localStorage.removeItem('stayease_user');
          setCurrentUser(null);
          setAuthToken(null);
        });
    }
  }, [authToken]);

  const loadHotels = async (city = '') => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = city.trim()
        ? `/api/hotels?city=${encodeURIComponent(city.trim())}`
        : '/api/hotels';

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const result = await response.json();
      setHotels(result.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load hotels from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotels(activeCityFilter);
  }, [activeCityFilter]);

  const handleSearch = ({ city }) => {
    setActiveCityFilter(city);
    setActiveView('home');
    setSelectedHotelId(null);
  };

  const handleResetSearch = () => {
    setActiveCityFilter('');
    setActiveView('home');
    setSelectedHotelId(null);
  };

  const handleViewDetails = (hotelId) => {
    setSelectedHotelId(hotelId);
    setActiveView('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToListings = () => {
    setSelectedHotelId(null);
    setActiveView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequireLogin = (msg) => {
    setLoginNotice(msg);
    setPendingHotelReturnId(selectedHotelId);
    setActiveView('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem('stayease_user', JSON.stringify(user));
    localStorage.setItem('stayease_token', token);
    setLoginNotice(null);

    // If user was prompted to login while booking a hotel, return them directly to that hotel
    if (pendingHotelReturnId) {
      setSelectedHotelId(pendingHotelReturnId);
      setPendingHotelReturnId(null);
      setActiveView('details');
    } else if (user.role === 'admin') {
      setActiveView('admin-dashboard');
    } else {
      setActiveView('my-bookings');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('stayease_token');
    localStorage.removeItem('stayease_user');
    setCurrentUser(null);
    setAuthToken(null);
    setActiveView('home');
    setSelectedHotelId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view) => {
    setLoginNotice(null);
    if (view === 'home') {
      setActiveView('home');
      setSelectedHotelId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (view === 'hotels') {
      setActiveView('home');
      setSelectedHotelId(null);
      const element = document.getElementById('hotels-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (view === 'login') {
      setActiveView('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (view === 'my-bookings') {
      setActiveView('my-bookings');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (view === 'admin-dashboard') {
      setActiveView('admin-dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="app-layout">
      <Navbar
        activeView={activeView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeView === 'login' ? (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            noticeMessage={loginNotice}
          />
        ) : activeView === 'my-bookings' && currentUser ? (
          <MyBookings
            currentUser={currentUser}
            authToken={authToken}
            onExploreHotels={() => handleNavigate('hotels')}
          />
        ) : activeView === 'admin-dashboard' && currentUser?.role === 'admin' ? (
          <AdminDashboard
            authToken={authToken}
          />
        ) : activeView === 'details' && selectedHotelId ? (
          <HotelDetails
            hotelId={selectedHotelId}
            onBack={handleBackToListings}
            currentUser={currentUser}
            authToken={authToken}
            onRequireLogin={handleRequireLogin}
          />
        ) : (
          <>
            <HeroSearch
              onSearch={handleSearch}
              onReset={handleResetSearch}
              activeCityFilter={activeCityFilter}
            />

            <section id="hotels-section" className="catalog-section">
              <div className="catalog-header">
                <div>
                  <h2 className="catalog-title">Curated Hotel Properties</h2>
                  <p className="catalog-subtitle">
                    {activeCityFilter
                      ? `Showing results for "${activeCityFilter}" (${hotels.length} propert${hotels.length === 1 ? 'y' : 'ies'} found)`
                      : `Displaying all ${hotels.length} active registered properties across India`}
                  </p>
                </div>

                {activeCityFilter && (
                  <button
                    type="button"
                    className="btn-text-clear"
                    onClick={handleResetSearch}
                  >
                    Clear Filter ({activeCityFilter}) &times;
                  </button>
                )}
              </div>

              {loading && (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Retrieving hotel properties...</p>
                </div>
              )}

              {error && (
                <div className="error-card">
                  <h3>Connection Notice</h3>
                  <p>{error}</p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => loadHotels(activeCityFilter)}
                  >
                    Retry Connection
                  </button>
                </div>
              )}

              {!loading && !error && hotels.length === 0 && (
                <EmptyState
                  cityQuery={activeCityFilter}
                  onReset={handleResetSearch}
                />
              )}

              {!loading && !error && hotels.length > 0 && (
                <div className="hotels-grid">
                  {hotels.map((hotel) => (
                    <HotelCard
                      key={hotel.hotel_id}
                      hotel={hotel}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <strong>StayEase</strong> &copy; {new Date().getFullYear()} StayEase. All rights reserved.
          </div>
          <p className="footer-note">
            Hotel reservations and booking management.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
