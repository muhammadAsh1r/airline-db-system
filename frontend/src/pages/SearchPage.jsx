import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { flightService, airportService } from '../services/api';
import { useToast } from '../context/ToastContext';

const SearchPage = () => {
    const today = new Date().toISOString().split('T')[0];
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [departureDate, setDepartureDate] = useState(today);
    const [returnDate, setReturnDate] = useState('');
    const [isRoundTrip, setIsRoundTrip] = useState(false);
    const [seatClass, setSeatClass] = useState('Economy');
    
    // Detailed Travelers
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [infants, setInfants] = useState(0);
    
    const [airports, setAirports] = useState([]);
    
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        const fetchAirports = async () => {
            try {
                console.log('Fetching airports from backend...');
                const response = await airportService.getAirports();
                console.log('Airports received:', response.data);
                setAirports(response.data);
            } catch (err) {
                console.error('Failed to fetch airports:', err);
                setError('Could not load airports. Please ensure the backend is running.');
            }
        };
        fetchAirports();
    }, []);
    const [error, setError] = useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        
        if (from === to) {
            return setError('Origin and Destination cannot be the same.');
        }

        if (infants > adults) {
            return setError('Number of infants cannot exceed number of adults.');
        }

        if (adults + children + infants > 9) {
            return setError('Maximum 9 travelers allowed per booking.');
        }

        const cleanFrom = from.split(' - ')[0];
        const cleanTo = to.split(' - ')[0];

        const params = new URLSearchParams({
            from: cleanFrom,
            to: cleanTo,
            date: departureDate,
            class: seatClass,
            adults,
            children,
            infants,
            travelers: adults + children + infants,
            roundTrip: isRoundTrip,
            returnDate: isRoundTrip ? returnDate : ''
        });
        navigate(`/flights?${params.toString()}`);
    };

    const swapCities = () => {
        const temp = from;
        setFrom(to);
        setTo(temp);
    };

    return (
        <div className="container">
            <div className="card">
                <h2>Plan Your Trip</h2>
                
                {/* Trip Type Toggle */}
                <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input type="radio" checked={!isRoundTrip} onChange={() => setIsRoundTrip(false)} /> One Way
                    </label>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input type="radio" checked={isRoundTrip} onChange={() => setIsRoundTrip(true)} /> Round Trip
                    </label>
                </div>

                <form onSubmit={handleSearch}>
                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'end' }}>
                        <div>
                            <label>From</label>
                            <input 
                                type="text" 
                                value={from} 
                                onChange={(e) => setFrom(e.target.value)} 
                                placeholder="Origin City" 
                                list="airport-suggestions"
                                required 
                            />
                        </div>
                        <button type="button" onClick={swapCities} className="swap-btn" style={{ marginBottom: '5px' }}>⇌</button>
                        <div>
                            <label>To</label>
                            <input 
                                type="text" 
                                value={to} 
                                onChange={(e) => setTo(e.target.value)} 
                                placeholder="Destination City" 
                                list="airport-suggestions"
                                required 
                            />
                        </div>
                        
                        <datalist id="airport-suggestions">
                            {airports.map((airport, index) => (
                                <option key={index} value={`${airport.city} - ${airport.name}${airport.iata_code ? ` (${airport.iata_code})` : ''}`} />
                            ))}
                        </datalist>
                    </div>

                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: isRoundTrip ? '1fr 1fr' : '1fr', gap: '20px' }}>
                        <div>
                            <label>Departure Date</label>
                            <input 
                                type="date" 
                                value={departureDate} 
                                min={today}
                                onChange={(e) => setDepartureDate(e.target.value)} 
                                required 
                            />
                        </div>
                        {isRoundTrip && (
                            <div>
                                <label>Return Date</label>
                                <input 
                                    type="date" 
                                    value={returnDate} 
                                    min={departureDate}
                                    onChange={(e) => setReturnDate(e.target.value)} 
                                    required 
                                />
                            </div>
                        )}
                    </div>

                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                        <div>
                            <label>Travelers</label>
                            <div className="traveler-selector" style={{ display: 'flex', gap: '10px', background: '#f5f5f5', padding: '10px', borderRadius: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '11px', display: 'block', color: '#666' }}>Adults</span>
                                    <input type="number" min="1" max="9" value={adults} onChange={(e) => setAdults(parseInt(e.target.value))} style={{ width: '100%', padding: '5px' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '11px', display: 'block', color: '#666' }}>Children</span>
                                    <input type="number" min="0" max="9" value={children} onChange={(e) => setChildren(parseInt(e.target.value))} style={{ width: '100%', padding: '5px' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '11px', display: 'block', color: '#666' }}>Infants</span>
                                    <input type="number" min="0" max="9" value={infants} onChange={(e) => setInfants(parseInt(e.target.value))} style={{ width: '100%', padding: '5px' }} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label>Class</label>
                            <select value={seatClass} onChange={(e) => setSeatClass(e.target.value)} style={{ padding: '12px' }}>
                                <option value="Economy">Economy</option>
                                <option value="Business">Business</option>
                                <option value="First">First</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                        {loading ? 'Searching...' : 'Search Flights'}
                    </button>
                </form>
            {error && <p className="error-msg" style={{ marginTop: '15px', textAlign: 'center' }}>{error}</p>}
            
            {/* Retrieve Booking Feature */}
            <div className="card" style={{ marginTop: '30px', background: 'linear-gradient(to right, #f8f9fa, #ffffff)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>Already have a booking?</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Enter your PNR to view or print your ticket.</p>
                    </div>
                    <span style={{ fontSize: '30px' }}>📄</span>
                </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                    <input 
                        type="text" 
                        placeholder="Enter PNR (e.g. SL-123456)" 
                        style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}
                        id="retrieve-pnr"
                    />
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            const pnr = document.getElementById('retrieve-pnr').value.trim();
                            if (pnr) navigate(`/ticket/${pnr.toUpperCase()}`);
                            else showToast('Please enter a PNR code', 'warning');
                        }}
                    >
                        Retrieve Ticket
                    </button>
                </div>
            </div>
        </div>
    </div>
);
};

export default SearchPage;
