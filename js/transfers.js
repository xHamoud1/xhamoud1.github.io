/**
 * إدارة التحويلات - تسجيل التحويلات المالية للمسؤول
 */
(function () {
  const tbody = document.getElementById('transfers-tbody');
  const btnAdd = document.getElementById('btn-add-transfer');
  const modal = document.getElementById('modal-transfer');
  const form = document.getElementById('form-transfer');
  const titleEl = document.getElementById('modal-transfer-title');
  const idInput = document.getElementById('transfer-id');
  const amountInput = document.getElementById('transfer-amount');
  const dateInput = document.getElementById('transfer-date');
  const noteInput = document.getElementById('transfer-note');

  function openModal(editTransfer) {
    if (editTransfer) {
      titleEl.textContent = 'تعديل التحويل';
      idInput.value = editTransfer.id;
      amountInput.value = editTransfer.amount;
      dateInput.value = editTransfer.date;
      noteInput.value = editTransfer.note || '';
    } else {
      titleEl.textContent = 'إضافة تحويل';
      idInput.value = '';
      form.reset();
      dateInput.value = getTodayDate();
    }
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

  function formatMoney(n) {
    if (n == null || n === '') return '—';
    return Number(n).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';
  }

  function render() {
    const list = getTransfers().slice().reverse();
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">لا توجد تحويلات. أضف تحويلاً جديداً.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(t => `
      <tr>
        <td>${formatDateAr(t.date)}</td>
        <td>${formatMoney(t.amount)}</td>
        <td>${(t.note || '').slice(0, 50)}${(t.note && t.note.length > 50) ? '...' : ''}</td>
        <td class="actions">
          <button type="button" class="btn btn-small btn-ghost edit-transfer" data-id="${t.id}">تعديل</button>
          <button type="button" class="btn btn-small btn-danger delete-transfer" data-id="${t.id}">حذف</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.edit-transfer').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = getTransfers().find(x => x.id === btn.dataset.id);
        if (item) openModal(item);
      });
    });

    tbody.querySelectorAll('.delete-transfer').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('حذف هذا التحويل؟')) {
          setTransfers(getTransfers().filter(x => x.id !== btn.dataset.id));
          render();
          if (window.updateDashboard) window.updateDashboard();
        }
      });
    });
  }

  btnAdd.addEventListener('click', () => openModal(null));

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = idInput.value;
    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;
    const note = noteInput.value.trim();

    let arr = getTransfers();
    if (id) {
      arr = arr.map(x => x.id === id ? { ...x, amount, date, note } : x);
    } else {
      arr.push({ id: generateId(), amount, date, note });
    }
    setTransfers(arr);
    closeModal();
    render();
    if (window.updateDashboard) window.updateDashboard();
  });

  modal.querySelectorAll('.cancel-btn').forEach(btn => btn.addEventListener('click', closeModal));

  window.renderTransfers = render;
})();
