// Shared Core Engine - Ony Coffee
let db = null;

const DEFAULT_COA = [
    { code: "4-1001", name: "Penjualan Aneka Kopi", category: "sales" },
    { code: "4-1002", name: "Penjualan Minuman Non-Kopi & Snack", category: "sales" },
    { code: "4-1003", name: "Pendapatan Lain-lain Kafe", category: "sales" },
    { code: "5-1001", name: "Pembelian Bahan Baku Kopi & Susu", category: "cogs" },
    { code: "5-1002", name: "Pembelian Cup & Packaging Kafe", category: "cogs" },
    { code: "5-1003", name: "Ongkos Angkut Bahan Baku", category: "cogs" },
    { code: "6-1001", name: "Biaya Listrik, Air & Gas Kafe", category: "expense" },
    { code: "6-1002", name: "Biaya Operasional & Pemeliharaan Mesin Kopi", category: "expense" },
    { code: "6-1003", name: "Gaji Barista & Karyawan Kafe", category: "expense" },
    { code: "6-1004", name: "Biaya Internet & Kebersihan Kafe", category: "expense" },
    { code: "6-1005", name: "Biaya Operasional Lainnya", category: "expense" },
    { code: "3-2001", name: "Prive Pemilik (Tarik Kas Pribadi)", category: "prive" }
];

const DEFAULT_RAW_MATERIALS = [
    { code: "BB-001", name: "Biji Kopi Arabika", type: "Bahan Pokok", unit: "Kg", costPerUnit: 185000, initialQty: 25, finalQty: 8 },
    { code: "BB-002", name: "Susu Fresh Milk", type: "Bahan Pokok", unit: "Liter", costPerUnit: 22000, initialQty: 50, finalQty: 14 },
    { code: "BB-003", name: "Sirup Karamel", type: "Flavour / Sirup", unit: "Botol", costPerUnit: 85000, initialQty: 15, finalQty: 4 },
    { code: "BB-004", name: "Cup Plastik 16oz", type: "Packaging", unit: "Pcs", costPerUnit: 850, initialQty: 1000, finalQty: 320 }
];

const DEFAULT_NOTICES = [
    { 
        id: "notif_1", 
        senderRole: "manager", 
        senderName: "Head Barista Ony Coffee", 
        title: "Pengecekan Stok Biji Kopi Arabika", 
        message: "Untuk tim closing kasir & barista shift sore, tolong cek fisik sisa Biji Kopi Arabika dan Susu Fresh Milk di chiller ya.", 
        date: "08/11/2026 09:30", 
        timestamp: Date.now() - 3600000, 
        replies: [
            { 
                id: "rep_1", 
                senderRole: "staff", 
                senderName: "Kasir Shift Pagi (Ony)", 
                message: "Siap Kak, Biji Kopi Arabika sisa 8 Kg dan Susu Fresh Milk ada 14 Liter di chiller.", 
                date: "08/11/2026 10:15", 
                timestamp: Date.now() - 2400000 
            }
        ]
    }
];

const ROLES = {
    owner: { title: "Owner", pin: "1234", redirect: "dashboard.html", canInput: false },
    manager: { title: "Manager / Supervisor", pin: "5678", redirect: "dashboard.html", canInput: true },
    staff: { title: "Kasir / Barista", pin: "1111", redirect: "kasir.html", canInput: true }
};

function formatDateTime(dateInput = new Date()) {
    const d = new Date(dateInput);
    const hariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const bulanList = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const hari = hariList[d.getDay()];
    const tgl = d.getDate();
    const bulan = bulanList[d.getMonth()];
    const thn = d.getFullYear();
    const jam = String(d.getHours()).padStart(2, '0');
    const mnt = String(d.getMinutes()).padStart(2, '0');

    return `${hari}, ${tgl} ${bulan} ${thn} | ${jam}.${mnt}`;
}

function initFirebase() {
    if (APP_CONFIG.firebase && APP_CONFIG.firebase.apiKey) {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(APP_CONFIG.firebase);
            }
            db = firebase.firestore();
        } catch (e) {
            console.error("Firebase init:", e);
        }
    }
}

function getCOA() {
    const saved = localStorage.getItem('fm_coa_list_ony_coffee');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('fm_coa_list_ony_coffee', JSON.stringify(DEFAULT_COA));
    return DEFAULT_COA;
}

function saveCOA(list) {
    localStorage.setItem('fm_coa_list_ony_coffee', JSON.stringify(list));
}

function getMaterials() {
    const saved = localStorage.getItem('fm_materials_ony_coffee');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('fm_materials_ony_coffee', JSON.stringify(DEFAULT_RAW_MATERIALS));
    return DEFAULT_RAW_MATERIALS;
}

function saveMaterials(list) {
    localStorage.setItem('fm_materials_ony_coffee', JSON.stringify(list));
}

function getNotices() {
    const saved = localStorage.getItem('fm_notices_ony_coffee');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('fm_notices_ony_coffee', JSON.stringify(DEFAULT_NOTICES));
    return DEFAULT_NOTICES;
}

function saveNotices(list) {
    localStorage.setItem('fm_notices_ony_coffee', JSON.stringify(list));
}

function getCurrentUser() {
    const raw = localStorage.getItem('fm_session_user_v13');
    return raw ? JSON.parse(raw) : null;
}

function requireAuth(allowedRoles = []) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "index.html";
        return null;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        alert("Akses Ditolak: Anda tidak memiliki wewenang untuk halaman ini.");
        if (user.role === 'staff') {
            window.location.href = "kasir.html";
        } else {
            window.location.href = "dashboard.html";
        }
        return null;
    }
    return user;
}

function logout() {
    if (confirm("Keluar dari sistem?")) {
        localStorage.removeItem('fm_session_user_v13');
        window.location.href = "index.html";
    }
}

function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(num || 0);
}

function formatThousandSeparator(value) {
    if (!value && value !== 0) return "";
    let clean = value.toString().replace(/[^0-9]/g, '');
    if (!clean) return "";
    return new Intl.NumberFormat('id-ID').format(clean);
}

function parseThousandSeparator(value) {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/[^0-9]/g, '')) || 0;
}