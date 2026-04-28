import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import FlightsPage from './pages/FlightsPage';
import SeatPage from './pages/SeatPage';
import PaymentPage from './pages/PaymentPage';
import './styles/App.css';

function App() {
  return (
    <Router>
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="logo">✈️ SkyLink</Link>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-dark)' }}>Home</Link>
            <span style={{ color: 'var(--text-muted)' }}>University Project</span>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/flights" element={<FlightsPage />} />
        <Route path="/seats/:flightId" element={<SeatPage />} />
        <Route path="/payment" element={<PaymentPage />} />
      </Routes>

      <footer style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
        &copy; 2026 SkyLink Airline System - Built with React & Node.js
      </footer>
    </Router>
  );
}

export default App;
