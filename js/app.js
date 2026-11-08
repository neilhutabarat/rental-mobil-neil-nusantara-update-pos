// State Management
let currentUser = null; // { username, name, role }
let localTransactions = []; // Transaksi lokal tersimpan di HP ini
let cloudTransactions = []; // Transaksi global dari Firestore (khusus Owner)
let financeData = { income: 0, cogs: 0, expense: 0 };
let db = null;

// Daftar User Default (Tersimpan di LocalStorage jika belum ada)
const DEFAULT_USERS = [
    { username: "owner", pin: "1234", name: "Neil (Owner)", role: "owner" },
    { username: "kasir1", pin: "1111", name: "Kasir Maya", role: "staff" },
    { username: "kasir2", pin: "2222", name: "Kasir Rina", role: "staff" },
    { username: "terapis", pin: "3333", name: "Terapis Budi", role: "staff" }
];

// Inisialisasi Aplikasi
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initUsers();
    initFirebase();
    checkSession();
});

// Setup User Storage
function initUsers() {
    if (!localStorage.getItem('fm_users')) {
        localStorage.setItem('fm_users', JSON.stringify(DEFAULT_USERS));
    }
}

function getUsers() {
    return JSON.parse(localStorage.getItem('fm_users') || '[]');
}

// Inisialisasi Firebase Firestore
function initFirebase() {
    if (APP_CONFIG.firebase && APP_CONFIG.firebase.apiKey) {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(APP_CONFIG.firebase);
            }
            db = firebase.firestore();
        } catch (e) {
            console.error("Firebase init error:", e);
        }
    }
}

// Session Check
function checkSession() {
    const saved = localStorage.getItem('fm_current_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        showApp();
    } else {
        showLogin();
    }
}

// Login System
function handleLogin(e) {
    if (e) e.preventDefault();
    const userSelect = document.getElementById('login-username').value;
    const pin = document.getElementById('login-pin').value.trim();

    const users = getUsers();
    const match = users.find(u => u.username === userSelect && u.pin === pin);

    if (match) {
        currentUser = { username: match.username, name: match.name, role: match.role };
        localStorage.setItem('fm_current_user', JSON.stringify(currentUser));
        document.getElementById('login-pin').value = "";
        showApp();
    } else {
        alert("PIN salah! Silakan coba lagi.");
    }
}

function handleLogout() {
    if (confirm("Keluar dari akun " + currentUser.name + "?")) {
        localStorage.removeItem('fm_current_user');
        currentUser = null;
        showLogin();
    }
}

// Toggle View Login vs App
function showLogin() {
    document.getElementById('screen-login').classList.remove('hidden');
    document.getElementById('screen-app').classList.add('hidden');
    document.getElementById('bottom-nav').classList.add('hidden');
    renderUserSelectOptions();
    lucide.createIcons();
}

function renderUserSelectOptions() {
    const select = document.getElementById('login-username');
    select.innerHTML = "";
    getUsers().forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.username;
        opt.innerText = `${u.name} (${u.role === 'owner' ? 'Owner' : 'Karyawan'})`;
        select.appendChild(opt);
    });
}

function showApp() {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-app').classList.remove('hidden');

    document.getElementById('user-display-name').innerText = currentUser.name;
    const roleBadge = document.getElementById('role-display-badge');
    roleBadge.innerText = currentUser.role === 'owner' ? 'Owner' : 'Kasir';
    roleBadge.className = currentUser.role === 'owner' 
        ? "px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200"
        : "px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200";

    // Kontrol Hak Akses Navigasi Menu
    if (currentUser.role === 'owner') {
        document.getElementById('nav-dashboard').classList.remove('hidden');
        document.getElementById('nav-report').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        loadCloudDataOwner();
        switchTab('dashboard');
    } else {
        // Staff/Kasir HANYA bisa buka menu input struk & closing sync
        document.getElementById('nav-dashboard').classList.add('hidden');
        document.getElementById('nav-report').classList.add('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        loadLocalDataStaff();
        switchTab('scan');
    }
    lucide.createIcons();
}

// Data Lokal Kasir (Tersimpan di HP masing-masing)
function getLocalKey() {
    return 'fm_tx_' + currentUser.username;
}

function loadLocalDataStaff() {
    const raw = localStorage.getItem(getLocalKey());
    localTransactions = raw ? JSON.parse(raw) : [];
    renderLocalStaffTransactions();
}

function saveLocalDataStaff() {
    localStorage.setItem(getLocalKey(), JSON.stringify(localTransactions));
    renderLocalStaffTransactions();
}

// Tambah Transaksi di HP Kasir (Lokal)
function submitLocalTransaction() {
    const amount = parseFloat(document.getElementById('form-amount').value) || 0;
    const desc = document.getElementById('form-desc').value.trim() || "Catatan transaksi";
    const type = document.getElementById('form-category').value;

    if (amount <= 0) {
        alert("Nominal transaksi masih kosong! Masukkan nominal yang sesuai.");
        return;
    }

    const newTx = {
        id: 'tx_' + Date.now(),
        staffUsername: currentUser.username,
        staff: currentUser.name,
        desc: desc,
        amount: amount,
        type: type,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateFull: new Date().toLocaleDateString('id-ID'),
        timestamp: Date.now(),
        synced: false
    };

    localTransactions.unshift(newTx);
    saveLocalDataStaff();
    resetForm();
    alert("Tersimpan di HP Anda! Jangan lupa tekan tombol 'Sinkron ke Owner' saat closing harian.");
}

function renderLocalStaffTransactions() {
    const list = document.getElementById('local-tx-list');
    const unsynced = localTransactions.filter(t => !t.synced);
    document.getElementById('unsynced-count-badge').innerText = `${unsynced.length} Belum Sinkron`;
    
    list.innerHTML = "";
    if (localTransactions.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-400 py-3 text-xs">Belum ada catatan hari ini.</p>`;
        return;
    }

    localTransactions.forEach((item, index) => {
        let badgeColor = item.type === 'income' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
        let prefix = item.type === 'income' ? '+' : '-';
        let syncStatus = item.synced 
            ? `<span class="text-[10px] text-emerald-600 font-bold flex items-center"><i data-lucide="check" class="w-3 h-3 mr-0.5"></i> Terkirim</span>` 
            : `<span class="text-[10px] text-amber-600 font-bold flex items-center"><i data-lucide="clock" class="w-3 h-3 mr-0.5"></i> Menunggu Closing</span>`;

        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100";
        div.innerHTML = `
            <div>
                <p class="font-bold text-gray-800 text-xs">${item.desc}</p>
                <div class="flex items-center space-x-2 mt-0.5">
                    <span class="text-[10px] text-gray-400">${item.date}</span>
                    <span class="text-[10px] text-gray-300">•</span>
                    ${syncStatus}
                </div>
            </div>
            <div class="text-right">
                <span class="font-extrabold text-xs px-2 py-0.5 rounded ${badgeColor} block">
                    ${prefix} ${formatRupiah(item.amount)}
                </span>
                ${!item.synced ? `<button onclick="deleteLocalTx(${index})" class="text-[10px] text-gray-400 hover:text-rose-500 mt-1">Hapus</button>` : ''}
            </div>
        `;
        list.appendChild(div);
    });
    lucide.createIcons();
}

function deleteLocalTx(idx) {
    if (confirm("Hapus catatan ini sebelum disinkronkan?")) {
        localTransactions.splice(idx, 1);
        saveLocalDataStaff();
    }
}

// PROSES SINKRONISASI BATCH SAAT CLOSING HARIAN
async function syncLocalToCloud() {
    const unsynced = localTransactions.filter(t => !t.synced);
    if (unsynced.length === 0) {
        alert("Semua catatan di HP Anda sudah tersinkronisasi ke Owner!");
        return;
    }

    if (!confirm(`Kirim ${unsynced.length} data transaksi closing ke Owner sekarang?`)) {
        return;
    }

    if (!db) {
        alert("Gagal koneksi ke database Firestore. Pastikan internet Anda aktif!");
        return;
    }

    const btn = document.getElementById('btn-sync-cloud');
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Mengirim data...`;

    try {
        const batch = db.batch();
        unsynced.forEach(tx => {
            const docRef = db.collection("transactions").doc(tx.id);
            batch.set(docRef, {
                staffUsername: tx.staffUsername,
                staff: tx.staff,
                desc: tx.desc,
                amount: tx.amount,
                type: tx.type,
                date: tx.date,
                dateFull: tx.dateFull,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        // Tandai transaksi di HP ini sudah tersinkronisasi
        localTransactions.forEach(t => t.synced = true);
        saveLocalDataStaff();

        alert(`Closing Berhasil! ${unsynced.length} transaksi telah terkirim ke sistem Owner.`);
    } catch (err) {
        console.error("Sync error:", err);
        alert("Gagal sinkronisasi: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4 mr-2"></i> Sinkron Data ke Owner (Closing)`;
        lucide.createIcons();
    }
}

// OWNER: Load Seluruh Data dari Firestore
function loadCloudDataOwner() {
    if (!db) return;
    db.collection("transactions").orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            financeData = { income: 0, cogs: 0, expense: 0 };
            cloudTransactions = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id;
                cloudTransactions.push(data);
                const amount = Number(data.amount) || 0;
                if (data.type === 'income') financeData.income += amount;
                if (data.type === 'cogs') financeData.cogs += amount;
                if (data.type === 'expense') financeData.expense += amount;
            });
            updateOwnerDashboard();
            renderOwnerTransactions();
        }, (err) => {
            console.error("Firestore owner error:", err);
        });
}

function updateOwnerDashboard() {
    const grossProfit = financeData.income - financeData.cogs;
    const netProfit = grossProfit - financeData.expense;

    document.getElementById('val-net-profit').innerText = formatRupiah(netProfit);
    document.getElementById('val-income').innerText = formatRupiah(financeData.income);
    document.getElementById('val-cogs').innerText = formatRupiah(financeData.cogs);
    document.getElementById('val-expense').innerText = formatRupiah(financeData.expense);

    document.getElementById('rep-income').innerText = formatRupiah(financeData.income);
    document.getElementById('rep-cogs').innerText = formatRupiah(financeData.cogs);
    document.getElementById('rep-gross').innerText = formatRupiah(grossProfit);
    document.getElementById('rep-expense').innerText = formatRupiah(financeData.expense);
    document.getElementById('rep-net').innerText = formatRupiah(netProfit);
}

function renderOwnerTransactions() {
    const list = document.getElementById('owner-tx-list');
    document.getElementById('total-tx-count').innerText = `${cloudTransactions.length} Transaksi Masuk`;
    list.innerHTML = "";

    if (cloudTransactions.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-400 py-4 text-xs">Belum ada data closing masuk dari kasir.</p>`;
        return;
    }

    cloudTransactions.forEach((item) => {
        let badgeColor = item.type === 'income' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
        let prefix = item.type === 'income' ? '+' : '-';

        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100";
        div.innerHTML = `
            <div>
                <p class="font-bold text-gray-800 text-xs">${item.desc}</p>
                <p class="text-[10px] text-gray-400">Oleh: <span class="font-semibold text-gray-700">${item.staff}</span> • ${item.date || ''}</p>
            </div>
            <span class="font-extrabold text-xs px-2 py-1 rounded ${badgeColor}">
                ${prefix} ${formatRupiah(item.amount)}
            </span>
        `;
        list.appendChild(div);
    });
}

// Buka Kamera / Galeri
function triggerCameraCapture() {
    document.getElementById('camera-file-input').click();
}

function triggerGalleryPick() {
    document.getElementById('gallery-file-input').click();
}

function handleReceiptSelected(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('photo-attached-chip').classList.remove('hidden');
        document.getElementById('photo-name-chip').innerText = file.name || "Foto siap";
    }
}

function resetForm() {
    document.getElementById('form-amount').value = "";
    document.getElementById('form-desc').value = "";
    document.getElementById('camera-file-input').value = "";
    document.getElementById('gallery-file-input').value = "";
    document.getElementById('photo-attached-chip').classList.add('hidden');
}

// Navigasi Tab
function switchTab(tabName) {
    // Larang staff membuka tab dashboard dan report
    if ((tabName === 'dashboard' || tabName === 'report') && currentUser.role !== 'owner') {
        alert("Akses Ditolak: Halaman ini hanya dapat diakses oleh Owner.");
        return;
    }

    ['scan', 'dashboard', 'report'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        const nav = document.getElementById(`nav-${t}`);
        if (el) el.classList.add('hidden');
        if (nav) {
            nav.classList.remove('text-emerald-600');
            nav.classList.add('text-gray-400');
        }
    });

    const activeTab = document.getElementById(`tab-${tabName}`);
    const activeNav = document.getElementById(`nav-${tabName}`);
    if (activeTab) activeTab.classList.remove('hidden');
    if (activeNav) {
        activeNav.classList.add('text-emerald-600');
        activeNav.classList.remove('text-gray-400');
    }
    lucide.createIcons();
}

// Format Rupiah Helper
function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(num || 0);
}

// PDF & WhatsApp
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const grossProfit = financeData.income - financeData.cogs;
    const netProfit = grossProfit - financeData.expense;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(46, 125, 50);
    doc.text(APP_CONFIG.businessName, 20, 25);
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text("REKAP LABA RUGI CLOSING HARIAN", 20, 32);
    doc.line(20, 38, 190, 38);

    let y = 48;
    doc.text("Total Pendapatan", 20, y);
    doc.text(formatRupiah(financeData.income), 190, y, { align: "right" });
    y += 10;
    doc.text("Total HPP", 20, y);
    doc.text("(" + formatRupiah(financeData.cogs) + ")", 190, y, { align: "right" });
    y += 6;
    doc.line(20, y, 190, y);
    y += 8;
    doc.text("Laba Kotor", 20, y);
    doc.text(formatRupiah(grossProfit), 190, y, { align: "right" });
    y += 12;
    doc.text("Total Beban Operasional", 20, y);
    doc.text("(" + formatRupiah(financeData.expense) + ")", 190, y, { align: "right" });
    y += 6;
    doc.line(20, y, 190, y);
    y += 8;
    doc.setFontSize(13);
    doc.setTextColor(46, 125, 50);
    doc.text("TOTAL LABA BERSIH", 20, y);
    doc.text(formatRupiah(netProfit), 190, y, { align: "right" });

    doc.save("Rekap_Laba_Rugi_" + APP_CONFIG.businessName.replace(/\s+/g, '_') + ".pdf");
}

function shareReport() {
    const grossProfit = financeData.income - financeData.cogs;
    const netProfit = grossProfit - financeData.expense;
    const msg = `*REKAP KEUANGAN - ${APP_CONFIG.businessName}*\n\n` +
                `Total Pendapatan: ${formatRupiah(financeData.income)}\n` +
                `Total HPP: ${formatRupiah(financeData.cogs)}\n` +
                `Total Beban: ${formatRupiah(financeData.expense)}\n` +
                `-----------------------------------\n` +
                `*TOTAL LABA BERSIH: ${formatRupiah(netProfit)}*\n\n` +
                `_Laporan closing via ${APP_CONFIG.appName}_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}
