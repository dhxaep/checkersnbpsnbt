'use client';

import React, { useState, useEffect } from 'react';

export default function WelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Cek apakah user sudah pernah melihat popup ini di sesi sebelumnya
        const hasSeen = localStorage.getItem('hasSeenWelcome');
        if (!hasSeen) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('hasSeenWelcome', 'true');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4 font-sans">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 sm:p-8">
                    <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-4">
                        Welcome! 👋
                    </h2>
                    
                    <p className="text-slate-300 leading-relaxed mb-6">
                        Website ini dibuat untuk mempermudah kesiswaan atau sekolah yang ingin mengambil data banyak dari peserta SNBP atau SNBT dari siswanya.
                    </p>
                    
                    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl mb-8">
                        <p className="text-slate-400 text-sm italic text-center">
                            "Web ini dibuat oleh <span className="font-semibold text-indigo-400">Dhafa Achmad Ghifari</span> sebagai bentuk terimakasih terhadap sekolah <span className="font-semibold text-white">SMA Al Minhaj</span>"
                        </p>
                    </div>
                    
                    <button 
                        onClick={handleClose}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
                    >
                        Mulai Gunakan Web
                    </button>
                </div>
            </div>
        </div>
    );
}
