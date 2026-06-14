import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import FlightsPage from './pages/FlightsPage';
import SeatPage from './pages/SeatPage';
import PaymentPage from './pages/PaymentPage';
import TicketPage from './pages/TicketPage';
import LogsPage from './pages/LogsPage';
import { ToastProvider } from './context/ToastContext';
import './styles/App.css';

function App() {
  return (
    <Router>
      <ToastProvider>
        <header className="navbar">
          <div className="nav-container">
            <Link to="/" className="logo">SkyLink</Link>
            <nav className="nav-links">
              <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Search</NavLink>
              <NavLink to="/flights" className={({ isActive }) => isActive ? 'active' : ''}>Status</NavLink>
              <NavLink to="/logs" className={({ isActive }) => isActive ? 'logs-btn active' : 'logs-btn'}>📊 Logs & Analytics</NavLink>
            </nav>
          </div>
        </header>


        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/flights" element={<FlightsPage />} />
          <Route path="/seats/:flightId" element={<SeatPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/ticket/:reference" element={<TicketPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </ToastProvider>


      <footer style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
        &copy; 2026 SkyLink Airline System - Built with React & Node.js
      </footer>
    </Router>
  );
}

export default App;
