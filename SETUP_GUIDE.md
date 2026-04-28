# SkyLink Local Setup Guide

Follow these steps to run the SkyLink Airline Reservation System on your local machine.

## Prerequisites

Ensure you have the following installed:
1. **Node.js** (v16+)
2. **PostgreSQL**
3. **MongoDB**
4. **Redis**

---

## 1. PostgreSQL Setup

1.  Open your PostgreSQL terminal (`psql`) or pgAdmin.
2.  Create a new database named `skylink`:
    ```sql
    CREATE DATABASE skylink;
    ```
3.  Connect to the `skylink` database and run the provided `schema.sql` to create tables and insert sample data:
    ```bash
    psql -U postgres -d skylink -f schema.sql
    ```
    *(Note: You may need to provide your password).*

---

## 2. MongoDB Setup

1.  Start your local MongoDB server (usually runs automatically if installed as a service).
2.  Ensure it is reachable at `mongodb://localhost:27017`.
3.  The backend will automatically create the `skylink` database and collections (`searchhistories`, `activitylogs`) upon the first action.

---

## 3. Redis Setup

1.  Start your local Redis server:
    ```bash
    redis-server
    ```
2.  Ensure it is running on the default port `6379`.

---

## 4. Backend Setup

1.  Navigate to the project directory:
    ```bash
    cd airline-db
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables:
    *   Open `.env` and update `DB_USER` and `DB_PASSWORD` if they differ from the defaults.
4.  Start the server:
    ```bash
    npm start
    ```
5.  The app will be running at [http://localhost:3000](http://localhost:3000).

---

## 5. Usage

1.  Open your browser and go to `http://localhost:3000`.
2.  **Search**: Enter "Karachi" to "Lahore" and click Search.
    *   *First time*: Fetches from Postgres and caches in Redis.
    *   *Second time (within 5 mins)*: Fetches instantly from Redis.
3.  **Book**: Click "Book Now" on a flight.
4.  **Flow**: Enter passenger details -> Select a seat -> Confirm Payment.
5.  **Check Logs**: You can check MongoDB Compass to see the search history and activity logs.
