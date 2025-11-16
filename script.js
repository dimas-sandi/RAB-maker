// --- LOCAL STORAGE FUNCTIONS ---
const LOCAL_STORAGE_KEY = 'rabMakerData';

function saveToLocalStorage(data) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Error saving to localStorage", e);
    }
}

function loadFromLocalStorage() {
    try {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (e) {
        console.error("Error loading from localStorage", e);
        // Clear corrupted data
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    return null;
}


// --- LANGUAGE MANAGEMENT ---
let currentLanguage = 'id'; // Default to Indonesian

/**
 * Apply translations to elements with data-translate attributes
 */
function applyTranslations() {
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
}

/**
 * Detect user's country and set language accordingly
 */
async function detectUserLanguage() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country === 'ID') {
            currentLanguage = 'id';
        } else {
            currentLanguage = 'en';
        }
    } catch (error) {
        console.warn('Failed to detect user location, defaulting to Indonesian:', error);
        currentLanguage = 'id'; // Fallback to Indonesian
    }
}

// --- DATA AWAL ---
const initialData = [
    { modul: 'A', kategori: 'ELEKTRONIK', komponen: 'Mikrokontroler (e.g., Arduino Uno)', jumlah: 1, satuan: 'unit', harga: 150000, keterangan: 'Otak utama proyek', isHeader: false, image: '' },
    { modul: 'A', kategori: 'ELEKTRONIK', komponen: 'Sensor Jarak (e.g., HC-SR04)', jumlah: 2, satuan: 'unit', harga: 25000, keterangan: 'Untuk deteksi halangan', isHeader: false, image: '' },
    { modul: 'B', kategori: 'MEKANIK', komponen: 'Roda Karet', jumlah: 4, satuan: 'pcs', harga: 15000, keterangan: 'Ukuran 65mm', isHeader: false, image: '' },
    { modul: 'B', kategori: 'MEKANIK', komponen: 'Motor DC + Gearbox', jumlah: 4, satuan: 'unit', harga: 45000, keterangan: 'Penggerak roda', isHeader: false, image: '' },
    { modul: 'C', kategori: 'DAYA', komponen: 'Baterai Li-Ion 18650', jumlah: 2, satuan: 'unit', harga: 50000, keterangan: 'Kapasitas 3000mAh', isHeader: false, image: '' },
    { modul: 'C', kategori: 'DAYA', komponen: 'Modul Charger TP4056', jumlah: 1, satuan: 'unit', harga: 10000, keterangan: 'Untuk mengisi daya baterai', isHeader: false, image: '' },
];

// --- REFERENSI DOM ---
const rabTbody = document.getElementById('rab-tbody');
const rabTitle = document.getElementById('rab-title');
const addRowBtn = document.getElementById('add-row-btn');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const newDocumentBtn = document.getElementById('new-document-btn'); // New button reference

// Dropdown elements
const actionDropdownToggle = document.getElementById('action-dropdown-toggle');
const actionDropdownMenu = document.getElementById('action-dropdown-menu');
const importJsonBtn = document.getElementById('import-json-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const printPdfBtn = document.getElementById('print-pdf-btn');

// --- RIWAYAT UNDO/REDO ---
let history = [];
let historyIndex = -1;


// --- UTILITY FUNCTIONS ---
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(angka);
}

/**
 * Membuat elemen baris (Row) tabel
 */
function createRow(data) {
    if (data.isHeader) {
        const headerRow = document.createElement('tr');
        headerRow.className = 'modul-header';
        
        // Header Modul dibuat editable, colspan 9 untuk mencakup kolom Gambar dan Aksi
        headerRow.innerHTML = `
            <td colspan="10" contenteditable="true">${data.modul} - ${data.kategori}</td>
            <td class="action-column">
                <button class="add-component-header-btn" data-modul="${data.modul}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-plus-circle"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </button>
            </td>
        `;
        // Attach event listener for the new button
        const addComponentButton = headerRow.querySelector('.add-component-header-btn');
        if (addComponentButton) {
            addComponentButton.addEventListener('click', (e) => {
                const module = e.currentTarget.dataset.modul;
                addComponentToModule(module);
            });
        }
        
        return headerRow;
    }

    const row = document.createElement('tr');
    row.className = `modul-${data.modul.toLowerCase()}`;
    row.dataset.modul = data.modul;

    // Memasukkan input dan teks print-only, serta class rata tengah
    row.innerHTML = `
        <td data-label="Modul" class="center-print editable-cell" contenteditable="true">${data.modul}</td>
        <td data-label="Kategori" class="editable-cell" contenteditable="true">${data.kategori}</td>
        <td data-label="Komponen" class="editable-cell" contenteditable="true">${data.komponen}</td>
        
        <td data-label="Jumlah" class="center-print">
            <input type="number" min="0" value="${data.jumlah}" class="qty-input">
            <span class="print-text">${data.jumlah}</span>
        </td>
        
        <td data-label="Satuan" class="editable-cell" contenteditable="true">${data.satuan}</td>
        
        <td data-label="Harga Satuan (IDR)">
            <input type="number" min="0" value="${data.harga}" class="price-input">
            <span class="print-text">${formatRupiah(data.harga)}</span>
        </td>
        
        <td data-label="Subtotal (IDR)" class="currency subtotal"></td>
        <td data-label="Keterangan" class="note editable-cell" contenteditable="true">${data.keterangan}</td>
        
        <td data-label="Gambar" class="image-column">
            <div class="image-preview-container">
                <img src="${data.image || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" class="image-preview" alt="Gambar Komponen" ${data.image ? '' : 'style="display: none;"'}>
                <input type="file" accept="image/*" class="image-input" style="display: none;">
                <div class="image-controls">
                    <button class="btn-image-upload">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-image"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </button>
                    <button class="btn-image-clear" ${data.image ? '' : 'style="display: none;"'}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    </button>
                </div>
            </div>
        </td>
        
        <td data-label="Aksi" class="action-column"><button class="delete-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button></td> 
    `;

    const qtyInput = row.querySelector('.qty-input');
    const priceInput = row.querySelector('.price-input');
    const deleteButton = row.querySelector('.delete-btn');
    const editableCells = row.querySelectorAll('.editable-cell');
    
    // Image handling elements
    const imageInput = row.querySelector('.image-input');
    const imagePreview = row.querySelector('.image-preview');
    const btnImageUpload = row.querySelector('.btn-image-upload');
    const btnImageClear = row.querySelector('.btn-image-clear');

    // Ambil elemen print-text untuk diupdate saat input berubah
    const qtyPrintText = row.querySelector('.print-text:first-child');
    const pricePrintText = row.querySelector('.print-text:last-child');


    qtyInput.addEventListener('input', () => {
        calculateTotal();
        qtyPrintText.textContent = qtyInput.value;
    });
    priceInput.addEventListener('input', () => {
        calculateTotal();
        pricePrintText.textContent = formatRupiah(priceInput.value);
    });
    
    // Simpan state saat pengguna selesai mengedit (on blur)
    qtyInput.addEventListener('blur', () => saveState());
    priceInput.addEventListener('blur', () => saveState());

    deleteButton.addEventListener('click', (e) => deleteRow(e.target));

    editableCells.forEach(cell => {
        cell.addEventListener('input', calculateTotal);
        // Simpan state saat pengguna selesai mengedit sel
        cell.addEventListener('blur', () => saveState());
    });

    // --- Image Handling Event Listeners ---
    btnImageUpload.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
                btnImageClear.style.display = 'inline-block';
                // Update the data model associated with this row
                const currentData = extractTableData();
                const rowIndex = Array.from(rabTbody.children).indexOf(row);
                // Adjust rowIndex for header rows if present
                let actualRowIndex = -1;
                let dataIndex = 0;
                for(let i=0; i<rabTbody.children.length; i++) {
                    if (rabTbody.children[i].classList.contains('modul-header')) continue;
                    if (rabTbody.children[i] === row) {
                        actualRowIndex = dataIndex;
                        break;
                    }
                    dataIndex++;
                }

                if (actualRowIndex !== -1 && currentData[actualRowIndex]) {
                    currentData[actualRowIndex].image = event.target.result;
                    saveState(); // Save state after image update
                }
            };
            reader.readAsDataURL(file);
        }
    });

    btnImageClear.addEventListener('click', () => {
        imagePreview.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // Transparent GIF
        imagePreview.style.display = 'none';
        btnImageClear.style.display = 'none';
        // Update the data model associated with this row
        const currentData = extractTableData();
        const rowIndex = Array.from(rabTbody.children).indexOf(row);
        let actualRowIndex = -1;
        let dataIndex = 0;
                for(let i=0; i<rabTbody.children.length; i++) {
                    if (rabTbody.children[i].classList.contains('modul-header')) continue;
                    if (rabTbody.children[i] === row) {
                        actualRowIndex = dataIndex;
                        break;
                    }
                    dataIndex++;
                }
        if (actualRowIndex !== -1 && currentData[actualRowIndex]) {
            currentData[actualRowIndex].image = '';
            saveState(); // Save state after image clear
        }
    });


    return row;
}

/**
 * Memasukkan baris Total Keseluruhan ke akhir tbody.
 */
function insertTotalRow() {
    // Pastikan elemen totalRow sebelumnya tidak ada (untuk menghindari duplikasi saat render ulang)
    let existingTotalRow = document.querySelector('.total-row-dynamic');
    if (existingTotalRow) {
        existingTotalRow.remove();
    }
    
    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row total-row-dynamic'; // Tambahkan class dynamic untuk identifikasi
    totalRow.innerHTML = `
        <td colspan="6" style="text-align: center;">TOTAL KESELURUHAN (ESTIMASI)</td>
        <td class="currency" id="total-harga">0</td>
        <td colspan="3" class="action-column"></td> 
        `;
    rabTbody.appendChild(totalRow);
}

// --- FUNGSI UNDO/REDO ---

/**
 * Memperbarui status tombol Urungkan dan Ulangi (aktif/nonaktif).
 */
function updateUndoRedoButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
}

/**
 * Menyimpan snapshot dari data tabel saat ini ke dalam riwayat.
 * Ini akan menghapus riwayat "redo" jika ada perubahan baru.
 */
function saveState() {
    // Ambil data saat ini
    const currentState = {
        title: rabTitle.textContent,
        data: extractTableData()
    };
    
    // Simpan ke localStorage
    saveToLocalStorage(currentState);
    
    // Hapus riwayat masa depan jika kita membuat perubahan baru setelah meng-undo
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    
    // Tambahkan state baru ke riwayat
    history.push(currentState);
    historyIndex++;
    
    // Perbarui status tombol
    updateUndoRedoButtons();
}

/**
 * Mengembalikan state tabel ke posisi sebelumnya dalam riwayat.
 */
function undo() {
    if (historyIndex > 0) {
        // Render ulang tabel dengan state dari riwayat tanpa menyimpan state baru
        renderTable(history[historyIndex].data, false);
        rabTitle.textContent = history[historyIndex].title;
        updateUndoRedoButtons();
    }
}

/**
 * Mengembalikan state tabel ke posisi berikutnya dalam riwayat.
 */
function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        // Render ulang tabel dengan state dari riwayat tanpa menyimpan state baru
        renderTable(history[historyIndex].data, false);
        rabTitle.textContent = history[historyIndex].title;
        updateUndoRedoButtons();
    }
}

/**
 * Mengatur ulang tabel ke data awal dan menghapus state tersimpan.
 */
function resetToInitialData() {
    if (confirm("Apakah Anda yakin ingin memulai dokumen baru? Semua data yang belum diekspor akan hilang.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        // Ensure translations object exists and has the key before accessing
        rabTitle.textContent = (translations[currentLanguage] && translations[currentLanguage].project_title) ? translations[currentLanguage].project_title : "Judul Proyek Anda";
        history = []; // Clear history
        historyIndex = -1; // Reset history index
        renderTable(initialData, true); // Render initial data and save its state to history and local storage
        updateUndoRedoButtons();
        applyTranslations(); // Apply translations for rabTitle if language is different
    }
}


/**
 * Merender data ke tabel dengan header modul.
 * @param {Array} data - Data yang akan dirender.
 * @param {boolean} shouldSaveState - Apakah akan menyimpan state ini ke riwayat. Default true.
 */
function renderTable(data, shouldSaveState = true) {
    rabTbody.innerHTML = '';
    let currentModul = null;
    data.sort((a, b) => a.modul.localeCompare(b.modul));

    data.forEach(item => {
        const kategori = item.kategori;

        if (item.modul !== currentModul) {
            const headerData = { modul: item.modul, kategori: kategori, isHeader: true };
            rabTbody.appendChild(createRow(headerData));
            currentModul = item.modul;
        }
        rabTbody.appendChild(createRow(item));
    });

    insertTotalRow();
    calculateTotal();
    
    // Simpan state setelah rendering jika diperlukan
    if (shouldSaveState) {
        saveState();
    }
}

/**
 * Menghitung dan memperbarui total biaya RAB.
 */
function calculateTotal(shouldSaveState = false) {
    let total = 0;
    const rows = rabTbody.querySelectorAll('tr:not(.modul-header):not(.total-row-dynamic)');

    rows.forEach(row => {
        const qtyInput = row.querySelector('.qty-input');
        const priceInput = row.querySelector('.price-input');
        const subtotalElement = row.querySelector('.subtotal');
        
        const qty = parseInt(qtyInput ? qtyInput.value : 0) || 0;
        const price = parseInt(priceInput ? priceInput.value : 0) || 0;
        const subtotal = qty * price;

        if (subtotalElement) {
            subtotalElement.textContent = formatRupiah(subtotal);
            total += subtotal;
        }
    });
    
    const totalHargaElement = document.getElementById('total-harga');
    const totalEstimasiElement = document.getElementById('total-estimasi');

    if (totalHargaElement) {
        totalHargaElement.textContent = formatRupiah(total);
    }
    if (totalEstimasiElement) {
        totalEstimasiElement.textContent = 'Rp ' + formatRupiah(total);
    }

    // Hanya simpan state jika diminta secara eksplisit
    if (shouldSaveState) {
        saveState();
    }
}

/**
 * Menambahkan komponen baru di bawah header modul tertentu.
 */
function addComponentToModule(module) {
    const newComponent = {
        modul: module,
        kategori: 'KATEGORI BARU',
        komponen: 'Komponen Baru',
        jumlah: 1,
        satuan: 'pcs',
        harga: 10000,
        keterangan: 'Masukkan keterangan di sini',
        isHeader: false,
        image: '' // Tambah properti gambar
    };

    let currentData = extractTableData();
    // Cari indeks baris terakhir dari modul yang sama
    let insertIndex = currentData.length; // Default: tambahkan di akhir

    // Find the last item of the given module to insert after it
    for (let i = currentData.length - 1; i >= 0; i--) {
        if (currentData[i].modul === module) {
            insertIndex = i + 1;
            break;
        }
    }

    currentData.splice(insertIndex, 0, newComponent);
    renderTable(currentData);
}

/**
 * Menambahkan baris komponen baru ke tabel.
 */
function addNewRow() {
    const newComponent = {
        modul: 'E', 
        kategori: 'KOMPONEN LAIN',
        komponen: 'Komponen Baru',
        jumlah: 1,
        satuan: 'pcs',
        harga: 10000,
        keterangan: 'Masukkan keterangan di sini',
        isHeader: false,
        image: '' // Tambah properti gambar
    };
    
    const currentData = extractTableData();
    currentData.push(newComponent);
    renderTable(currentData);
}

/**
 * Menghapus baris komponen dari tabel.
 */
function deleteRow(button) {
    const row = button.closest('tr');
    const componentName = row.children[2].textContent; 

    if (confirm(`Yakin ingin menghapus komponen: ${componentName}?`)) {
        row.remove();
        calculateTotal();
        saveState(); // Simpan state setelah menghapus
    }
}


// --- EXPORT/IMPORT FUNCTIONALITY ---
function extractTableData() {
    const data = [];
    // Seleksi hanya baris komponen, abaikan header dan baris total
    const rows = rabTbody.querySelectorAll('tr:not(.modul-header):not(.total-row-dynamic)'); 

    rows.forEach(row => {
        const imagePreview = row.querySelector('.image-preview');
        const imageData = imagePreview && imagePreview.src !== 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=' ? imagePreview.src : '';

        const item = {
            modul: row.children[0].textContent.trim(),
            kategori: row.children[1].textContent.trim(),
            komponen: row.children[2].textContent.trim(), 
            jumlah: parseInt(row.querySelector('.qty-input').value) || 0,
            satuan: row.children[4].textContent.trim(),
            harga: parseInt(row.querySelector('.price-input').value) || 0,
            keterangan: row.children[7].textContent.trim(),
            image: imageData, // Tambah properti gambar
            isHeader: false
        };
        data.push(item);
    });
    return data;
}

function exportData() {
    const projectData = {
        title: rabTitle.textContent,
        data: extractTableData()
    };
    
    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rabTitle.textContent.replace(/\s/g, '_')}_RAB.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Data RAB berhasil diexport sebagai JSON.');
}

function importData(jsonContent) {
    try {
        const projectData = JSON.parse(jsonContent);
        rabTitle.textContent = projectData.title || (translations[currentLanguage] && translations[currentLanguage].project_title) ? translations[currentLanguage].project_title : "Judul Proyek Anda";
        renderTable(projectData.data);
        saveState(); // Save imported data to history and local storage
        alert('Data RAB berhasil diimport.');
    } catch (error) {
        alert('Gagal mengimport data. Pastikan file JSON valid.');
        console.error('Import Error:', error);
    }
}

// Global file input element
const importFileInput = document.createElement('input');
importFileInput.type = 'file';
importFileInput.accept = '.json';
importFileInput.style.display = 'none'; // Keep it hidden

// Function to handle file input change
const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => importData(event.target.result);
        reader.readAsText(file);
    }
};

// Function to trigger file input click
function triggerImportFileInput() {
    importFileInput.click();
}


// --- INITALIZATION / DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');

    // --- FUNGSI TEMA ---
    const applyTheme = (theme) => {
        const moonIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        const sunIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = sunIcon;
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.innerHTML = moonIcon;
        }
    };

    const toggleTheme = () => {
        const currentTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    };

    // Cek tema tersimpan saat load
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // Append the hidden file input to the body once
    document.body.appendChild(importFileInput);
    importFileInput.addEventListener('change', handleImportFileChange);

    // --- EVENT LISTENERS ---
    rabTitle.addEventListener('input', saveState); // Save state on input for title
    rabTitle.addEventListener('blur', saveState);  // Save state when title loses focus
    themeToggle.addEventListener('click', toggleTheme);
    addRowBtn.addEventListener('click', addNewRow);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    newDocumentBtn.addEventListener('click', resetToInitialData); // New button event listener

    // Language selector event listeners
    const languageId = document.getElementById('language-id');
    const languageEn = document.getElementById('language-en');

    function updateLanguageSelector() {
        if (currentLanguage === 'id') {
            languageId.classList.add('active');
            languageEn.classList.remove('active');
        } else {
            languageEn.classList.add('active');
            languageId.classList.remove('active');
        }
    }

    languageId.addEventListener('click', () => {
        currentLanguage = 'id';
        applyTranslations();
        updateLanguageSelector();
    });

    languageEn.addEventListener('click', () => {
        currentLanguage = 'en';
        applyTranslations();
        updateLanguageSelector();
    });

    // Dropdown toggle
    actionDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent immediate closing
        actionDropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!actionDropdownMenu.contains(e.target) && !actionDropdownToggle.contains(e.target)) {
            actionDropdownMenu.classList.remove('show');
        }
    });

    // Re-attach listeners for dropdown items
    importJsonBtn.addEventListener('click', triggerImportFileInput);
    exportJsonBtn.addEventListener('click', exportData);
    printPdfBtn.addEventListener('click', () => window.print());

    // Listener untuk shortcut keyboard
    document.addEventListener('keydown', (e) => {
        const isEditing = document.activeElement.isContentEditable || 
                          document.activeElement.tagName === 'INPUT' || 
                          document.activeElement.tagName === 'TEXTAREA';

        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    });

    // Detect user language and apply translations
    detectUserLanguage().then(() => {
        applyTranslations();
        updateLanguageSelector();
    });

    // --- LOAD STATE ON INITIALIZATION ---
    const storedProject = loadFromLocalStorage();
    if (storedProject) {
        rabTitle.textContent = storedProject.title;
        renderTable(storedProject.data, true); // Render loaded data and save its state to history
    } else {
        rabTitle.textContent = (translations[currentLanguage] && translations[currentLanguage].project_title) ? translations[currentLanguage].project_title : "Judul Proyek Anda";
        renderTable(initialData, true); // Render initial data and save its state to history
    }
    updateUndoRedoButtons();
});
