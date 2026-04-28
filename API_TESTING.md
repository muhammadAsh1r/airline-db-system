# API Testing Examples (curl)

You can test the backend APIs using the following `curl` commands.

### 1. Search Flights
```bash
curl "http://localhost:3000/api/flights?from=Karachi&to=Lahore"
```

### 2. Get Available Seats
```bash
# Replace 1 with a valid flight_id from the search results
curl "http://localhost:3000/api/seats/1"
```

### 3. Create Passenger
```bash
curl -X POST http://localhost:3000/api/passenger \
-H "Content-Type: application/json" \
-d '{
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "123456789",
  "passport_number": "AB123456"
}'
```

### 4. Create Booking
```bash
curl -X POST http://localhost:3000/api/booking \
-H "Content-Type: application/json" \
-d '{
  "passenger_id": 1,
  "flight_id": 1,
  "seat_id": 1
}'
```

### 5. Process Payment
```bash
curl -X POST http://localhost:3000/api/payment \
-H "Content-Type: application/json" \
-d '{
  "booking_id": 1,
  "payment_method": "Credit Card",
  "amount": 500.00
}'
```
