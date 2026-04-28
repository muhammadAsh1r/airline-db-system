import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { flightService, passengerService, bookingService } from '../services/api';

const SeatPage = () => {
    const { flightId } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const selectedClass = queryParams.get('class') || 'Economy';
    const travelers = parseInt(queryParams.get('travelers') || '1');
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1: Passengers, 2: Baggage, 3: Seats
    const [loading, setLoading] = useState(true);
    const [seats, setSeats] = useState([]);
    
    // State for multiple passengers
    const [passengers, setPassengers] = useState(
        Array(travelers).fill().map(() => ({
            given_names: '',
            surnames: '',
            email: '',
            phone_number: '',
            nationality: 'Pakistan',
            gender: 'Male',
            dob_dd: '',
            dob_mm: 'January',
            dob_yyyy: '',
            passport_number: '',
            exp_dd: '',
            exp_mm: 'January',
            exp_yyyy: '',
            selected_seat: null,
            extra_baggage: 0 // In KG
        }))
    );

    const baggageAllowance = selectedClass === 'First' ? 40 : (selectedClass === 'Business' ? 30 : 20);

    useEffect(() => {
        const fetchSeats = async () => {
            try {
                const res = await flightService.getSeats(flightId);
                const filteredSeats = res.data.filter(s => s.seat_class === selectedClass);
                setSeats(filteredSeats);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSeats();
    }, [flightId, selectedClass]);

    const updatePassenger = (index, field, value) => {
        const newPassengers = [...passengers];
        newPassengers[index][field] = value;
        setPassengers(newPassengers);
    };

    const handleNextStep = () => {
        if (step === 1) {
            const isComplete = passengers.every(p => p.given_names && p.surnames && p.email && p.passport_number);
            if (!isComplete) return alert('Please fill in all passenger details');
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        }
    };

    const toggleSeat = async (seat) => {
        if (seat.display_status === 'Booked' || seat.display_status === 'Held') {
            return alert('This seat is temporarily held or already booked');
        }
        
        const newPassengers = [...passengers];
        const occupantIndex = newPassengers.findIndex(p => p.selected_seat?.seat_id === seat.seat_id);
        
        if (occupantIndex !== -1) {
            // Unselecting: In a real system, you'd call a 'releaseHold' API here
            newPassengers[occupantIndex].selected_seat = null;
            setPassengers(newPassengers);
        } else {
            const emptyIndex = newPassengers.findIndex(p => !p.selected_seat);
            if (emptyIndex !== -1) {
                try {
                    // Call the Hold API
                    await bookingService.holdSeat({ flight_id: parseInt(flightId), seat_id: seat.seat_id });
                    
                    newPassengers[emptyIndex].selected_seat = seat;
                    setPassengers(newPassengers);
                } catch (err) {
                    alert(err.response?.data?.error || 'Failed to hold seat. Someone might have just taken it.');
                    // Refresh seats to show updated status
                    const res = await flightService.getSeats(flightId);
                    setSeats(res.data.filter(s => s.seat_class === selectedClass));
                }
            } else {
                alert(`You can only select ${passengers.length} seat(s)`);
            }
        }
    };

    const handleFinalBooking = async () => {
        const allSeatsPicked = passengers.every(p => p.selected_seat);
        if (!allSeatsPicked) return alert('Please select a seat for every passenger');

        setLoading(true);
        try {
            const bookings = [];
            let totalAmount = 0;

            for (let p of passengers) {
                const dob = `${p.dob_yyyy}-${p.dob_mm}-${p.dob_dd}`;
                const passport_expiry = `${p.exp_yyyy}-${p.exp_mm}-${p.exp_dd}`;
                
                const passengerData = {
                    ...p,
                    name: `${p.given_names} ${p.surnames}`,
                    dob,
                    passport_expiry
                };

                const pRes = await passengerService.createPassenger(passengerData);
                const bRes = await bookingService.createBooking({
                    passenger_id: pRes.data.passenger_id,
                    flight_id: parseInt(flightId),
                    seat_id: p.selected_seat.seat_id
                });
                bookings.push(bRes.data);
                
                const baseAmount = selectedClass === 'First' ? 500 : 
                                 (selectedClass === 'Business' ? 300 : 
                                 (selectedClass === 'Premium Economy' ? 220 : 150));
                
                const baggageFee = p.extra_baggage * 10; // $10 per extra KG
                totalAmount += baseAmount + baggageFee;
            }

            navigate('/payment', { state: { bookings, amount: totalAmount, travelers: passengers.length } });
        } catch (err) {
            alert('Booking failed. Please check your details and try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && step === 1) return <div className="container">Loading...</div>;

    return (
        <div className="container">
            {/* Step Indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px', gap: '40px' }}>
                {[
                    { n: 1, label: 'Passengers' },
                    { n: 2, label: 'Baggage' },
                    { n: 3, label: 'Seats' }
                ].map(s => (
                    <div key={s.n} style={{ textAlign: 'center', opacity: step === s.n ? 1 : 0.4 }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: step >= s.n ? 'var(--primary)' : '#ddd', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px' }}>{s.n}</div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="card">
                {step === 1 && (
                    <div>
                        <h2 style={{ marginBottom: '25px' }}>Passenger Information</h2>
                        {passengers.map((p, index) => (
                            <div key={index} style={{ marginBottom: '40px', padding: '25px', border: '1px solid #ddd', borderRadius: '12px', background: '#fff' }}>
                                <h3 style={{ marginBottom: '20px', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '5px' }}>Traveler {index + 1}</h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label>Given names</label>
                                        <input type="text" value={p.given_names} onChange={e => updatePassenger(index, 'given_names', e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Surnames</label>
                                        <input type="text" value={p.surnames} onChange={e => updatePassenger(index, 'surnames', e.target.value)} required />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label>Nationality</label>
                                        <select value={p.nationality} onChange={e => updatePassenger(index, 'nationality', e.target.value)}>
                                            <option>Pakistan</option><option>UK</option><option>USA</option><option>UAE</option><option>Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Gender</label>
                                        <select value={p.gender} onChange={e => updatePassenger(index, 'gender', e.target.value)}>
                                            <option>Male</option><option>Female</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Date of birth</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr', gap: '10px' }}>
                                        <input type="number" placeholder="DD" value={p.dob_dd} onChange={e => updatePassenger(index, 'dob_dd', e.target.value)} />
                                        <select value={p.dob_mm} onChange={e => updatePassenger(index, 'dob_mm', e.target.value)}>
                                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => <option key={m}>{m}</option>)}
                                        </select>
                                        <input type="number" placeholder="YYYY" value={p.dob_yyyy} onChange={e => updatePassenger(index, 'dob_yyyy', e.target.value)} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input type="email" value={p.email} onChange={e => updatePassenger(index, 'email', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Passport or ID number</label>
                                        <input type="text" value={p.passport_number} onChange={e => updatePassenger(index, 'passport_number', e.target.value)} />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Passport expiration date</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr', gap: '10px' }}>
                                        <input type="number" placeholder="DD" value={p.exp_dd} onChange={e => updatePassenger(index, 'exp_dd', e.target.value)} />
                                        <select value={p.exp_mm} onChange={e => updatePassenger(index, 'exp_mm', e.target.value)}>
                                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => <option key={m}>{m}</option>)}
                                        </select>
                                        <input type="number" placeholder="YYYY" value={p.exp_yyyy} onChange={e => updatePassenger(index, 'exp_yyyy', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div style={{ padding: '20px', border: '2px dashed #ddd', borderRadius: '12px', textAlign: 'center', marginBottom: '30px' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>Booking for more passengers?</p>
                            <button type="button" className="btn" onClick={() => setPassengers([...passengers, { given_names: '', surnames: '', email: '', passport_number: '', selected_seat: null, extra_baggage: 0, nationality: 'Pakistan', gender: 'Male', dob_dd: '', dob_mm: 'January', dob_yyyy: '', exp_dd: '', exp_mm: 'January', exp_yyyy: '' }])} style={{ background: '#f0f0f0', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                                + Add more passenger
                            </button>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%', padding: '15px' }} onClick={handleNextStep}>
                            Proceed to Baggage Selection
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <h2>Baggage Selection</h2>
                            <button className="btn" onClick={() => setStep(1)} style={{ background: '#eee' }}>Back</button>
                        </div>

                        <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '8px', marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <span style={{ fontSize: '30px' }}>🎒</span>
                            <div>
                                <h4 style={{ margin: 0, color: '#0d47a1' }}>Included Allowance</h4>
                                <p style={{ margin: 0, fontSize: '14px' }}>Your {selectedClass} ticket includes <strong>{baggageAllowance}kg</strong> checked baggage and <strong>7kg</strong> carry-on per person.</p>
                            </div>
                        </div>

                        {passengers.map((p, index) => (
                            <div key={index} style={{ marginBottom: '20px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ margin: 0 }}>{p.given_names || `Traveler ${index + 1}`}</h4>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Current weight: {baggageAllowance + p.extra_baggage}kg</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className={`btn ${p.extra_baggage === 0 ? 'btn-primary' : ''}`} onClick={() => updatePassenger(index, 'extra_baggage', 0)} style={{ fontSize: '12px' }}>Standard</button>
                                    <button className={`btn ${p.extra_baggage === 5 ? 'btn-primary' : ''}`} onClick={() => updatePassenger(index, 'extra_baggage', 5)} style={{ fontSize: '12px' }}>+5kg ($50)</button>
                                    <button className={`btn ${p.extra_baggage === 10 ? 'btn-primary' : ''}`} onClick={() => updatePassenger(index, 'extra_baggage', 10)} style={{ fontSize: '12px' }}>+10kg ($100)</button>
                                </div>
                            </div>
                        ))}

                        <button className="btn btn-primary" style={{ width: '100%', padding: '15px', marginTop: '30px' }} onClick={handleNextStep}>
                            Proceed to Seat Selection
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2>Choose Your Seats</h2>
                            <button className="btn" onClick={() => setStep(2)} style={{ background: '#eee' }}>Back</button>
                        </div>
                        
                        <div style={{ background: '#333', color: '#fff', padding: '10px', textAlign: 'center', borderRadius: '4px', marginBottom: '30px', fontSize: '12px', letterSpacing: '2px' }}>
                            FRONT OF AIRCRAFT
                        </div>

                        <div className="seat-grid">
                            {seats.map(s => {
                                const occupantIndex = passengers.findIndex(p => p.selected_seat?.seat_id === s.seat_id);
                                return (
                                    <div 
                                        key={s.seat_id} 
                                        className={`seat ${s.display_status.toLowerCase()} ${occupantIndex !== -1 ? 'selected' : ''}`}
                                        onClick={() => toggleSeat(s)}
                                        style={{ position: 'relative' }}
                                    >
                                        <strong>{s.seat_number}</strong>
                                        {occupantIndex !== -1 && (
                                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#000', color: '#fff', width: '20px', height: '20px', borderRadius: '50%', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                P{occupantIndex + 1}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: '40px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
                            <h3 style={{ marginBottom: '10px' }}>Selection Summary</h3>
                            {passengers.map((p, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
                                    <span>{p.given_names || `Traveler ${i+1}`} ({baggageAllowance + p.extra_baggage}kg)</span>
                                    <span style={{ fontWeight: 'bold' }}>{p.selected_seat ? `Seat ${p.selected_seat.seat_number}` : 'No seat selected'}</span>
                                </div>
                            ))}
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%', padding: '15px', marginTop: '20px' }} onClick={handleFinalBooking}>
                            Confirm & Continue to Payment
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeatPage;
