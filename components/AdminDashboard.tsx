
import React, { useState, useEffect } from 'react';
import type { CommunityShare } from '../types.js';

export const AdminDashboard: React.FC = () => {
  const [secret, setSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [items, setItems] = useState<{ latest: CommunityShare[], featured: CommunityShare[] }>({ latest: [], featured: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for existing session
    const stored = localStorage.getItem('admin_secret');
    if (stored) {
        setSecret(stored);
        fetchData(stored);
    }
  }, []);

  const fetchData = async (key: string) => {
    setLoading(true);
    try {
        const res = await fetch('/api/admin', {
            headers: { 'x-admin-secret': key }
        });
        if (res.ok) {
            const data = await res.json();
            setItems(data);
            setIsAuthenticated(true);
            localStorage.setItem('admin_secret', key);
        } else {
            if (res.status === 401) {
                // Only alert if we are manually trying to login, not on auto-load
                if (key !== localStorage.getItem('admin_secret')) alert('Invalid Secret');
            }
            setIsAuthenticated(false);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      fetchData(secret);
  };

  const handleAction = async (action: 'ban' | 'feature' | 'unfeature', id: string) => {
    if (action === 'ban' && !confirm(`Are you sure you want to BAN this item? It will be removed from the site.`)) return;
    
    setLoading(true);
    try {
        await fetch('/api/admin', {
            method: 'POST',
            headers: { 
                'x-admin-secret': secret,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ action, id })
        });
        // Refresh data
        await fetchData(secret);
    } catch (e) {
        alert('Action failed');
    } finally {
        setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 font-sans">
            <form onSubmit={handleLogin} className="p-8 bg-white rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black flex flex-col gap-6 w-full max-w-sm">
                <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-black italic">P</div>
                    <h1 className="text-2xl font-black text-black">Admin Access</h1>
                </div>
                <input 
                    type="password" 
                    value={secret} 
                    onChange={e => setSecret(e.target.value)} 
                    placeholder="Enter Secret Key" 
                    className="w-full border-2 border-black p-3 rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-pink-200 transition-all"
                />
                <button type="submit" disabled={loading} className="bg-black text-white p-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50">
                    {loading ? 'Checking...' : 'Enter Dashboard'}
                </button>
            </form>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-6 md:p-10 font-sans text-black">
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center text-lg font-black italic">P</div>
                <h1 className="text-3xl font-black tracking-tight">Admin Dashboard</h1>
            </div>
            <div className="flex gap-3">
                <button onClick={() => fetchData(secret)} className="bg-white border-2 border-black px-4 py-2 rounded-xl font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all">
                    {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
                <button onClick={() => { localStorage.removeItem('admin_secret'); setIsAuthenticated(false); }} className="bg-red-100 border-2 border-black px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition-colors">
                    Logout
                </button>
            </div>
        </header>

        {/* Featured Section */}
        <section className="mb-12">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <span className="text-3xl">✨</span> Featured Items ({items.featured.length})
            </h2>
            {items.featured.length === 0 ? (
                <div className="p-8 bg-white border-2 border-dashed border-gray-300 rounded-xl text-center text-gray-400 font-bold">No featured items.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {items.featured.map(item => (
                        <div key={item.id} className="bg-white border-2 border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
                            <div className="aspect-video bg-gray-100 rounded-lg border-2 border-black overflow-hidden relative group">
                                {item.screenshotUrl && <img src={item.screenshotUrl} className="w-full h-full object-cover" />}
                                <a href={`/view/${item.id}`} target="_blank" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity">View</a>
                            </div>
                            <div>
                                <p className="font-bold text-sm truncate" title={item.prompt}>{item.prompt}</p>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">{item.id}</p>
                            </div>
                            <button 
                                onClick={() => handleAction('unfeature', item.id)} 
                                className="w-full mt-auto bg-yellow-100 border-2 border-black rounded-lg py-2 text-xs font-bold hover:bg-yellow-200 transition-colors"
                            >
                                Remove from Featured
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>

        {/* Latest Feed Section */}
        <section>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <span className="text-3xl">🔥</span> Latest Feed (Recent 100)
            </h2>
            <div className="overflow-x-auto bg-white border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b-2 border-black text-sm uppercase tracking-wider">
                            <th className="p-4 border-r-2 border-gray-100 w-32">Preview</th>
                            <th className="p-4 border-r-2 border-gray-100">Details</th>
                            <th className="p-4 border-r-2 border-gray-100">Author</th>
                            <th className="p-4 w-48">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.latest.map(item => (
                            <tr key={item.id} className="hover:bg-yellow-50 transition-colors">
                                <td className="p-4">
                                     <div className="w-24 h-16 bg-gray-200 rounded-lg border-2 border-black overflow-hidden relative">
                                        {item.screenshotUrl && <img src={item.screenshotUrl} className="w-full h-full object-cover" />}
                                     </div>
                                </td>
                                <td className="p-4">
                                    <div className="max-w-lg">
                                        <p className="font-bold text-sm line-clamp-2 mb-1">{item.prompt}</p>
                                        <div className="flex gap-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border border-black font-bold ${item.type === 'learn' ? 'bg-pink-300' : 'bg-lime-300'}`}>{item.type.toUpperCase()}</span>
                                            <span className="text-xs font-mono text-gray-400">{item.id}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full border border-black overflow-hidden bg-gray-100">
                                            {item.authorAvatarUrl ? (
                                                <img src={item.authorAvatarUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold">{item.authorName?.[0] || '?'}</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold">{item.authorName || 'Anonymous'}</span>
                                            {item.userId && <span className="text-[10px] text-gray-400 font-mono">{item.userId.slice(0,8)}...</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <a href={`/view/${item.id}`} target="_blank" className="flex-1 text-center bg-white border-2 border-black rounded py-1.5 text-xs font-bold hover:bg-gray-100">
                                                View
                                            </a>
                                            <button 
                                                onClick={() => handleAction('feature', item.id)} 
                                                className="flex-1 bg-green-300 border-2 border-black rounded py-1.5 text-xs font-bold hover:bg-green-400"
                                            >
                                                Feature
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => handleAction('ban', item.id)} 
                                            className="w-full bg-red-400 border-2 border-black rounded py-1.5 text-xs font-bold text-white hover:bg-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                                        >
                                            BAN ITEM
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    </div>
  );
};
