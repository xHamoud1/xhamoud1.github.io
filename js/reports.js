/**
 * التقارير - تصدير Excel و PDF
 */
(function () {
  const { jsPDF } = window.jspdf;

  function formatDateAr(d) {
    if (!d) return '—';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getProductName(id) {
    const p = getProducts().find(x => x.id === id);
    return p ? p.name : id;
  }

  const STATUS_LABELS = { pending: 'قيد الانتظار', delivered: 'متسلم', excluded: 'مستبعد', postponed: 'متأجل' };

  // --- Excel ---
  function exportDepositsExcel() {
    const list = getDeposits();
    const rows = [['التاريخ', 'المبلغ', 'ملاحظات']];
    list.forEach(d => rows.push([formatDateAr(d.date), d.amount, d.note || '']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التأمينات');
    XLSX.writeFile(wb, 'تقرير-التأمينات.xlsx');
  }

  function exportProductsExcel() {
    const list = getProducts();
    const rows = [['المنتج', 'الوحدة', 'الكمية الحالية']];
    list.forEach(p => rows.push([p.name, p.unit || '', getProductCurrentStock(p.id)]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');
    XLSX.writeFile(wb, 'تقرير-المنتجات-والمخزون.xlsx');
  }

  function exportMovementsExcel() {
    const list = getMovements();
    const rows = [['التاريخ', 'المنتج', 'النوع', 'الكمية', 'ملاحظات']];
    list.forEach(m => rows.push([formatDateAr(m.date), getProductName(m.productId), m.type === 'in' ? 'إدخال' : 'إخراج', m.qty, m.note || '']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'حركات المخزون');
    XLSX.writeFile(wb, 'تقرير-حركات-المخزون.xlsx');
  }

  function exportOrdersExcel() {
    const list = getOrders();
    const rows = [['رقم الطلب', 'التاريخ', 'الحالة', 'اسم العميل', 'رقم الهاتف', 'رقم إضافي', 'العنوان', 'المنتجات والكميات', 'إجمالي السعر', 'الشحن', 'ملاحظات']];
    list.forEach(o => {
      const itemsText = (o.items || []).map(i => `${getProductName(i.productId)}: ${i.qty}`).join(' | ');
      rows.push([
        o.orderNumber || o.id,
        formatDateAr(o.date),
        STATUS_LABELS[o.status] || o.status,
        o.customerName || '',
        o.phone || '',
        o.phone2 || '',
        o.address || '',
        itemsText,
        o.totalPrice != null ? o.totalPrice : '',
        o.shipping != null ? o.shipping : '',
        o.note || '',
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الطلبات');
    XLSX.writeFile(wb, 'تقرير-الطلبات.xlsx');
  }

  // --- PDF ---
  function createPdfDoc(title) {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    doc.setFont('Helvetica');
    doc.setFontSize(18);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text('تاريخ التصدير: ' + formatDateAr(new Date().toISOString().slice(0, 10)), doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    return doc;
  }

  function exportDepositsPdf() {
    const list = getDeposits();
    const doc = createPdfDoc('تقرير التأمينات');
    const tableData = list.map(d => [formatDateAr(d.date), String(d.amount), (d.note || '').slice(0, 60)]);
    doc.autoTable({
      startY: 28,
      head: [['التاريخ', 'المبلغ', 'ملاحظات']],
      body: tableData.length ? tableData : [['لا توجد بيانات']],
      theme: 'grid',
      styles: { font: 'Helvetica', fontSize: 9 },
      headStyles: { fillColor: [60, 60, 60] },
    });
    doc.save('تقرير-التأمينات.pdf');
  }

  function exportProductsPdf() {
    const list = getProducts();
    const doc = createPdfDoc('تقرير المنتجات والمخزون');
    const tableData = list.map(p => [p.name, p.unit || '—', String(getProductCurrentStock(p.id))]);
    doc.autoTable({
      startY: 28,
      head: [['المنتج', 'الوحدة', 'الكمية الحالية']],
      body: tableData.length ? tableData : [['لا توجد بيانات']],
      theme: 'grid',
      styles: { font: 'Helvetica', fontSize: 9 },
      headStyles: { fillColor: [60, 60, 60] },
    });
    doc.save('تقرير-المنتجات-والمخزون.pdf');
  }

  function exportMovementsPdf() {
    const list = getMovements();
    const doc = createPdfDoc('تقرير حركات المخزون');
    const tableData = list.map(m => [formatDateAr(m.date), getProductName(m.productId), m.type === 'in' ? 'إدخال' : 'إخراج', String(m.qty), (m.note || '').slice(0, 40)]);
    doc.autoTable({
      startY: 28,
      head: [['التاريخ', 'المنتج', 'النوع', 'الكمية', 'ملاحظات']],
      body: tableData.length ? tableData : [['لا توجد بيانات']],
      theme: 'grid',
      styles: { font: 'Helvetica', fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
    });
    doc.save('تقرير-حركات-المخزون.pdf');
  }

  function exportOrdersPdf() {
    const list = getOrders();
    const doc = createPdfDoc('تقرير الطلبات');
    const tableData = list.map(o => {
      const itemsText = (o.items || []).map(i => `${getProductName(i.productId)}: ${i.qty}`).join(' | ');
      return [
        o.orderNumber || '—',
        formatDateAr(o.date),
        STATUS_LABELS[o.status] || o.status,
        (o.customerName || '—').slice(0, 15),
        (o.phone || '—').slice(0, 12),
        (o.address || '—').slice(0, 20),
        itemsText.slice(0, 35),
        o.totalPrice != null ? String(o.totalPrice) : '—',
        o.shipping != null ? String(o.shipping) : '—',
        (o.note || '').slice(0, 25),
      ];
    });
    doc.autoTable({
      startY: 28,
      head: [['رقم الطلب', 'التاريخ', 'الحالة', 'العميل', 'التليفون', 'العنوان', 'المنتجات', 'الإجمالي', 'الشحن', 'ملاحظات']],
      body: tableData.length ? tableData : [['لا توجد بيانات']],
      theme: 'grid',
      styles: { font: 'Helvetica', fontSize: 7 },
      headStyles: { fillColor: [60, 60, 60] },
    });
    doc.save('تقرير-الطلبات.pdf');
  }

  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', function () {
      const action = this.getAttribute('data-export');
      switch (action) {
        case 'deposits-excel': exportDepositsExcel(); break;
        case 'deposits-pdf': exportDepositsPdf(); break;
        case 'products-excel': exportProductsExcel(); break;
        case 'products-pdf': exportProductsPdf(); break;
        case 'movements-excel': exportMovementsExcel(); break;
        case 'movements-pdf': exportMovementsPdf(); break;
        case 'orders-excel': exportOrdersExcel(); break;
        case 'orders-pdf': exportOrdersPdf(); break;
      }
    });
  });
})();
