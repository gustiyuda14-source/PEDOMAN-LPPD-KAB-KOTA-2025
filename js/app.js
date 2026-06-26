import Alpine from 'alpinejs';
import collapse from '@alpinejs/collapse';
import * as lucide from 'lucide';
import html2pdf from 'html2pdf.js';

window.lucide = lucide;
window.Alpine = Alpine;
Alpine.plugin(collapse);

document.addEventListener('alpine:init', () => {
    Alpine.data('lppdApp', () => ({
        isLoading: true,
        ikkData: [],
        introData: { bab1: '', bab2: '', bab3: '' },
        activeMenu: window.location.hash ? window.location.hash.substring(1) : 'dashboard',
        searchQuery: '',
        activeCategory: 'all',
        expandedCards: {},
        expandedMacroCards: {},
        isDarkMode: false,
        showFormatModal: false,
        isFormatLoading: false,
        formatExists: false,
        currentFormatItem: null,

        tabs: [
            { id: 'dashboard', label: 'IKK Urusan' },
            { id: 'bab1-2', label: 'Pengantar LPPD' },
            { id: 'bab3-macro', label: 'Indikator Makro' },
        ],

        menuCategories: [
            {
                name: 'Urusan Wajib Pelayanan Dasar',
                expanded: true,
                urusans: [
                    'Urusan Pendidikan',
                    'Urusan Kesehatan',
                    'Urusan Pekerjaan Umum dan Penataan Ruang',
                    'Urusan Perumahan Rakyat dan Kawasan Permukiman',
                    'Urusan Ketenteraman dan Ketertiban Umum serta Perlindungan Masyarakat',
                    'Urusan Sosial',
                ],
            },
            {
                name: 'Urusan Wajib Non-Pelayanan Dasar',
                expanded: false,
                urusans: [
                    'Urusan Tenaga Kerja',
                    'Urusan Pemberdayaan Perempuan dan Perlindungan Anak',
                    'Urusan Pangan',
                    'Urusan Pertanahan',
                    'Urusan Lingkungan Hidup',
                    'Urusan Administrasi Kependudukan dan Pencatatan Sipil',
                    'Urusan Pemberdayaan Masyarakat dan Desa',
                    'Urusan Pengendalian Penduduk dan Keluarga Berencana',
                    'Urusan Perhubungan',
                    'Urusan Komunikasi dan Informatika',
                    'Urusan Koperasi, Usaha Kecil, dan Menengah',
                    'Urusan Penanaman Modal',
                    'Urusan Kepemudaan dan Olahraga',
                    'Urusan Statistik',
                    'Urusan Persandian',
                    'Urusan Kebudayaan',
                    'Urusan Perpustakaan',
                    'Urusan Kearsipan',
                ],
            },
            {
                name: 'Urusan Pilihan',
                expanded: false,
                urusans: [
                    'Urusan Kelautan dan Perikanan',
                    'Urusan Pariwisata',
                    'Urusan Pertanian',
                    'Urusan Perdagangan',
                    'Urusan Perindustrian',
                ],
            },
            {
                name: 'Fungsi Penunjang',
                expanded: false,
                urusans: [
                    'Fungsi Penunjang Urusan Pemerintahan Bidang Perencanaan',
                    'Fungsi Penunjang Urusan Pemerintahan Bidang Keuangan',
                    'Fungsi Penunjang Urusan Pemerintahan Bidang Kelembagaan,',
                    'Fungsi Penunjang Urusan Pemerintahan Bidang Penelitian dan',
                    'Fungsi Penunjang Urusan Pemerintahan Bidang Pengawasan',
                    'Fungsi Penunjang Urusan Pemerintahan Bidang Pengadaan',
                ],
            },
        ],

        macroIndicators: [],

        get filteredIKK() {
            let data = this.ikkData;
            if (this.activeCategory !== 'all') {
                data = data.filter(d => d.urusan === this.activeCategory);
            }
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                data = data.filter(d =>
                    d.id.toLowerCase().includes(q) ||
                    d.name.toLowerCase().includes(q) ||
                    (d.urusan && d.urusan.toLowerCase().includes(q)) ||
                    (d.konsep && d.konsep.toLowerCase().includes(q))
                );
            }
            return data;
        },

        getUrusanCount(urusan) {
            return this.ikkData.filter(d => d.urusan === urusan).length;
        },

        toggleCard(id) {
            this.expandedCards[id] = !this.expandedCards[id];
        },
        
        toggleMacroCard(id) {
            this.expandedMacroCards[id] = !this.expandedMacroCards[id];
        },

        setAllCards(state) {
            const updates = {};
            this.filteredIKK.forEach(item => { updates[item.id] = state; });
            this.expandedCards = { ...this.expandedCards, ...updates };
        },

        toggleTheme() {
            this.isDarkMode = !this.isDarkMode;
            document.documentElement.classList.toggle('dark', this.isDarkMode);
            localStorage.setItem('lppd-theme', this.isDarkMode ? 'dark' : 'light');
        },

        async copyToClipboard(item) {
            const text = [
                `ID Indikator : ${item.id}`,
                `Nama         : ${item.name}`,
                `Urusan       : ${item.urusan}`,
                `Satuan       : ${item.satuan || '-'}`,
                `Rumus        :\n${item.rumus || '-'}`,
                `Halaman      : ${item.page_start} – ${item.page_end}`,
            ].join('\n');
            try {
                await navigator.clipboard.writeText(text);
            } catch {
                const el = document.createElement('textarea');
                el.value = text;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
            }
        },

        exportToPDF() {
            this.isLoading = true;
            const tempState = { ...this.expandedCards };
            this.setAllCards(true);

            setTimeout(() => {
                const element = document.querySelector('main');
                const opt = {
                    margin:       10,
                    filename:     `LPPD_2025_Export.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                
                html2pdf().set(opt).from(element).save().then(() => {
                    this.expandedCards = tempState;
                    this.isLoading = false;
                    this.$nextTick(() => lucide.createIcons());
                });
            }, 800);
        },

        async openFormatModal(item) {
            this.currentFormatItem = item;
            this.showFormatModal = true;
            this.isFormatLoading = true;
            this.formatExists = false;
            
            // Mencegah body scroll di belakang modal
            document.body.style.overflow = 'hidden';

            try {
                // Menggunakan timestamp untuk menghindari cache saat development
                const cacheBuster = `?t=${new Date().getTime()}`;
                const response = await fetch(`./data/formats/${item.id}.html${cacheBuster}`);
                
                if (response.ok) {
                    const html = await response.text();
                    this.formatExists = true;
                    // Memasukkan HTML ke dalam iframe
                    this.$nextTick(() => {
                        const iframe = document.getElementById('format-iframe');
                        if (iframe) {
                            iframe.style.height = '10px'; // Reset height
                            const doc = iframe.contentWindow.document;
                            doc.open();
                            doc.write(html);
                            doc.close();
                            
                            // Adjust height after content loads
                            setTimeout(() => {
                                iframe.style.height = (doc.documentElement.scrollHeight + 50) + 'px';
                            }, 100);
                        }
                    });
                } else {
                    this.formatExists = false;
                }
            } catch (err) {
                console.error("Gagal memuat format:", err);
                this.formatExists = false;
            } finally {
                this.isFormatLoading = false;
            }
        },

        closeFormatModal() {
            this.showFormatModal = false;
            document.body.style.overflow = ''; // Mengembalikan scroll
            
            setTimeout(() => {
                const iframe = document.getElementById('format-iframe');
                if (iframe) {
                    iframe.contentWindow.document.open();
                    iframe.contentWindow.document.write('');
                    iframe.contentWindow.document.close();
                }
            }, 300); // Bersihkan setelah animasi tutup selesai
        },

        downloadFormatPDF() {
            if (!this.formatExists || !this.currentFormatItem) return;
            
            const iframe = document.getElementById('format-iframe');
            if (!iframe) return;
            
            // Mengambil elemen wrapper di dalam iframe untuk dicetak
            // Mengambil elemen div terluar dari body iframe
            const element = iframe.contentWindow.document.body.querySelector('div') || iframe.contentWindow.document.body;
            
            // Tambahkan flag loading pada modal PDF
            this.isFormatLoading = true;
            
            const opt = {
                margin:       10,
                filename:     `Format_Data_Dukung_${this.currentFormatItem.id}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, windowWidth: 850 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save().then(() => {
                this.isFormatLoading = false;
            }).catch(err => {
                console.error("Gagal membuat PDF format:", err);
                this.isFormatLoading = false;
            });
        },

        async init() {
            const saved = localStorage.getItem('lppd-theme');
            if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                this.isDarkMode = true;
                document.documentElement.classList.add('dark');
            }

            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.substring(1);
                if (this.tabs.find(t => t.id === hash)) {
                    this.activeMenu = hash;
                }
            });

            this.$watch('activeMenu', value => {
                window.location.hash = value;
            });

            try {
                const [ikkRes, introRes, macroRes] = await Promise.all([
                    fetch('./data/ikk_details.json'),
                    fetch('./data/intro_chapters.json'),
                    fetch('./data/macro_indicators.json'),
                ]);
                this.ikkData = await ikkRes.json();
                this.introData = await introRes.json();
                this.macroIndicators = await macroRes.json();
            } catch (err) {
                console.error('Gagal memuat data:', err);
            } finally {
                this.isLoading = false;
                this.$nextTick(() => lucide.createIcons());
            }
        },
    }));
});

Alpine.start();
