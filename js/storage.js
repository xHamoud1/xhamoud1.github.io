/**
 * التخزين المحلي - كل البيانات في localStorage مؤقتاً
 * لاحقاً يمكن استبداله بقاعدة بيانات
 */

const STORAGE_KEYS = {
  DEPOSITS: 'delivery_deposits',
  TRANSFERS: 'delivery_transfers',
  VEHICLE_EXPENSES: 'delivery_vehicle_expenses',
  PRODUCTS: 'delivery_products',
  MOVEMENTS: 'delivery_movements',
  ORDERS: 'delivery_orders',
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getTodayDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// التأمينات
function getDeposits() {
  const raw = localStorage.getItem(STORAGE_KEYS.DEPOSITS);
  return raw ? JSON.parse(raw) : [];
}

function setDeposits(arr) {
  localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(arr));
}

// التحويلات
function getTransfers() {
  const raw = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
  return raw ? JSON.parse(raw) : [];
}

function setTransfers(arr) {
  localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(arr));
}

// استهلاكات المركبة (بنزين/زيت/صيانة)
function getVehicleExpenses() {
  const raw = localStorage.getItem(STORAGE_KEYS.VEHICLE_EXPENSES);
  return raw ? JSON.parse(raw) : [];
}

function setVehicleExpenses(arr) {
  localStorage.setItem(STORAGE_KEYS.VEHICLE_EXPENSES, JSON.stringify(arr));
}

// المنتجات
function getProducts() {
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  return raw ? JSON.parse(raw) : [];
}

function setProducts(arr) {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(arr));
}

// الحركات (إدخال/إخراج)
function getMovements() {
  const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
  return raw ? JSON.parse(raw) : [];
}

function setMovements(arr) {
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(arr));
}

// الطلبات
function getOrders() {
  const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
  return raw ? JSON.parse(raw) : [];
}

function setOrders(arr) {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(arr));
}

// حساب الكمية الحالية لمنتج من الحركات
function getProductCurrentStock(productId) {
  const movements = getMovements();
  let qty = 0;
  movements.forEach(m => {
    if (m.productId !== productId) return;
    if (m.type === 'in') qty += Number(m.qty);
    else qty -= Number(m.qty);
  });
  return qty;
}
