(function () {
  const tabs = document.querySelectorAll('.vehicle-tab');
  const tbody = document.getElementById('vehicle-expenses-tbody');
  const btnAdd = document.getElementById('btn-add-vehicle-expense');

  const modal = document.getElementById('modal-vehicle-expense');
  const form = document.getElementById('form-vehicle-expense');
  const titleEl = document.getElementById('modal-vehicle-expense-title');

  const idInput = document.getElementById('vehicle-expense-id');
  const typeInput = document.getElementById('vehicle-expense-type');
  const dateInput = document.getElementById('vehicle-expense-date');
  const kmInput = document.getElementById('vehicle-expense-km');
  const amountInput = document.getElementById('vehicle-expense-amount');
  const noteInput = document.getElementById('vehicle-expense-note');

  let activeType = 'fuel';

  function formatDateAr(d) {
    if (!d) return '—';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatMoney(n) {
    if (n == null || n === '') return '—';
    return Number(n).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';
  }

  function getTypeLabel(t) {
    if (t === 'fuel') return 'بنزين';
    if (t === 'oil') return 'زيت';
    if (t === 'maintenance') return 'صيانة';
    return t;
  }

  function openModal(editItem) {
    if (editItem) {
      titleEl.textContent = 'تعديل استهلاك';
      idInput.value = editItem.id;
      typeInput.value = editItem.type || activeType;
      dateInput.value = editItem.date || getTodayDate();
      kmInput.value = editItem.km != null ? editItem.km : '';
      amountInput.value = editItem.amount != null ? editItem.amount : '';
      noteInput.value = editItem.note || '';
    } else {
      titleEl.textContent = 'إضافة استهلاك';
      idInput.value = '';
      form.reset();
      typeInput.value = activeType;
      dateInput.value = getTodayDate();
    }
    modal.classList.add('show');
  }

  function closeModal() {
    modal.classList.remove('show');
  }

  function getFiltered() {
    const list = getVehicleExpenses().slice().reverse();
    return list.filter(x => (x.type || 'fuel') === activeType);
  }

  function render() {
    if (!tbody) return;

    const list = getFiltered();
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">لا توجد بيانات.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(x => {
      return `
        <tr>
          <td>${formatDateAr(x.date)}</td>
          <td>${getTypeLabel(x.type)}</td>
          <td>${x.km != null ? String(x.km) : '—'}</td>
          <td>${formatMoney(x.amount)}</td>
          <td>${(x.note || '').slice(0, 40)}${(x.note && x.note.length > 40) ? '...' : ''}</td>
          <td class="actions">
            <button type="button" class="btn btn-small btn-ghost edit-vehicle-expense" data-id="${x.id}">تعديل</button>
            <button type="button" class="btn btn-small btn-danger delete-vehicle-expense" data-id="${x.id}">حذف</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.edit-vehicle-expense').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.dataset.id;
        const item = getVehicleExpenses().find(x => String(x.id) === String(id));
        if (item) openModal(item);
      });
    });

    tbody.querySelectorAll('.delete-vehicle-expense').forEach(btn => {
      btn.addEventListener('click', function () {
        if (!confirm('حذف هذا السجل؟')) return;
        const id = this.dataset.id;
        setVehicleExpenses(getVehicleExpenses().filter(x => String(x.id) !== String(id)));
        render();
        if (window.updateDashboard) window.updateDashboard();
      });
    });
  }

  if (btnAdd) btnAdd.addEventListener('click', function () {
    openModal(null);
  });

  if (tabs && tabs.length) {
    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        activeType = this.dataset.type || 'fuel';
        tabs.forEach(t => t.classList.toggle('active', t === this));
        render();
      });
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const id = idInput.value;
      const type = typeInput.value;
      const date = dateInput.value;
      const km = kmInput.value.trim() === '' ? null : parseFloat(kmInput.value);
      const amount = amountInput.value.trim() === '' ? null : parseFloat(amountInput.value);
      const note = noteInput.value.trim();

      if (!date) {
        alert('اختر التاريخ.');
        return;
      }
      if (amount == null || !(amount >= 0)) {
        alert('اكتب مبلغ صحيح.');
        return;
      }

      let arr = getVehicleExpenses();
      const payload = {
        id: id || generateId(),
        type,
        date,
        km: km == null ? undefined : km,
        amount: Number(amount),
        note: note || undefined,
      };

      if (id) {
        arr = arr.map(x => (String(x.id) === String(id) ? { ...x, ...payload } : x));
      } else {
        arr.push(payload);
      }

      setVehicleExpenses(arr);
      closeModal();
      render();
      if (window.updateDashboard) window.updateDashboard();
    });
  }

  if (modal) modal.querySelectorAll('.cancel-btn').forEach(btn => btn.addEventListener('click', closeModal));

  window.renderVehicleExpenses = render;
})();
