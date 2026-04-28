import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { flightService, airportService } from '../services/api';

const FlightsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    
    const from = queryParams.get('from');
    const to = queryParams.get('to');
    const date = queryParams.get('date');
    const seatClass = queryParams.get('class') || 'Economy';
    const travelers = queryParams.get('travelers') || 1;
    const isRoundTrip = queryParams.get('roundTrip') === 'true';
    const returnDate = queryParams.get('returnDate');

    const [flights, setFlights] = useState([]);
    const [returnFlights, setReturnFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [airports, setAirports] = useState([]);

    // Local state for the search bar inputs
    const [fromCity, setFromCity] = useState(from || '');
    const [toCity, setToCity] = useState(to || '');
    const [depDate, setDepDate] = useState(date || '');
    const [sClass, setSClass] = useState(seatClass || 'Economy');

    useEffect(() => {
        const fetchAirports = async () => {
            try {
                const response = await airportService.getAirports();
                setAirports(response.data);
            } catch (err) {
                console.error('Failed to fetch airports:', err);
            }
        };
        fetchAirports();
    }, []);

    const handleUpdateSearch = (e) => {
        e.preventDefault();
        const cleanFrom = fromCity.split(' - ')[0];
        const cleanTo = toCity.split(' - ')[0];
        
        const params = new URLSearchParams({
            from: cleanFrom,
            to: cleanTo,
            date: depDate,
            class: sClass,
            travelers: travelers,
            roundTrip: isRoundTrip,
            returnDate: isRoundTrip ? returnDate : ''
        });
        navigate(`/flights?${params.toString()}`);
    };

    useEffect(() => {
        const fetchFlights = async () => {
            setLoading(true);
            try {
                const res = await flightService.searchFlights(from, to, date, seatClass);
                setFlights(res.data);

                if (isRoundTrip && returnDate) {
                    const resReturn = await flightService.searchFlights(to, from, returnDate, seatClass);
                    setReturnFlights(resReturn.data);
                }

                if (res.data.length === 0) setError('No outbound flights found.');
            } catch (err) {
                setError('Failed to fetch flights. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (from && to && date) {
            fetchFlights();
        } else {
            setError('Missing search parameters.');
            setLoading(false);
        }
    }, [from, to, date, seatClass, isRoundTrip, returnDate]);

    return (
        <div className="container" style={{ maxWidth: '98%', marginTop: '40px' }}>
            <div className="card" style={{ padding: '20px', marginBottom: '30px', background: '#f8f9fa' }}>
                <form onSubmit={handleUpdateSearch} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr', gap: '15px', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>From</label>
                        <input type="text" value={fromCity} onChange={(e) => setFromCity(e.target.value)} list="airport-suggestions" required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>To</label>
                        <input type="text" value={toCity} onChange={(e) => setToCity(e.target.value)} list="airport-suggestions" required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>Departure</label>
                        <input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>Class</label>
                        <select value={sClass} onChange={(e) => setSClass(e.target.value)}>
                            <option value="Economy">Economy</option>
                            <option value="Business">Business</option>
                            <option value="First">First</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary">Update</button>
                </form>

                <datalist id="airport-suggestions">
                    {airports.map((airport, index) => (
                        <option key={index} value={`${airport.city} - ${airport.name}`} />
                    ))}
                </datalist>
            </div>

            <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                {/* Left Side: Filters (30%) */}
                <div style={{ flex: '0 0 280px' }}>
                    <div className="card" style={{ padding: '20px' }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Filters</h3>
                        
                        {/* Stops */}
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Stops</h4>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="checkbox" defaultChecked /> Non-stop
                            </label>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="checkbox" /> 1 Stop
                            </label>
                        </div>

                        {/* Baggage */}
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Baggage</h4>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="checkbox" /> Checked Baggage Included
                            </label>
                        </div>

                        {/* Departure Time */}
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Departure Time</h4>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="checkbox" defaultChecked /> Morning (06:00 - 12:00)
                            </label>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="checkbox" defaultChecked /> Afternoon (12:00 - 18:00)
                            </label>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="checkbox" defaultChecked /> Evening (18:00 - 00:00)
                            </label>
                        </div>

                        {/* Trip Duration */}
                        <div style={{ marginBottom: '10px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Max Trip Duration</h4>
                            <input type="range" min="1" max="24" defaultValue="12" style={{ width: '100%' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span>1h</span>
                                <span>24h+</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Flights (70%) */}
                <div style={{ flex: 1 }}>
                    {loading && <div style={{ textAlign: 'center', padding: '40px' }} className="card">Searching for best flights...</div>}
                    {error && <div className="error-msg" style={{ marginTop: '0' }}>{error}</div>}

                    {/* Outbound Flights */}
                    {!loading && flights.length > 0 && (
                        <div style={{ marginTop: '0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0 }}>Outbound Flights</h3>
                                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{flights.length} flights found</span>
                            </div>

                            {flights.map((f) => (
                                <div className="card" key={f.flight_id} style={{ marginBottom: '15px', padding: '20px', display: 'grid', gridTemplateColumns: '1.5fr 3fr 1fr 1.5fr', alignItems: 'center', gap: '20px' }}>
                                    {/* Airline */}
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--primary)' }}>{f.airline_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Flight #{f.flight_id + 100}</div>
                                    </div>

                                    {/* Timeline */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{new Date(f.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{f.departure_city}</div>
                                        </div>
                                        
                                        <div style={{ flex: 1, position: 'relative', padding: '0 20px' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>2h 15m</div>
                                            <div style={{ height: '2px', background: '#ddd', position: 'relative' }}>
                                                <div style={{ position: 'absolute', right: 0, top: '-4px' }}>✈️</div>
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '5px', fontWeight: '600' }}>Direct</div>
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{new Date(f.arrival_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{f.arrival_city}</div>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>$250</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>per traveler</div>
                                    </div>

                                    {/* Action */}
                                    <div style={{ textAlign: 'right' }}>
                                        <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => navigate(`/seats/${f.flight_id}?class=${seatClass}&travelers=${travelers}`)}>
                                            Select Seat
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Return Flights (Same Card Design) */}
                    {!loading && isRoundTrip && returnFlights.length > 0 && (
                        <div style={{ marginTop: '40px' }}>
                            <h3 style={{ marginBottom: '15px' }}>Return Flights ({to} ➔ {from})</h3>
                            {returnFlights.map((f) => (
                                <div className="card" key={f.flight_id} style={{ marginBottom: '15px', padding: '20px', display: 'grid', gridTemplateColumns: '1.5fr 3fr 1fr 1.5fr', alignItems: 'center', gap: '20px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--primary)' }}>{f.airline_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Flight #{f.flight_id + 100}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{new Date(f.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{f.departure_city}</div>
                                        </div>
                                        <div style={{ flex: 1, padding: '0 20px' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>2h 15m</div>
                                            <div style={{ height: '2px', background: '#ddd', margin: '5px 0' }}></div>
                                            <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>Direct</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{new Date(f.arrival_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{f.arrival_city}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>$250</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => navigate(`/seats/${f.flight_id}?class=${seatClass}&travelers=${travelers}`)}>
                                            Select Seat
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FlightsPage;
