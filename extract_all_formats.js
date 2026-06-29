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

console.log(`Mulai mengekstrak format untuk ${ikkData.length} IKK (Support Multi-Tabel: Pembilang/Penyebut)...`);

let successCount = 0;
let failCount = 0;

for (const ikk of ikkData) {
    if (ikk.id === '1.a.1' || ikk.id === '4.a') continue;
    
    if (!ikk.page_start || !ikk.page_end) {
        console.warn(`IKK ${ikk.id} tidak memiliki halaman pedoman, melewati.`);
        continue;
    }

    try {
        const cmd = `/opt/homebrew/bin/pdftotext -layout -f ${ikk.page_start} -l ${ikk.page_end} "${pdfPath}" -`;
        const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        
        const parts = output.split(/Keterangan Kolom\s*:/i);
        let tablesData = [];
        
        if (parts.length > 1) {
            for (let i = 1; i < parts.length; i++) {
                const ketText = parts[i];
                const prevText = parts[i-1].slice(-800).toLowerCase(); // Look at previous text to guess title
                
                let title = `BAGIAN ${i}`;
                if (prevText.includes('pembilang') && !prevText.includes('penyebut')) {
                    title = "PEMBILANG";
                } else if (prevText.includes('penyebut') && !prevText.includes('pembilang')) {
                    title = "PENYEBUT";
                } else if (prevText.includes('pembilang') && prevText.includes('penyebut')) {
                    // Check which word appears closer to the end
                    const posPemb = prevText.lastIndexOf('pembilang');
                    const posPeny = prevText.lastIndexOf('penyebut');
                    title = posPemb > posPeny ? "PEMBILANG" : "PENYEBUT";
                }
                
                let columns = [];
                const regex = /(?:-\s*)?Kolom\s*(\d+)\s*:\s*([^\n]+)/gi;
                let match;
                while ((match = regex.exec(ketText)) !== null) {
                    let desc = match[2].trim().replace(/\s+/g, ' ');
                    if (desc.length > 120) desc = desc.substring(0, 117) + '...';
                    columns.push({ index: match[1], desc: desc });
                }

                const uniqueColumnsMap = new Map();
                for (const c of columns) {
                    if (!uniqueColumnsMap.has(c.index)) {
                        uniqueColumnsMap.set(c.index, c);
                    }
                }
                columns = Array.from(uniqueColumnsMap.values()).sort((a, b) => parseInt(a.index) - parseInt(b.index));
                
                if (columns.length > 0) {
                    tablesData.push({ title, columns });
                }
            }
        }

        // Edge cases
        if (ikk.id === '2.i.1') {
            tablesData = [
                { title: 'TRAYEK ANTAR KOTA DALAM KAB/KOTA', columns: [ {index:'1', desc:'Nomor Urut'}, {index:'2', desc:'Kode'}, {index:'3', desc:'Rute Trayek'}, {index:'4', desc:'Asal'}, {index:'5', desc:'Tujuan'}, {index:'6', desc:'Keterangan'} ] },
                { title: 'TRAYEK ANTAR KOTA ANTAR KAB/KOTA', columns: [ {index:'1', desc:'Nomor Urut'}, {index:'2', desc:'Nama Trayek'}, {index:'3', desc:'Rute Trayek'}, {index:'4', desc:'Asal'}, {index:'5', desc:'Tujuan'}, {index:'6', desc:'Keterangan'} ] },
                { title: 'KONEKTIVITAS TRANSPORTASI LAUT', columns: [ {index:'1', desc:'Nomor Urut'}, {index:'2', desc:'Jenis Trayek'}, {index:'3', desc:'Rute'}, {index:'4', desc:'Pelabuhan Asal'}, {index:'5', desc:'Tujuan Pelabuhan'}, {index:'6', desc:'Keterangan'} ] }
            ];
        } else if (ikk.id === '3.e.4') {
            tablesData = [
                { title: 'INVESTASI PMA', columns: [ {index:'1', desc:'Nomor Urut'}, {index:'2', desc:'Nama Perusahaan'}, {index:'3', desc:'Alamat Perusahaan'}, {index:'4', desc:'Asal Negara'}, {index:'5', desc:'Nilai Investasi'}, {index:'6', desc:'Keterangan'} ] },
                { title: 'INVESTASI PMDN', columns: [ {index:'1', desc:'Nomor Urut'}, {index:'2', desc:'Nama Perusahaan'}, {index:'3', desc:'Alamat Perusahaan'}, {index:'4', desc:'Nilai Investasi'}, {index:'5', desc:'Keterangan'} ] }
            ];
        } else if (ikk.id === '4.f.1') {
            tablesData = [{ title: 'PENYEBUT', columns: [ {index:'1', desc:'Uraian'}, {index:'2', desc:'Capaian'}, {index:'3', desc:'Lampiran'} ] }];
        } else if (ikk.id === '4.f.3') {
            tablesData = [{ title: 'PENYEBUT', columns: [ {index:'1', desc:'Uraian'}, {index:'2', desc:'Capaian'}, {index:'3', desc:'Lampiran'} ] }];
        }

        if (tablesData.length === 0) {
            console.warn(`⚠️ IKK ${ikk.id}: Gagal mendeteksi tabel dari PDF, fallback ke generik.`);
            tablesData = [{
                title: 'DATA DUKUNG',
                columns: [
                    { index: '1', desc: 'Nomor Urut' },
                    { index: '2', desc: 'Uraian Data Dukung' },
                    { index: '3', desc: 'Satuan' },
                    { index: '4', desc: 'Capaian' },
                    { index: '5', desc: 'Keterangan' },
                ]
            }];
            failCount++;
        } else {
            console.log(`✅ IKK ${ikk.id}: Berhasil mengekstrak ${tablesData.length} tabel.`);
            successCount++;
        }

        let dinasName = ikk.urusan ? ikk.urusan.toUpperCase().replace('URUSAN ', 'DINAS ') : 'DINAS / BADAN ................................';
        // Handle Edge Cases for Dinas
        if (dinasName.includes('FUNGSI PENUNJANG')) {
            dinasName = 'BADAN ' + dinasName.replace('FUNGSI PENUNJANG URUSAN PEMERINTAHAN BIDANG ', '');
        }

        let tablesHtml = '';
        for (let i = 0; i < tablesData.length; i++) {
            const t = tablesData[i];
            const pageBreak = i > 0 ? '<div class="break-before-page w-full h-8 bg-transparent print:h-0 print:m-0"></div>' : '';
            
            tablesHtml += `
${pageBreak}
<div class="bg-white p-6 sm:p-10 w-full max-w-[950px] mx-auto text-[13px] leading-snug shadow-xl relative print:shadow-none print:w-full print:max-w-full mb-8">
    
    <!-- Top Right Box -->
    <div class="flex justify-end mb-6">
        <div class="border-2 border-black p-1.5 text-center text-xs font-bold w-44">
            <p>Format Data Dukung</p>
            <p>${t.title.charAt(0) + t.title.slice(1).toLowerCase()}</p>
            <p>IKK ${ikk.id}</p>
        </div>
    </div>

    <!-- KOP Surat -->
    <div class="text-center font-bold mb-4">
        <p class="text-base">KOP SURAT</p>
        <p class="text-base uppercase">${dinasName} KABUPATEN/KOTA .....</p>
    </div>
    
    <!-- KOP Line -->
    <div class="border-t-[3px] border-black mb-1"></div>
    <div class="border-t border-black mb-6"></div>

    <!-- Title -->
    <div class="text-center font-bold mb-8 uppercase">
        <p class="mb-2">FORMAT DATA DUKUNG IKK ${ikk.id} - ${t.title}</p>
        <p>${ikk.name}</p>
    </div>

    <!-- Tabel -->
    <div class="overflow-x-auto w-full mb-8">
        <table class="w-full border-collapse border border-black text-center text-xs min-w-[700px]">
            <thead>
                <tr>
                    ${t.columns.map(c => `<th class="border border-black p-2 align-middle break-words">${c.desc}</th>`).join('\n                    ')}
                </tr>
                <tr class="bg-gray-100 italic font-bold">
                    ${t.columns.map(c => `<td class="border border-black p-1">(${c.index})</td>`).join('\n                    ')}
                </tr>
            </thead>
            <tbody>
                <tr>${t.columns.map(c => `<td class="border border-black p-2.5 h-8"></td>`).join('')}</tr>
                <tr>${t.columns.map(c => `<td class="border border-black p-2.5 h-8"></td>`).join('')}</tr>
                <tr>${t.columns.map(c => `<td class="border border-black p-2.5 h-8 text-left pl-3">${c.index === '1' ? 'Dst.' : ''}</td>`).join('')}</tr>
            </tbody>
        </table>
    </div>

    <!-- Signatures -->
    <div class="flex justify-end mb-12 text-center">
        <div class="w-72">
            <p>......................., tanggal .....</p>
            <p class="mt-4 font-bold">Kepala ${dinasName.replace('DINAS ', 'Dinas ').replace('BADAN ', 'Badan ')}</p>
            <p class="font-bold">Kabupaten/Kota .....</p>
            <p class="mt-6 font-bold">Ttd dan cap/TTE</p>
            <p class="mt-20 font-bold">(.........................................)</p>
            <p class="font-bold text-left pl-6">Pangkat/Gol Ruang .....</p>
            <p class="font-bold text-left pl-6">NIP. .....</p>
        </div>
    </div>

    <!-- Keterangan -->
    <div class="text-xs mb-8">
        <p class="font-bold underline mb-2.5 text-[13px]">Keterangan Kolom:</p>
        <table class="w-full border-none text-left">
            <tbody>
                ${t.columns.map(c => `<tr><td class="align-top pr-2 w-20 py-0.5 whitespace-nowrap">- Kolom ${c.index}</td><td class="align-top w-3 py-0.5">:</td><td class="align-top py-0.5 break-words">${c.desc}</td></tr>`).join('\n                ')}
            </tbody>
        </table>
    </div>
</div>
`;
        }

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
<body class="bg-gray-100 p-4 sm:p-8 print:p-0 print:bg-white text-black font-sans">
    ${tablesHtml}
</body>
</html>`;

        fs.writeFileSync(path.join(customFormatsDir, `${ikk.id}.html`), html);

    } catch (e) {
        console.error(`❌ Gagal memproses IKK ${ikk.id}:`, e.message);
    }
}

console.log(`\nSelesai! Berhasil parsing ${successCount} format IKK. Fallback/gagal parsing: ${failCount}`);
