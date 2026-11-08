/**
 * KONFIGURASI SISTEM KEUANGAN - ONY COFFEE MODERN
 */
const APP_CONFIG = {
    appName: "Ony Coffee Modern POS & Finance",
    businessName: "Ony Coffee Modern",
    subtitle: "Kedai Kopi & Minuman",
    periodName: "November 2026",
    currency: "IDR",

    // Pengaturan Toko
    store: {
        address: "Jl. Kopi Modern No. 8, Jakarta",
        phone: "0812-3456-7890",
        taxRate: 0.10,
        serviceRate: 0,
        receiptFooter: "Terima kasih telah menikmati kopi di Ony Coffee Modern!"
    },

    // Akun Transaksi & Metode Pembayaran
    accounts: [
        { id: "cash", name: "Kas Kasir (Tunai)", type: "cash", active: true },
        { id: "qris", name: "QRIS Dinamis / Statis", type: "e-wallet", active: true },
        { id: "bank_bca", name: "Bank Transfer BCA", type: "bank", active: true },
        { id: "bank_mandiri", name: "Bank Transfer Mandiri", type: "bank", active: true },
        { id: "edc_debit", name: "Mesin EDC / Kartu Debit", type: "edc", active: true }
    ],

    // Kategori Transaksi Pendapatan & Pengeluaran
    transactionCategories: {
        income: [
            "Penjualan Minuman Kopi",
            "Penjualan Minuman Non-Kopi",
            "Penjualan Snack & Pastry",
            "Penjualan Coffee Beans & Merchandise",
            "Pendapatan Lain-lain"
        ],
        expense: [
            "Bahan Baku Kopi (Beans, Susu, Sirup)",
            "Kemasan & Cup Takeaway",
            "Operasional (Listrik, Air, Wi-Fi)",
            "Gaji Barista & Staf",
            "Maintenance Mesin Espresso & Grinder",
            "Sewa Tempat",
            "Marketing & Promosi"
        ]
    },

    firebase: {
        apiKey: "AIzaSyBSxD060e_MyiS62hHsWkqlAhBqDuFYQMI",
        authDomain: "finance-ai-master-byneilverse.firebaseapp.com",
        projectId: "finance-ai-master-byneilverse",
        storageBucket: "finance-ai-master-byneilverse.firebasestorage.app",
        messagingSenderId: "120043241027",
        appId: "1:120043241027:web:ec78438f39440125b85ef6"
    }
};