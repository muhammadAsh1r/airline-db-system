import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { flightService, passengerService, bookingService, baggageService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { getSeatSessionId } from '../utils/seatSession';

const SeatPage = () => {
    const { showToast } = useToast();
    const { flightId } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const selectedClass = queryParams.get('class') || 'Economy';
    const travelers = parseInt(queryParams.get('travelers') || '1');
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1: Passengers, 2: Baggage, 3: Seats
    const [loading, setLoading] = useState(true);
    const [seats, setSeats] = useState([]);
    const [submitted, setSubmitted] = useState(false); // Track form submission to display errors
    
    // State for multiple passengers
    const [passengers, setPassengers] = useState(
        Array(travelers).fill().map(() => ({
            type: 'Adult',
            given_names: '',
            surnames: '',
            email: '',
            phone_number: '',
            nationality: 'Pakistan',
            gender: 'Male',
            dob: '',
            passport_number: '',
            passport_expiry: '',
            selected_seat: null,
            extra_baggage: 0,
            errors: {},
            touched: {} // Track touched state of individual fields
        }))
    );

    const baggageAllowance = selectedClass === 'First' ? 40 : (selectedClass === 'Business' ? 30 : 20);

    const [flight, setFlight] = useState(null);
    const [sessionId] = useState(() => getSeatSessionId());
    const [holdingSeats, setHoldingSeats] = useState(new Set());
    const [holdTimer, setHoldTimer] = useState(null);
    const bookingCompleteRef = useRef(false);

    const applySeatsToPassengers = useCallback((filteredSeats, currentPassengers) => {
        const myHeldSeats = filteredSeats.filter(s => s.is_mine || s.display_status === 'Yours');
        if (myHeldSeats.length === 0) return currentPassengers;

        const updated = currentPassengers.map(p => ({ ...p }));
        let seatIdx = 0;

        for (let i = 0; i < updated.length && seatIdx < myHeldSeats.length; i++) {
            if (updated[i].type === 'Infant') continue;
            if (!updated[i].selected_seat) {
                updated[i].selected_seat = myHeldSeats[seatIdx++];
            }
        }

        return updated;
    }, []);

    const refreshSeats = useCallback(async () => {
        const seatsRes = await flightService.getSeats(flightId, sessionId);
        const filteredSeats = seatsRes.data.filter(s => s.seat_class === selectedClass);
        setSeats(filteredSeats);
        setPassengers(prev => applySeatsToPassengers(filteredSeats, prev));

        const myHold = filteredSeats.find(s => s.is_mine && s.hold_expires_at);
        if (myHold?.hold_expires_at) {
            setHoldTimer(new Date(myHold.hold_expires_at));
        } else if (!filteredSeats.some(s => s.is_mine)) {
            setHoldTimer(null);
        }

        return filteredSeats;
    }, [flightId, sessionId, selectedClass, applySeatsToPassengers]);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [seatsRes, flightRes] = await Promise.all([
                    flightService.getSeats(flightId, sessionId),
                    flightService.getFlight(flightId)
                ]);
                const filteredSeats = seatsRes.data.filter(s => s.seat_class === selectedClass);
                setSeats(filteredSeats);
                setPassengers(prev => applySeatsToPassengers(filteredSeats, prev));
                setFlight(flightRes.data);

                const myHold = filteredSeats.find(s => s.is_mine && s.hold_expires_at);
                if (myHold?.hold_expires_at) {
                    setHoldTimer(new Date(myHold.hold_expires_at));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [flightId, selectedClass, sessionId, applySeatsToPassengers]);

    useEffect(() => {
        if (step !== 3) return undefined;

        const interval = setInterval(() => {
            refreshSeats().catch(err => console.error('Seat refresh failed:', err));
        }, 5000);

        return () => clearInterval(interval);
    }, [step, refreshSeats]);

    useEffect(() => {
        return () => {
            if (!bookingCompleteRef.current && sessionId) {
                bookingService.releaseSessionHolds({
                    session_id: sessionId,
                    flight_id: parseInt(flightId, 10)
                }).catch(() => {});
            }
        };
    }, [sessionId, flightId]);

    const getBasePrice = () => {
        if (!flight) return 0;
        let base = 150;
        if (flight.airline_name.includes('PIA')) base = 140;
        else if (flight.airline_name.includes('Airblue')) base = 130;
        else if (flight.airline_name.includes('Serene')) base = 180;
        else if (flight.airline_name.includes('AirSial')) base = 160;
        else if (flight.airline_name.includes('Emirates')) base = 400;
        
        base += (flight.flight_id % 7) * 15;
        const multiplier = selectedClass === 'First' ? 3 : (selectedClass === 'Business' ? 2 : 1);
        return base * multiplier;
    };

    const calculateTotals = () => {
        const basePrice = getBasePrice();
        let totalBase = 0;
        let totalBaggageExtra = 0;

        passengers.forEach(p => {
            let pFare = basePrice;
            if (p.type === 'Child') pFare *= 0.75;
            if (p.type === 'Infant') pFare *= 0.10;
            totalBase += pFare;
            if (p.extra_baggage === 10) totalBaggageExtra += 100;
            else if (p.extra_baggage === 20) totalBaggageExtra += 180;
        });

        const subtotal = totalBase + totalBaggageExtra;
        const taxes = subtotal * 0.15;

        return {
            base: Math.round(totalBase),
            baggage: totalBaggageExtra,
            taxes: Math.round(taxes),
            total: Math.round(subtotal + taxes)
        };
    };

    const validatePassenger = (p) => {
        const errors = {};
        if (!p.given_names) errors.given_names = 'First name is required';
        if (!p.surnames) errors.surnames = 'Last name is required';
        if (!p.dob) errors.dob = 'Date of birth is required';
        if (!p.passport_number) errors.passport_number = 'Passport number is required';
        else if (!/^[A-Z0-9]{6,12}$/i.test(p.passport_number)) errors.passport_number = 'Invalid passport format';
        
        if (!p.passport_expiry) errors.passport_expiry = 'Expiry date is required';
        else if (flight && new Date(p.passport_expiry) <= new Date(flight.departure_time)) {
            errors.passport_expiry = 'Passport must be valid after travel date';
        }
        
        return errors;
    };

    const updatePassenger = (index, field, value) => {
        const newPassengers = [...passengers];
        newPassengers[index][field] = value;
        
        if (field === 'dob' && value) {
            const birthDate = new Date(value);
            const age = new Date().getFullYear() - birthDate.getFullYear();
            if (age < 2) {
                newPassengers[index].type = 'Infant';
                newPassengers[index].extra_baggage = 0;
            }
            else if (age < 12) newPassengers[index].type = 'Child';
            else newPassengers[index].type = 'Adult';
        }

        // Real-time validation
        newPassengers[index].errors = validatePassenger(newPassengers[index]);
        setPassengers(newPassengers);
    };

    const handleBlur = (index, field) => {
        const newPassengers = [...passengers];
        if (!newPassengers[index].touched) newPassengers[index].touched = {};
        newPassengers[index].touched[field] = true;
        newPassengers[index].errors = validatePassenger(newPassengers[index]);
        setPassengers(newPassengers);
    };

    const shouldShowError = (p, fieldName) => {
        return p.errors[fieldName] && (submitted || (p.touched && p.touched[fieldName]));
    };

    const isStep1Valid = () => {
        const allFieldsFilled = passengers.every(p => Object.keys(validatePassenger(p)).length === 0);
        const adults = passengers.filter(p => p.type === 'Adult').length;
        const infants = passengers.filter(p => p.type === 'Infant').length;
        
        if (infants > adults) return false;
        return allFieldsFilled;
    };

    const addPassenger = () => {
        if (passengers.length >= 9) return showToast('Maximum 9 passengers allowed', 'warning');
        const newP = {
            type: 'Adult', given_names: '', surnames: '', email: '', phone_number: '',
            nationality: 'Pakistan', gender: 'Male', dob: '', passport_number: '',
            passport_expiry: '', selected_seat: null, extra_baggage: 0, errors: {},
            touched: {}
        };
        setPassengers([...passengers, newP]);
        
        // Auto-scroll logic (simulated with timeout)
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const handleNextStep = () => {
        if (step === 1) {
            if (!isStep1Valid()) {
                setSubmitted(true); // Trigger global validation visibility
                const adults = passengers.filter(p => p.type === 'Adult').length;
                const infants = passengers.filter(p => p.type === 'Infant').length;
                if (infants > adults) showToast('Each infant must be accompanied by an adult.', 'warning');
                else showToast('Please complete all required fields and correct errors in passenger forms.', 'warning');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        }
    };

    const toggleSeat = async (seat) => {
        if (holdingSeats.has(seat.seat_id)) return;

        const occupantIndex = passengers.findIndex(p => p.selected_seat?.seat_id === seat.seat_id);
        const isMine = seat.is_mine || seat.display_status === 'Yours' || occupantIndex !== -1;
        const isBlocked = seat.display_status === 'Booked' || (seat.display_status === 'Held' && !isMine);

        if (isBlocked) {
            return showToast('This seat is temporarily held or already booked', 'error');
        }

        setHoldingSeats(prev => new Set(prev).add(seat.seat_id));

        try {
            if (occupantIndex !== -1) {
                await bookingService.releaseSeat({
                    flight_id: parseInt(flightId, 10),
                    seat_id: seat.seat_id,
                    session_id: sessionId
                });

                const newPassengers = [...passengers];
                newPassengers[occupantIndex].selected_seat = null;
                setPassengers(newPassengers);
                showToast(`Seat ${seat.seat_number} released`, 'info');
            } else {
                const emptyIndex = passengers.findIndex(p => !p.selected_seat && p.type !== 'Infant');
                if (emptyIndex === -1) {
                    showToast(
                        passengers.some(p => p.type === 'Infant')
                            ? 'All seats allocated. Infants do not require separate seats.'
                            : 'All seats allocated. Deselect a seat first to choose another.',
                        'warning'
                    );
                    return;
                }

                await bookingService.holdSeat({
                    flight_id: parseInt(flightId, 10),
                    seat_id: seat.seat_id,
                    session_id: sessionId
                });

                const newPassengers = [...passengers];
                newPassengers[emptyIndex].selected_seat = { ...seat, display_status: 'Yours', is_mine: true };
                setPassengers(newPassengers);
                showToast(`Seat ${seat.seat_number} held for 10 minutes`, 'success');
            }

            await refreshSeats();
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to update seat hold';
            showToast(msg, 'error');
            await refreshSeats().catch(() => {});
        } finally {
            setHoldingSeats(prev => {
                const next = new Set(prev);
                next.delete(seat.seat_id);
                return next;
            });
        }
    };

    const handleFinalBooking = async () => {
        const adultsAndChildren = passengers.filter(p => p.type !== 'Infant');
        const allSeatsPicked = adultsAndChildren.every(p => p.selected_seat);
        if (!allSeatsPicked) return showToast('Please select seats for all passengers (excluding infants)', 'warning');

        setLoading(true);
        try {
            const bookings = [];
            const bookingRef = Math.random().toString(36).substring(2, 8).toUpperCase();

            for (let p of passengers) {
                const passengerData = { ...p, type: p.type };
                const pRes = await passengerService.createPassenger(passengerData);
                
                const extraCost = p.extra_baggage === 10 ? 100 : (p.extra_baggage === 20 ? 180 : 0);
                await baggageService.addBaggage({
                    passenger_id: pRes.data.passenger_id,
                    weight: (p.type === 'Adult' ? 20 : (p.type === 'Child' ? 15 : 0)) + p.extra_baggage,
                    cost: extraCost
                });

                const bRes = await bookingService.createBooking({
                    passenger_id: pRes.data.passenger_id,
                    flight_id: parseInt(flightId),
                    seat_id: p.selected_seat ? p.selected_seat.seat_id : null,
                    booking_reference: bookingRef
                });
                bookings.push(bRes.data);
            }

            const totals = calculateTotals();
            bookingCompleteRef.current = true;
            navigate('/payment', { state: { bookings, amount: totals.total, travelers: passengers.length, reference: bookingRef } });
        } catch (err) {
            console.error(err);
            showToast('Booking failed.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !flight) return <div className="container">Loading flight details...</div>;

    const totals = calculateTotals();

    const getBaggageAllowance = (type) => {
        if (type === 'Adult') return 20;
        if (type === 'Child') return 15;
        return 0;
    };

    return (
        <div className="container" style={{ maxWidth: '1100px' }}>
            {/* 1. Flight Summary Header */}
            {flight && (
                <div className="summary-card">
                    <div className="flight-info-grid">
                        <div className="info-item">
                            <label>Airline</label>
                            <span>{flight.airline_name}</span>
                        </div>
                        <div className="info-item">
                            <label>Route</label>
                            <span>{flight.departure_city} ➔ {flight.arrival_city}</span>
                        </div>
                        <div className="info-item">
                            <label>Departure</label>
                            <span>{new Date(flight.departure_time).toLocaleDateString()} at {new Date(flight.departure_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="info-item">
                            <label>Class</label>
                            <span className="badge badge-primary">{selectedClass}</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', borderLeft: '1px solid #ddd', paddingLeft: '30px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888' }}>Total Price</label>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>${totals.total}</div>
                    </div>
                </div>
            )}

            {/* 2. Step Indicator */}
            <div className="step-indicator-container">
                {[
                    { n: 1, label: 'Passengers' },
                    { n: 2, label: 'Baggage' },
                    { n: 3, label: 'Seats' }
                ].map(s => (
                    <div key={s.n} className="step-item" style={{ opacity: step === s.n ? 1 : 0.4 }}>
                        <div className="step-number" style={{ background: step >= s.n ? 'var(--primary)' : '#ddd', color: 'white' }}>{s.n}</div>
                        <div className="step-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px', alignItems: 'start' }}>
                {/* Main Content */}
                <div className="card" style={{ padding: '30px' }}>
                    {step === 1 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h2 style={{ margin: 0 }}>Passenger Details</h2>
                                <button className="btn" onClick={addPassenger} disabled={passengers.length >= 9} style={{ background: '#f0f0f0', color: 'var(--primary)', border: '1px solid var(--primary)', fontSize: '12px' }}>
                                    + Add Traveler
                                </button>
                            </div>
                                                       {passengers.map((p, index) => {
                                const hasShownErrors = Object.keys(p.errors).some(field => shouldShowError(p, field));
                                return (
                                    <div key={index} style={{ marginBottom: '30px', padding: '25px', border: `1px solid ${hasShownErrors ? 'var(--error)' : 'var(--border)'}`, borderRadius: '12px', boxShadow: hasShownErrors ? '0 0 5px rgba(164, 38, 44, 0.2)' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h3 style={{ margin: 0, color: 'var(--primary)' }}>
                                                Traveler {index + 1} 
                                                <span className={`badge ${p.type === 'Adult' ? 'badge-primary' : 'badge-success'}`} style={{ marginLeft: '10px' }}>{p.type}</span>
                                            </h3>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {index > 0 && (
                                                    <button className="btn" onClick={() => {
                                                        const prev = passengers[index-1];
                                                        updatePassenger(index, 'surnames', prev.surnames);
                                                        updatePassenger(index, 'nationality', prev.nationality);
                                                    }} style={{ fontSize: '11px', background: '#f0f0f0' }}>Copy from P{index}</button>
                                                )}
                                                {passengers.length > 1 && (
                                                    <button className="btn" onClick={() => {
                                                        const newP = [...passengers];
                                                        newP.splice(index, 1);
                                                        setPassengers(newP);
                                                    }} style={{ fontSize: '11px', background: '#fee', color: 'var(--error)' }}>Remove</button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>First Name (as in passport)</label>
                                                <input 
                                                    type="text" 
                                                    value={p.given_names} 
                                                    onChange={e => updatePassenger(index, 'given_names', e.target.value)} 
                                                    onBlur={() => handleBlur(index, 'given_names')}
                                                    placeholder="e.g. JOHN"
                                                    style={{ borderColor: shouldShowError(p, 'given_names') ? 'var(--error)' : 'var(--border)' }}
                                                />
                                                {shouldShowError(p, 'given_names') && <div className="validation-error">{p.errors.given_names}</div>}
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>Last Name (as in passport)</label>
                                                <input 
                                                    type="text" 
                                                    value={p.surnames} 
                                                    onChange={e => updatePassenger(index, 'surnames', e.target.value)} 
                                                    onBlur={() => handleBlur(index, 'surnames')}
                                                    placeholder="e.g. DOE"
                                                    style={{ borderColor: shouldShowError(p, 'surnames') ? 'var(--error)' : 'var(--border)' }}
                                                />
                                                {shouldShowError(p, 'surnames') && <div className="validation-error">{p.errors.surnames}</div>}
                                            </div>
                                        </div>
     
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>Date of Birth</label>
                                                <input 
                                                    type="date" 
                                                    value={p.dob} 
                                                    onChange={e => updatePassenger(index, 'dob', e.target.value)}
                                                    onBlur={() => handleBlur(index, 'dob')}
                                                    style={{ borderColor: shouldShowError(p, 'dob') ? 'var(--error)' : 'var(--border)' }}
                                                />
                                                {shouldShowError(p, 'dob') && <div className="validation-error">{p.errors.dob}</div>}
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>Gender</label>
                                                <select value={p.gender} onChange={e => updatePassenger(index, 'gender', e.target.value)}>
                                                    <option>Male</option><option>Female</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>Nationality</label>
                                                <select value={p.nationality} onChange={e => updatePassenger(index, 'nationality', e.target.value)}>
                                                    <option>Pakistan</option><option>UK</option><option>USA</option><option>Canada</option>
                                                </select>
                                            </div>
                                        </div>
     
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>Passport Number</label>
                                                <input 
                                                    type="text" 
                                                    value={p.passport_number} 
                                                    onChange={e => updatePassenger(index, 'passport_number', e.target.value)} 
                                                    onBlur={() => handleBlur(index, 'passport_number')}
                                                    placeholder="e.g. AB1234567"
                                                    style={{ borderColor: shouldShowError(p, 'passport_number') ? 'var(--error)' : 'var(--border)' }}
                                                />
                                                {shouldShowError(p, 'passport_number') && <div className="validation-error">{p.errors.passport_number}</div>}
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>Passport Expiry Date</label>
                                                <input 
                                                    type="date" 
                                                    value={p.passport_expiry} 
                                                    onChange={e => updatePassenger(index, 'passport_expiry', e.target.value)}
                                                    onBlur={() => handleBlur(index, 'passport_expiry')}
                                                    style={{ borderColor: shouldShowError(p, 'passport_expiry') ? 'var(--error)' : 'var(--border)' }}
                                                />
                                                {shouldShowError(p, 'passport_expiry') && <div className="validation-error">{p.errors.passport_expiry}</div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
 
                            <button 
                                className="btn btn-primary" 
                                style={{ width: '100%', padding: '15px', opacity: isStep1Valid() ? 1 : 0.7 }} 
                                onClick={handleNextStep}
                            >
                                Continue to Baggage
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h2>Baggage Selection</h2>
                                <button className="btn" onClick={() => setStep(1)} style={{ background: '#eee' }}>Back</button>
                            </div>

                            <div style={{ padding: '20px', background: '#fff9c4', borderRadius: '12px', marginBottom: '30px', border: '1px solid #fbc02d' }}>
                                <h4 style={{ margin: 0, color: '#f57f17' }}>⚠️ Baggage Policy</h4>
                                <p style={{ margin: '5px 0 0', fontSize: '13px' }}>Adults: 20kg included. Children: 15kg included. Infants: 0kg. Max total weight allowed: 40kg.</p>
                            </div>

                            {passengers.map((p, index) => {
                                const allowance = getBaggageAllowance(p.type);
                                return (
                                    <div key={index} style={{ marginBottom: '25px', padding: '25px', border: '1px solid #eee', borderRadius: '12px', background: p.type === 'Infant' ? '#f5f5f5' : '#fff' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <div>
                                                <h4 style={{ margin: 0 }}>{p.given_names || `Traveler ${index + 1}`} <span className="badge badge-primary" style={{ fontSize: '10px' }}>{p.type}</span></h4>
                                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Included Allowance: <strong>{allowance}kg</strong></span>
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>
                                                Total: {allowance + p.extra_baggage}kg
                                            </div>
                                        </div>
                                        
                                        {p.type !== 'Infant' ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                                <div 
                                                    onClick={() => updatePassenger(index, 'extra_baggage', 0)}
                                                    style={{ padding: '15px', border: '2px solid', borderColor: p.extra_baggage === 0 ? 'var(--primary)' : '#eee', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', background: p.extra_baggage === 0 ? '#e3f2fd' : '#fff' }}
                                                >
                                                    <div style={{ fontWeight: 'bold' }}>Standard</div>
                                                    <div style={{ fontSize: '12px' }}>$0</div>
                                                </div>
                                                <div 
                                                    onClick={() => updatePassenger(index, 'extra_baggage', 10)}
                                                    style={{ padding: '15px', border: '2px solid', borderColor: p.extra_baggage === 10 ? 'var(--primary)' : '#eee', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', background: p.extra_baggage === 10 ? '#e3f2fd' : '#fff' }}
                                                >
                                                    <div style={{ fontWeight: 'bold' }}>+10 kg</div>
                                                    <div style={{ fontSize: '12px' }}>$100</div>
                                                </div>
                                                <div 
                                                    onClick={() => updatePassenger(index, 'extra_baggage', 20)}
                                                    style={{ padding: '15px', border: '2px solid', borderColor: p.extra_baggage === 20 ? 'var(--primary)' : '#eee', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', background: p.extra_baggage === 20 ? '#e3f2fd' : '#fff' }}
                                                >
                                                    <div style={{ fontWeight: 'bold' }}>+20 kg</div>
                                                    <div style={{ fontSize: '12px' }}>$180</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                                                Infants are not eligible for extra baggage selection.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button className="btn btn-primary" style={{ width: '100%', padding: '15px', marginTop: '20px' }} onClick={handleNextStep}>Proceed to Seat Selection</button>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2>Select Seats</h2>
                                <button className="btn" onClick={() => setStep(2)} style={{ background: '#eee' }}>Back</button>
                            </div>

                            {holdTimer && (
                                <div style={{
                                    background: '#e3f2fd',
                                    border: '1px solid #90caf9',
                                    borderRadius: '8px',
                                    padding: '10px 15px',
                                    marginBottom: '15px',
                                    fontSize: '13px',
                                    color: '#1565c0'
                                }}>
                                    Your seat hold expires at {holdTimer.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                                    Click a selected seat again to release it.
                                </div>
                            )}
                            
                            <div style={{ background: '#333', color: '#fff', padding: '8px', textAlign: 'center', borderRadius: '4px', marginBottom: '20px', fontSize: '10px', letterSpacing: '4px' }}>AIRCRAFT FRONT</div>
                            
                            {/* Seat Status Legend Key */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                gap: '10px', 
                                background: '#f8f9fa', 
                                padding: '12px 15px', 
                                borderRadius: '12px', 
                                border: '1px solid #eee',
                                marginBottom: '25px',
                                fontSize: '12px',
                                fontWeight: '500'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', border: '2px solid var(--success)', background: 'transparent' }}></div>
                                    <span style={{ color: '#444' }}>Available</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--primary)', border: '1px solid var(--primary)' }}></div>
                                    <span style={{ color: '#444' }}>Your Choice</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#e3f2fd', border: '1px solid var(--primary)' }}></div>
                                    <span style={{ color: '#444' }}>Your Hold</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#fff4ce', border: '1px solid #fce100' }}></div>
                                    <span style={{ color: '#444' }}>On Hold</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#f3f2f1', border: '1px solid #ddd' }}></div>
                                    <span style={{ color: '#888' }}>Booked</span>
                                </div>
                            </div>

                            <div className="seat-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', maxWidth: '400px', margin: '0 auto' }}>
                                {seats.map(s => {
                                    const occupantIndex = passengers.findIndex(p => p.selected_seat?.seat_id === s.seat_id);
                                    const isSelected = occupantIndex !== -1;
                                    const isPending = holdingSeats.has(s.seat_id);
                                    let seatClassName = s.display_status.toLowerCase();
                                    if (isSelected) seatClassName = 'selected';
                                    else if (s.is_mine || s.display_status === 'Yours') seatClassName = 'yours';

                                    return (
                                        <div 
                                            key={s.seat_id} 
                                            className={`seat ${seatClassName}${isPending ? ' pending' : ''}`}
                                            onClick={() => toggleSeat(s)}
                                            title={
                                                isSelected ? 'Click to release this seat' :
                                                s.display_status === 'Held' ? 'Held by another passenger' :
                                                s.display_status === 'Booked' ? 'Already booked' :
                                                'Click to select'
                                            }
                                            style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                                        >
                                            {s.seat_number}
                                        </div>
                                    );
                                })}
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%', padding: '15px', marginTop: '40px' }} onClick={handleFinalBooking}>Confirm Booking</button>
                        </div>
                    )}
                </div>

                {/* Sidebar: Price Breakdown */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Price Summary</h3>
                    <div className="price-breakdown">
                        <div className="price-row">
                            <span>Base Fare ({passengers.length} px)</span>
                            <span>${totals.base}</span>
                        </div>
                        <div className="price-row">
                            <span>Baggage Fees</span>
                            <span>${totals.baggage}</span>
                        </div>
                        <div className="price-row">
                            <span>Taxes & Fees (15%)</span>
                            <span>${totals.taxes}</span>
                        </div>
                        <div className="price-row total">
                            <span>Total (USD)</span>
                            <span>${totals.total}</span>
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
                        * Prices are inclusive of all fuel surcharges and government taxes.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeatPage;
