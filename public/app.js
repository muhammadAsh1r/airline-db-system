const API_URL = 'http://localhost:3000/api';

let selectedFlight = null;
let selectedSeat = null;
let currentPassengerId = null;

// DOM Elements
const searchBtn = document.getElementById('search-btn');
const flightsList = document.getElementById('flights-list');
const resultsSection = document.getElementById('results-section');
const bookingModal = document.getElementById('booking-modal');
const closeBtn = document.querySelector('.close-btn');

// Search Flights
searchBtn.addEventListener('click', async () => {
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;

    if (!from || !to) return alert('Please enter source and destination');

    try {
        const res = await fetch(`${API_URL}/flights?from=${from}&to=${to}`);
        const flights = await res.json();

        flightsList.innerHTML = '';
        if (flights.length === 0) {
            flightsList.innerHTML = '<p>No flights found for this route.</p>';
        } else {
            flights.forEach(f => {
                const card = document.createElement('div');
                card.className = 'flight-card';
                card.innerHTML = `
                    <div class="airline">${f.airline_name}</div>
                    <div class="route">
                        <div>${f.departure_city} ➔ ${f.arrival_city}</div>
                        <div class="time">${new Date(f.departure_time).toLocaleTimeString()} - ${new Date(f.arrival_time).toLocaleTimeString()}</div>
                    </div>
                    <button class="btn-primary" onclick="openBooking(${f.flight_id})">Book Now</button>
                `;
                flightsList.appendChild(card);
            });
        }
        resultsSection.classList.remove('hidden');
    } catch (err) {
        alert('Error fetching flights');
    }
});

// Open Booking Modal
window.openBooking = async (flightId) => {
    selectedFlight = flightId;
    bookingModal.classList.remove('hidden');
    showStep('passenger-form');
};

// Close Modal
closeBtn.onclick = () => {
    bookingModal.classList.add('hidden');
    resetBooking();
};

// Step 1: Create/Identify Passenger
document.getElementById('next-to-seats').onclick = async () => {
    const name = document.getElementById('p-name').value;
    const email = document.getElementById('p-email').value;
    const phone = document.getElementById('p-phone').value;
    const passport = document.getElementById('p-passport').value;

    if (!name || !email || !passport) return alert('Please fill required fields');

    try {
        const res = await fetch(`${API_URL}/passenger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone_number: phone, passport_number: passport })
        });
        const passenger = await res.json();
        currentPassengerId = passenger.passenger_id;

        // Fetch Seats for Step 2
        await fetchSeats(selectedFlight);
        showStep('seat-selection');
    } catch (err) {
        alert('Error registering passenger');
    }
};

// Fetch Seats
async function fetchSeats(flightId) {
    const res = await fetch(`${API_URL}/seats/${flightId}`);
    const seats = await res.json();
    
    const grid = document.getElementById('seats-grid');
    grid.innerHTML = '';
    
    seats.forEach(s => {
        const div = document.createElement('div');
        div.className = `seat ${s.seat_status.toLowerCase()}`;
        div.innerHTML = `<strong>${s.seat_number}</strong><br>${s.seat_class}`;
        
        if (s.seat_status === 'Available') {
            div.onclick = () => {
                document.querySelectorAll('.seat').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedSeat = s;
                document.getElementById('next-to-payment').disabled = false;
            };
        }
        grid.appendChild(div);
    });
}

// Step 2: Next to Payment
document.getElementById('next-to-payment').onclick = () => {
    let amount = 0;
    if (selectedSeat.seat_class === 'First') amount = 500;
    else if (selectedSeat.seat_class === 'Business') amount = 300;
    else amount = 150;

    document.getElementById('total-amount').innerText = `$${amount}`;
    showStep('payment-section');
};

// Step 3: Confirm Booking & Payment
document.getElementById('confirm-booking').onclick = async () => {
    try {
        // 1. Create Booking
        const bookRes = await fetch(`${API_URL}/booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                passenger_id: currentPassengerId, 
                flight_id: selectedFlight, 
                seat_id: selectedSeat.seat_id 
            })
        });
        const booking = await bookRes.json();

        if (booking.error) throw new Error(booking.error);

        // 2. Process Payment
        const payMethod = document.getElementById('pay-method').value;
        const amountStr = document.getElementById('total-amount').innerText.replace('$', '');
        
        await fetch(`${API_URL}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                booking_id: booking.booking_id, 
                payment_method: payMethod, 
                amount: parseFloat(amountStr) 
            })
        });

        showStep('success-message');
    } catch (err) {
        alert(err.message || 'Booking failed');
    }
};

// Helper Functions
function showStep(stepId) {
    ['passenger-form', 'seat-selection', 'payment-section', 'success-message'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(stepId).classList.remove('hidden');
}

function resetBooking() {
    selectedFlight = null;
    selectedSeat = null;
    currentPassengerId = null;
    document.getElementById('next-to-payment').disabled = true;
}
