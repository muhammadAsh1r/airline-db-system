import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { flightService, airportService } from '../services/api';

const SearchPage = () => {
    const [from, setFrom] = useState('Karachi');
    const [to, setTo] = useState('Lahore');
    const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0]);
    const [returnDate, setReturnDate] = useState('');
    const [isRoundTrip, setIsRoundTrip] = useState(false);
    const [seatClass, setSeatClass] = useState('Economy');
    const [travelers, setTravelers] = useState(1);
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
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        
        // If the user selected "Karachi - Jinnah International", 
        // we just want "Karachi" for the database search.
        const cleanFrom = from.split(' - ')[0];
        const cleanTo = to.split(' - ')[0];

        const params = new URLSearchParams({
            from: cleanFrom,
            to: cleanTo,
            date: departureDate,
            class: seatClass,
            travelers,
            roundTrip: isRoundTrip,
            returnDate: isRoundTrip ? returnDate : ''
        });
        navigate(`/flights?${params.toString()}`);
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
                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label>From</label>
                            <input 
                                type="text" 
                                value={from} 
                                onChange={(e) => setFrom(e.target.value)} 
                                placeholder="Departure City" 
                                list="airport-suggestions"
                                required 
                            />
                        </div>
                        <div>
                            <label>To</label>
                            <input 
                                type="text" 
                                value={to} 
                                onChange={(e) => setTo(e.target.value)} 
                                placeholder="Arrival City" 
                                list="airport-suggestions"
                                required 
                            />
                        </div>
                        
                        <datalist id="airport-suggestions">
                            {airports.map((airport, index) => (
                                <option key={index} value={`${airport.city} - ${airport.name}`} />
                            ))}
                        </datalist>
                    </div>

                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: isRoundTrip ? '1fr 1fr' : '1fr', gap: '20px' }}>
                        <div>
                            <label>Departure Date</label>
                            <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} required />
                        </div>
                        {isRoundTrip && (
                            <div>
                                <label>Return Date</label>
                                <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} required />
                            </div>
                        )}
                    </div>

                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label>Travelers</label>
                            <input type="number" min="1" max="10" value={travelers} onChange={(e) => setTravelers(e.target.value)} />
                        </div>
                        <div>
                            <label>Class</label>
                            <select value={seatClass} onChange={(e) => setSeatClass(e.target.value)}>
                                <option value="Economy">Economy</option>
                                <option value="Premium Economy">Premium Economy</option>
                                <option value="Business">Business</option>
                                <option value="First">First</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                        {loading ? 'Searching...' : 'Search Flights'}
                    </button>
                </form>
                {error && <p className="error-msg">{error}</p>}
            </div>
        </div>
    );
};

export default SearchPage;
