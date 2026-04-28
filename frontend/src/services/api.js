import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
});

export const flightService = {
    searchFlights: (from, to, date, seatClass) => 
        api.get(`/flights?from=${from}&to=${to}${date ? `&date=${date}` : ''}${seatClass ? `&class=${seatClass}` : ''}`),
    getSeats: (flightId) => api.get(`/flights/${flightId}/seats`),
};

export const airportService = {
    getAirports: () => api.get('/airports'),
};

export const passengerService = {
    createPassenger: (data) => api.post('/passenger', data),
};

export const bookingService = {
    createBooking: (data) => api.post('/booking', data),
    holdSeat: (data) => api.post('/booking/hold', data),
    processPayment: (data) => api.post('/payment', data),
};

export default api;
