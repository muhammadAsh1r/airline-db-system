import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
});

export const flightService = {
    searchFlights: (from, to, date, seatClass) => 
        api.get(`/flights?from=${from}&to=${to}${date ? `&date=${date}` : ''}${seatClass ? `&class=${seatClass}` : ''}`),
    getFlight: (flightId) => api.get(`/flights/${flightId}`),
    getSeats: (flightId, sessionId) => {
        const params = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
        return api.get(`/flights/${flightId}/seats${params}`);
    },
};

export const airportService = {
    getAirports: () => api.get('/airports'),
};

export const passengerService = {
    createPassenger: (data) => api.post('/passenger', data),
};

export const baggageService = {
    addBaggage: (data) => api.post('/baggage', data),
};

export const bookingService = {
    createBooking: (data) => api.post('/booking', data),
    holdSeat: (data) => api.post('/booking/hold', data),
    releaseSeat: (data) => api.post('/booking/release', data),
    releaseSessionHolds: (data) => api.post('/booking/release-session', data),
    cancelBooking: (data) => api.post('/booking/cancel', data),
    processPayment: (data) => api.post('/payment', data),
    confirmPayment: (data) => api.post('/payment/confirm', data),
    getBookingByReference: (reference) => api.get(`/booking/${reference}`),
};

export const logsService = {
    getStats: () => api.get('/logs/stats'),
    getHealth: () => api.get('/logs/health'),
    getSearchHistory: (limit, from, to) => 
        api.get(`/logs/search-history?limit=${limit || 100}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`),
    getActivityLogs: (limit, action) => 
        api.get(`/logs/activity?limit=${limit || 100}${action ? `&action=${action}` : ''}`),
    getSystemLogs: (limit, level) => 
        api.get(`/logs/system?limit=${limit || 100}${level ? `&level=${level}` : ''}`),
    clearLogs: (type) => api.delete(`/logs/clear?type=${type || 'all'}`),
};

export default api;

