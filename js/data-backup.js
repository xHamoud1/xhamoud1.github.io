/**
 * صفحة البيانات: نسخ كل بيانات localStorage ككود، ولصق لاستعادة البيانات على جهاز آخر
 */
(function () {
  const EXPORT_VERSION = 1;

  const copyBtn = document.getElementById('data-copy-btn');
  const copyStatus = document.getElementById('data-copy-status');
  const pasteArea = document.getElementById('data-paste-area');
  const restoreBtn = document.getElementById('data-restore-btn');
  const restoreStatus = document.getElementById('data-restore-status');

  function exportData() {
    const payload = {
      v: EXPORT_VERSION,
      date: new Date().toISOString(),
      data: {
        [STORAGE_KEYS.DEPOSITS]: getDeposits(),
        [STORAGE_KEYS.PRODUCTS]: getProducts(),
        [STORAGE_KEYS.MOVEMENTS]: getMovements(),
        [STORAGE_KEYS.ORDERS]: getOrders(),
      },
    };
    return JSON.stringify(payload);
  }

  function setCopyStatus(msg, isError) {
    if (!copyStatus) return;
    copyStatus.textContent = msg;
    copyStatus.style.color = isError ? 'var(--danger)' : 'var(--success)';
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      try {
        const code = exportData();
        navigator.clipboard.writeText(code).then(function () {
          setCopyStatus('تم نسخ البيانات إلى الحافظة. الصقها في ملف أو جهاز آخر عند الحاجة.');
        }).catch(function () {
          pasteArea.value = code;
          pasteArea.select();
          setCopyStatus('لم يتم النسخ للحافظة. الكود معروض في المربع أدناه — انسخه يدوياً (Ctrl+C).', true);
        });
      } catch (e) {
        setCopyStatus('حدث خطأ: ' + (e.message || e), true);
      }
    });
  }

  function setRestoreStatus(msg, isError) {
    if (!restoreStatus) return;
    restoreStatus.textContent = msg;
    restoreStatus.style.color = isError ? 'var(--danger)' : 'var(--success)';
  }

  function restoreData() {
    const raw = (pasteArea && pasteArea.value) ? pasteArea.value.trim() : '';
    if (!raw) {
      setRestoreStatus('الصق الكود أولاً في المربع أعلاه.', true);
      return;
    }
    try {
      const payload = JSON.parse(raw);
      if (!payload || !payload.data || typeof payload.data !== 'object') {
        setRestoreStatus('الكود غير صالح (لا يوجد بيانات).', true);
        return;
      }
      const d = payload.data;
      if (Array.isArray(d[STORAGE_KEYS.DEPOSITS])) setDeposits(d[STORAGE_KEYS.DEPOSITS]);
      if (Array.isArray(d[STORAGE_KEYS.PRODUCTS])) setProducts(d[STORAGE_KEYS.PRODUCTS]);
      if (Array.isArray(d[STORAGE_KEYS.MOVEMENTS])) setMovements(d[STORAGE_KEYS.MOVEMENTS]);
      if (Array.isArray(d[STORAGE_KEYS.ORDERS])) setOrders(d[STORAGE_KEYS.ORDERS]);
      setRestoreStatus('تم استعادة البيانات بنجاح. جاري تحديث الصفحة...');
      pasteArea.value = '';
      if (window.renderDeposits) window.renderDeposits();
      if (window.renderProducts) window.renderProducts();
      if (window.renderMovements) window.renderMovements();
      if (window.renderOrders) window.renderOrders();
      if (window.updateDashboard) window.updateDashboard();
      setTimeout(function () {
        setRestoreStatus('تم تحديث كل الصفحات.');
      }, 500);
    } catch (e) {
      setRestoreStatus('كود غير صالح أو تالف: ' + (e.message || e), true);
    }
  }

  if (restoreBtn) {
    restoreBtn.addEventListener('click', restoreData);
  }
})();
