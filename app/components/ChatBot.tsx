'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    isError?: boolean;
    hasDownload?: boolean;
    downloadData?: any[];
};

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'Halo! Kirimkan pesan berisi nama, nomor peserta, dan TTL yang berantakan, atau upload file ZIP berisi PDF kartu ujian untuk saya convert ke format Excel.', sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const parseTextToExcel = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const extracted: any[] = [];
        
        // Regex patterns
        const noPesertaPattern = /\b\d{9,12}\b/;
        const ttlNumericPattern = /\b(\d{2})[-/]?(\d{2})[-/]?(\d{4})\b/;
        
        const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
        const monthRegex = months.join('|');
        const ttlTextPattern = new RegExp(`\\b(\\d{1,2})\\s+(${monthRegex})\\s+(\\d{4})\\b`, 'i');

        lines.forEach(line => {
            let noPeserta = '';
            let ttl = '';
            let nama = line;

            const noMatch = line.match(noPesertaPattern);
            if (noMatch) {
                noPeserta = noMatch[0];
                nama = nama.replace(noPeserta, '');
            }

            let ttlMatch = line.match(ttlNumericPattern);
            if (ttlMatch) {
                ttl = `${ttlMatch[1]}${ttlMatch[2]}${ttlMatch[3]}`;
                nama = nama.replace(ttlMatch[0], '');
            } else {
                let textMatch = line.match(ttlTextPattern);
                if (textMatch) {
                    const d = textMatch[1].padStart(2, '0');
                    const mStr = textMatch[2].toLowerCase();
                    const mIndex = months.indexOf(mStr) + 1;
                    const m = mIndex.toString().padStart(2, '0');
                    const y = textMatch[3];
                    ttl = `${d}${m}${y}`;
                    nama = nama.replace(textMatch[0], '');
                }
            }

            // Clean up Nama
            nama = nama.replace(/^[-\s]+/, ''); // remove leading dash
            nama = nama.replace(/[,;:\.]/g, ' ').replace(/\s+/g, ' ').trim();
            
            if (noPeserta || ttl) {
                extracted.push({
                    "Nama": nama || 'Unknown',
                    "No Peserta": noPeserta || '000000000',
                    "Tanggal Lahir": ttl || '01012000'
                });
            }
        });

        return extracted;
    };

    const handleSend = () => {
        if (!input.trim()) return;
        
        const newMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, newMsg]);
        
        const extracted = parseTextToExcel(input);
        
        setTimeout(() => {
            if (extracted.length > 0) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    text: `Berhasil merangkum ${extracted.length} data siswa dari pesan Anda. Silakan download Excelnya:`,
                    sender: 'bot',
                    hasDownload: true,
                    downloadData: extracted
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    text: 'Maaf, saya tidak menemukan format nomor peserta dan tanggal lahir dari pesan Anda.',
                    sender: 'bot',
                    isError: true
                }]);
            }
        }, 500);

        setInput('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: `Mengupload dan memproses ZIP: ${file.name}...`,
            sender: 'user'
        }]);

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/parse-zip', {
                method: 'POST',
                body: formData
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    text: `Selesai! Berhasil mengekstrak ${data.students.length} data peserta dari PDF di dalam ZIP.`,
                    sender: 'bot',
                    hasDownload: true,
                    downloadData: data.students
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    text: `Gagal memproses file: ${data.error || 'Unknown error'}`,
                    sender: 'bot',
                    isError: true
                }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: 'Terjadi kesalahan koneksi saat memproses file ZIP.',
                sender: 'bot',
                isError: true
            }]);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const downloadExcel = (data: any[]) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Hasil Bot");
        XLSX.writeFile(wb, "Data_Siswa_Bot.xlsx");
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-80 h-96 mb-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-3 bg-slate-800 border-b border-slate-700 font-semibold text-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            Asisten Data SNPMB
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                                    msg.sender === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-br-sm' 
                                        : msg.isError 
                                            ? 'bg-red-500/20 text-red-200 border border-red-500/30 rounded-bl-sm'
                                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
                                }`}>
                                    {msg.text}
                                </div>
                                {msg.hasDownload && msg.downloadData && (
                                    <button 
                                        onClick={() => downloadExcel(msg.downloadData!)}
                                        className="mt-2 text-xs font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-emerald-500/30"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                        Download .xlsx
                                    </button>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
                        <input type="file" accept=".zip" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Upload ZIP file"
                        >
                            {isUploading ? (
                                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                            )}
                        </button>
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ketik atau paste teks (Nama, No, TTL)..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none h-10"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isOpen ? 'bg-slate-700 text-white' : 'bg-indigo-600 text-white shadow-indigo-500/25'}`}
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                )}
            </button>
        </div>
    );
}
