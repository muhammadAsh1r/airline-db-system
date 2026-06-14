import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/api';
import { useToast } from '../context/ToastContext';

const TicketPage = () => {
    const { showToast } = useToast();
    const { reference } = useParams();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTicket = async () => {
            try {
                const response = await bookingService.getBookingByReference(reference);
                setBookings(response.data);
            } catch (err) {
                setError('Booking not found. Please check your reference code.');
            } finally {
                setLoading(false);
            }
        };
        fetchTicket();
    }, [reference]);

    const handlePrint = () => {
        window.print();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(reference);
        showToast('PNR copied to clipboard!', 'success');
    };

    if (loading) return <div className="container"><div className="spinner"></div></div>;
    if (error) return (
        <div className="container">
            <div className="card" style={{ textAlign: 'center' }}>
                <h2 style={{ color: 'var(--error)' }}>Error</h2>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '20px' }}>Go Back</button>
            </div>
        </div>
    );

    const flight = bookings[0]; // All passengers share the same flight details

    return (
        <div className="container ticket-container" style={{ maxWidth: '800px' }}>
            <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn" onClick={() => navigate('/')}>← Back</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn" onClick={handleCopy}>Copy PNR</button>
                    <button className="btn btn-primary" onClick={handlePrint}>Print / Download PDF</button>
                </div>
            </div>

            <div className="card ticket-card" style={{ padding: '0', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                <div style={{ background: 'var(--primary)', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px' }}>BOARDING PASS</h1>
                        <p style={{ margin: 0, opacity: 0.8, fontSize: '12px' }}>SkyLink Airline Systems</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>PNR / Reference</p>
                        <h2 style={{ margin: 0, letterSpacing: '2px' }}>{reference}</h2>
                    </div>
                </div>

                <div style={{ padding: '30px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px', marginBottom: '30px' }}>
                        <div>
                            <div style={{ display: 'flex', gap: '40px', marginBottom: '25px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>From</label>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{flight.departure_city}</div>
                                </div>
                                <div style={{ alignSelf: 'center', fontSize: '20px' }}>✈️</div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>To</label>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{flight.arrival_city}</div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Date</label>
                                    <div style={{ fontWeight: '600' }}>{new Date(flight.departure_time).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Time</label>
                                    <div style={{ fontWeight: '600' }}>{new Date(flight.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ borderLeft: '1px dashed #ddd', paddingLeft: '40px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Airline</label>
                            <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '15px' }}>{flight.airline_name}</div>
                            
                            <label style={{ display: 'block', fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Status</label>
                            <div className="badge badge-success" style={{ display: 'inline-block' }}>{flight.booking_status}</div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '15px', color: '#444' }}>Passenger Details</h3>
                        <table style={{ marginTop: '0' }}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Seat</th>
                                    <th>Class</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((b, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: '600' }}>{b.first_name} {b.last_name}</td>
                                        <td>{b.seat_number || 'Not Assigned'}</td>
                                        <td><span className="badge badge-primary">{b.seat_class || 'Economy'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ background: '#f8f9fa', padding: '15px 30px', borderTop: '1px solid #eee', fontSize: '11px', color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>PLEASE ARRIVE AT THE GATE 60 MINUTES BEFORE DEPARTURE</span>
                    <div style={{ letterSpacing: '1px', fontWeight: 'bold', color: '#ddd', fontSize: '14px' }}>|||| ||| ||||| || ||||</div>
                </div>
            </div>

            <div className="no-print" style={{ marginTop: '30px', padding: '20px', background: '#fff9c4', borderRadius: '8px', border: '1px solid #fbc02d', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <p style={{ margin: 0, fontSize: '13px' }}>
                    <strong>Important:</strong> Please save your PNR (<strong>{reference}</strong>). Since we do not use accounts, this code is the only way to retrieve your ticket later.
                </p>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .container { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
                    .card { border: none !important; box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
};

export default TicketPage;
