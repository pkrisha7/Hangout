import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import socket from '../socket';

const Friends = () => {
        const { user } = useAuth();
        const [search, setSearch] = useState('');
        const [results, setResults] = useState([]);
        const [loading, setLoading] = useState(false);
        const [sent, setSent] = useState({});

        const handleSearch = async(e) => {
            setSearch(e.target.value);
            if (e.target.value.length < 2) { setResults([]); return; }
            setLoading(true);
            try {
                const res = await api.get(`/friends/search?q=${e.target.value}`);
                setResults(res.data);
            } catch (err) { console.error(err); }
            setLoading(false);
        };

        const sendRequest = async(targetUser) => {
            try {
                await api.post(`/friends/request/${targetUser._id}`);
                setSent(prev => ({...prev, [targetUser._id]: true }));
                socket.emit('friend_request_sent', {
                    toUserId: targetUser._id,
                    fromUser: { _id: user.id, name: user.name, username: user.username }
                });
            } catch (err) {
                alert((err.response && err.response.data && err.response.data.message) || 'Error');
            }
        };

        return ( <
            div style = { styles.page } >
            <
            div style = { styles.left } >
            <
            div style = { styles.leftInner } >
            <
            div style = { styles.leftEmoji } > 🔍 < /div> <
            h2 style = { styles.leftTitle } > Find your people < /h2> <
            p style = { styles.leftSub } > Search by username and send a friend request to start hanging out together. < /p> <
            /div> <
            /div> <
            div style = { styles.right } >
            <
            h2 style = { styles.title } > Search People < /h2> <
            div style = { styles.searchBox } >
            <
            span style = { styles.searchIcon } > 🔍 < /span> <
            input style = { styles.input }
            placeholder = "Search by username..."
            value = { search }
            onChange = { handleSearch }
            /> <
            /div> {
                search.length < 2 && ( <
                    div style = { styles.hint } > Type at least 2 characters to search < /div>
                )
            } {
                loading && < div style = { styles.loading } > Searching... < /div>} {
                        results.length === 0 && search.length >= 2 && !loading && ( <
                            div style = { styles.noResults } >
                            <
                            div style = { styles.noResultsEmoji } > 😶 < /div> <
                            div > No users found
                            for "{search}" < /div> <
                            /div>
                        )
                    } <
                    div style = { styles.results } > {
                        results.map(u => ( <
                            div key = { u._id }
                            style = { styles.resultCard } >
                            <
                            div style = { styles.resultAvatar } > { u.name[0].toUpperCase() } < /div> <
                            div style = { styles.resultInfo } >
                            <
                            div style = { styles.resultName } > { u.name } < /div> <
                            div style = { styles.resultUsername } > @ { u.username } < /div> <
                            /div> <
                            div style = {
                                { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: u.status === 'online' ? '#22c55e' : '#94a3b8', flexShrink: 0 } }
                            /> <
                            button style = { sent[u._id] ? styles.sentBtn : styles.addBtn }
                            onClick = {
                                () => sendRequest(u) }
                            disabled = { sent[u._id] } >
                            { sent[u._id] ? '✓ Sent' : '+ Add' } <
                            /button> <
                            /div>
                        ))
                    } <
                    /div> <
                    /div> <
                    /div>
            );
        };

        const styles = {
            page: { display: 'flex', minHeight: 'calc(100vh - 60px)' },
            left: { flex: 1, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' },
            leftInner: { textAlign: 'center', maxWidth: '300px' },
            leftEmoji: { fontSize: '72px', marginBottom: '20px' },
            leftTitle: { fontSize: '28px', fontWeight: '800', color: 'white', marginBottom: '12px' },
            leftSub: { fontSize: '16px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.7' },
            right: { width: '500px', backgroundColor: 'white', padding: '40px', overflowY: 'auto' },
            title: { fontSize: '22px', fontWeight: '800', color: '#1a1a2e', marginBottom: '20px' },
            searchBox: { position: 'relative', marginBottom: '20px' },
            searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' },
            input: { width: '100%', padding: '13px 14px 13px 42px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fafafa' },
            hint: { color: '#cbd5e1', fontSize: '13px', textAlign: 'center', padding: '24px 0' },
            loading: { color: '#94a3b8', fontSize: '14px', padding: '12px 0' },
            noResults: { textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: '14px' },
            noResultsEmoji: { fontSize: '40px', marginBottom: '10px' },
            results: { display: 'flex', flexDirection: 'column', gap: '10px' },
            resultCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafafa' },
            resultAvatar: { width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#6C63FF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', flexShrink: 0 },
            resultInfo: { flex: 1 },
            resultName: { fontSize: '15px', fontWeight: '600', color: '#1a1a2e', marginBottom: '2px' },
            resultUsername: { fontSize: '13px', color: '#6C63FF' },
            addBtn: { padding: '8px 18px', backgroundColor: '#6C63FF', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(108,99,255,0.25)' },
            sentBtn: { padding: '8px 18px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', cursor: 'default', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' },
        };

        export default Friends;