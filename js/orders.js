/**
 * إدارة الطلبات - عميل، تليفونات، عنوان، إجمالي سعر، شحن، تحديد وجمع إيرادات
 */
(function () {
  const tbody = document.getElementById('orders-tbody');
  const btnAdd = document.getElementById('btn-add-order');
  const modal = document.getElementById('modal-order');
  const form = document.getElementById('form-order');
  const titleEl = document.getElementById('modal-order-title');
  const orderIdInput = document.getElementById('order-id');
  const orderNumberInput = document.getElementById('order-number');
  const orderDateInput = document.getElementById('order-date');
  const orderStatusInput = document.getElementById('order-status');
  const orderNoteInput = document.getElementById('order-note');
  const orderCustomerNameInput = document.getElementById('order-customer-name');
  const orderPhoneInput = document.getElementById('order-phone');
  const orderPhone2Input = document.getElementById('order-phone2');
  const orderAddressInput = document.getElementById('order-address');
  const orderTotalPriceInput = document.getElementById('order-total-price');
  const orderShippingInput = document.getElementById('order-shipping');
  const itemsContainer = document.getElementById('order-items-container');
  const addItemBtn = document.getElementById('add-order-item-btn');
  const filterStatus = document.getElementById('orders-filter-status');
  const filterDateEl = document.getElementById('orders-filter-date');
  const btnFilterToday = document.getElementById('orders-filter-today');
  const btnFilterClearDate = document.getElementById('orders-filter-clear-date');
  const btnSelectAll = document.getElementById('orders-select-all');
  const btnDeselectAll = document.getElementById('orders-deselect-all');
  const checkAll = document.getElementById('orders-check-all');
  const selectedCountEl = document.getElementById('orders-selected-count');
  const selectedTotalEl = document.getElementById('orders-selected-total');
  const shippingPerUnitInput = document.getElementById('orders-shipping-per-unit');
  const shippingTotalEl = document.getElementById('orders-shipping-total');
  const netTotalEl = document.getElementById('orders-net-total');
  const dailySummaryPlaceholder = document.getElementById('daily-summary-placeholder');
  const dailySummaryContent = document.getElementById('daily-summary-content');
  const dailySummaryDateEl = document.getElementById('daily-summary-date');
  const dailyDeliveredCountEl = document.getElementById('daily-delivered-count');
  const dailyNotDeliveredCountEl = document.getElementById('daily-not-delivered-count');
  const dailyNotDeliveredBreakdownEl = document.getElementById('daily-not-delivered-breakdown');
  const dailyRevenueEl = document.getElementById('daily-revenue');
  const dailyShippingEl = document.getElementById('daily-shipping');
  const dailyProductsTbody = document.getElementById('daily-products-tbody');

  let selectedOrderIds = new Set();

  // Load selected order IDs from localStorage
  function loadSelectedOrderIds() {
    const saved = localStorage.getItem('delivery_selected_orders');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        selectedOrderIds = new Set(ids);
      } catch (e) {
        selectedOrderIds = new Set();
      }
    }
  }

  // Save selected order IDs to localStorage
  function saveSelectedOrderIds() {
    localStorage.setItem('delivery_selected_orders', JSON.stringify(Array.from(selectedOrderIds)));
  }

  const STATUS_MAP = {
    pending: { label: 'قيد الانتظار', class: 'badge-pending' },
    delivered: { label: 'متسلم', class: 'badge-delivered' },
    excluded: { label: 'مستبعد', class: 'badge-excluded' },
    postponed: { label: 'متأجل', class: 'badge-postponed' },
  };

  function fillProductOptions(selectEl, selectedId) {
    const products = getProducts();
    selectEl.innerHTML = '<option value="">-- اختر منتج --</option>' +
      products.map(p => {
        const stock = getProductCurrentStock(p.id);
        return `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.name} (متاح: ${stock})</option>`;
      }).join('');
  }

  function addOrderItemRow(item) {
    const row = document.createElement('div');
    row.className = 'order-item-row';
    row.innerHTML = `
      <select class="order-item-product"><option value="">-- اختر منتج --</option></select>
      <input type="number" class="order-item-qty" min="1" placeholder="كمية" value="${item ? item.qty : ''}">
      <button type="button" class="btn btn-small btn-ghost remove-order-item">حذف</button>
    `;
    const select = row.querySelector('.order-item-product');
    fillProductOptions(select, item ? item.productId : '');
    row.querySelector('.remove-order-item').addEventListener('click', () => row.remove());
    itemsContainer.appendChild(row);
  }

  function getFilterDate() {
    if (!filterDateEl || !filterDateEl.value) return null;
    return filterDateEl.value;
  }

  function getFilteredOrders() {
    let list = getOrders().slice().reverse();
    const dateFilter = getFilterDate();
    if (dateFilter) list = list.filter(o => o.date === dateFilter);
    const statusFilter = (filterStatus && filterStatus.value) || '';
    if (statusFilter) list = list.filter(o => o.status === statusFilter);
    return list;
  }

  /**
   * ملخص يوم معين: متسلم كام، متسلمش كام، كم قطعة من كل منتج، إجمالي الفلوس والشحن
   */
  function getDailySummary(dateStr) {
    const all = getOrders();
    const dayOrders = all.filter(o => o.date === dateStr);
    const delivered = dayOrders.filter(o => o.status === 'delivered');
    const notDelivered = dayOrders.filter(o => o.status !== 'delivered');
    const byStatus = { pending: 0, excluded: 0, postponed: 0 };
    notDelivered.forEach(o => {
      if (o.status in byStatus) byStatus[o.status]++;
    });
    const productQuantities = {};
    delivered.forEach(o => {
      (o.items || []).forEach(it => {
        productQuantities[it.productId] = (productQuantities[it.productId] || 0) + Number(it.qty);
      });
    });
    const totalRevenue = delivered.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);
    const totalShipping = delivered.reduce((s, o) => s + (Number(o.shipping) || 0), 0);
    return {
      deliveredCount: delivered.length,
      notDeliveredCount: notDelivered.length,
      byStatus,
      productQuantities,
      totalRevenue,
      totalShipping,
    };
  }

  function renderDailySummary(dateStr) {
    if (!dailySummaryPlaceholder || !dailySummaryContent) return;
    if (!dateStr) {
      dailySummaryPlaceholder.classList.remove('hidden');
      dailySummaryContent.classList.add('hidden');
      return;
    }
    dailySummaryPlaceholder.classList.add('hidden');
    dailySummaryContent.classList.remove('hidden');

    const dt = new Date(dateStr + 'T12:00:00');
    const dateLabel = dt.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    dailySummaryDateEl.textContent = dateLabel;

    const sum = getDailySummary(dateStr);
    dailyDeliveredCountEl.textContent = sum.deliveredCount;
    dailyNotDeliveredCountEl.textContent = sum.notDeliveredCount;
    const parts = [];
    if (sum.byStatus.pending) parts.push('قيد الانتظار: ' + sum.byStatus.pending);
    if (sum.byStatus.excluded) parts.push('مستبعد: ' + sum.byStatus.excluded);
    if (sum.byStatus.postponed) parts.push('متأجل: ' + sum.byStatus.postponed);
    dailyNotDeliveredBreakdownEl.textContent = parts.length ? parts.join(' · ') : '—';
    dailyRevenueEl.textContent = formatMoney(sum.totalRevenue);
    dailyShippingEl.textContent = formatMoney(sum.totalShipping);

    const products = getProducts();
    const rows = Object.entries(sum.productQuantities).map(([productId, qty]) => {
      const p = products.find(x => x.id === productId);
      const name = p ? p.name : productId;
      const unit = p ? (p.unit || '—') : '—';
      return `<tr><td>${name}</td><td>${unit}</td><td>${qty}</td></tr>`;
    });
    if (rows.length === 0) rows.push('<tr><td colspan="3" style="color:var(--text-muted)">لا توجد كميات (لا طلبات متسلمة في هذا اليوم)</td></tr>');
    dailyProductsTbody.innerHTML = rows.join('');
  }

  function openModal(editOrder) {
    if (editOrder) {
      titleEl.textContent = 'تعديل الطلب';
      orderIdInput.value = editOrder.id;
      orderNumberInput.value = editOrder.orderNumber || '';
      orderDateInput.value = editOrder.date;
      orderStatusInput.value = editOrder.status || 'pending';
      orderNoteInput.value = editOrder.note || '';
      orderCustomerNameInput.value = editOrder.customerName || '';
      orderPhoneInput.value = editOrder.phone || '';
      orderPhone2Input.value = editOrder.phone2 || '';
      orderAddressInput.value = editOrder.address || '';
      orderTotalPriceInput.value = editOrder.totalPrice != null ? editOrder.totalPrice : '';
      orderShippingInput.value = editOrder.shipping != null ? editOrder.shipping : '';
      itemsContainer.innerHTML = '';
      (editOrder.items || []).forEach(it => addOrderItemRow(it));
    } else {
      titleEl.textContent = 'إضافة طلب';
      orderIdInput.value = '';
      form.reset();
      orderDateInput.value = getTodayDate();
      orderStatusInput.value = 'pending';
      itemsContainer.innerHTML = '';
      addOrderItemRow();
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

  function getProductName(id) {
    const p = getProducts().find(x => x.id === id);
    return p ? p.name : id;
  }

  function deductOrderFromStock(order) {
    if (order.status !== 'delivered' || !order.items || order.items.length === 0) return;
    const movements = getMovements();
    if (movements.some(m => m.orderId === order.id)) return;
    order.items.forEach(it => {
      movements.push({
        id: generateId(),
        productId: it.productId,
        type: 'out',
        qty: Number(it.qty),
        date: order.date,
        note: `طلب - ${order.orderNumber || order.id}`,
        orderId: order.id,
      });
    });
    setMovements(movements);
  }

  /** عند تغيير الطلب من "متسلم" إلى أي حالة أخرى: إرجاع الكميات للمخزون (بمسح حركات الإخراج بتاعة الطلب فقط، من غير إضافة إدخال) */
  function restoreOrderToStock(orderId) {
    const movements = getMovements();
    const idStr = String(orderId);
    const withoutThisOrder = movements.filter(m => m.orderId == null || String(m.orderId) !== idStr);
    setMovements(withoutThisOrder);
  }

  function updateSelectionSummary() {
    const totalRevenue = Array.from(selectedOrderIds).reduce((sum, id) => {
      const o = getOrders().find(x => x.id === id);
      return sum + (o && Number(o.totalPrice) ? Number(o.totalPrice) : 0);
    }, 0);
    const totalShippingFromOrders = Array.from(selectedOrderIds).reduce((sum, id) => {
      const o = getOrders().find(x => x.id === id);
      return sum + (o && Number(o.shipping) ? Number(o.shipping) : 0);
    }, 0);
    const count = selectedOrderIds.size;
    selectedCountEl.textContent = count;
    selectedTotalEl.textContent = formatMoney(totalRevenue);

    const perUnit = parseFloat(shippingPerUnitInput.value) || 0;
    const shippingByPerUnit = perUnit * count;
    const totalShipping = totalShippingFromOrders + shippingByPerUnit;
    shippingTotalEl.textContent = formatMoney(totalShipping);
    if (perUnit > 0 && count > 0) {
      shippingTotalEl.title = 'شحن مسجل في الطلبات: ' + formatMoney(totalShippingFromOrders) + ' + (' + count + ' × ' + perUnit + ') تقدير';
    }
    const netTotal = totalRevenue - totalShipping;
    if (netTotalEl) netTotalEl.textContent = formatMoney(netTotal);
    
    // Save selected orders to localStorage
    saveSelectedOrderIds();
  }

  function render() {
    // Load selected orders from localStorage
    loadSelectedOrderIds();
    
    const filtered = getFilteredOrders();
    renderDailySummary(getFilterDate());
    if (checkAll) {
      checkAll.checked = filtered.length > 0 && filtered.every(o => selectedOrderIds.has(o.id));
      checkAll.onclick = function () {
        if (this.checked) filtered.forEach(o => selectedOrderIds.add(o.id));
        else filtered.forEach(o => selectedOrderIds.delete(o.id));
        updateSelectionSummary();
        // Update checkbox states without re-rendering the entire table
        tbody.querySelectorAll('.order-row-check').forEach(cb => {
          cb.checked = selectedOrderIds.has(cb.dataset.id);
        });
      };
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">لا توجد طلبات. غيّر الفلتر أو أضف طلباً.</td></tr>';
      updateSelectionSummary();
      return;
    }

    tbody.innerHTML = filtered.map(o => {
      const itemsText = (o.items || []).map(i => `${getProductName(i.productId)}: ${i.qty}`).join(' | ') || '—';
      const status = STATUS_MAP[o.status] || STATUS_MAP.pending;
      const checked = selectedOrderIds.has(o.id);
      const customerLine = [o.customerName, o.phone].filter(Boolean).join(' · ') || '—';
      return `
        <tr>
          <td class="col-check"><input type="checkbox" class="order-row-check" data-id="${o.id}" ${checked ? 'checked' : ''}></td>
          <td>${customerLine}${o.phone2 ? ' <br><small>' + o.phone2 + '</small>' : ''}</td>
          <td>${o.orderNumber || '—'} <br><small>${formatDateAr(o.date)}</small></td>
          <td>${itemsText}</td>
          <td>${formatMoney(o.totalPrice)}</td>
          <td>${formatMoney(o.shipping)}</td>
          <td><span class="badge ${status.class}">${status.label}</span></td>
          <td>${(o.note || '').slice(0, 30)}${(o.note && o.note.length > 30) ? '...' : ''}</td>
          <td class="actions">
            <button type="button" class="btn btn-small btn-ghost edit-order" data-id="${o.id}">تعديل</button>
            <button type="button" class="btn btn-small btn-danger delete-order" data-id="${o.id}">حذف</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.order-row-check').forEach(cb => {
      cb.addEventListener('change', function () {
        if (this.checked) selectedOrderIds.add(this.dataset.id);
        else selectedOrderIds.delete(this.dataset.id);
        updateSelectionSummary();
        if (checkAll) checkAll.checked = filtered.every(o => selectedOrderIds.has(o.id));
      });
    });

    tbody.querySelectorAll('.edit-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = getOrders().find(x => x.id === btn.dataset.id);
        if (item) openModal(item);
      });
    });
    tbody.querySelectorAll('.delete-order').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('حذف هذا الطلب؟')) {
          selectedOrderIds.delete(btn.dataset.id);
          setOrders(getOrders().filter(x => x.id !== btn.dataset.id));
          render();
          updateSelectionSummary();
          if (window.updateDashboard) window.updateDashboard();
        }
      });
    });

    if (btnSelectAll) btnSelectAll.onclick = function () {
      getFilteredOrders().forEach(o => selectedOrderIds.add(o.id));
      updateSelectionSummary();
      // Update checkbox states without re-rendering the entire table
      tbody.querySelectorAll('.order-row-check').forEach(cb => {
        cb.checked = selectedOrderIds.has(cb.dataset.id);
      });
      if (checkAll) checkAll.checked = getFilteredOrders().every(o => selectedOrderIds.has(o.id));
    };
    if (btnDeselectAll) btnDeselectAll.onclick = function () {
      selectedOrderIds.clear();
      updateSelectionSummary();
      // Update checkbox states without re-rendering the entire table
      tbody.querySelectorAll('.order-row-check').forEach(cb => {
        cb.checked = false;
      });
      if (checkAll) checkAll.checked = false;
    };
    if (shippingPerUnitInput) shippingPerUnitInput.oninput = updateSelectionSummary;

    updateSelectionSummary();
  }

  addItemBtn.addEventListener('click', () => addOrderItemRow());
  btnAdd.addEventListener('click', () => openModal(null));

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = orderIdInput.value;
    const orderNumber = orderNumberInput.value.trim();
    const date = orderDateInput.value;
    const status = orderStatusInput.value;
    const note = orderNoteInput.value.trim();
    const customerName = orderCustomerNameInput.value.trim();
    const phone = orderPhoneInput.value.trim();
    const phone2 = orderPhone2Input.value.trim();
    const address = orderAddressInput.value.trim();
    const totalPrice = orderTotalPriceInput.value.trim() === '' ? null : parseFloat(orderTotalPriceInput.value);
    const shipping = orderShippingInput.value.trim() === '' ? null : parseFloat(orderShippingInput.value);

    const rows = itemsContainer.querySelectorAll('.order-item-row');
    const items = [];
    rows.forEach(row => {
      const productSelect = row.querySelector('.order-item-product');
      const qtyInput = row.querySelector('.order-item-qty');
      const pid = productSelect.value;
      const qty = parseInt(qtyInput.value, 10);
      if (pid && qty > 0) items.push({ productId: pid, qty });
    });

    if (items.length === 0) {
      alert('أضف على الأقل منتجاً واحداً بالكمية.');
      return;
    }

    let arr = getOrders();
    const previousOrder = id ? arr.find(x => x.id === id) : null;
    const orderData = {
      orderNumber, date, status, note, items,
      customerName: customerName || undefined,
      phone: phone || undefined,
      phone2: phone2 || undefined,
      address: address || undefined,
      totalPrice: totalPrice != null ? totalPrice : undefined,
      shipping: shipping != null ? shipping : undefined,
    };

    if (id) {
      if (previousOrder && previousOrder.status === 'delivered' && status !== 'delivered') {
        restoreOrderToStock(id);
      }
      arr = arr.map(x => {
        if (x.id !== id) return x;
        const newOrder = { ...x, ...orderData };
        if (previousOrder && previousOrder.status !== 'delivered' && status === 'delivered') deductOrderFromStock(newOrder);
        return newOrder;
      });
    } else {
      const newOrder = { id: generateId(), ...orderData };
      if (status === 'delivered') deductOrderFromStock(newOrder);
      arr.push(newOrder);
    }
    setOrders(arr);
    closeModal();
    render();
    if (window.renderProducts) window.renderProducts();
    if (window.renderMovements) window.renderMovements();
    if (window.updateDashboard) window.updateDashboard();
  });

  modal.querySelectorAll('.cancel-btn').forEach(btn => btn.addEventListener('click', closeModal));

  if (filterStatus) filterStatus.addEventListener('change', render);
  if (filterDateEl) filterDateEl.addEventListener('change', render);
  if (btnFilterToday) {
    btnFilterToday.addEventListener('click', function () {
      filterDateEl.value = getTodayDate();
      render();
    });
  }
  if (btnFilterClearDate) {
    btnFilterClearDate.addEventListener('click', function () {
      filterDateEl.value = '';
      render();
    });
  }

  window.renderOrders = render;
  window.renderOrderProductSelect = function () {
    itemsContainer.querySelectorAll('.order-item-product').forEach(select => fillProductOptions(select));
  };
})();
