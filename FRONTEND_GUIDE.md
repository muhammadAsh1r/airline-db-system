# SkyLink React Frontend Guide

This is the React-based frontend for the SkyLink Airline Reservation System, built with Vite.

## Setup Instructions

1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```
2.  **Install dependencies** (if not already done):
    ```bash
    npm install
    ```
3.  **Start the development server**:
    ```bash
    npm run dev
    ```
4.  **Access the app**:
    Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Features Demonstrated

### 1. Flight Search
- Connects to `GET /api/flights`.
- Displays results in a clean table format.
- Shows airline name, departure/arrival cities, and times.

### 2. Seat Selection
- Connects to `GET /api/seats/:id`.
- Visual grid showing seat status (Available vs. Booked).
- Allows interactive selection.

### 3. Booking & Passenger Registration
- Connects to `POST /api/passenger` and `POST /api/booking`.
- Automatically handles passenger creation before booking.

### 4. Payment
- Connects to `POST /api/payment`.
- Calculates total price based on seat class.
- Shows a professional "Success" confirmation page.

---

## Technical Details
- **Framework**: React 18+ (Vite)
- **Routing**: React Router v6
- **API Client**: Axios
- **Design**: Microsoft-inspired clean UI (Segoe UI, primary blue accents)
