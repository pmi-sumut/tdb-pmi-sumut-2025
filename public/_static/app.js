document.addEventListener('alpine:init', () => {
    Alpine.data('dashboard', () => ({
        baseUrl: '/api',
        apiLatest: '/bnpb/latest',
        apiPosko: '/pmi/posko',
        apiGiat: '/pmi/giat',
        apiShelter: '/kobo/shelter',
        apiService: '/kobo/service',
        apiLayanan: '/kobo/giat',
        isLoadingLayanan: true,
        layananList: [],
        
        // Filter States
        filterTanggal: '',
        filterKabKota: '',
        filterJenisLayanan: '',
        filterSubLayanan: '',

        currentLayananPage: 1,
        itemsPerLayananPage: 10,
        lastUpdate: '',
        isLoading: true,
        isLoadingMap: true,
        isLoadingGiat: true,
        isLoadingShelter: true,
        isLoadingService: true,
        isLoadingWeather: true,
        weatherData: null,
        userCoordinates: null,
        showDetailModal: false,
        selectedService: null,
        chartJenisKelamin: null,
        chartUsia: null,
        stats: {
            meninggalTotal: 0,
            hilang: 0,
            lukaSakit: 0,
            rumahRusak: 0,
            kabTerdampak: 0,
            fasilitasUmumRusak: 0,
            pendidikanRusak: 0,
            rumahIbadahRusak: 0,
            fasyankesRusak: 0,
            kantorRusak: 0,
            jembatanRusak: 0,
            meninggal: {
                tapanuliSelatan: 0,
                kotaSibolga: 0,
                tapanuliUtara: 0,
                deliSerdang: 0,
                langkat: 0,
                humbangHasundutan: 0,
                tapanuliTengah: 0,
                kotaMedan: 0
            }
        },
        shelterData: {
            totalPengungsi: {
                kk: 0,
                jiwa: 0,
                laki: 0,
                perempuan: 0,
                rentan: 0
            },
            pengungsiPerKabKota: [],
            pengungsiUsia: [],
            pengungsiRentan: []
        },
        // Service Filter States
        filterServiceTanggal: '',
        filterServiceKabKota: '',
        serviceData: [],
        giatList: [],
        poskoMarkers: [],
        markerRotationStarted: false,
        markerRotationIndex: 0,
        chartPengungsiKabKota: null,
        chartPengungsiUsia: null,
        chartPengungsiRentan: null,
        chartTopLayanan: null,
        chartDistribusiLayanan: null,
        chartsRendered: false,
        
        updateClock() {
            const now = new Date();

            const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
            document.getElementById('clockUTC').textContent = new Date(utcTime).toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
            });
            
            const wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            document.getElementById('clockWIB').textContent = wibTime.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
            });
            
            const witaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));
            document.getElementById('clockWITA').textContent = witaTime.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
            });
            
            const witTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jayapura' }));
            document.getElementById('clockWIT').textContent = witTime.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
            });
        },
        
        get totalFasilitasRusak() {
            return (
                (this.stats.fasilitasUmumRusak || 0) +
                (this.stats.kantorRusak || 0) +
                (this.stats.rumahIbadahRusak || 0) +
                (this.stats.fasyankesRusak || 0) +
                (this.stats.pendidikanRusak || 0) +
                (this.stats.jembatanRusak || 0)
            );
        },

        // Filter Options
        get uniqueKabKota() {
            return [...new Set(this.layananList.map(item => item.kab_kota_name))].sort();
        },

        get uniqueJenisLayanan() {
            return [...new Set(this.layananList.map(item => item.jenis_layanan))].sort();
        },

        get uniqueSubLayanan() {
            let list = this.layananList;
            if (this.filterJenisLayanan) {
                list = list.filter(item => item.jenis_layanan === this.filterJenisLayanan);
            }
            return [...new Set(list.map(item => item.sub_layanan).filter(Boolean))].sort();
        },

        get filteredLayananList() {
            return this.layananList.filter(item => {
                const matchTanggal = !this.filterTanggal || item.tanggal_kegiatan === this.filterTanggal;
                const matchKabKota = !this.filterKabKota || item.kab_kota_name === this.filterKabKota;
                const matchJenis = !this.filterJenisLayanan || item.jenis_layanan === this.filterJenisLayanan;
                const matchSub = !this.filterSubLayanan || item.sub_layanan === this.filterSubLayanan;
                return matchTanggal && matchKabKota && matchJenis && matchSub;
            });
        },

        get totalLayanan() {
            return this.filteredLayananList.length;
        },

        get totalLayananPages() {
            return Math.ceil(this.totalLayanan / this.itemsPerLayananPage);
        },

        get paginatedLayananList() {
            const start = (this.currentLayananPage - 1) * this.itemsPerLayananPage;
            const end = start + this.itemsPerLayananPage;
            return this.filteredLayananList.slice(start, end);
        },

        get layananStartIndex() {
            if (this.totalLayanan === 0) return 0;
            return (this.currentLayananPage - 1) * this.itemsPerLayananPage + 1;
        },

        get layananEndIndex() {
            const end = this.currentLayananPage * this.itemsPerLayananPage;
            return Math.min(end, this.totalLayanan);
        },

        get paginationLayananPages() {
            const pages = [];
            const maxVisible = 5;
            let startPage = Math.max(1, this.currentLayananPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(this.totalLayananPages, startPage + maxVisible - 1);
            
            if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            return pages;
        },

        getServiceBorderClass(id) {
            const classes = {
                'pertolongan_pertama': 'border-red-500',
                'evakuasi_korban': 'border-blue-500',
                'shelter': 'border-purple-500',
                'medis': 'border-green-500',
                'tim_ambulans': 'border-orange-500',
                'dapur_umum': 'border-yellow-500',
                'relief_distribusi': 'border-indigo-500',
                'wash': 'border-cyan-500',
                'pemulihan_hubungan': 'border-pink-500',
                'dukungan_psikososial': 'border-teal-500'
            };
            return classes[id] || 'border-gray-500';
        },

        getServiceBgClass(id) {
            const classes = {
                'pertolongan_pertama': 'bg-red-100',
                'evakuasi_korban': 'bg-blue-100',
                'shelter': 'bg-purple-100',
                'medis': 'bg-green-100',
                'tim_ambulans': 'bg-orange-100',
                'dapur_umum': 'bg-yellow-100',
                'relief_distribusi': 'bg-indigo-100',
                'wash': 'bg-cyan-100',
                'pemulihan_hubungan': 'bg-pink-100',
                'dukungan_psikososial': 'bg-teal-100'
            };
            return classes[id] || 'bg-gray-100';
        },

        hasDetailData(detail) {
            if (!detail) return false;
            
            for (let key in detail) {
                if (Array.isArray(detail[key]) && detail[key].length > 0) {
                    if (key === 'jenisPenyakit' || key === 'jenisBantuanFood' || key === 'jenisBantuanNonFood') {
                        const hasNonZero = detail[key].some(item => item.jumlah > 0);
                        if (hasNonZero) return true;
                    } else {
                        return true;
                    }
                }
            }
            return false;
        },

        countDetailItems(detail) {
            if (!detail) return 0;
            
            let count = 0;
            for (let key in detail) {
                if (Array.isArray(detail[key])) {
                    if (key === 'jenisPenyakit' || key === 'jenisBantuanFood' || key === 'jenisBantuanNonFood') {
                        count += detail[key].filter(item => item.jumlah > 0).length;
                    } else {
                        count += detail[key].length;
                    }
                }
            }
            return count;
        },

        renderDetailCharts(service) {
            this.destroyDetailCharts();
            
            this.$nextTick(() => {
                const ctxGender = document.getElementById('chartJenisKelamin');
                if (ctxGender && service.jenisKelamin) {
                    const genderData = service.jenisKelamin;
                    if (genderData.lakiLaki > 0 || genderData.perempuan > 0) {
                        this.chartJenisKelamin = new Chart(ctxGender, {
                            type: 'doughnut',
                            data: {
                                labels: ['Laki-laki', 'Perempuan'],
                                datasets: [{
                                    data: [genderData.lakiLaki, genderData.perempuan],
                                    backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(236, 72, 153, 0.8)'],
                                    borderColor: ['rgba(59, 130, 246, 1)', 'rgba(236, 72, 153, 1)'],
                                    borderWidth: 2
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom', labels: { padding: 15, font: { size: 12, weight: 'bold' } } },
                                    tooltip: {
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        padding: 12,
                                        callbacks: {
                                            label: function(context) {
                                                const label = context.label || '';
                                                const value = context.parsed || 0;
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const percentage = ((value / total) * 100).toFixed(1);
                                                return label + ': ' + value.toLocaleString('id-ID') + ' jiwa (' + percentage + '%)';
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }

                const ctxAge = document.getElementById('chartUsia');
                if (ctxAge && service.usia) {
                    const usiaData = service.usia;
                    const usiaTotal = usiaData.kurangDari5 + usiaData.antara5Hingga17 + usiaData.antara18Hingga60 + usiaData.lebihDari60;
                    if (usiaTotal > 0) {
                        this.chartUsia = new Chart(ctxAge, {
                            type: 'doughnut',
                            data: {
                                labels: ['< 5 tahun', '5-17 tahun', '18-60 tahun', '> 60 tahun'],
                                datasets: [{
                                    data: [usiaData.kurangDari5, usiaData.antara5Hingga17, usiaData.antara18Hingga60, usiaData.lebihDari60],
                                    backgroundColor: ['rgba(251, 191, 36, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                                    borderColor: ['rgba(251, 191, 36, 1)', 'rgba(34, 197, 94, 1)', 'rgba(139, 92, 246, 1)', 'rgba(239, 68, 68, 1)'],
                                    borderWidth: 2
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom', labels: { padding: 15, font: { size: 12, weight: 'bold' } } },
                                    tooltip: {
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        padding: 12,
                                        callbacks: {
                                            label: function(context) {
                                                const label = context.label || '';
                                                const value = context.parsed || 0;
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const percentage = ((value / total) * 100).toFixed(1);
                                                return label + ': ' + value.toLocaleString('id-ID') + ' jiwa (' + percentage + '%)';
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            });
        },

        destroyDetailCharts() {
            if (this.chartJenisKelamin) {
                this.chartJenisKelamin.destroy();
                this.chartJenisKelamin = null;
            }
            if (this.chartUsia) {
                this.chartUsia.destroy();
                this.chartUsia = null;
            }
        },

        openDetailModal(service) {
            this.selectedService = service;
            this.showDetailModal = true;
            this.renderDetailCharts(service);
        },

        async fetchData() {
            try {
                const res = await fetch(this.baseUrl + this.apiLatest, { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                if (!json.success || !json.data) return;
                const d = json.data;
                if (d.meninggalTotal !== undefined) this.stats.meninggalTotal = d.meninggalTotal;
                if (d.hilang !== undefined) this.stats.hilang = d.hilang;
                if (d.lukaSakit !== undefined) this.stats.lukaSakit = d.lukaSakit;
                if (d.rumahRusak !== undefined) this.stats.rumahRusak = d.rumahRusak;
                if (d.kabupatenTerdampak !== undefined) this.stats.kabTerdampak = d.kabupatenTerdampak;
                if (d.fasilitasUmumRusak !== undefined) this.stats.fasilitasUmumRusak = d.fasilitasUmumRusak;
                if (d.pendidikanRusak !== undefined) this.stats.pendidikanRusak = d.pendidikanRusak;
                if (d.rumahIbadahRusak !== undefined) this.stats.rumahIbadahRusak = d.rumahIbadahRusak;
                if (d.fasyankesRusak !== undefined) this.stats.fasyankesRusak = d.fasyankesRusak;
                if (d.kantorRusak !== undefined) this.stats.kantorRusak = d.kantorRusak;
                if (d.jembatanRusak !== undefined) this.stats.jembatanRusak = d.jembatanRusak;
                if (d.meninggal) {
                    this.stats.meninggal = {
                        ...this.stats.meninggal,
                        ...d.meninggal
                    };
                }
                if (d.updatedAt) {
                    this.lastUpdate = d.updatedAt + ' WIB';
                }
                this.isLoading = false;
            } catch (e) {
                this.isLoading = false;
            }
        },
        
        async fetchShelter() {
            try {
                const res = await fetch(this.baseUrl + this.apiShelter, { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                if (!json.success || !json.data) return;
                
                this.shelterData = json.data;
                this.isLoadingShelter = false;
                
                await this.$nextTick();
                this.renderShelterCharts();
            } catch (e) {
                this.isLoadingShelter = false;
            }
        },
        
        async fetchService() {
            try {
                const params = new URLSearchParams();
                if (this.filterServiceTanggal) params.append('date', this.filterServiceTanggal);
                if (this.filterServiceKabKota) params.append('kab_kota', this.filterServiceKabKota);
                
                const url = `${this.baseUrl}${this.apiService}?${params.toString()}`;
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                if (!json.success || !json.data) return;
                
                this.serviceData = json.data;
                this.isLoadingService = false;
                
                await this.$nextTick();
                setTimeout(() => {
                    this.renderServiceCharts();
                }, 100);
            } catch (e) {
                this.isLoadingService = false;
            }
        },

        async fetchWeather() {
            try {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            this.userCoordinates = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            };
                            
                            const url = `https://service.pmi-tech.id/api/v1/bmkg-service/weather/current?longitude=${this.userCoordinates.longitude}&latitude=${this.userCoordinates.latitude}`;
                            
                            try {
                                const res = await fetch(url, { 
                                    cache: 'no-store',
                                    mode: 'cors'
                                });
                                
                                if (!res.ok) {
                                    console.error('Weather API response not OK:', res.status);
                                    this.isLoadingWeather = false;
                                    return;
                                }
                                
                                const json = await res.json();
                                
                                if (json.success && json.data) {
                                    this.weatherData = json.data;
                                    console.log('Weather data loaded:', this.weatherData);
                                } else {
                                    console.error('Invalid weather data structure');
                                }
                                
                                this.isLoadingWeather = false;
                            } catch (fetchError) {
                                console.error('Weather API fetch error:', fetchError);
                                this.isLoadingWeather = false;
                            }
                        },
                        (error) => {
                            console.error('Geolocation error:', error.message);
                            this.isLoadingWeather = false;
                        },
                        {
                            enableHighAccuracy: false,
                            timeout: 10000,
                            maximumAge: 300000
                        }
                    );
                } else {
                    console.error('Geolocation is not supported by this browser');
                    this.isLoadingWeather = false;
                }
            } catch (e) {
                console.error('Weather fetch error:', e);
                this.isLoadingWeather = false;
            }
        },
        
        renderShelterCharts() {
            const ctxKabKota = document.getElementById('chartPengungsiKabKota');
            if (ctxKabKota && this.shelterData.pengungsiPerKabKota.length > 0) {
                if (this.chartPengungsiKabKota) {
                    this.chartPengungsiKabKota.destroy();
                }
                this.chartPengungsiKabKota = new Chart(ctxKabKota, {
                    type: 'bar',
                    data: {
                        labels: this.shelterData.pengungsiPerKabKota.map(d => d.kabKota),
                        datasets: [{
                            label: 'Jumlah Pengungsi',
                            data: this.shelterData.pengungsiPerKabKota.map(d => d.total),
                            backgroundColor: 'rgba(99, 102, 241, 0.8)',
                            borderColor: 'rgba(99, 102, 241, 1)',
                            borderWidth: 2,
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                padding: 12,
                                callbacks: {
                                    label: function(context) {
                                        return 'Pengungsi: ' + context.parsed.y.toLocaleString('id-ID') + ' jiwa';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return value.toLocaleString('id-ID');
                                    }
                                }
                            }
                        }
                    }
                });
            }

            const ctxUsia = document.getElementById('chartPengungsiUsia');
            if (ctxUsia && this.shelterData.pengungsiUsia.length > 0) {
                if (this.chartPengungsiUsia) {
                    this.chartPengungsiUsia.destroy();
                }
                this.chartPengungsiUsia = new Chart(ctxUsia, {
                    type: 'doughnut',
                    data: {
                        labels: this.shelterData.pengungsiUsia.map(d => d.name),
                        datasets: [{
                            data: this.shelterData.pengungsiUsia.map(d => d.value),
                            backgroundColor: [
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(16, 185, 129, 0.8)',
                                'rgba(251, 191, 36, 0.8)',
                                'rgba(239, 68, 68, 0.8)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }

            const ctxRentan = document.getElementById('chartPengungsiRentan');
            if (ctxRentan && this.shelterData.pengungsiRentan.length > 0) {
                if (this.chartPengungsiRentan) {
                    this.chartPengungsiRentan.destroy();
                }
                this.chartPengungsiRentan = new Chart(ctxRentan, {
                    type: 'bar',
                    data: {
                        labels: this.shelterData.pengungsiRentan.map(d => d.name),
                        datasets: [{
                            label: 'Jumlah',
                            data: this.shelterData.pengungsiRentan.map(d => d.value),
                            backgroundColor: 'rgba(245, 158, 11, 0.8)',
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        indexAxis: 'y',
                        plugins: { legend: { display: false } }
                    }
                });
            }
        },
        
        renderServiceCharts() {
            if (this.chartsRendered) return;
            
            const ctxTop = document.getElementById('chartTopLayanan');
            const ctxDist = document.getElementById('chartDistribusiLayanan');
            
            if (!ctxTop || !ctxDist || !this.serviceData || this.serviceData.length === 0) {
                return;
            }

            try {
                const topServices = [...this.serviceData]
                    .sort((a, b) => b.penerimaManfaat - a.penerimaManfaat);
                    // .slice(0, 5); // Removed slice to show all data

                if (this.chartTopLayanan) {
                    this.chartTopLayanan.destroy();
                    this.chartTopLayanan = null;
                }
                if (this.chartDistribusiLayanan) {
                    this.chartDistribusiLayanan.destroy();
                    this.chartDistribusiLayanan = null;
                }
                
                // Calculate dynamic height based on number of items (approx 40px per item)
                // Default 400px in CSS, but we can override canvas height attribute or style if needed?
                // Actually Chart.js in 'maintainAspectRatio: false' will fill parent.
                // We might need to adjust parent height if we really want to scroll, but user said "tampilan semua data di chart".
                // If it fits in 400px, great. If not, bars get thin.
                // Let's rely on standard fitting for now.

                this.chartTopLayanan = new Chart(ctxTop, {
                    type: 'bar',
                    data: {
                        labels: topServices.map(s => s.value),
                        datasets: [{
                            label: 'Penerima Manfaat',
                            data: topServices.map(s => s.penerimaManfaat),
                            backgroundColor: 'rgba(239, 68, 68, 0.8)',
                            borderColor: 'rgba(239, 68, 68, 1)',
                            borderWidth: 1,
                            borderRadius: 4,
                            barThickness: 'flex',
                            maxBarThickness: 32
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        onClick: (event, activeElements) => {
                            if (activeElements.length > 0) {
                                const index = activeElements[0].index;
                                const service = topServices[index];
                                this.openDetailModal(service);
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                padding: 12,
                                callbacks: {
                                    label: function(context) {
                                        return 'Penerima: ' + context.parsed.x.toLocaleString('id-ID') + ' jiwa';
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return value.toLocaleString('id-ID');
                                    }
                                }
                            }
                        }
                    }
                });

                const colors = [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(20, 184, 166, 0.8)'
                ];

                this.chartDistribusiLayanan = new Chart(ctxDist, {
                    type: 'doughnut',
                    data: {
                        labels: this.serviceData.map(s => s.value),
                        datasets: [{
                            data: this.serviceData.map(s => s.count),
                            backgroundColor: colors,
                            borderColor: colors.map(c => c.replace('0.8', '1')),
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        onClick: (event, activeElements) => {
                            if (activeElements.length > 0) {
                                const index = activeElements[0].index;
                                const service = this.serviceData[index];
                                this.openDetailModal(service);
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 10,
                                    font: {
                                        size: 11,
                                        weight: 'bold'
                                    }
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                padding: 12,
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return label + ': ' + value + ' kegiatan (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });

                this.chartsRendered = true;
            } catch (error) {
            }
        },
        
        async fetchPosko() {
            try {
                const res = await fetch(this.baseUrl + this.apiPosko, { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                if (!json.success || !json.data) return;
                this.poskoMarkers.forEach(m => map.removeLayer(m));
                this.poskoMarkers = [];
                json.data.forEach(posko => {
                    if (posko.latitude == null || posko.longitude == null) return;
                    const icon = L.divIcon({
                        className: 'custom-div-icon',
                        html: '<div style="background-color: #dc2626; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 16px rgba(220, 38, 38, 0.6);"></div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    const marker = L.marker([posko.latitude, posko.longitude], { icon }).addTo(map);
                    marker.bindPopup(`
                        <div class="p-5" style="min-width: 320px; font-family: Inter;">
                            <div class="flex items-center space-x-3 mb-4 pb-3 border-b-2 border-red-600">
                                <div class="w-12 h-12 flex items-center justify-center">
                                    <img src="https://pmisumut.org/assets/img/favicon.png" alt="Logo" class="w-12 h-12 rounded-lg">
                                </div>
                                <h3 class="font-black text-gray-900 text-xl">${posko.kabKota || ''}</h3>
                            </div>
                            <div class="space-y-3 text-sm mb-4">
                                <p class="font-bold text-gray-900 ml-7">${posko.namaKoordinator || ''}</p>
                                <div class="flex items-center space-x-2 mt-3">
                                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                    </svg>
                                    <span class="text-blue-600 font-black text-lg">${posko.noHp || ''}</span>
                                </div>
                                <div class="flex items-start space-x-2 mt-3">
                                    <p class="text-gray-600 text-xs">${posko.alamat || ''}</p>
                                </div>
                            </div>
                        </div>
                    `);
                    this.poskoMarkers.push(marker);
                });
                this.startMarkerRotation();
                this.isLoadingMap = false;
            } catch (e) {
                this.isLoadingMap = false;
            }
        },
        
        async fetchGiat() {
            try {
                const res = await fetch(this.baseUrl + this.apiGiat, { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                if (!json.success || !json.data) return;
                this.giatList = json.data;
                this.scrollGiatToBottom();
                this.isLoadingGiat = false;
            } catch (e) {
                this.isLoadingGiat = false;
            }
        },
        
        scrollGiatToBottom() {
            this.$nextTick(() => {
                const el = this.$refs.giatContainer;
                if (el) {
                    el.scrollTop = el.scrollHeight;
                }
            });
        },
        
        startMarkerRotation() {
            if (this.markerRotationStarted || this.poskoMarkers.length === 0) {
                if (!this.markerRotationStarted && this.poskoMarkers.length > 0) {
                    this.poskoMarkers[0].openPopup();
                }
                return;
            }
            this.markerRotationStarted = true;
            this.markerRotationIndex = 0;
            this.poskoMarkers[0].openPopup();
            setInterval(() => {
                if (this.poskoMarkers.length === 0) return;
                this.markerRotationIndex = (this.markerRotationIndex + 1) % this.poskoMarkers.length;
                this.poskoMarkers[this.markerRotationIndex].openPopup();
            }, 5000);
        },

        nextLayananPage() {
            if (this.currentLayananPage < this.totalLayananPages) {
                this.currentLayananPage++;
                this.scrollToLayananTop();
            }
        },

        prevLayananPage() {
            if (this.currentLayananPage > 1) {
                this.currentLayananPage--;
                this.scrollToLayananTop();
            }
        },

        goToLayananPage(page) {
            this.currentLayananPage = page;
            this.scrollToLayananTop();
        },

        scrollToLayananTop() {
            const section = document.querySelector('h2:has-text("Giat Layanan")');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        async fetchLayanan() {
            try {
                const res = await fetch(this.baseUrl + this.apiLayanan, { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                if (!json.success || !json.data) return;
                
                this.layananList = json.data.sort((a, b) => {
                    return new Date(b.tanggal_kegiatan) - new Date(a.tanggal_kegiatan);
                });
                
                this.isLoadingLayanan = false;
            } catch (e) {
                console.error('Error fetching layanan:', e);
                this.isLoadingLayanan = false;
            }
        },
        init() {
            this.updateClock();
            setInterval(() => {
                this.updateClock();
            }, 1000);
            
            this.fetchData();
            this.fetchShelter();
            this.fetchService();
            this.fetchPosko();
            this.fetchGiat();
            this.fetchWeather();
            this.fetchLayanan();
            
            // Watchers for filters logic (Alpine watchers can be done in x-init or init)
            this.$watch('filterTanggal', () => this.currentLayananPage = 1);
            this.$watch('filterKabKota', () => this.currentLayananPage = 1);
            this.$watch('filterJenisLayanan', () => {
                this.currentLayananPage = 1;
                this.filterSubLayanan = ''; // Reset sub layanan when jenis changes
            });
            this.$watch('filterSubLayanan', () => this.currentLayananPage = 1);
            
            // Watchers for Service Filters (Backend)
            this.$watch('filterServiceTanggal', () => {
                this.isLoadingService = true;
                this.fetchService();
            });
            this.$watch('filterServiceKabKota', () => {
                this.isLoadingService = true;
                this.fetchService();
            });

            setInterval(() => {
                this.fetchData();
                this.fetchShelter();
                this.fetchPosko();
                this.fetchGiat();
                this.fetchWeather();
                this.fetchLayanan();
            }, 60000);
        }
    }));
});

const map = L.map('map').setView([2.1154, 99.5451], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Palang Merah Indonesia © OpenStreetMap',
    maxZoom: 18
}).addTo(map);
