import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Friends from './pages/Friends';
import WatchParty from './pages/WatchParty';
import socket from './socket';

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div style = {
        { minHeight: '100vh', background: '#0a0a12' } }
    />;
    return user ? children : < Navigate to = "/login" / > ;
}

function AppRoutes() {
    const { user } = useAuth();

    useEffect(function() {
        if (!user) return;
        // ✅ user.id because auth.js returns { id: user._id } in JWT
        var userId = (user.id || user._id).toString();
        console.log('App.js emitting user_online:', userId);
        socket.emit('user_online', userId);

        socket.on('connect', function() {
            console.log('Socket reconnected, re-emitting user_online:', userId);
            socket.emit('user_online', userId);
        });

        return function() {
            socket.off('connect');
        };
    }, [user]);

    return ( <
            >
            <
            Navbar / >
            <
            Routes >
            <
            Route path = "/login"
            element = { < Login / > }
            /> <
            Route path = "/register"
            element = { < Register / > }
            /> <
            Route path = "/"
            element = { < PrivateRoute > < Dashboard / > < /PrivateRoute>} / >
                <
                Route path = "/friends"
                element = { < PrivateRoute > < Friends / > < /PrivateRoute>} / >
                    <
                    Route path = "/watch"
                    element = { < WatchParty / > }
                    /> <
                    Route path = "/watch/:roomId"
                    element = { < WatchParty / > }
                    /> <
                    Route path = "*"
                    element = { < Navigate to = "/" / > }
                    /> <
                    /Routes> <
                    />
                );
            }

            export default function App() {
                return ( <
                    AuthProvider >
                    <
                    NotificationProvider >
                    <
                    Router >
                    <
                    AppRoutes / >
                    <
                    /Router> <
                    /NotificationProvider> <
                    /AuthProvider>
                );
            }