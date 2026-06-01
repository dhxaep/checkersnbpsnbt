'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ChatBot from './components/ChatBot';
import WelcomeModal from './components/WelcomeModal';

type Student = {
    nama: string;
    noPeserta: string;
    ttl: string;
    manualStatus?: string;
    manualPtn?: string;
    manualJurusan?: string;
};

type ProcessedResult = Student & {
    status: string;
    ptn: string;
    jurusan: string;
    rawApi?: any;
};

export default function Home() {
    const [mode, setMode] = useState<'snbt' | 'snbp'>('snbt');
    const [students, setStudents] = useState<Student[]>([]);
    const [results, setResults] = useState<ProcessedResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const acceptedRef = useRef<HTMLDivElement>(null);
    const rejectedRef = useRef<HTMLDivElement>(null);
    const [renderTarget, setRenderTarget] = useState<ProcessedResult | null>(null);

    const handleDownloadTemplate = () => {
        const ws_data = [
            ["Nama", "No Peserta", "Tanggal Lahir"],
            ["Budi Santoso", "123456789012", "01012005"],
            ["Siti Aminah", "987654321098", "15082006"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
        XLSX.writeFile(wb, "Template_Cek_SNPMB.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });
            
            const newStudents: Student[] = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row.length >= 2 && row[1]) {
                    // Coba cari TTL dari kolom 2 (C) atau 3 (D) jika ada shift
                    let rawTtl = String(row[2] || '').trim();
                    let nextCol = 3;
                    
                    // Jika kolom 2 kosong atau bukan angka, tapi kolom 3 adalah angka (shift)
                    if (!rawTtl || (isNaN(Number(rawTtl)) && row[3] && !isNaN(Number(row[3])))) {
                        rawTtl = String(row[3] || '').trim();
                        nextCol = 4;
                    }

                    if (rawTtl) {
                        let manualStatus = row[nextCol] ? String(row[nextCol]).trim() : undefined;
                        // Hanya terima jika manualStatus adalah Lulus / Tidak Lulus
                        if (manualStatus && !manualStatus.toLowerCase().includes('lulus')) {
                            manualStatus = undefined;
                        }

                        newStudents.push({
                            nama: row[0] || "Unknown",
                            noPeserta: String(row[1]).trim(),
                            ttl: rawTtl.padStart(8, '0'),
                            manualStatus: manualStatus,
                            manualPtn: row[nextCol + 1] ? String(row[nextCol + 1]).trim() : undefined,
                            manualJurusan: row[nextCol + 2] ? String(row[nextCol + 2]).trim() : undefined
                        });
                    }
                }
            }
            
            if (newStudents.length > 0) {
                setStudents(newStudents);
                setResults([]);
                alert(`Berhasil memuat ${newStudents.length} data siswa.`);
            } else {
                alert("Data tidak valid. Pastikan format Excel sesuai template.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const processAll = async () => {
        setIsProcessing(true);
        const newResults: ProcessedResult[] = [];
        setResults([]);

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            setProgress(i + 1);

            let resultObj: ProcessedResult = {
                ...student,
                status: 'Memproses...',
                ptn: '-',
                jurusan: '-',
            };
            
            try {
                const res = await fetch('/api/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: mode, // snbt or snbp
                        noPeserta: student.noPeserta,
                        ttl: student.ttl
                    })
                });
                
                if (res.ok) {
                    const apiData = await res.json();
                    resultObj.rawApi = apiData;
                    
                    if (apiData.ac === 1 || apiData.status === true || apiData.npt) {
                        resultObj.status = 'Lulus';
                        resultObj.ptn = apiData.npt || apiData.ptn || '-';
                        resultObj.jurusan = apiData.nps || apiData.prodi || '-';
                    } else {
                        resultObj.status = 'Tidak Lulus';
                    }
                } else {
                    resultObj.status = 'Tidak Lulus';
                }
            } catch (error) {
                console.error('Fetch error:', error);
                resultObj.status = 'Error Koneksi';
            }

            newResults.push(resultObj);
            setResults([...newResults]);
        }
        setIsProcessing(false);
    };

    const generateScreenshot = async (res: ProcessedResult): Promise<string | null> => {
        return new Promise((resolve) => {
            setRenderTarget(res);
            setTimeout(async () => {
                let targetEl = null;
                if (res.status === 'Lulus' && acceptedRef.current) {
                    targetEl = acceptedRef.current;
                } else if (res.status === 'Tidak Lulus' && rejectedRef.current) {
                    targetEl = rejectedRef.current;
                }

                if (!targetEl) {
                    resolve(null);
                    return;
                }

                try {
                    const canvas = await html2canvas(targetEl, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: "#EAF2F8"
                    });
                    resolve(canvas.toDataURL("image/png"));
                } catch (e) {
                    console.error("html2canvas error:", e);
                    resolve(null);
                }
            }, 100);
        });
    };

    const downloadSingle = async (res: ProcessedResult) => {
        const dataUrl = await generateScreenshot(res);
        if (dataUrl) {
            const link = document.createElement('a');
            link.download = `Hasil_${mode.toUpperCase()}_${res.nama}.png`;
            link.href = dataUrl;
            link.click();
        }
    };

    const downloadZip = async () => {
        setIsProcessing(true);
        const zip = new JSZip();
        const folder = zip.folder(`Hasil_${mode.toUpperCase()}`);
        
        for (let i = 0; i < results.length; i++) {
            const res = results[i];
            if (res.status !== 'Tidak Ditemukan') {
                if (mode === 'snbp' && res.status !== 'Lulus') continue;
                
                const dataUrl = await generateScreenshot(res);
                if (dataUrl && folder) {
                    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
                    folder.file(`${res.nama}_${res.noPeserta}.png`, base64Data, {base64: true});
                }
            }
        }
        
        const content = await zip.generateAsync({type: "blob"});
        saveAs(content, `Hasil_${mode.toUpperCase()}_Siswa.zip`);
        setIsProcessing(false);
    };

    const formatNo = (no: string) => no.length >= 12 ? `${no.substring(0,2)} - ${no.substring(2,6)} - ${no.substring(6)}` : no;
    const formatTtl = (ttl: string) => ttl.length === 8 ? `${ttl.substring(0,2)} - ${ttl.substring(2,4)} - ${ttl.substring(4)}` : ttl;

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
                
                {/* Header */}
                <header className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium border border-indigo-500/20 mb-4">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Next.js Server API
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
                        Bulk Check <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">SNBT & SNBP</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Alat bantu guru untuk mengecek dan men-download hasil pengumuman UTBK SNBT / SNBP 2026 secara massal dalam satu klik.
                    </p>
                </header>

                <main className="grid gap-8">
                    
                    {/* Controls Card */}
                    <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50">
                        {/* Tabs */}
                        <div className="flex gap-4 mb-8 bg-slate-950/50 p-1.5 rounded-2xl w-fit border border-slate-800/50">
                            <button 
                                onClick={() => { setMode('snbt'); setResults([]); setStudents([]); }}
                                className={`px-6 py-3 font-semibold rounded-xl transition-all duration-300 ${mode === 'snbt' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                Mode SNBT
                            </button>
                            <button 
                                onClick={() => { setMode('snbp'); setResults([]); setStudents([]); }}
                                className={`px-6 py-3 font-semibold rounded-xl transition-all duration-300 ${mode === 'snbp' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                Mode SNBP
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Upload Section */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">1</span>
                                    Upload Data Siswa
                                </h3>
                                <p className="text-sm text-slate-400">Upload file Excel (.xlsx). Pastikan Kolom A: Nama, B: No Peserta, C: Tanggal Lahir.</p>
                                <p className="text-xs text-yellow-400/80 mb-2">💡 Tips SNBP: Tambahkan Kolom D (Status Lulus/Tidak Lulus), E (PTN), F (Jurusan) jika API resmi diblokir.</p>
                                
                                <label className="block w-full p-8 border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all rounded-2xl cursor-pointer group">
                                    <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                                    <div className="text-center space-y-2">
                                        <div className="w-12 h-12 mx-auto bg-slate-800 group-hover:bg-indigo-500/20 rounded-xl flex items-center justify-center transition-colors">
                                            <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </div>
                                        <span className="block font-medium text-slate-300 group-hover:text-white">Pilih file Excel</span>
                                    </div>
                                </label>
                                
                                <button onClick={handleDownloadTemplate} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                    ↓ Download Template Excel
                                </button>
                            </div>

                            {/* Process Section */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">2</span>
                                    Proses Hasil
                                </h3>
                                <p className="text-sm text-slate-400">Klik tombol di bawah untuk mengecek kelulusan secara massal langsung ke server resmi SNPMB.</p>
                                
                                <button 
                                    onClick={processAll}
                                    disabled={students.length === 0 || isProcessing}
                                    className="w-full py-4 mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-2xl font-bold text-lg text-white shadow-lg shadow-emerald-500/25 transition-all transform active:scale-[0.98]"
                                >
                                    {isProcessing ? 'Memproses Data...' : 'Cek Kelulusan Sekarang'}
                                </button>
                                
                                {(isProcessing || results.length > 0) && (
                                    <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-800">
                                        <div className="flex justify-between text-sm font-medium mb-2">
                                            <span className="text-slate-300">Progress Pengecekan</span>
                                            <span className="text-emerald-400">{progress} / {students.length}</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 ease-out"
                                                style={{ width: `${(progress / students.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Results Section */}
                    <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50 overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <h2 className="text-2xl font-bold text-white">Hasil Kelulusan</h2>
                            {results.length > 0 && !isProcessing && (
                                <button onClick={downloadZip} className="px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold transition-colors shadow-lg shadow-white/10 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Download ZIP (Semua SS)
                                </button>
                            )}
                        </div>
                        
                        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-900/80 text-slate-300 text-sm uppercase tracking-wider">
                                        <th className="p-5 font-semibold border-b border-slate-800/80">No</th>
                                        <th className="p-5 font-semibold border-b border-slate-800/80">Nama Siswa</th>
                                        <th className="p-5 font-semibold border-b border-slate-800/80">No Peserta</th>
                                        {mode === 'snbt' && <th className="p-5 font-semibold border-b border-slate-800/80">Status</th>}
                                        <th className="p-5 font-semibold border-b border-slate-800/80">PTN Diterima</th>
                                        <th className="p-5 font-semibold border-b border-slate-800/80">Jurusan</th>
                                        <th className="p-5 font-semibold border-b border-slate-800/80 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                    {results.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-slate-500">
                                                Belum ada data. Silakan upload Excel dan klik Cek Kelulusan.
                                            </td>
                                        </tr>
                                    ) : (
                                        results.map((res, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-5">{i + 1}</td>
                                                <td className="p-5 font-medium text-white">{res.nama}</td>
                                                <td className="p-5 text-slate-400 font-mono">{res.noPeserta}</td>
                                                {mode === 'snbt' && (
                                                    <td className="p-5">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border ${
                                                            res.status === 'Lulus' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                            (res.status === 'Tidak Lulus' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20')
                                                        }`}>
                                                            {res.status === 'Lulus' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                                                            {res.status === 'Tidak Lulus' && <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>}
                                                            {res.status}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="p-5" title={res.ptn}>{res.ptn}</td>
                                                <td className="p-5" title={res.jurusan}>{res.jurusan}</td>
                                                <td className="p-5 text-right">
                                                    {(mode === 'snbt' ? res.status !== 'Tidak Ditemukan' : res.status === 'Lulus') && (
                                                        <button 
                                                            onClick={() => downloadSingle(res)}
                                                            className="inline-flex items-center justify-center p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20"
                                                            title="Download Screenshot"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>

            {/* HIDDEN TEMPLATES FOR SCREENSHOTS */}
            <div className="screenshot-hidden">
                {mode === 'snbt' && (
                    <>
                        <div ref={acceptedRef} className="snbt-card">
                            <div className="snbt-header">
                                <h1>PENGUMUMAN HASIL SELEKSI NASIONAL BERDASARKAN TES (SNBT) 2026</h1>
                                <h2>BALAI PENGELOLAAN PENGUJIAN PENDIDIKAN</h2>
                            </div>
                            <div className="snbt-body">
                                <div className="content-row">
                                    <div className="qr-col">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=LULUS`} alt="qr" crossOrigin="anonymous" />
                                    </div>
                                    <div className="details-col">
                                        <div className="detail-item">
                                            <span className="label">Nomor peserta</span><span className="colon">:</span>
                                            <span className="value">{renderTarget ? formatNo(renderTarget.noPeserta) : ''}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Nama</span><span className="colon">:</span>
                                            <span className="value">{renderTarget?.rawApi?.na || renderTarget?.nama || ''}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Tanggal lahir</span><span className="colon">:</span>
                                            <span className="value">{renderTarget ? formatTtl(renderTarget.ttl) : ''}</span>
                                        </div>
                                        
                                        <div className="congrats-text">
                                            Selamat! Anda dinyatakan lulus seleksi SNBT SNPMB 2026 di
                                        </div>

                                        <div className="detail-item">
                                            <span className="label">PTN</span><span className="colon">:</span>
                                            <span className="value">{renderTarget?.rawApi?.kpt} - {renderTarget?.rawApi?.npt}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Program Studi</span><span className="colon">:</span>
                                            <span className="value">{renderTarget?.rawApi?.kps} - {renderTarget?.rawApi?.nps}</span>
                                        </div>

                                        <div className="info-text">
                                            Persyaratan pendaftaran ulang calon mahasiswa baru dapat dilihat di situs resmi PTN.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div ref={rejectedRef} className="snbt-card">
                            <div className="snbt-header" style={{background: '#991b1b'}}>
                                <h1>PENGUMUMAN HASIL SELEKSI NASIONAL BERDASARKAN TES (SNBT) 2026</h1>
                                <h2>BALAI PENGELOLAAN PENGUJIAN PENDIDIKAN</h2>
                            </div>
                            <div className="snbt-body">
                                <div className="rejected-text">
                                    PESERTA ATAS NAMA <strong>{renderTarget?.rawApi?.na || renderTarget?.nama}</strong> DENGAN NOMOR PESERTA <strong>{renderTarget ? formatNo(renderTarget.noPeserta) : ''}</strong> DINYATAKAN <strong>TIDAK LULUS</strong> SELEKSI SNBT SNPMB 2026.
                                </div>
                                <div className="rejected-text" style={{color: '#333'}}>
                                    JANGAN PUTUS ASA DAN TETAP SEMANGAT!
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {mode === 'snbp' && (
                    <>
                        <div ref={acceptedRef} className="snbp-card">
                            <div className="snbp-header">
                                <h1>SELEKSI NASIONAL BERDASARKAN PRESTASI (SNBP) 2026</h1>
                                <h2>KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI</h2>
                            </div>
                            <div className="snbp-body">
                                <div className="snbp-content-box">
                                    <div className="content-row">
                                        <div className="details-col" style={{ width: '100%' }}>
                                            <div className="detail-item">
                                                <span className="label">Nomor Pendaftaran</span><span className="colon">:</span>
                                                <span className="value">{renderTarget ? renderTarget.noPeserta : ''}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="label">Nama Siswa</span><span className="colon">:</span>
                                                <span className="value">{renderTarget?.rawApi?.na || renderTarget?.nama || ''}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="label">Asal Sekolah</span><span className="colon">:</span>
                                                <span className="value">{renderTarget?.rawApi?.sch || 'SMAN/SMKN'}</span>
                                            </div>
                                            
                                            <div className="congrats-text" style={{color: '#0284c7', textAlign: 'center', fontSize: '20px', marginTop: '30px'}}>
                                                SELAMAT! ANDA DINYATAKAN LULUS SELEKSI SNBP 2026
                                            </div>

                                            <div style={{background: '#f0f9ff', padding: '15px', borderRadius: '8px', marginTop: '20px', border: '1px solid #bae6fd'}}>
                                                <div className="detail-item" style={{marginBottom: '5px'}}>
                                                    <span className="label" style={{width: '120px', color: '#0369a1'}}>PTN</span><span className="colon">:</span>
                                                    <span className="value">{renderTarget?.rawApi?.npt || renderTarget?.ptn}</span>
                                                </div>
                                                <div className="detail-item" style={{marginBottom: '0'}}>
                                                    <span className="label" style={{width: '120px', color: '#0369a1'}}>Program Studi</span><span className="colon">:</span>
                                                    <span className="value">{renderTarget?.rawApi?.nps || renderTarget?.jurusan}</span>
                                                </div>
                                            </div>

                                            <div className="info-text" style={{textAlign: 'center'}}>
                                                Silakan baca aturan pendaftaran ulang di website resmi PTN tujuan Anda.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div ref={rejectedRef} className="snbp-card">
                            <div className="snbp-header" style={{background: '#b91c1c'}}>
                                <h1>SELEKSI NASIONAL BERDASARKAN PRESTASI (SNBP) 2026</h1>
                                <h2>KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI</h2>
                            </div>
                            <div className="snbp-body">
                                <div className="snbp-content-box" style={{textAlign: 'center', padding: '40px'}}>
                                    <div className="detail-item" style={{justifyContent: 'center', marginBottom: '20px'}}>
                                        <span className="value" style={{fontSize: '18px'}}>{renderTarget ? renderTarget.noPeserta : ''} - {renderTarget?.rawApi?.na || renderTarget?.nama}</span>
                                    </div>
                                    <div className="rejected-text">
                                        MOHON MAAF, ANDA DINYATAKAN TIDAK LULUS SELEKSI SNBP 2026.
                                    </div>
                                    <div style={{color: '#555', marginTop: '20px', fontSize: '15px'}}>
                                        Masih ada kesempatan di SNBT dan Ujian Mandiri. Tetap Semangat!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <WelcomeModal />
            <ChatBot />
        </div>
    );
}
