/**
 * حركات المخزون - إدخال بضاعة / إخراج بضاعة
 */
(function () {
  const tbody = document.getElementById('movements-tbody');
  const btnIn = document.getElementById('btn-add-movement-in');
  const btnOut = document.getElementById('btn-add-movement-out');
  const modal = document.getElementById('modal-movement');
  const form = document.getElementById('form-movement');
  const titleEl = document.getElementById('modal-movement-title');
  const typeInput = document.getElementById('movement-type');
  const productSelect = document.getElementById('movement-product');
  const qtyInput = document.getElementById('movement-qty');
  const dateInput = document.getElementById('movement-date');
  const noteInput = document.getElementById('movement-note');

  function fillProductSelect() {
    const products = getProducts();
    productSelect.innerHTML = '<option value="">-- اختر المنتج --</option>' +
      products.map(p => `<option value="${p.id}">${p.name} (${getProductCurrentStock(p.id)} ${p.unit || ''})</option>`).join('');
  }

  function openModal(type) {
    typeInput.value = type;
    titleEl.textContent = type === 'in' ? 'إدخال بضاعة' : 'إخراج بضاعة';
    form.reset();
    typeInput.value = type;
    dateInput.value = getTodayDate();
    fillProductSelect();
    modal.classList.add('show');
  }

  function closeModal() {
    modal.classList.remove('show');
  }

  function formatDateAr(d) {
    if (!d) return '—';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getProductName(id) {
    const p = getProducts().find(x => x.id === id);
    return p ? p.name : id;
  }

  function render() {
    const list = getMovements().slice().reverse();
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">لا توجد حركات. استخدم "إدخال بضاعة" أو "إخراج بضاعة".</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(m => `
      <tr>
        <td>${formatDateAr(m.date)}</td>
        <td>${getProductName(m.productId)}</td>
        <td><span class="badge badge-${m.type}">${m.type === 'in' ? 'إدخال' : 'إخراج'}</span></td>
        <td>${m.qty}</td>
        <td>${(m.note || '').slice(0, 40)}${(m.note && m.note.length > 40) ? '...' : ''}</td>
      </tr>
    `).join('');
  }

  btnIn.addEventListener('click', () => openModal('in'));
  btnOut.addEventListener('click', () => openModal('out'));

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const productId = productSelect.value;
    const qty = parseInt(qtyInput.value, 10);
    const date = dateInput.value;
    const note = noteInput.value.trim();
    if (!productId) {
      alert('اختر المنتج');
      return;
    }
    if (typeInput.value === 'out') {
      const current = getProductCurrentStock(productId);
      if (qty > current) {
        alert(`الكمية المتاحة ${current} فقط. لا يمكن إخراج ${qty}.`);
        return;
      }
    }
    const arr = getMovements();
    arr.push({
      id: generateId(),
      productId,
      type: typeInput.value,
      qty,
      date,
      note,
    });
    setMovements(arr);
    closeModal();
    render();
    if (window.renderProducts) window.renderProducts();
    if (window.renderOrderProductSelect) window.renderOrderProductSelect();
    if (window.updateDashboard) window.updateDashboard();
  });

  modal.querySelectorAll('.cancel-btn').forEach(btn => btn.addEventListener('click', closeModal));

  window.renderMovements = render;
  window.renderMovementProductSelect = fillProductSelect;
})();
