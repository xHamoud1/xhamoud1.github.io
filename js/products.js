/**
 * إدارة المنتجات (الكمية تُحسب من الحركات)
 */
(function () {
  const tbody = document.getElementById('products-tbody');
  const btnAdd = document.getElementById('btn-add-product');
  const modal = document.getElementById('modal-product');
  const form = document.getElementById('form-product');
  const titleEl = document.getElementById('modal-product-title');
  const idInput = document.getElementById('product-id');
  const nameInput = document.getElementById('product-name');
  const unitInput = document.getElementById('product-unit');

  function openModal(editItem) {
    if (editItem) {
      titleEl.textContent = 'تعديل المنتج';
      idInput.value = editItem.id;
      nameInput.value = editItem.name;
      unitInput.value = editItem.unit || '';
    } else {
      titleEl.textContent = 'إضافة منتج';
      idInput.value = '';
      form.reset();
    }
    modal.classList.add('show');
  }

  function closeModal() {
    modal.classList.remove('show');
  }

  function render() {
    const list = getProducts();
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">لا توجد منتجات. أضف منتجاً أولاً ثم سجّل حركات إدخال بضاعة.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(p => {
      const stock = getProductCurrentStock(p.id);
      return `
        <tr>
          <td>${p.name}</td>
          <td>${p.unit || '—'}</td>
          <td>${stock}</td>
          <td class="actions">
            <button type="button" class="btn btn-small btn-ghost edit-product" data-id="${p.id}">تعديل</button>
            <button type="button" class="btn btn-small btn-danger delete-product" data-id="${p.id}">حذف</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = list.find(x => x.id === btn.dataset.id);
        if (item) openModal(item);
      });
    });
    tbody.querySelectorAll('.delete-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const stock = getProductCurrentStock(id);
        const hasMovements = getMovements().some(m => m.productId === id);
        if (hasMovements) {
          alert('لا يمكن حذف منتج له حركات مسجلة. يمكنك إخفاؤه أو تركه بدون حركات جديدة.');
          return;
        }
        if (confirm('حذف هذا المنتج؟')) {
          setProducts(getProducts().filter(x => x.id !== id));
          render();
          if (window.renderMovementProductSelect) window.renderMovementProductSelect();
          if (window.renderOrderProductSelect) window.renderOrderProductSelect();
          if (window.updateDashboard) window.updateDashboard();
        }
      });
    });
  }

  btnAdd.addEventListener('click', () => openModal(null));

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = idInput.value;
    const name = nameInput.value.trim();
    const unit = unitInput.value.trim();
    let arr = getProducts();
    if (id) {
      arr = arr.map(x => x.id === id ? { ...x, name, unit } : x);
    } else {
      arr.push({ id: generateId(), name, unit });
    }
    setProducts(arr);
    closeModal();
    render();
    if (window.renderMovementProductSelect) window.renderMovementProductSelect();
    if (window.renderOrderProductSelect) window.renderOrderProductSelect();
    if (window.updateDashboard) window.updateDashboard();
  });

  modal.querySelectorAll('.cancel-btn').forEach(btn => btn.addEventListener('click', closeModal));

  window.renderProducts = render;
})();
