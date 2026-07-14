import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    if (!user && (location.pathname === '/login' || location.pathname === '/register')) {
        return ( <
            nav style = { styles.nav } >
            <
            Link to = "/"
            style = { styles.logo } >
            <
            div style = { styles.logoIcon } > H < /div>
            Hangout <
            /Link> <
            div style = { styles.links } >
            <
            Link to = "/login"
            style = { styles.navLink } > Login < /Link> <
            Link to = "/register"
            style = { styles.registerBtn } > Get Started < /Link> <
            /div> <
            /nav>
        );
    }

    return ( <
        nav style = { styles.nav } >
        <
        Link to = "/"
        style = { styles.logo } >
        <
        div style = { styles.logoIcon } > H < /div>
        Hangout <
        /Link> {
            user && ( <
                div style = { styles.links } >
                <
                Link to = "/"
                style = { Object.assign({}, styles.navLink, isActive('/') ? styles.navActive : {}) } > Home < /Link> <
                Link to = "/friends"
                style = { Object.assign({}, styles.navLink, isActive('/friends') ? styles.navActive : {}) } > Find Friends < /Link> <
                div style = { styles.divider }
                /> <
                div style = { styles.userPill } >
                <
                div style = { styles.navAvatar } > { user.name[0].toUpperCase() } < /div> <
                span style = { styles.navUsername } > @ { user.username } < /span> <
                div style = { styles.onlineDot }
                /> <
                /div> <
                button style = { styles.logoutBtn }
                onClick = { handleLogout } > Sign out < /button> <
                /div>
            )
        } <
        /nav>
    );
};

const styles = {
    nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 28px', height: '60px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderBottom: '1px solid rgba(108,99,255,0.2)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.3)' },
    logo: { color: 'white', textDecoration: 'none', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.3px' },
    logoIcon: { width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#6C63FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: 'white', boxShadow: '0 4px 12px rgba(108,99,255,0.4)' },
    links: { display: 'flex', alignItems: 'center', gap: '6px' },
    navLink: { color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '14px', fontWeight: '500', padding: '6px 12px', borderRadius: '8px' },
    navActive: { color: 'white', backgroundColor: 'rgba(108,99,255,0.3)' },
    divider: { width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 6px' },
    userPill: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.07)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' },
    navAvatar: { width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#6C63FF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' },
    navUsername: { fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
    onlineDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' },
    logoutBtn: { backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', marginLeft: '4px' },
    registerBtn: { color: 'white', textDecoration: 'none', backgroundColor: '#6C63FF', padding: '7px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 12px rgba(108,99,255,0.3)' },
};

export default Navbar;