-- SkyLink Airline Reservation System Schema

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS seat_reservations CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS baggage CASCADE;
DROP TABLE IF EXISTS booking CASCADE;
DROP TABLE IF EXISTS seat CASCADE;
DROP TABLE IF EXISTS flight CASCADE;
DROP TABLE IF EXISTS flight_schedule CASCADE;
DROP TABLE IF EXISTS schedule_seat_template CASCADE;
DROP TABLE IF EXISTS passenger CASCADE;
DROP TABLE IF EXISTS airport CASCADE;

-- Passenger Table
CREATE TABLE passenger (
    passenger_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    passport_number VARCHAR(50) UNIQUE NOT NULL,
    nationality VARCHAR(100),
    gender VARCHAR(20),
    dob DATE,
    passport_expiry DATE,
    passenger_type VARCHAR(20) -- Adult, Child, Infant
);

-- Flight Schedule Table
CREATE TABLE flight_schedule (
    schedule_id SERIAL PRIMARY KEY,
    airline_name VARCHAR(100) NOT NULL,
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    departure_time_daily TIME NOT NULL,
    arrival_time_daily TIME NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- Daily, Weekly
    day_of_week INT, -- 0-6 (Sunday-Saturday)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schedule Seat Template
CREATE TABLE schedule_seat_template (
    template_id SERIAL PRIMARY KEY,
    schedule_id INT REFERENCES flight_schedule(schedule_id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    seat_class VARCHAR(20) NOT NULL
);

-- Flight Table
CREATE TABLE flight (
    flight_id SERIAL PRIMARY KEY,
    airline_name VARCHAR(100) NOT NULL,
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    schedule_id INT REFERENCES flight_schedule(schedule_id) ON DELETE SET NULL
);

-- Seat Table
CREATE TABLE seat (
    seat_id SERIAL PRIMARY KEY,
    flight_id INT REFERENCES flight(flight_id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    seat_class VARCHAR(20) CHECK (seat_class IN ('Economy', 'Premium Economy', 'Business', 'First')),
    seat_status VARCHAR(20) DEFAULT 'Available' CHECK (seat_status IN ('Available', 'Booked', 'Reserved'))
);

-- Booking Table
CREATE TABLE booking (
    booking_id SERIAL PRIMARY KEY,
    passenger_id INT REFERENCES passenger(passenger_id),
    flight_id INT REFERENCES flight(flight_id),
    seat_id INT REFERENCES seat(seat_id),
    booking_reference VARCHAR(10) NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    booking_status VARCHAR(20) DEFAULT 'Pending' CHECK (booking_status IN ('Pending', 'Confirmed', 'Cancelled'))
);

-- Baggage Table
CREATE TABLE baggage (
    baggage_id SERIAL PRIMARY KEY,
    passenger_id INT REFERENCES passenger(passenger_id) ON DELETE CASCADE,
    weight_selected DECIMAL(5, 2) NOT NULL,
    extra_cost DECIMAL(10, 2) DEFAULT 0.00
);

-- Payment Table
CREATE TABLE payment (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES booking(booking_id),
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'Completed' CHECK (payment_status IN ('Pending', 'Completed', 'Failed')),
    amount DECIMAL(10, 2) NOT NULL
);

-- Stateful Seat Reservations Table
CREATE TABLE seat_reservations (
    reservation_id SERIAL PRIMARY KEY,
    flight_id INT REFERENCES flight(flight_id) ON DELETE CASCADE,
    seat_id INT REFERENCES seat(seat_id) ON DELETE CASCADE,
    passenger_id INT REFERENCES passenger(passenger_id) ON DELETE SET NULL,
    session_id VARCHAR(64),
    status VARCHAR(20) DEFAULT 'Held', -- 'Held' or 'Booked'
    hold_expiry TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_seat_flight UNIQUE(flight_id, seat_id)
);

-- Airport Table
CREATE TABLE airport (
    airport_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100),
    iata_code VARCHAR(10) UNIQUE
);

-- Sample Data (Airports)
INSERT INTO airport (name, city, country, iata_code) VALUES
('Jinnah International Airport', 'Karachi', 'Pakistan', 'KHI'),
('Allama Iqbal International Airport', 'Lahore', 'Pakistan', 'LHE'),
('Islamabad International Airport', 'Islamabad', 'Pakistan', 'ISB'),
('Dubai International Airport', 'Dubai', 'UAE', 'DXB'),
('Heathrow Airport', 'London', 'UK', 'LHR'),
('John F. Kennedy International Airport', 'New York', 'USA', 'JFK');

-- Sample Flights for Today and Tomorrow
-- Flight 1: Karachi to Islamabad (Today)
INSERT INTO flight (airline_name, departure_city, arrival_city, departure_time, arrival_time) VALUES
('PIA', 'Karachi', 'Islamabad', CURRENT_DATE + INTERVAL '14 hours', CURRENT_DATE + INTERVAL '16 hours'),
('Airblue', 'Karachi', 'Islamabad', CURRENT_DATE + INTERVAL '18 hours', CURRENT_DATE + INTERVAL '20 hours'),
('Serene Air', 'Karachi', 'Islamabad', CURRENT_DATE + INTERVAL '1 day 08 hours', CURRENT_DATE + INTERVAL '1 day 10 hours');

-- Seats for Flight 1 (PIA Today)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(1, '1A', 'Business', 'Available'), (1, '1B', 'Business', 'Available'),
(1, '10A', 'Economy', 'Available'), (1, '10B', 'Economy', 'Available'), (1, '10C', 'Economy', 'Available');

-- Seats for Flight 2 (Airblue Today)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(2, '5A', 'Economy', 'Available'), (2, '5B', 'Economy', 'Available'), (2, '5C', 'Economy', 'Available');

-- Seats for Flight 3 (Serene Tomorrow)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(3, '1A', 'First', 'Available'), (3, '5A', 'Business', 'Available'), (3, '15A', 'Economy', 'Available');


-- =========================================================================
-- Flight Schedules — daily flights for ALL airport pairs (66 schedules)
-- Airports: Karachi, Lahore, Islamabad, Dubai, London, New York
-- Flights are auto-generated for the next 30 days on server startup.
-- =========================================================================

INSERT INTO flight_schedule (airline_name, departure_city, arrival_city, departure_time_daily, arrival_time_daily, frequency, day_of_week, start_date, end_date) VALUES
('PIA', 'Karachi', 'Lahore', '06:00:00', '08:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Airblue', 'Karachi', 'Lahore', '10:00:00', '12:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Serene Air', 'Karachi', 'Lahore', '14:00:00', '16:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Karachi', 'Islamabad', '06:00:00', '08:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Airblue', 'Karachi', 'Islamabad', '10:00:00', '12:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Serene Air', 'Karachi', 'Islamabad', '14:00:00', '16:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Karachi', 'Dubai', '06:00:00', '08:10:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('FlyDubai', 'Karachi', 'Dubai', '10:00:00', '12:10:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'Karachi', 'London', '06:00:00', '14:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Karachi', 'London', '10:00:00', '18:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Karachi', 'New York', '06:00:00', '22:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Karachi', 'New York', '10:00:00', '02:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Lahore', 'Karachi', '06:00:00', '08:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Airblue', 'Lahore', 'Karachi', '10:00:00', '12:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Serene Air', 'Lahore', 'Karachi', '14:00:00', '16:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Lahore', 'Islamabad', '06:00:00', '07:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Airblue', 'Lahore', 'Islamabad', '10:00:00', '11:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Serene Air', 'Lahore', 'Islamabad', '14:00:00', '15:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Lahore', 'Dubai', '06:00:00', '09:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('FlyDubai', 'Lahore', 'Dubai', '10:00:00', '13:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'Lahore', 'London', '06:00:00', '13:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Lahore', 'London', '10:00:00', '17:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Lahore', 'New York', '06:00:00', '21:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Lahore', 'New York', '10:00:00', '01:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Islamabad', 'Karachi', '06:00:00', '08:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Airblue', 'Islamabad', 'Karachi', '10:00:00', '12:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Serene Air', 'Islamabad', 'Karachi', '14:00:00', '16:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Islamabad', 'Lahore', '06:00:00', '07:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Airblue', 'Islamabad', 'Lahore', '10:00:00', '11:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Serene Air', 'Islamabad', 'Lahore', '14:00:00', '15:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Islamabad', 'Dubai', '06:00:00', '09:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('FlyDubai', 'Islamabad', 'Dubai', '10:00:00', '13:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'Islamabad', 'London', '06:00:00', '13:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Islamabad', 'London', '10:00:00', '17:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Islamabad', 'New York', '06:00:00', '21:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'Islamabad', 'New York', '10:00:00', '01:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Dubai', 'Karachi', '06:00:00', '08:10:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('FlyDubai', 'Dubai', 'Karachi', '10:00:00', '12:10:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Dubai', 'Lahore', '06:00:00', '09:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('FlyDubai', 'Dubai', 'Lahore', '10:00:00', '13:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Dubai', 'Islamabad', '06:00:00', '09:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('FlyDubai', 'Dubai', 'Islamabad', '10:00:00', '13:15:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Dubai', 'London', '06:00:00', '13:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'Dubai', 'London', '10:00:00', '17:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'Dubai', 'New York', '06:00:00', '20:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'Dubai', 'New York', '10:00:00', '00:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'London', 'Karachi', '06:00:00', '14:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'London', 'Karachi', '10:00:00', '18:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'London', 'Lahore', '06:00:00', '13:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'London', 'Lahore', '10:00:00', '17:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'London', 'Islamabad', '06:00:00', '13:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'London', 'Islamabad', '10:00:00', '17:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'London', 'Dubai', '06:00:00', '13:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'London', 'Dubai', '10:00:00', '17:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'London', 'New York', '06:00:00', '14:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Virgin Atlantic', 'London', 'New York', '10:00:00', '18:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'New York', 'Karachi', '06:00:00', '22:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'New York', 'Karachi', '10:00:00', '02:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'New York', 'Lahore', '06:00:00', '21:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'New York', 'Lahore', '10:00:00', '01:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'New York', 'Islamabad', '06:00:00', '21:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('PIA', 'New York', 'Islamabad', '10:00:00', '01:30:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Emirates', 'New York', 'Dubai', '06:00:00', '20:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'New York', 'Dubai', '10:00:00', '00:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('British Airways', 'New York', 'London', '06:00:00', '14:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31'),
('Virgin Atlantic', 'New York', 'London', '10:00:00', '18:00:00', 'Daily', NULL, '2026-01-01', '2027-12-31');

-- Seed standard seat templates dynamically for ALL flight schedules to make sure seats are always generated
INSERT INTO schedule_seat_template (schedule_id, seat_number, seat_class)
SELECT s.schedule_id, t.seat_num, t.seat_cls
FROM flight_schedule s
CROSS JOIN (VALUES 
    ('1A', 'First'), ('1B', 'First'),
    ('2A', 'Business'), ('2B', 'Business'), ('2C', 'Business'), ('2D', 'Business'),
    ('10A', 'Economy'), ('10B', 'Economy'), ('10C', 'Economy'), ('10D', 'Economy'), ('10E', 'Economy'), ('10F', 'Economy'),
    ('11A', 'Economy'), ('11B', 'Economy'), ('11C', 'Economy'), ('11D', 'Economy'), ('11E', 'Economy'), ('11F', 'Economy'),
    ('12A', 'Economy'), ('12B', 'Economy'), ('12C', 'Economy'), ('12D', 'Economy'), ('12E', 'Economy'), ('12F', 'Economy')
) AS t(seat_num, seat_cls);


