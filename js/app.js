/**
 * التطبيق الرئيسي - التنقل، التحقق من الدخول، تحديث لوحة التحكم
 */
(function () {
  const loginScreen = document.getElementById('login-screen');
  const appEl = document.getElementById('app');
  const loginForm = document.getElementById('login-form');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  function showApp() {
    loginScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    if (window.renderDeposits) window.renderDeposits();
    if (window.renderTransfers) window.renderTransfers();
    if (window.renderVehicleExpenses) window.renderVehicleExpenses();
    if (window.renderProducts) window.renderProducts();
    if (window.renderMovements) window.renderMovements();
    if (window.renderOrders) window.renderOrders();
    updateDashboard();
  }

  function showLogin() {
    loginScreen.classList.remove('hidden');
    appEl.classList.add('hidden');
    loginError.textContent = '';
    loginPassword.value = '';
  }

  function updateDashboard() {
    const deposits = getDeposits();
    const totalDeposits = deposits.reduce((s, d) => s + Number(d.amount), 0);
    document.getElementById('stat-deposits').textContent = Number(totalDeposits).toLocaleString('ar-EG') + ' ج.م';
    
    const transfers = getTransfers();
    const totalTransfers = transfers.reduce((s, t) => s + Number(t.amount), 0);
    document.getElementById('stat-transfers').textContent = Number(totalTransfers).toLocaleString('ar-EG') + ' ج.م';

    const vehicleExpenses = getVehicleExpenses();
    const totalVehicleExpenses = vehicleExpenses.reduce((s, x) => s + Number(x.amount || 0), 0);
    const statVehicle = document.getElementById('stat-vehicle-expenses');
    if (statVehicle) statVehicle.textContent = Number(totalVehicleExpenses).toLocaleString('ar-EG') + ' ج.م';
    
    document.getElementById('stat-products').textContent = getProducts().length;
    const pendingOrders = getOrders().filter(o => o.status === 'pending').length;
    document.getElementById('stat-orders-pending').textContent = pendingOrders;

    const quarterVehicleEl = document.getElementById('quarter-vehicle-expenses');
    if (quarterVehicleEl) quarterVehicleEl.textContent = Number(totalVehicleExpenses).toLocaleString('ar-EG') + ' ج.م';
  }

  window.updateDashboard = updateDashboard;

  const quarterShipInput = document.getElementById('quarter-shipping-per-unit');
  const quarterCalcBtn = document.getElementById('btn-calc-quarter');
  const quarterOrdersCountEl = document.getElementById('quarter-orders-count');
  const quarterEstShippingEl = document.getElementById('quarter-est-shipping');
  const quarterNetProfitEl = document.getElementById('quarter-net-profit');

  function calcQuarter() {
    const orders = getOrders();
    const delivered = orders.filter(o => o.status === 'delivered');
    const returnedIncluded = orders.filter(o => o.status === 'returned' && o.includeShippingPerUnit);

    const perUnit = quarterShipInput ? (parseFloat(quarterShipInput.value) || 0) : 0;
    const shippingOrdersCount = delivered.length + returnedIncluded.length;
    const totalShipping = perUnit * shippingOrdersCount;

    const vehicleExpenses = getVehicleExpenses();
    const totalVehicleExpenses = vehicleExpenses.reduce((s, x) => s + Number(x.amount || 0), 0);

    const netProfit = totalShipping - totalVehicleExpenses;

    if (quarterOrdersCountEl) quarterOrdersCountEl.textContent = String(shippingOrdersCount);
    if (quarterEstShippingEl) quarterEstShippingEl.textContent = Number(totalShipping).toLocaleString('ar-EG') + ' ج.م';
    if (quarterNetProfitEl) quarterNetProfitEl.textContent = Number(netProfit).toLocaleString('ar-EG') + ' ج.م';
  }

  if (quarterCalcBtn) {
    quarterCalcBtn.addEventListener('click', calcQuarter);
  }

  // التنقل بين الصفحات
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('page-' + page);
      if (target) target.classList.add('active');
    });
  });

  // فتح الصفحة حسب الهاش
  function syncPageFromHash() {
    const hash = (window.location.hash || '#dashboard').slice(1);
    const page = hash || 'dashboard';
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.getAttribute('data-page') === page);
    });
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.id === 'page-' + page);
    });
  }

  window.addEventListener('hashchange', syncPageFromHash);
  syncPageFromHash();

  // الدخول
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const pass = loginPassword.value.trim();
    loginError.textContent = '';
    if (checkPassword(pass)) {
      setAuthenticated();
      showApp();
    } else {
      loginError.textContent = 'كلمة المرور غير صحيحة';
    }
  });

  logoutBtn.addEventListener('click', function () {
    logout();
    showLogin();
  });

  // عند تحميل الصفحة
  if (isAuthenticated()) {
    showApp();
  } else {
    showLogin();
  }
})();
