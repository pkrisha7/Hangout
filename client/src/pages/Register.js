import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
        const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
        const [error, setError] = useState('');
        const [loading, setLoading] = useState(false);
        const { register } = useAuth();
        const navigate = useNavigate();

        const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value });

        const handleSubmit = async(e) => {
            e.preventDefault();
            setLoading(true);
            setError('');
            try {
                await register(form.name, form.username, form.email, form.password);
                navigate('/');
            } catch (err) {
                setError((err.response && err.response.data && err.response.data.message) || 'Registration failed');
            }
            setLoading(false);
        };

        return ( <
            div style = { styles.page } >
            <
            div style = { styles.left } >
            <
            div style = { styles.leftContent } >
            <
            div style = { styles.bigLogo } > H < /div> <
            h1 style = { styles.bigTitle } > Join Hangout < /h1> <
            p style = { styles.bigSub } > Your friends are waiting
            for you. < /p> <
            div style = { styles.featureList } > {
                ['Free forever', 'No ads ever', 'Private & secure', 'Works everywhere'].map(f => ( <
                    div key = { f }
                    style = { styles.featureItem } >
                    <
                    span style = { styles.featureCheck } > ✓ < /span> <
                    span > { f } < /span> <
                    /div>
                ))
            } <
            /div> <
            /div> <
            /div> <
            div style = { styles.right } >
            <
            div style = { styles.card } >
            <
            h2 style = { styles.cardTitle } > Create account < /h2> <
            p style = { styles.cardSub } > Start hanging out in seconds < /p> {
                error && < div style = { styles.error } > { error } < /div>} <
                    form onSubmit = { handleSubmit } >
                    <
                    div style = { styles.row } >
                    <
                    div style = { styles.field } >
                    <
                    label style = { styles.label } > Full name < /label> <
                    input style = { styles.input }
                name = "name"
                placeholder = "Krisha Pokharel"
                value = { form.name }
                onChange = { handleChange }
                required / >
                    <
                    /div> <
                    div style = { styles.field } >
                    <
                    label style = { styles.label } > Username < /label> <
                    input style = { styles.input }
                name = "username"
                placeholder = "krisha7"
                value = { form.username }
                onChange = { handleChange }
                required / >
                    <
                    /div> <
                    /div> <
                    div style = { styles.field } >
                    <
                    label style = { styles.label } > Email < /label> <
                    input style = { styles.input }
                name = "email"
                type = "email"
                placeholder = "you@example.com"
                value = { form.email }
                onChange = { handleChange }
                required / >
                    <
                    /div> <
                    div style = { styles.field } >
                    <
                    label style = { styles.label } > Password < /label> <
                    input style = { styles.input }
                name = "password"
                type = "password"
                placeholder = "••••••••"
                value = { form.password }
                onChange = { handleChange }
                required / >
                    <
                    /div> <
                    button style = { styles.btn }
                type = "submit"
                disabled = { loading } > { loading ? 'Creating account...' : 'Create Account →' } <
                    /button> <
                    /form> <
                    p style = { styles.footer } > Already have an account ? < Link to = "/login"
                style = { styles.footerLink } > Sign in < /Link></p >
                    <
                    /div> <
                    /div> <
                    /div>
            );
        };

        const styles = {
            page: { display: 'flex', minHeight: 'calc(100vh - 60px)' },
            left: { flex: 1, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' },
            leftContent: { maxWidth: '380px' },
            bigLogo: { width: '72px', height: '72px', borderRadius: '20px', backgroundColor: '#6C63FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '800', color: 'white', marginBottom: '20px', boxShadow: '0 8px 32px rgba(108,99,255,0.4)' },
            bigTitle: { fontSize: '42px', fontWeight: '800', color: 'white', marginBottom: '8px', letterSpacing: '-1px' },
            bigSub: { fontSize: '18px', color: 'rgba(255,255,255,0.55)', marginBottom: '36px' },
            featureList: { display: 'flex', flexDirection: 'column', gap: '14px' },
            featureItem: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', color: 'rgba(255,255,255,0.8)' },
            featureCheck: { color: '#6C63FF', fontWeight: '700', fontSize: '18px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
            right: { width: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', backgroundColor: 'white' },
            card: { width: '100%', maxWidth: '400px' },
            cardTitle: { fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginBottom: '6px' },
            cardSub: { fontSize: '15px', color: '#94a3b8', marginBottom: '28px' },
            row: { display: 'flex', gap: '14px' },
            field: { marginBottom: '16px', flex: 1 },
            label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' },
            input: { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#fafafa', color: '#1a1a2e' },
            btn: { width: '100%', padding: '14px', backgroundColor: '#6C63FF', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontWeight: '700', marginTop: '8px', marginBottom: '20px', boxShadow: '0 4px 16px rgba(108,99,255,0.35)' },
            error: { backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '14px', border: '1px solid #fecaca' },
            footer: { textAlign: 'center', fontSize: '14px', color: '#94a3b8' },
            footerLink: { color: '#6C63FF', textDecoration: 'none', fontWeight: '600' },
        };

        export default Register;