-- SkyLink Airline Reservation System Schema

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS seat_reservations CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS booking CASCADE;
DROP TABLE IF EXISTS seat CASCADE;
DROP TABLE IF EXISTS flight CASCADE;
DROP TABLE IF EXISTS passenger CASCADE;
DROP TABLE IF EXISTS airport CASCADE;

-- Passenger Table
CREATE TABLE passenger (
    passenger_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    passport_number VARCHAR(50) UNIQUE NOT NULL
);

-- Flight Table
CREATE TABLE flight (
    flight_id SERIAL PRIMARY KEY,
    airline_name VARCHAR(100) NOT NULL,
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL
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
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    booking_status VARCHAR(20) DEFAULT 'Pending' CHECK (booking_status IN ('Pending', 'Confirmed', 'Cancelled'))
);

-- Payment Table
CREATE TABLE payment (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES booking(booking_id),
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'Completed' CHECK (payment_status IN ('Pending', 'Completed', 'Failed')),
    amount DECIMAL(10, 2) NOT NULL
);

-- Sample Data

-- Flights
INSERT INTO flight (airline_name, departure_city, arrival_city, departure_time, arrival_time) VALUES
('SkyLink Air', 'Karachi', 'Lahore', '2026-05-01 10:00:00', '2026-05-01 11:30:00'),
('SkyLink Air', 'Lahore', 'Karachi', '2026-05-01 14:00:00', '2026-05-01 15:30:00'),
('Blue Sky', 'Islamabad', 'Karachi', '2026-05-02 08:00:00', '2026-05-02 10:00:00'),
('Emerald Wings', 'Karachi', 'Islamabad', '2026-05-02 12:00:00', '2026-05-02 14:00:00');

-- Seats for Flight 1 (Karachi to Lahore)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(1, '1A', 'First', 'Available'),
(1, '1B', 'First', 'Available'),
(1, '10A', 'Business', 'Available'),
(1, '10B', 'Business', 'Available'),
(1, '20A', 'Economy', 'Available'),
(1, '20B', 'Economy', 'Available');

-- Seats for Flight 2 (Lahore to Karachi)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(2, '1A', 'First', 'Available'),
(2, '20A', 'Economy', 'Available');

-- Seats for Flight 3
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(3, '5A', 'Business', 'Available'),
(3, '25C', 'Economy', 'Available');

-- Flights for Today and Tomorrow
INSERT INTO flight (airline_name, departure_city, arrival_city, departure_time, arrival_time) VALUES
('SkyLink Air', 'Karachi', 'Lahore', CURRENT_DATE + INTERVAL '10 hours', CURRENT_DATE + INTERVAL '11 hours 30 minutes'),
('SkyLink Air', 'Lahore', 'Karachi', CURRENT_DATE + INTERVAL '14 hours', CURRENT_DATE + INTERVAL '15 hours 30 minutes'),
('Blue Sky', 'Karachi', 'Lahore', CURRENT_DATE + INTERVAL '1 day 08:00:00', CURRENT_DATE + INTERVAL '1 day 09:30:00');

-- Seats for Flight 5 (Dynamic Today)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(5, '2A', 'First', 'Available'),
(5, '5C', 'Business', 'Available'),
(5, '12F', 'Premium Economy', 'Available'),
(5, '25A', 'Economy', 'Available');

-- Seats for Flight 6
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(6, '1A', 'First', 'Available'),
(6, '15B', 'Premium Economy', 'Available');


-- Airport Table
CREATE TABLE airport (
    airport_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100)
);

-- Insert Airports
INSERT INTO airport (name, city, country) VALUES
('Jinnah International Airport', 'Karachi', 'Pakistan'),
('Allama Iqbal International Airport', 'Lahore', 'Pakistan'),
('Islamabad International Airport', 'Islamabad', 'Pakistan'),
('Bacha Khan International Airport', 'Peshawar', 'Pakistan'),
('Multan International Airport', 'Multan', 'Pakistan'),
('Sialkot International Airport', 'Sialkot', 'Pakistan'),
('Faisalabad International Airport', 'Faisalabad', 'Pakistan'),
('Quetta International Airport', 'Quetta', 'Pakistan'),
('John F. Kennedy International Airport', 'New York', 'USA'),
('Los Angeles International Airport', 'Los Angeles', 'USA'),
('Chicago O''Hare International Airport', 'Chicago', 'USA'),
('Dallas/Fort Worth International Airport', 'Dallas', 'USA'),
('San Francisco International Airport', 'San Francisco', 'USA'),
('Miami International Airport', 'Miami', 'USA'),
('Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'USA'),
('Indira Gandhi International Airport', 'Delhi', 'India'),
('Chhatrapati Shivaji Maharaj International Airport', 'Mumbai', 'India'),
('Kempegowda International Airport', 'Bangalore', 'India'),
('Chennai International Airport', 'Chennai', 'India'),
('Netaji Subhas Chandra Bose International Airport', 'Kolkata', 'India'),
('Rajiv Gandhi International Airport', 'Hyderabad', 'India'),
('Heathrow Airport', 'London', 'UK'),
('Gatwick Airport', 'London', 'UK'),
('Manchester Airport', 'Manchester', 'UK'),
('Birmingham Airport', 'Birmingham', 'UK'),
('Dubai International Airport', 'Dubai', 'UAE'),
('Al Maktoum International Airport', 'Dubai', 'UAE'),
('Abu Dhabi International Airport', 'Abu Dhabi', 'UAE'),
('Sharjah International Airport', 'Sharjah', 'UAE'),
('King Abdulaziz International Airport', 'Jeddah', 'Saudi Arabia'),
('King Khalid International Airport', 'Riyadh', 'Saudi Arabia'),
('Prince Mohammad bin Abdulaziz Airport', 'Medina', 'Saudi Arabia'),
('Beijing Capital International Airport', 'Beijing', 'China'),
('Shanghai Pudong International Airport', 'Shanghai', 'China'),
('Guangzhou Baiyun International Airport', 'Guangzhou', 'China'),
('Tokyo Haneda Airport', 'Tokyo', 'Japan'),
('Narita International Airport', 'Tokyo', 'Japan'),
('Kansai International Airport', 'Osaka', 'Japan'),
('Frankfurt Airport', 'Frankfurt', 'Germany'),
('Munich Airport', 'Munich', 'Germany'),
('Berlin Brandenburg Airport', 'Berlin', 'Germany'),
('Charles de Gaulle Airport', 'Paris', 'France'),
('Orly Airport', 'Paris', 'France'),
('Toronto Pearson International Airport', 'Toronto', 'Canada'),
('Vancouver International Airport', 'Vancouver', 'Canada'),
('Montréal–Trudeau International Airport', 'Montreal', 'Canada'),
('Sydney Kingsford Smith Airport', 'Sydney', 'Australia'),
('Melbourne Airport', 'Melbourne', 'Australia'),
('Brisbane Airport', 'Brisbane', 'Australia');

-- Stateful Seat Reservations Table
CREATE TABLE seat_reservations (
    reservation_id SERIAL PRIMARY KEY,
    flight_id INT REFERENCES flight(flight_id) ON DELETE CASCADE,
    seat_id INT REFERENCES seat(seat_id) ON DELETE CASCADE,
    passenger_id INT REFERENCES passenger(passenger_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'Held', -- 'Held' or 'Booked'
    hold_expiry TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_seat_flight UNIQUE(flight_id, seat_id)
);

-- ==========================================
-- DUMMY DATA FOR TESTING
-- ==========================================

-- 1. Insert More International Flights
INSERT INTO flight (airline_name, departure_city, arrival_city, departure_time, arrival_time) VALUES
('Emirates', 'Dubai', 'Karachi', CURRENT_DATE + INTERVAL '2 days 08:00:00', CURRENT_DATE + INTERVAL '2 days 10:30:00'),
('British Airways', 'London', 'New York', CURRENT_DATE + INTERVAL '3 days 11:00:00', CURRENT_DATE + INTERVAL '3 days 19:00:00'),
('Qatar Airways', 'Doha', 'Lahore', CURRENT_DATE + INTERVAL '1 day 22:00:00', CURRENT_DATE + INTERVAL '2 days 03:00:00'),
('PIA', 'Islamabad', 'London', CURRENT_DATE + INTERVAL '5 days 09:00:00', CURRENT_DATE + INTERVAL '5 days 17:00:00'),
('Turkish Airlines', 'Istanbul', 'Paris', CURRENT_DATE + INTERVAL '2 days 14:00:00', CURRENT_DATE + INTERVAL '2 days 17:30:00'),
('Lufthansa', 'Frankfurt', 'Tokyo', CURRENT_DATE + INTERVAL '4 days 20:00:00', CURRENT_DATE + INTERVAL '5 days 10:00:00');

-- 2. Insert Seats for New Flights (Flights 7 to 12)
-- Flight 7 (Dubai -> Karachi)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(7, '1A', 'First', 'Available'), (7, '1B', 'First', 'Available'),
(7, '5A', 'Business', 'Available'), (7, '5B', 'Business', 'Available'),
(7, '10A', 'Economy', 'Available'), (7, '10B', 'Economy', 'Available'), (7, '10C', 'Economy', 'Available');

-- Flight 8 (London -> New York)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(8, '1A', 'First', 'Available'), (8, '2A', 'First', 'Available'),
(8, '10C', 'Business', 'Available'), (8, '10D', 'Business', 'Available'),
(8, '30A', 'Economy', 'Available'), (8, '30B', 'Economy', 'Available');

-- Flight 9 (Doha -> Lahore)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(9, '1K', 'First', 'Available'), (9, '5J', 'Business', 'Available'),
(9, '15A', 'Economy', 'Available'), (9, '15B', 'Economy', 'Available');

-- Flight 10 (Islamabad -> London)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(10, '1A', 'First', 'Available'), (10, '8A', 'Business', 'Available'),
(10, '22C', 'Economy', 'Available'), (10, '22D', 'Economy', 'Available');

-- Flight 11 (Istanbul -> Paris)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(11, '2A', 'Business', 'Available'), (11, '12F', 'Economy', 'Available');

-- Flight 12 (Frankfurt -> Tokyo)
INSERT INTO seat (flight_id, seat_number, seat_class, seat_status) VALUES
(12, '1A', 'First', 'Available'), (12, '10A', 'Business', 'Available'), (12, '40A', 'Economy', 'Available');
