import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/api';
import { useToast } from '../context/ToastContext';

// Keep track of active cancellation timeouts to prevent React 18 Strict Mode cleanup from cancelling active bookings
const activeCancelTimeouts = new Map();

const PaymentPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    const [method, setMethod] = useState('Credit Card');
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ticketData, setTicketData] = useState(null);
    
    // Form fields
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');

    const confirmedRef = useRef(false);
    confirmedRef.current = confirmed;

    // React router navigation unmount release (if they leave the page without completing payment)
    useEffect(() => {
        const refCode = state?.reference;
        if (!refCode) return;

        // If there was a pending cancellation timeout for this specific booking, cancel it.
        // This handles React 18 Strict Mode remounting.
        if (activeCancelTimeouts.has(refCode)) {
            clearTimeout(activeCancelTimeouts.get(refCode));
            activeCancelTimeouts.delete(refCode);
        }

        return () => {
            if (!confirmedRef.current && refCode) {
                // Delay cancellation slightly to prevent React 18 Strict Mode from canceling active bookings
                const timeoutId = setTimeout(() => {
                    bookingService.cancelBooking({ booking_reference: refCode }).catch(err => {
                        console.error('Failed to auto-cancel abandoned booking on navigation:', err.message);
                    });
                    activeCancelTimeouts.delete(refCode);
                }, 1000); // 1 second delay

                activeCancelTimeouts.set(refCode, timeoutId);
            }
        };
    }, [state]);

    // Page closed, tab closed, or reloaded release (fire-and-forget Beacon/Keepalive APIs)
    useEffect(() => {
        const refCode = state?.reference;
        const handleBeforeUnload = () => {
            if (!confirmed && refCode) {
                const url = 'http://localhost:3000/api/booking/cancel';
                const data = JSON.stringify({ booking_reference: refCode });
                if (navigator.sendBeacon) {
                    navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
                } else {
                    fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: data,
                        keepalive: true
                    });
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [confirmed, state]);

    // Safety check for invalid access
    if (!state || !state.bookings || state.bookings.length === 0) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
                <div className="card">
                    <h2 style={{ color: 'var(--error)' }}>Invalid Session</h2>
                    <p>We couldn't find your booking details. Please start the booking process again.</p>
                    <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/')}>
                        Return to Search
                    </button>
                </div>
            </div>
        );
    }

    const { bookings, amount, reference, travelers } = state;

    const handlePayment = async () => {
        if (method === 'Credit Card' && (!cardNumber || !expiry || !cvv || !cardName)) {
            return showToast('Please fill in all card details.', 'warning');
        }

        setLoading(true);
        try {
            await bookingService.confirmPayment({
                booking_reference: reference,
                payment_method: method,
                amount: amount,
                card_details: {
                    number: cardNumber.replace(/\s/g, ''),
                    expiry: expiry,
                    cvv: cvv,
                    name: cardName
                }
            });
            
            // Fetch full ticket details to display on success page
            const res = await bookingService.getBookingByReference(reference);
            setTicketData(res.data);
            setConfirmed(true);
            showToast('Payment successful!', 'success');
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.error || 'Payment processing failed.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length > 0) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    const handleCardNumberChange = (e) => {
        const formatted = formatCardNumber(e.target.value);
        if (formatted.replace(/\s/g, '').length <= 16) {
            setCardNumber(formatted);
        }
    };

    const handleExpiryChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        if (value.length > 2) {
            setExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
        } else {
            setExpiry(value);
        }
    };

    if (confirmed && ticketData) {
        const flight = ticketData[0];
        return (
            <div className="container" style={{ maxWidth: '800px' }}>
                <div className="card" style={{ textAlign: 'center', marginBottom: '30px', border: '1px solid var(--success)', background: '#f6fff6' }}>
                    <div style={{ fontSize: '50px' }}>✅</div>
                    <h1 style={{ color: 'var(--success)', margin: '10px 0' }}>Payment Successful!</h1>
                    <p>Your booking has been confirmed. Please see your ticket details below.</p>
                </div>

                {/* Boarding Pass UI (Same as TicketPage) */}
                <div className="card ticket-card" style={{ padding: '0', overflow: 'hidden', border: '2px solid var(--primary)', marginBottom: '30px' }}>
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px' }}>BOARDING PASS</h2>
                            <p style={{ margin: 0, opacity: 0.8, fontSize: '11px' }}>SkyLink Airline Systems</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '9px', textTransform: 'uppercase' }}>PNR / Reference</p>
                            <h2 style={{ margin: 0, letterSpacing: '2px' }}>{reference}</h2>
                        </div>
                    </div>

                    <div style={{ padding: '25px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px', marginBottom: '25px' }}>
                            <div>
                                <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>From</label>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{flight.departure_city}</div>
                                    </div>
                                    <div style={{ alignSelf: 'center', fontSize: '18px' }}>✈️</div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>To</label>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{flight.arrival_city}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>Date</label>
                                        <div style={{ fontWeight: '600' }}>{new Date(flight.departure_time).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>Time</label>
                                        <div style={{ fontWeight: '600' }}>{new Date(flight.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ borderLeft: '1px dashed #ddd', paddingLeft: '30px' }}>
                                <label style={{ display: 'block', fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>Airline</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '10px' }}>{flight.airline_name}</div>
                                <label style={{ display: 'block', fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>Total Paid</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>${amount}</div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                            <table style={{ marginTop: '0', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th>Passenger</th>
                                        <th>Seat</th>
                                        <th>Class</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ticketData.map((b, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: '600' }}>{b.first_name} {b.last_name}</td>
                                            <td>{b.seat_number || 'N/A'}</td>
                                            <td><span className="badge badge-primary">{b.seat_class}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="no-print" style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>Print / Download PDF</button>
                    <button className="btn" style={{ flex: 1 }} onClick={() => {
                        navigator.clipboard.writeText(reference);
                        showToast('PNR copied to clipboard!', 'success');
                    }}>Copy PNR Code</button>
                    <button className="btn" style={{ flex: 1 }} onClick={() => navigate('/')}>Back to Home</button>
                </div>

                <div style={{ padding: '20px', background: '#fff9c4', borderRadius: '8px', border: '1px solid #fbc02d', display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                        <strong>Important:</strong> Save your PNR (<strong>{reference}</strong>) to retrieve your ticket later from the homepage.
                    </p>
                </div>

                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        .container { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
                        .card:not(.ticket-card) { display: none !important; }
                        .ticket-card { border: none !important; box-shadow: none !important; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '1100px' }}>
            {/* 1. Summary Header (Matching SeatPage) */}
            <div className="summary-card">
                <div className="flight-info-grid">
                    <div className="info-item">
                        <label>Booking Ref</label>
                        <span>{reference}</span>
                    </div>
                    <div className="info-item">
                        <label>Travelers</label>
                        <span>{travelers} Passenger(s)</span>
                    </div>
                    <div className="info-item">
                        <label>Status</label>
                        <span className="badge badge-primary">Pending Payment</span>
                    </div>
                    <div className="info-item">
                        <label>Date</label>
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid #ddd', paddingLeft: '30px' }}>
                    <label style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888' }}>Total to Pay</label>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>${amount}</div>
                </div>
            </div>

            {/* 2. Step Indicator (Final Step) */}
            <div className="step-indicator-container">
                {[
                    { n: 1, label: 'Passengers', status: 'done' },
                    { n: 2, label: 'Baggage', status: 'done' },
                    { n: 3, label: 'Seats', status: 'done' },
                    { n: 4, label: 'Payment', status: 'active' }
                ].map(s => (
                    <div key={s.n} className="step-item" style={{ opacity: s.status === 'active' ? 1 : 0.6 }}>
                        <div className="step-number" style={{ background: s.status === 'active' ? 'var(--primary)' : 'var(--success)', color: 'white' }}>
                            {s.status === 'done' ? '✓' : s.n}
                        </div>
                        <div className="step-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px', alignItems: 'start' }}>
                {/* Main Payment Content */}
                <div className="card" style={{ padding: '30px' }}>
                    <h2 style={{ marginBottom: '25px' }}>Payment Method</h2>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                        {['Credit Card', 'PayPal', 'Bank Transfer'].map(m => (
                            <button 
                                key={m}
                                onClick={() => setMethod(m)}
                                className="btn"
                                style={{ 
                                    flex: 1,
                                    background: method === m ? 'var(--primary)' : '#f5f5f5',
                                    color: method === m ? 'white' : 'var(--text-dark)',
                                    border: `1px solid ${method === m ? 'var(--primary)' : 'var(--border)'}`,
                                    padding: '12px'
                                }}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    {method === 'Credit Card' && (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div className="form-group">
                                <label>Cardholder Name</label>
                                <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Name as on card" />
                            </div>
                            <div className="form-group">
                                <label>Card Number</label>
                                <input 
                                    type="text" 
                                    value={cardNumber} 
                                    onChange={handleCardNumberChange} 
                                    placeholder="0000 0000 0000 0000" 
                                    maxLength="19"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input 
                                        type="text" 
                                        value={expiry} 
                                        onChange={handleExpiryChange} 
                                        placeholder="MM/YY" 
                                        maxLength="5"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>CVV</label>
                                    <input type="password" value={cvv} onChange={e => setCvv(e.target.value)} placeholder="***" maxLength="3" />
                                </div>
                            </div>
                        </div>
                    )}

                    {method !== 'Credit Card' && (
                        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-light)', borderRadius: '8px', border: '1px dashed var(--border)', marginBottom: '20px' }}>
                            <p>You will be redirected to <strong>{method}</strong> secure portal to complete your payment of <strong>${amount}</strong>.</p>
                        </div>
                    )}

                    <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '15px', marginTop: '20px', fontSize: '16px' }} 
                        onClick={handlePayment}
                        disabled={loading}
                    >
                        {loading ? 'Processing Transaction...' : `Confirm & Pay $${amount}`}
                    </button>
                </div>

                {/* Sidebar Summary (Matching SeatPage) */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Price Breakdown</h3>
                    <div className="price-breakdown">
                        <div className="price-row">
                            <span>Base & Baggage</span>
                            <span>${Math.round(amount / 1.15)}</span>
                        </div>
                        <div className="price-row">
                            <span>Taxes (15%)</span>
                            <span>${Math.round(amount - (amount / 1.15))}</span>
                        </div>
                        <div className="price-row total">
                            <span>Total (USD)</span>
                            <span>${amount}</span>
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        By clicking "Confirm & Pay", you agree to SkyLink's Terms of Service and Privacy Policy.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
