# StayEase – Hotel Reservation Management System

StayEase is a DBMS project built with React, Node.js (Express), and PostgreSQL. It demonstrates relational database normalization (3NF), database constraints, triggers, views, and temporal exclusion concurrency control using real hospitality workflows.

---

## 1. Project Structure

```text
DBMS PROJECT/
├── frontend/                   # React.js + Vite Frontend
│   ├── src/
│   │   ├── App.jsx             # Main UI layout, search & hotel details
│   │   ├── main.jsx            # React root mount
│   │   └── style.css           # Minimal, clean design system
│   ├── index.html              # HTML shell
│   ├── package.json            # Frontend dependencies & scripts
│   ├── vite.config.js          # Vite config & API reverse proxy (/api -> :5000)
│   └── .gitignore              # Node modules & build exclusions
│
├── backend/                    # Node.js + Express Backend
│   ├── server.js               # Express API routes, logic & error handling
│   ├── db.js                   # PostgreSQL pg.Pool connection pool
│   ├── package.json            # Backend dependencies & scripts
│   ├── .env.example            # Environment template
│   ├── .env                    # Local configuration (excluded from Git)
│   └── .gitignore              # Node modules & .env exclusions
│
├── database/                   # Relational Database Assets
│   ├── stayease_schema.sql     # PostgreSQL DDL (9 normalized tables, triggers, views)
│   ├── sample_data.sql         # Seed data (hotels, rooms, users, reservations)
│   └── ER_DIAGRAM.drawio       # Interactive ER Diagram for draw.io
│
└── README.md                   # Project overview & execution guide
```

---

## 2. Technology Stack

* **Frontend:** React.js (v18+) with Vite, plain CSS3
* **Backend:** Node.js with Express.js
* **Database:** PostgreSQL (v14+)
* **Database Driver:** `pg` (`node-postgres` with `pg.Pool` connection pooling)

---

## 3. Database Setup

1. **Create the database in PostgreSQL:**
   ```bash
   psql -U postgres
   CREATE DATABASE stayease_db;
   \c stayease_db;
   ```
2. **Execute the schema DDL (builds all 9 tables, constraints, triggers, views):**
   ```bash
   psql -U postgres -d stayease_db -f database/stayease_schema.sql
   ```
3. **Load sample data:**
   ```bash
   psql -U postgres -d stayease_db -f database/sample_data.sql
   ```

---

## 4. How to Run the Application

### Step 1: Start the Backend (Terminal 1)
```bash
cd backend
npm run dev
```
* Backend runs at **`http://localhost:5000`**
* Health check: `http://localhost:5000/api/health`
* DB connection check: `http://localhost:5000/api/db-health`

### Step 2: Start the Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
* Frontend runs at **`http://localhost:5173`**
* All `/api` requests are proxied directly to the backend.

---

## 5. Active Backend API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Server uptime and health status |
| `GET` | `/api/db-health` | Public | PostgreSQL live connectivity verification |
| `GET` | `/api/hotels` | Public | Retrieve active hotels (supports `?city=Mumbai`) |
| `GET` | `/api/hotels/:id` | Public | Retrieve single hotel property details |
| `GET` | `/api/hotels/:id/rooms` | Public | Retrieve active room categories and aggregated amenities |
| `POST` | `/api/availability` | Public | Temporal room availability check (uses `NOT EXISTS`) |
| `POST` | `/api/auth/login` | Public | Common email & password login with JWT token generation |
| `GET` | `/api/auth/me` | Authenticated | Validate session and retrieve current user profile |
| `POST` | `/api/auth/logout` | Authenticated | Log out current user session |
| `POST` | `/api/reservations` | Authenticated | Create reservation via ACID transaction & exclusion constraint |
| `GET` | `/api/reservations/:id` | Authenticated | Retrieve reservation details (owner or admin only) |
| `GET` | `/api/reservations/user/:userId` | Authenticated | Retrieve customer bookings (customer data isolation) |
| `GET` | `/api/admin/stats` | Admin Only | System-wide statistics and revenue summary |
| `GET` | `/api/admin/reservations` | Admin Only | Comprehensive booking overview across all hotels |
| `PATCH` | `/api/admin/reservations/:id/status` | Admin Only | Update reservation lifecycle status |

---

## 6. Seed Accounts & Credentials

All demo accounts use password: `Password@123`

* **Administrator:** `admin@stayease.com`
* **Customer 1:** `aarav.patel@example.com`
* **Customer 2:** `priya.nair@example.com`
* **Customer 3:** `rohan.gupta@example.com`
* **Hotel Manager (Mumbai):** `manager.mumbai@stayease.com`
* **Hotel Manager (Goa):** `manager.goa@stayease.com`

---

## 7. Key DBMS Concepts Implemented

1. **Relational Normalization (3NF):** 9 normalized tables eliminating transitive dependencies. Physical `rooms` uses controlled redundancy with composite foreign key `(hotel_id, room_type_id)` to guarantee hotel-wide room number uniqueness.
2. **Temporal Concurrency Control (`btree_gist`):** `EXCLUDE USING gist` constraint prevents overlapping reservations for the same room.
3. **Automated Triggers:**
   * `trg_check_guest_capacity`: Prevents reservations exceeding room type capacity.
   * `trg_check_review_eligibility`: Restricts review submissions strictly to `checked_out` guests.
4. **Independent View Aggregation (`v_hotel_ratings_summary`):** Uses a Common Table Expression (CTE) to aggregate reviews independently, preventing row multiplication across rooms.
