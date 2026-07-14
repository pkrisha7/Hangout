import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import socket from '../socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // ── Helper: register as online once socket is ready ───────────────────
    function goOnline(userId) {
        if (!userId) return;
        var id = userId.toString();
        if (socket.connected) {
            socket.emit('user_online', id);
        } else {
            // Wait for connection then emit
            socket.once('connect', function() {
                socket.emit('user_online', id);
            });
        }
    }

    // ── On app load: restore session ──────────────────────────────────────
    useEffect(function() {
        var token = localStorage.getItem('token');
        var savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                var u = JSON.parse(savedUser);
                setUser(u);
                goOnline(u.id || u._id);
            } catch (e) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    // ── Re-register when socket reconnects (e.g. after server restart) ────
    useEffect(function() {
        function handleReconnect() {
            var savedUser = localStorage.getItem('user');
            if (savedUser) {
                try {
                    var u = JSON.parse(savedUser);
                    socket.emit('user_online', (u.id || u._id).toString());
                } catch (e) {}
            }
        }
        socket.on('connect', handleReconnect);
        return function() { socket.off('connect', handleReconnect); };
    }, []);

    // ── Login ─────────────────────────────────────────────────────────────
    const login = async function(email, password) {
        var res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        goOnline(res.data.user.id || res.data.user._id);
        return res.data;
    };

    // ── Register ──────────────────────────────────────────────────────────
    const register = async function(name, username, email, password) {
        var res = await api.post('/auth/register', { name, username, email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        goOnline(res.data.user.id || res.data.user._id);
        return res.data;
    };

    // ── Logout ────────────────────────────────────────────────────────────
    const logout = function() {
        if (user) socket.emit('user_offline', (user.id || user._id).toString());
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return ( <
        AuthContext.Provider value = {
            { user, login, register, logout, loading } } > { children } <
        /AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);