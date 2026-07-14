import React, { createContext, useState, useContext, useEffect } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Load from localStorage on initialization
    useEffect(() => {
        const stored = localStorage.getItem('hangout_notifications');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNotifications(parsed);
                setUnreadCount(parsed.filter(n => !n.read).length);
            } catch (e) {
                localStorage.removeItem('hangout_notifications');
            }
        }
    }, []);

    // Save to localStorage when changed
    const saveNotifications = (newNotifications) => {
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.read).length);
        localStorage.setItem('hangout_notifications', JSON.stringify(newNotifications));
    };

    const addNotification = ({ type, text, icon }) => {
        const newNotif = {
            id: Date.now() + Math.random().toString(36).substring(2, 5),
            type, // 'video' | 'game' | 'friend'
            text,
            icon: icon || '🔔',
            read: false,
            ts: Date.now()
        };
        const updated = [newNotif, ...notifications].slice(0, 100); // Limit to last 100
        saveNotifications(updated);
    };

    const markAllAsRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        saveNotifications(updated);
    };

    const clearNotifications = () => {
        saveNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllAsRead, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
