/**
 * إدارة التأمينات
 */
(function () {
  const tbody = document.getElementById('deposits-tbody');
  const btnAdd = document.getElementById('btn-add-deposit');
  const modal = document.getElementById('modal-deposit');
  const form = document.getElementById('form-deposit');
  const titleEl = document.getElementById('modal-deposit-title');
  const idInput = document.getElementById('deposit-id');
  const amountInput = document.getElementById('deposit-amount');
  const dateInput = document.getElementById('deposit-date');
  const noteInput = document.getElementById('deposit-note');

  function openModal(editItem) {
    if (editItem) {
      titleEl.textContent = 'تعديل التأمين';
      idInput.value = editItem.id;
      amountInput.value = editItem.amount;
      dateInput.value = editItem.date;
      noteInput.value = editItem.note || '';
    } else {
      titleEl.textContent = 'إضافة تأمين';
      idInput.value = '';
      form.reset();
      dateInput.value = getTodayDate();
    }
    modal.classList.add('show');
  }

  function closeModal() {
    modal.classList.remove('show');
  }

  function formatMoney(n) {
    return Number(n).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function formatDateAr(d) {
    if (!d) return '—';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function render() {
    const list = getDeposits();
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">لا توجد تأمينات. أضف تأميناً من الزر أعلاه.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(d => `
      <tr>
        <td>${formatDateAr(d.date)}</td>
        <td>${formatMoney(d.amount)} ج.م</td>
        <td>${(d.note || '').slice(0, 50)}${(d.note && d.note.length > 50) ? '...' : ''}</td>
        <td class="actions">
          <button type="button" class="btn btn-small btn-ghost edit-deposit" data-id="${d.id}">تعديل</button>
          <button type="button" class="btn btn-small btn-danger delete-deposit" data-id="${d.id}">حذف</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.edit-deposit').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = list.find(x => x.id === btn.dataset.id);
        if (item) openModal(item);
      });
    });
    tbody.querySelectorAll('.delete-deposit').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('حذف هذا التأمين؟')) {
          const arr = getDeposits().filter(x => x.id !== btn.dataset.id);
          setDeposits(arr);
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
    let arr = getDeposits();
    if (id) {
      arr = arr.map(x => x.id === id ? { ...x, amount, date, note } : x);
    } else {
      arr.push({ id: generateId(), amount, date, note });
    }
    setDeposits(arr);
    closeModal();
    render();
    if (window.updateDashboard) window.updateDashboard();
  });

  modal.querySelectorAll('.cancel-btn').forEach(btn => btn.addEventListener('click', closeModal));

  window.renderDeposits = render;
})();
