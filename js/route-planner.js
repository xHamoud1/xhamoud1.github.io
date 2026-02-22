/**
 * سير الطلبات - صفحة مستقلة لترتيب نقاط/طلبات على الخريطة ورسم خط السير
 * - إدخال: لينك لوكيشن (Google Maps) أو Lat,Lng
 * - ترتيب: الأقرب فالأقرب من موقعي
 * - خط سير: OSRM (عام)
 */
(function () {
  const pageEl = document.getElementById('page-route-planner');
  const mapEl = document.getElementById('rp-map');
  const tbody = document.getElementById('rp-tbody');
  const statusEl = document.getElementById('rp-status');

  const idInput = document.getElementById('rp-id');
  const titleInput = document.getElementById('rp-title');
  const phoneInput = document.getElementById('rp-phone');
  const phone2Input = document.getElementById('rp-phone2');
  const productInput = document.getElementById('rp-product');
  const totalInput = document.getElementById('rp-total');
  const locationInput = document.getElementById('rp-location');
  const noteInput = document.getElementById('rp-note');

  const btnAdd = document.getElementById('rp-btn-add');
  const btnMyLocation = document.getElementById('rp-btn-my-location');
  const btnOptimize = document.getElementById('rp-btn-optimize');
  const btnClear = document.getElementById('rp-btn-clear');

  let map = null;
  let markersLayer = null;
  let routeLayer = null;

  let myLocation = null; // {lat,lng}

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
  }

  function ensureMap() {
    if (!mapEl || !window.L) return;
    if (map) return;

    map = L.map(mapEl, { zoomControl: true });
    markersLayer = L.layerGroup().addTo(map);
    routeLayer = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.setView([30.0444, 31.2357], 11);
  }

  function safeNumber(n) {
    const x = Number(n);
    return Number.isFinite(x) ? x : null;
  }

  function parseLatLngFromText(text) {
    const t = (text || '').trim();
    if (!t) return null;

    // 0) Google place coordinates (actual place) like: ...!3dLAT!4dLNG...
    // Prefer this over @lat,lng because @ is often just the viewport/camera.
    const m0 = t.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (m0) {
      return { lat: Number(m0[1]), lng: Number(m0[2]) };
    }

    // 0b) Google Maps Directions API style: ?api=1&destination=lat,lng or query=lat,lng
    const m0b = t.match(/[?&](?:destination|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (m0b) {
      return { lat: Number(m0b[1]), lng: Number(m0b[2]) };
    }

    // 0c) Google maps search path: /maps/search/lat,lng
    // Example: https://www.google.com/maps/search/29.903858,+31.300057?... 
    const m0c = t.match(/\/maps\/search\/(-?\d+(?:\.\d+)?),\s*\+?(-?\d+(?:\.\d+)?)/);
    if (m0c) {
      return { lat: Number(m0c[1]), lng: Number(m0c[2]) };
    }

    // 1) direct "lat,lng"
    const m1 = t.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m1) {
      const lat = safeNumber(m1[1]);
      const lng = safeNumber(m1[2]);
      if (lat == null || lng == null) return null;
      return { lat, lng };
    }

    // 2) Google maps q=lat,lng
    const m2 = t.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (m2) {
      return { lat: Number(m2[1]), lng: Number(m2[2]) };
    }

    // 3) Google maps "@lat,lng"
    const m3 = t.match(/@\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m3) {
      return { lat: Number(m3[1]), lng: Number(m3[2]) };
    }

    // 4) google short link often resolves server-side; cannot parse reliably
    return null;
  }

  function makeGoogleMapsLink(lat, lng) {
    return `https://www.google.com/maps?q=${encodeURIComponent(lat + ',' + lng)}`;
  }

  function normalizePhone(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    // keep digits and leading +
    const cleaned = s.replace(/[^0-9+]/g, '');
    return cleaned;
  }

  function makeTelLink(phone) {
    const p = normalizePhone(phone);
    return p ? `tel:${p}` : '';
  }

  function makeWhatsAppLink(phone) {
    const p = normalizePhone(phone);
    if (!p) return '';
    // wa.me expects digits without +
    const digits = p.replace(/^\+/, '');
    return `https://wa.me/${digits}`;
  }

  function formatMoney(n) {
    if (n == null || n === '') return '—';
    const x = Number(n);
    if (!Number.isFinite(x)) return '—';
    return x.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';
  }

  function getPoints() {
    return getRoutePoints();
  }

  function setPoints(arr) {
    setRoutePoints(arr);
  }

  function haversineKm(a, b) {
    const R = 6371;
    const toRad = (x) => x * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function greedyOptimize(start, points) {
    const remaining = points.slice();
    const result = [];
    let cur = start;

    while (remaining.length) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversineKm(cur, remaining[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      const next = remaining.splice(bestIdx, 1)[0];
      result.push(next);
      cur = next;
    }

    return result;
  }

  function fitMapToAll() {
    if (!map || !window.L) return;
    const pts = [];
    const points = getPoints();
    points.forEach(p => pts.push([p.lat, p.lng]));
    if (myLocation) pts.push([myLocation.lat, myLocation.lng]);
    if (pts.length === 0) return;

    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds.pad(0.2));
  }

  function clearRoute() {
    if (routeLayer) routeLayer.clearLayers();
  }

  function movePoint(id, dir) {
    const points = getPoints();
    const idx = points.findIndex(p => String(p.id) === String(id));
    if (idx < 0) return;

    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= points.length) return;

    const next = points.slice();
    const tmp = next[idx];
    next[idx] = next[nextIdx];
    next[nextIdx] = tmp;

    setPoints(next);
    clearRoute();
    render();
    if (myLocation) {
      drawRoute();
    }
  }

  function renderMarkers() {
    ensureMap();
    if (!markersLayer) return;

    markersLayer.clearLayers();

    if (myLocation) {
      const m = L.marker([myLocation.lat, myLocation.lng], { title: 'موقعي' });
      m.bindPopup('موقعي الحالي');
      markersLayer.addLayer(m);
    }

    const points = getPoints();
    points.forEach((p, idx) => {
      const label = (idx + 1) + '';
      const icon = L.divIcon({
        className: 'rp-marker',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:rgba(88,166,255,0.95);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid rgba(0,0,0,0.35);">${label}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([p.lat, p.lng], { icon, title: p.title || `نقطة ${idx + 1}` });
      const gLink = p.link || makeGoogleMapsLink(p.lat, p.lng);

      const phoneLine = [p.phone, p.phone2].filter(Boolean).join(' · ');
      const detailsLine = [p.product, (p.total != null ? formatMoney(p.total) : '')].filter(Boolean).join(' · ');
      const popupHtml = `
        <div style="font-family:Tajawal, sans-serif; direction:rtl;">
          <div style="font-weight:800; margin-bottom:4px;">${(p.title || `نقطة ${idx + 1}`)}</div>
          <div style="color:#8b949e; margin-bottom:6px;">${[phoneLine, detailsLine, p.note].filter(Boolean).join('<br>')}</div>
          <a href="${gLink}" target="_blank" rel="noopener">فتح على Google Maps</a>
        </div>
      `;
      marker.bindPopup(popupHtml);
      markersLayer.addLayer(marker);
    });

    fitMapToAll();
  }

  async function fetchOsrmRoute(coords) {
    // coords: [{lat,lng}...]
    const str = coords.map(c => `${c.lng},${c.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${str}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM HTTP ' + res.status);
    const json = await res.json();
    if (!json || json.code !== 'Ok' || !json.routes || !json.routes[0]) {
      throw new Error('OSRM response invalid');
    }
    return json.routes[0];
  }

  async function drawRoute() {
    ensureMap();
    clearRoute();

    const points = getPoints();
    if (!points.length) return;

    if (!myLocation) {
      setStatus('حدد موقعي الحالي أولاً لتوليد خط السير.', true);
      return;
    }

    const coords = [myLocation, ...points];

    setStatus('جاري حساب خط السير...', false);
    try {
      const route = await fetchOsrmRoute(coords);
      const geo = route.geometry;
      const line = L.geoJSON(geo, { style: { color: '#58a6ff', weight: 5, opacity: 0.85 } });
      routeLayer.addLayer(line);
      fitMapToAll();

      const km = (route.distance || 0) / 1000;
      const mins = (route.duration || 0) / 60;
      setStatus(`تم حساب خط السير: ${km.toFixed(1)} كم تقريباً • ${Math.round(mins)} دقيقة`, false);
    } catch (e) {
      setStatus('تعذر حساب خط السير. تأكد من اتصال الإنترنت.', true);
      console.error(e);
    }
  }

  function renderTable() {
    const points = getPoints();
    if (!tbody) return;

    if (!points.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">لا توجد نقاط. أضف لينك لوكيشن أو Lat,Lng.</td></tr>';
      return;
    }

    tbody.innerHTML = points.map((p, idx) => {
      const link = p.link || makeGoogleMapsLink(p.lat, p.lng);
      const shortCoord = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
      const phone1 = p.phone ? String(p.phone) : '';
      const phone2 = p.phone2 ? String(p.phone2) : '';

      const phoneButtons = (ph) => {
        if (!ph) return '';
        const tel = makeTelLink(ph);
        const wa = makeWhatsAppLink(ph);
        return `
          <span class="rp-phone-actions">
            <a class="btn btn-small btn-ghost" href="${tel}">اتصال</a>
            <a class="btn btn-small btn-ghost" href="${wa}" target="_blank" rel="noopener">واتساب</a>
          </span>
        `;
      };

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${(p.title || '—')}${p.note ? `<br><small style="color:var(--text-muted)">${p.note}</small>` : ''}</td>
          <td>
            ${phone1 ? `<div>${phone1} ${phoneButtons(phone1)}</div>` : '<span style="color:var(--text-muted)">—</span>'}
            ${phone2 ? `<div style="margin-top:6px">${phone2} ${phoneButtons(phone2)}</div>` : ''}
          </td>
          <td>${p.product ? String(p.product) : '—'}</td>
          <td>${(p.total != null && p.total !== '') ? formatMoney(p.total) : '—'}</td>
          <td>${shortCoord}</td>
          <td><a href="${link}" target="_blank" rel="noopener">فتح</a></td>
          <td class="actions">
            <button type="button" class="btn btn-small btn-ghost rp-zoom" data-id="${p.id}">عرض</button>
            <button type="button" class="btn btn-small btn-ghost rp-move" data-id="${p.id}" data-dir="-1" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="btn btn-small btn-ghost rp-move" data-id="${p.id}" data-dir="1" ${idx === points.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="btn btn-small btn-secondary rp-edit" data-id="${p.id}">تعديل</button>
            <button type="button" class="btn btn-small btn-danger rp-del" data-id="${p.id}">حذف</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.rp-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        setPoints(getPoints().filter(x => String(x.id) !== String(id)));
        clearRoute();
        render();
      });
    });

    tbody.querySelectorAll('.rp-zoom').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const p = getPoints().find(x => String(x.id) === String(id));
        if (!p || !map) return;
        map.setView([p.lat, p.lng], 16);
      });
    });

    tbody.querySelectorAll('.rp-move').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const id = btn.dataset.id;
        const dir = parseInt(btn.dataset.dir, 10);
        movePoint(id, dir);
      });
    });

    tbody.querySelectorAll('.rp-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const p = getPoints().find(x => String(x.id) === String(id));
        if (!p) return;

        if (idInput) idInput.value = p.id;
        if (titleInput) titleInput.value = p.title || '';
        if (phoneInput) phoneInput.value = p.phone || '';
        if (phone2Input) phone2Input.value = p.phone2 || '';
        if (productInput) productInput.value = p.product || '';
        if (totalInput) totalInput.value = (p.total != null ? p.total : '');
        if (locationInput) locationInput.value = p.link || makeGoogleMapsLink(p.lat, p.lng);
        if (noteInput) noteInput.value = p.note || '';

        setStatus('تعديل الطلب: عدّل البيانات ثم اضغط حفظ.', false);
        if (titleInput) titleInput.focus();
      });
    });
  }

  function render() {
    // رندر الصفحة حتى لو مش مفتوحة علشان تبقى جاهزة
    if (!pageEl) return;
    ensureMap();
    renderTable();
    renderMarkers();
  }

  async function detectMyLocation() {
    if (!navigator.geolocation) {
      setStatus('المتصفح لا يدعم تحديد الموقع.', true);
      return;
    }

    setStatus('جاري تحديد موقعك...', false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        myLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setStatus('تم تحديد موقعك.', false);
        clearRoute();
        render();
      },
      () => {
        setStatus('تعذر تحديد موقعك. فعّل صلاحية الموقع.', true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function optimize() {
    const points = getPoints();
    if (!points.length) return;

    if (!myLocation) {
      setStatus('اضغط "موقعي الحالي" أولاً.', true);
      return;
    }

    const optimized = greedyOptimize(myLocation, points);
    setPoints(optimized);
    clearRoute();
    render();
    await drawRoute();
  }

  function savePoint() {
    const id = (idInput && idInput.value) ? idInput.value.trim() : '';

    const title = (titleInput && titleInput.value ? titleInput.value.trim() : '');
    const phone = (phoneInput && phoneInput.value ? phoneInput.value.trim() : '');
    const phone2 = (phone2Input && phone2Input.value ? phone2Input.value.trim() : '');
    const product = (productInput && productInput.value ? productInput.value.trim() : '');
    const total = (totalInput && totalInput.value !== '' ? parseFloat(totalInput.value) : null);

    const locText = (locationInput && locationInput.value ? locationInput.value.trim() : '');
    const note = (noteInput && noteInput.value ? noteInput.value.trim() : '');

    const ll = parseLatLngFromText(locText);
    if (!ll) {
      setStatus('الصيغة غير صحيحة. استخدم Lat,Lng أو لينك Google Maps فيه @lat,lng أو ?q=lat,lng', true);
      return;
    }

    const points = getPoints();
    const link = locText.startsWith('http') ? locText : makeGoogleMapsLink(ll.lat, ll.lng);

    if (id) {
      const next = points.map(p => {
        if (String(p.id) !== String(id)) return p;
        return {
          ...p,
          title: title || undefined,
          phone: phone || undefined,
          phone2: phone2 || undefined,
          product: product || undefined,
          total: (total != null && Number.isFinite(total)) ? total : null,
          note: note || undefined,
          lat: ll.lat,
          lng: ll.lng,
          link,
          updatedAt: new Date().toISOString(),
        };
      });
      setPoints(next);
    } else {
      points.push({
        id: generateId(),
        title: title || undefined,
        phone: phone || undefined,
        phone2: phone2 || undefined,
        product: product || undefined,
        total: (total != null && Number.isFinite(total)) ? total : null,
        note: note || undefined,
        lat: ll.lat,
        lng: ll.lng,
        link,
        createdAt: new Date().toISOString(),
      });
      setPoints(points);
    }

    if (idInput) idInput.value = '';
    if (titleInput) titleInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (phone2Input) phone2Input.value = '';
    if (productInput) productInput.value = '';
    if (totalInput) totalInput.value = '';
    if (locationInput) locationInput.value = '';
    if (noteInput) noteInput.value = '';

    setStatus('تمت الإضافة.', false);
    clearRoute();
    render();
  }

  function clearAll() {
    if (!confirm('مسح كل نقاط سير الطلبات؟')) return;
    setPoints([]);
    clearRoute();
    render();
  }

  if (btnAdd) btnAdd.addEventListener('click', savePoint);
  if (btnMyLocation) btnMyLocation.addEventListener('click', detectMyLocation);
  if (btnOptimize) btnOptimize.addEventListener('click', optimize);
  if (btnClear) btnClear.addEventListener('click', clearAll);

  // render API
  window.renderRoutePlanner = render;

  window.rpInvalidateMap = function () {
    if (map) {
      map.invalidateSize(true);
    }
  };

  // initial
  render();
})();
