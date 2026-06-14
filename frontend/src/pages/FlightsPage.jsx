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
    const [sortBy, setSortBy] = useState('cheapest'); // cheapest, fastest, earliest
    const [maxPrice, setMaxPrice] = useState(1000);

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

    const calculatePrice = (f) => {
        let base = 150;
        if (f.airline_name.includes('PIA')) base = 140;
        else if (f.airline_name.includes('Airblue')) base = 130;
        else if (f.airline_name.includes('Serene')) base = 180;
        else if (f.airline_name.includes('AirSial')) base = 160;
        else if (f.airline_name.includes('Emirates')) base = 400;
        base += (f.flight_id % 7) * 15;
        const multiplier = seatClass === 'First' ? 3 : (seatClass === 'Business' ? 2 : 1);
        return base * multiplier;
    };

    const getProcessedFlights = (flightList) => {
        let processed = flightList.map(f => {
            const price = calculatePrice(f);
            const dep = new Date(f.departure_time);
            const arr = new Date(f.arrival_time);
            const durationMinutes = (arr - dep) / (1000 * 60);
            return { ...f, finalPrice: price, durationMinutes };
        });

        // Filter by price
        processed = processed.filter(f => f.finalPrice <= maxPrice);

        // Sort
        if (sortBy === 'cheapest') {
            processed.sort((a, b) => a.finalPrice - b.finalPrice);
        } else if (sortBy === 'fastest') {
            processed.sort((a, b) => a.durationMinutes - b.durationMinutes);
        } else if (sortBy === 'earliest') {
            processed.sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));
        }

        return processed;
    };

    const processedFlights = getProcessedFlights(flights);
    const minPrice = processedFlights.length > 0 ? Math.min(...processedFlights.map(f => f.finalPrice)) : 0;

    return (
        <div className="container" style={{ maxWidth: '98%', marginTop: '10px' }}>
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
                        <option key={index} value={`${airport.city} - ${airport.name}${airport.iata_code ? ` (${airport.iata_code})` : ''}`} />
                    ))}
                </datalist>
            </div>

            <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                {/* Left Side: Filters */}
                <div style={{ flex: '0 0 280px' }}>
                    <div className="card" style={{ padding: '20px' }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Filters</h3>
                        
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Price Range</h4>
                            <input type="range" min="0" max="2000" step="50" value={maxPrice} onChange={(e) => setMaxPrice(parseInt(e.target.value))} style={{ width: '100%' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span>$0</span>
                                <span>Max: ${maxPrice}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Stops</h4>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                                <input type="checkbox" defaultChecked /> Non-stop
                            </label>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                                <input type="checkbox" /> 1 Stop
                            </label>
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Airlines</h4>
                            {['PIA', 'Airblue', 'Serene Air', 'AirSial', 'Emirates'].map(airline => (
                                <label key={airline} style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                                    <input type="checkbox" defaultChecked /> {airline}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Flights */}
                <div style={{ flex: 1 }}>
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div className="spinner"></div>
                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Finding the best flights...</div>
                        </div>
                    )}
                    {error && <div className="error-msg">{error}</div>}

                    {!loading && flights.length > 0 && (
                        <div>
                            {/* Sort Tabs */}
                            <div style={{ display: 'flex', background: '#fff', border: '1px solid #eee', borderRadius: '8px', marginBottom: '20px', overflow: 'hidden' }}>
                                <button onClick={() => setSortBy('cheapest')} style={{ flex: 1, padding: '12px', border: 'none', background: sortBy === 'cheapest' ? '#e3f2fd' : '#fff', color: sortBy === 'cheapest' ? 'var(--primary)' : '#666', borderBottom: sortBy === 'cheapest' ? '3px solid var(--primary)' : 'none', cursor: 'pointer', fontWeight: 'bold' }}>Cheapest</button>
                                <button onClick={() => setSortBy('fastest')} style={{ flex: 1, padding: '12px', border: 'none', background: sortBy === 'fastest' ? '#e3f2fd' : '#fff', color: sortBy === 'fastest' ? 'var(--primary)' : '#666', borderBottom: sortBy === 'fastest' ? '3px solid var(--primary)' : 'none', cursor: 'pointer', fontWeight: 'bold' }}>Fastest</button>
                                <button onClick={() => setSortBy('earliest')} style={{ flex: 1, padding: '12px', border: 'none', background: sortBy === 'earliest' ? '#e3f2fd' : '#fff', color: sortBy === 'earliest' ? 'var(--primary)' : '#666', borderBottom: sortBy === 'earliest' ? '3px solid var(--primary)' : 'none', cursor: 'pointer', fontWeight: 'bold' }}>Earliest</button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0 }}>Outbound Flights</h3>
                                <span style={{ fontSize: '14px', color: '#666' }}>{processedFlights.length} flights matching filters</span>
                            </div>

                            {processedFlights.map((f) => (
                                <div className="card" key={f.flight_id} style={{ marginBottom: '15px', padding: '25px', display: 'grid', gridTemplateColumns: '1.5fr 3fr 1fr 1.5fr', alignItems: 'center', gap: '20px', border: f.finalPrice === minPrice ? '2px solid var(--success)' : '1px solid #eee', position: 'relative' }}>
                                    {f.finalPrice === minPrice && (
                                        <div style={{ position: 'absolute', top: '-12px', left: '20px', background: 'var(--success)', color: 'white', padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>CHEAPEST</div>
                                    )}
                                    
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--primary)' }}>{f.airline_name}</div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>Flight {f.flight_id + 1000}</div>
                                        <div style={{ marginTop: '10px' }}>
                                            {f.available_seats < 5 ? (
                                                <span style={{ fontSize: '11px', color: 'var(--error)', fontWeight: 'bold' }}>Only {f.available_seats} seats left!</span>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: 'var(--success)' }}>{f.available_seats} seats available</span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{new Date(f.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            <div style={{ fontSize: '13px', color: '#666' }}>{f.departure_city}</div>
                                        </div>
                                        <div style={{ flex: 1, padding: '0 20px' }}>
                                            <div style={{ fontSize: '11px', color: '#888' }}>{Math.floor(f.durationMinutes/60)}h {Math.round(f.durationMinutes%60)}m</div>
                                            <div style={{ height: '2px', background: '#eee', margin: '5px 0', position: 'relative' }}>
                                                <div style={{ position: 'absolute', right: 0, top: '-4px' }}>✈️</div>
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'bold' }}>Direct</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{new Date(f.arrival_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            <div style={{ fontSize: '13px', color: '#666' }}>{f.arrival_city}</div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>${f.finalPrice}</div>
                                        <div style={{ fontSize: '11px', color: '#888' }}>per traveler</div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <button className="btn btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '8px' }} onClick={() => navigate(`/seats/${f.flight_id}?class=${seatClass}&travelers=${travelers}`)}>
                                            Select Flight
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {processedFlights.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No flights match your filters. Try adjusting the price range.</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FlightsPage;
