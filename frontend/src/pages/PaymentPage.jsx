import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/api';

const PaymentPage = () => {
    const { state } = useLocation();
    const [method, setMethod] = useState('Credit Card');
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    if (!state || !state.booking) {
        return <div className="container">Invalid Access</div>;
    }

    const handlePayment = async () => {
        setLoading(true);
        try {
            await bookingService.processPayment({
                booking_id: state.booking.booking_id,
                payment_method: method,
                amount: state.amount
            });
            setConfirmed(true);
        } catch (err) {
            alert('Payment failed');
        } finally {
            setLoading(false);
        }
    };

    if (confirmed) {
        return (
            <div className="container">
                <div className="card" style={{ textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--success)', fontSize: '50px' }}>✅</h1>
                    <h2>Payment Confirmed!</h2>
                    <p>Your booking ID is <strong>#{state.booking.booking_id}</strong></p>
                    <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/')}>
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="card">
                <h2>Complete Payment</h2>
                <div style={{ marginBottom: '20px', padding: '15px', background: '#f3f2f1', borderRadius: '4px' }}>
                    <p>Booking ID: #{state.booking.booking_id}</p>
                    <p style={{ fontSize: '20px', fontWeight: 'bold' }}>Total Amount: ${state.amount}</p>
                </div>

                <div className="form-group">
                    <label>Select Payment Method</label>
                    <select value={method} onChange={e => setMethod(e.target.value)}>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="PayPal">PayPal</option>
                    </select>
                </div>

                <button 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    onClick={handlePayment}
                    disabled={loading}
                >
                    {loading ? 'Processing...' : `Pay $${state.amount}`}
                </button>
            </div>
        </div>
    );
};

export default PaymentPage;
