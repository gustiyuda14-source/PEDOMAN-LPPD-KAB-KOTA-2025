const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ikkDetailsPath = path.join(__dirname, 'public/data/ikk_details.json');
const customFormatsDir = path.join(__dirname, 'public/data/custom_formats');
const pdfPath = path.join(__dirname, '../PEDOMAN UMUM PENYUSUNAN LPPD KABKOTA 2025 REV3 FINAL.pdf');

// Ensure custom formats directory exists
if (!fs.existsSync(customFormatsDir)) {
    fs.mkdirSync(customFormatsDir, { recursive: true });
}

// Read IKK Data
const ikkData = JSON.parse(fs.readFileSync(ikkDetailsPath, 'utf8'));

console.log(`Mulai mengekstrak format untuk ${ikkData.length} IKK...`);

let successCount = 0;
let failCount = 0;

for (const ikk of ikkData) {
    // Skip the ones we already handcrafted perfectly
    if (ikk.id === '1.a.1' || ikk.id === '4.a') {
        continue;
    }
    
    if (!ikk.page_start || !ikk.page_end) {
        console.warn(`IKK ${ikk.id} tidak memiliki halaman pedoman, melewati.`);
        continue;
    }

    try {
        // Jalankan pdftotext
        // Menggunakan -layout untuk menjaga struktur
        const cmd = `/opt/homebrew/bin/pdftotext -layout -f ${ikk.page_start} -l ${ikk.page_end} "${pdfPath}" -`;
        const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        
        // Cari bagian Keterangan Kolom
        const parts = output.split(/Keterangan Kolom\s*:/i);
        let columns = [];
        
        if (parts.length > 1) {
            // Kita ambil bagian terakhir karena kadang ada Pembilang dan Penyebut
            const ketText = parts[parts.length - 1];
            
            // Regex mencari "- Kolom 1 : Deskripsi" atau "Kolom 1: Deskripsi"
            const regex = /(?:-\s*)?Kolom\s*(\d+)\s*:\s*([^\n]+)/gi;
            let match;
            while ((match = regex.exec(ketText)) !== null) {
                // Bersihkan spasi ganda dan karakter aneh
                let desc = match[2].trim().replace(/\s+/g, ' ');
                // Potong jika terlalu panjang, supaya tampilan tidak hancur
                if (desc.length > 120) desc = desc.substring(0, 117) + '...';
                
                columns.push({
                    index: match[1],
                    desc: desc
                });
            }
        }
        
        // Filter unik jika ada duplikasi index kolom
        const uniqueColumnsMap = new Map();
        for (const c of columns) {
            if (!uniqueColumnsMap.has(c.index)) {
                uniqueColumnsMap.set(c.index, c);
            }
        }
        columns = Array.from(uniqueColumnsMap.values()).sort((a, b) => parseInt(a.index) - parseInt(b.index));

        // Edge cases untuk 4 IKK yang gagal di-parsing regex karena typo di pedoman atau layout aneh
        if (ikk.id === '2.i.1') {
            columns = [
                { index: '1', desc: 'Nomor Urut' },
                { index: '2', desc: 'Kode / Nama Trayek' },
                { index: '3', desc: 'Rute Trayek' },
                { index: '4', desc: 'Asal' },
                { index: '5', desc: 'Tujuan' },
                { index: '6', desc: 'Keterangan' }
            ];
        } else if (ikk.id === '3.e.4') {
            columns = [
                { index: '1', desc: 'Nomor Urut' },
                { index: '2', desc: 'Nama Perusahaan' },
                { index: '3', desc: 'Alamat Perusahaan' },
                { index: '4', desc: 'Asal Negara (PMA)' },
                { index: '5', desc: 'Nilai Investasi' },
                { index: '6', desc: 'Keterangan' }
            ];
        } else if (ikk.id === '4.f.1') {
            columns = [
                { index: '1', desc: 'Uraian Tingkat Kematangan UKPBJ' },
                { index: '2', desc: 'Capaian Tingkat Kematangan UKPBJ' },
                { index: '3', desc: 'Lampiran Rincian Indeks Tata Kelola Pengadaan' }
            ];
        } else if (ikk.id === '4.f.3') {
            columns = [
                { index: '1', desc: 'Uraian Kualifikasi dan Kompetensi SDM' },
                { index: '2', desc: 'Capaian Kualifikasi' },
                { index: '3', desc: 'Lampiran / Keterangan' }
            ];
        }

        if (columns.length === 0) {
            console.warn(`⚠️ IKK ${ikk.id}: Gagal mendeteksi kolom dari PDF, fallback ke generik.`);
            columns = [
                { index: '1', desc: 'Nomor Urut' },
                { index: '2', desc: 'Uraian Data Dukung' },
                { index: '3', desc: 'Satuan' },
                { index: '4', desc: 'Capaian' },
                { index: '5', desc: 'Keterangan' },
            ];
            failCount++;
        } else {
            console.log(`✅ IKK ${ikk.id}: Berhasil mengekstrak ${columns.length} kolom.`);
            successCount++;
        }

        // Generate Flattened HTML
        const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Format Data Dukung ${ikk.id}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
            .break-before-page { page-break-before: always; }
        }
    </style>
</head>
<body class="bg-white text-black font-sans print:m-0 print:p-0">

<div class="bg-white p-6 sm:p-10 w-full max-w-[950px] mx-auto text-[13px] leading-snug shadow-xl relative print:shadow-none print:w-full print:max-w-full">
    <!-- KOP Surat -->
    <div class="text-center font-bold mb-4">
        <p class="text-base">KOP SURAT</p>
        <p class="text-base uppercase">DINAS / BADAN ................................</p>
        <p class="text-base uppercase">KABUPATEN/KOTA .....</p>
    </div>
    
    <div class="border-t-[3px] border-black mb-1"></div>
    <div class="border-t border-black mb-6"></div>

    <div class="text-center font-bold mb-8 uppercase">
        <p class="mb-2">FORMAT DATA DUKUNG IKK ${ikk.id}</p>
        <p>${ikk.name}</p>
    </div>

    <!-- Tabel -->
    <div class="overflow-x-auto w-full">
        <table class="w-full border-collapse border border-black mb-6 text-[11px] sm:text-[12px] min-w-[700px]">
            <thead>
                <tr class="bg-gray-100 text-center font-bold">
                    ${columns.map(c => `<th class="border border-black p-2 align-middle max-w-[250px] break-words">${c.desc}</th>`).join('\n                    ')}
                </tr>
                <tr class="bg-gray-100 italic font-bold text-center">
                    ${columns.map(c => `<td class="border border-black p-1">(${c.index})</td>`).join('\n                    ')}
                </tr>
            </thead>
            <tbody>
                <!-- Contoh 3 baris data kosong -->
                <tr>${columns.map(c => `<td class="border border-black p-2 h-8"></td>`).join('')}</tr>
                <tr>${columns.map(c => `<td class="border border-black p-2 h-8"></td>`).join('')}</tr>
                <tr>${columns.map(c => `<td class="border border-black p-2 h-8"></td>`).join('')}</tr>
            </tbody>
        </table>
    </div>

    <!-- Keterangan -->
    <div class="text-xs mb-8">
        <p class="font-bold underline mb-2.5 text-[13px]">Keterangan Kolom (Otomatis diekstrak dari Pedoman):</p>
        <table class="w-full border-none text-left">
            <tbody>
                ${columns.map(c => `<tr><td class="align-top pr-2 w-20 py-0.5 whitespace-nowrap">- Kolom ${c.index}</td><td class="align-top w-3 py-0.5">:</td><td class="align-top py-0.5 break-words">${c.desc}</td></tr>`).join('\n                ')}
            </tbody>
        </table>
    </div>

    <!-- Tanda Tangan -->
    <div class="mt-8 flex justify-end">
        <div class="w-64 text-center">
            <p class="text-left pl-6 mb-1">……………, tanggal …..</p>
            <p class="font-bold">Kepala PD ................................</p>
            <p class="mb-16 font-bold">Kabupaten/Kota .....</p>
            
            <p class="font-bold underline">(........................................................)</p>
            <p class="text-left pl-6">Pangkat/Gol Ruang .....</p>
            <p class="text-left pl-6">NIP. ............................</p>
        </div>
    </div>
</div>

</body>
</html>`;

        fs.writeFileSync(path.join(customFormatsDir, `${ikk.id}.html`), html);

    } catch (e) {
        console.error(`❌ Gagal memproses IKK ${ikk.id}:`, e.message);
    }
}

console.log(`\nSelesai! Berhasil parsing ${successCount} format IKK. Fallback/gagal parsing: ${failCount}`);
