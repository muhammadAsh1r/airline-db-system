const SESSION_KEY = 'skylink_seat_session';

export function getSeatSessionId() {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
}

export function clearSeatSessionId() {
    sessionStorage.removeItem(SESSION_KEY);
}
