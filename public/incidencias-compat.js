(function () {
  const originalApi = api;
  const text = (value) => String(value ?? '');
  const asLegacy = (row) => ({
    record_id: row.id,
    order_number: row.orderNumber,
    ticket_number: row.sourceType === 'tienda' ? row.ticketNumber || row.orderNumber : '',
    source_type: row.sourceType || 'order',
    customer_name: row.customerName,
    customer_email: row.customerEmail,
    customer_phone: row.customerPhone,
    incident_text: [
      row.incidentText,
      row.observations ? 'OBSERVACIONES:\n' + row.observations : '',
    ].filter(Boolean).join('\n\n'),
    incident_date: text(row.incidentDate).slice(0, 10),
    solved: row.solved ? 1 : 0,
    sent: row.sent ? 1 : 0,
    solved_at: row.solvedAt,
    updated_at: row.updatedAt,
    pickup_school: row.pickupSchool ? 1 : 0,
    pickup_school_name: row.pickupSchoolName,
    pickup_details: row.pickupDetails,
    pickup_received: row.pickupReceived ? 1 : 0,
    pickup_received_at: row.pickupReceivedAt,
    incident_school_name: row.school,
    amount: row.amount || '',
    order_total: row.amount || '',
    shipping_address: row.shippingAddress || '',
    ticket_file_id: row.ticketFileId || '',
    is_recurrence: row.isRecurrence ? 1 : 0,
    recurrence_count: row.recurrenceCount || 0,
    products_json: JSON.stringify(row.products || []),
    images: row.images || [],
  });

  const request = async (url, options) => {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ha ocurrido un error');
    return data;
  };

  api = async function (url, options) {
    const parsed = new URL(url, location.origin);
    if (parsed.pathname === '/api/order') {
      const entered = text(parsed.searchParams.get('number')).replace(/^#/, '');
      const supplied = entered.replace(/^I(?=(?:R|PA))/i, '');
      if (/^R/i.test(supplied)) {
        const monday = await request('/api/monday?number=' + encodeURIComponent(supplied));
        const rows = monday.records || [];
        if (!rows.length) throw new Error('No se encontró la reserva ' + supplied + ' en Monday.');
        const first = rows[0];
        const incidentResult = await request('/api/incidents?number=' + encodeURIComponent('I' + supplied));
        const incident = incidentResult.found ? asLegacy(incidentResult.incident) : {};
        return {
          order_number: first.reference || supplied,
          customer_name: first.customer || '',
          customer_email: first.customerEmail || '',
          customer_phone: first.phone || '',
          order_date: text(first.date).slice(0, 10).split('-').reverse().join('/'),
          order_status: first.status || 'Reserva Monday',
          order_total: '',
          shipping_address: [first.school, first.observations].filter(Boolean).join('\n'),
          incident_school_name: first.school || '',
          products_json: rows.map((row) => ({
            name: row.articleDescription || row.article || 'Artículo sin descripción',
            sku: row.code || '',
            quantity: row.units || 1,
            variation: row.size ? 'Talla: ' + row.size : '',
            unit_price: '',
            line_total: '',
            currency: '',
          })),
          ...incident,
        };
      }
      const order = await request('/api/search?number=' + encodeURIComponent(supplied));
      const incidentResult = await request('/api/incidents?number=' + encodeURIComponent('I' + supplied));
      const incident = incidentResult.found ? asLegacy(incidentResult.incident) : {};
      return {
        order_number: order.number,
        customer_name: order.customer?.name || '',
        customer_email: order.customer?.email || '',
        customer_phone: order.customer?.phone || '',
        order_date: text(order.dateCreated).slice(0, 10).split('-').reverse().join('/'),
        order_status: order.statusLabel || order.status || '',
        order_total: order.total || '',
        shipping_address: order.customer?.address || '',
        products_json: (order.items || []).map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          variation: item.size,
          unit_price: '',
          line_total: item.total,
          currency: '',
        })),
        ...incident,
      };
    }
    if (parsed.pathname === '/api/incidents') {
      const data = await request('/api/incidents?scope=all');
      const query = text(parsed.searchParams.get('q')).trim().toLowerCase();
      return (data.rows || []).map(asLegacy).filter((row) => !query || [row.order_number, row.customer_name, row.incident_text].some((value) => text(value).toLowerCase().includes(query)));
    }
    if (parsed.pathname === '/api/store-incident') {
      const ticket = text(parsed.searchParams.get('ticket')).trim().replace(/^#/, '');
      const data = await request('/api/incidents?number=' + encodeURIComponent(ticket));
      if (!data.found || data.incident?.sourceType !== 'tienda') {
        throw new Error('No se encontró la incidencia de tienda ' + ticket + '.');
      }
      return asLegacy(data.incident);
    }
    if (parsed.pathname === '/api/incident-record') {
      const reference = text(parsed.searchParams.get('number')).trim().replace(/^#/, '');
      const data = await request('/api/incidents?number=' + encodeURIComponent(reference));
      if (!data.found) throw new Error('No se encontró la incidencia ' + reference + '.');
      return asLegacy(data.incident);
    }
    if (parsed.pathname === '/api/pickups') {
      const data = await request('/api/incidents?scope=pickups');
      return (data.rows || []).map(asLegacy);
    }
    if (parsed.pathname === '/api/save' || parsed.pathname === '/api/store-save') {
      const body = JSON.parse(options?.body || '{}');
      const record = body.record || body;
      if (parsed.pathname === '/api/store-save') {
        record.order_number = record.order_number || record.ticket_number;
        record.ticket_number = record.ticket_number || record.order_number;
        record.source_type = 'tienda';
      }
      const data = await request('/api/incidents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
      });
      return data.row;
    }
    if (parsed.pathname === '/api/solved' || parsed.pathname === '/api/pickup-received' || parsed.pathname === '/api/sent') {
      const body = JSON.parse(options?.body || '{}');
      const data = await request('/api/incidents', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderNumber: body.order_number,
          ...(parsed.pathname === '/api/solved' ? { solved: Boolean(body.solved) } : {}),
          ...(parsed.pathname === '/api/pickup-received' ? { received: Boolean(body.received) } : {}),
          ...(parsed.pathname === '/api/sent' ? { sent: Boolean(body.sent) } : {}),
        }),
      });
      return asLegacy(data.incident);
    }
    if (parsed.pathname === '/api/store-incidents') {
      const data = await request('/api/incidents?scope=all');
      return (data.rows || []).map(asLegacy).filter((row) => row.source_type === 'tienda');
    }
    if (parsed.pathname === '/api/metrics') {
      const data = await request('/api/incidents?scope=all');
      const rows = data.rows || [];
      const grouped = (key) => Object.entries(rows.reduce((acc, row) => {
        const label = key(row) || 'Sin indicar';
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
      return {
        total: rows.length,
        pending: rows.filter((row) => !row.solved).length,
        solved: rows.filter((row) => row.solved).length,
        recurrent_total: rows.filter((row) => row.recurrenceCount > 0).length,
        pickup: rows.filter((row) => row.pickupSchool).length,
        affected_amount: 0,
        average_resolution_days: 0,
        schools: grouped((row) => row.school || row.pickupSchoolName),
        products: grouped((row) => row.products?.[0]?.name),
        months: grouped((row) => text(row.incidentDate).slice(0, 7)),
        years: grouped((row) => text(row.incidentDate).slice(0, 4)),
        recurrent: rows.filter((row) => row.recurrenceCount > 0).map((row) => ({
          order_number: row.orderNumber,
          customer_name: row.customerName,
          school: row.school,
          recurrence_count: row.recurrenceCount,
          last_date: text(row.incidentDate).slice(0, 10),
        })),
      };
    }
    return originalApi(url, options);
  };

  function printableProducts(record) {
    try {
      const products = typeof record.products_json === 'string'
        ? JSON.parse(record.products_json || '[]')
        : record.products_json || [];
      return products.map((item) => `<tr><td>${esc(item.name || '')}</td><td>${esc(item.sku || '')}</td><td>${esc(item.variation || item.size || '')}</td><td>${esc(item.quantity || item.units || '')}</td></tr>`).join('');
    } catch {
      return '';
    }
  }

  function printableImages(record) {
    if (!record.record_id || !Array.isArray(record.images) || !record.images.length) return '';
    const images = record.images.map((image) => {
      const source = `/api/incidents/images?incidentId=${encodeURIComponent(record.record_id)}&key=${encodeURIComponent(image.key)}`;
      return `<figure><img src="${source}" alt="${esc(image.name || 'Imagen de la incidencia')}"><figcaption>${esc(image.name || 'Imagen')}</figcaption></figure>`;
    }).join('');
    return `<section class="print-images"><h2>Imágenes de la incidencia</h2><div>${images}</div></section>`;
  }

  function renderPrintWindow(target, record, label) {
    if (!target) {
      alert('El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes para esta página.');
      return;
    }
    const reference = record.order_number || record.ticket_number || '';
    const products = printableProducts(record);
    const images = printableImages(record);
    const pickup = record.pickup_school
      ? `<section><h2>Recogida en colegio</h2><p><b>Colegio:</b> ${esc(record.pickup_school_name || '')}</p><p>${esc(record.pickup_details || '').replace(/\n/g, '<br>')}</p></section>`
      : '';
    const content = label
      ? `<main class="label"><h1>INCIDENCIA ${esc(reference)}</h1><p><b>${esc(record.customer_name || 'Sin nombre')}</b></p><p>${esc(record.customer_phone || '')}</p><p>${esc(record.incident_school_name || record.pickup_school_name || '')}</p><p>${esc(record.incident_text || '')}</p></main>`
      : `<main><header><div><h1>Paddy · Incidencia</h1><p>Documento de gestión</p></div><div class="reference">${esc(reference)}</div></header><section class="grid"><div><span>CLIENTE</span><b>${esc(record.customer_name || 'Sin nombre')}</b></div><div><span>FECHA</span><b>${esc(record.incident_date || '')}</b></div><div><span>TELÉFONO</span><b>${esc(record.customer_phone || '')}</b></div><div><span>COLEGIO</span><b>${esc(record.incident_school_name || '')}</b></div></section><section><h2>Descripción de la incidencia</h2><p>${esc(record.incident_text || '').replace(/\n/g, '<br>')}</p></section>${pickup}${products ? `<section><h2>Artículos</h2><table><thead><tr><th>Artículo</th><th>Código</th><th>Talla</th><th>Unidades</th></tr></thead><tbody>${products}</tbody></table></section>` : ''}${images}<footer>${record.solved ? 'INCIDENCIA SOLUCIONADA' : 'INCIDENCIA PENDIENTE'}</footer></main>`;
    target.document.open();
    target.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Incidencia ${esc(reference)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#173c31;margin:0}main{max-width:780px;margin:auto}header{display:flex;justify-content:space-between;align-items:start;border-bottom:3px solid #285b43;padding-bottom:18px}.reference{font-size:24px;font-weight:800}h1{margin:0}h2{font-size:17px;margin:24px 0 10px}p{line-height:1.5}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}.grid div{border:1px solid #d7e0db;border-radius:8px;padding:12px}.grid span{display:block;font-size:11px;color:#68766f}.grid b{display:block;margin-top:5px}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #dfe5e1;padding:9px}.print-images>div{display:grid;grid-template-columns:1fr 1fr;gap:10px}.print-images figure{margin:0;break-inside:avoid}.print-images img{display:block;width:100%;height:85mm;object-fit:contain;border:1px solid #d7e0db}.print-images figcaption{font-size:11px;margin-top:4px;color:#68766f}footer{margin-top:30px;border-top:1px solid #ccd7d1;padding-top:12px;font-weight:700}.label{border:3px solid #173c31;padding:18px;width:100%;max-width:100mm}.label h1{font-size:22px;border-bottom:2px solid #173c31;padding-bottom:10px}.label p{margin:8px 0;font-size:16px}@media print{button{display:none}}</style></head><body>${content}<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),150)})<\/script></body></html>`);
    target.document.close();
  }

  function installPrintButton(id, getRecord, label) {
    const button = document.getElementById(id);
    if (!button) return;
    button.onclick = async () => {
      const target = window.open('', '_blank');
      try {
        const record = await getRecord();
        if (record) renderPrintWindow(target, record, label);
        else target?.close();
      } catch (error) {
        target?.close();
        status(error instanceof Error ? error.message : 'No se pudo preparar la impresión.', 'error');
      }
    };
  }

  // Identificadores automáticos para incidencias sin pedido, reserva o ticket.
  // La numeración se reserva en D1, no en el navegador, para evitar duplicados.
  const automaticIdControl = (inputId, checkboxId, checked) => {
    const input = document.getElementById(inputId);
    if (!input || document.getElementById(checkboxId)) return;
    input.insertAdjacentHTML(
      'afterend',
      `<label class="check" style="margin-top:10px"><input type="checkbox" id="${checkboxId}" ${checked ? 'checked' : ''}> Crear ID automático al guardar</label>`,
    );
  };
  automaticIdControl('storeTicket', 'storeAutoId', false);
  automaticIdControl('ownReference', 'ownAutoId', true);

  async function reserveAutomaticIncidentId() {
    const data = await request('/api/incidents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ allocate_id_only: true }),
    });
    if (!data.generatedId) throw new Error('No se pudo generar el ID automático.');
    return data.generatedId;
  }

  const saveStoreWithAutomaticId = saveStore;
  saveStore = async function () {
    const input = document.getElementById('storeTicket');
    const automatic = document.getElementById('storeAutoId');
    if (!input.value.trim() && automatic?.checked) {
      storeMessage('Generando un ID único…');
      input.value = await reserveAutomaticIncidentId();
    }
    return saveStoreWithAutomaticId();
  };
  const clearStoreWithAutomaticId = clearStore;
  clearStore = function () {
    clearStoreWithAutomaticId();
    document.getElementById('storeAutoId').checked = false;
  };
  const showStoreWithAutomaticId = showStore;
  showStore = function (row) {
    showStoreWithAutomaticId(row);
    document.getElementById('storeAutoId').checked = false;
  };

  const saveOwnWithAutomaticId = saveOwn;
  saveOwn = async function () {
    const input = document.getElementById('ownReference');
    const automatic = document.getElementById('ownAutoId');
    if (!input.value.trim() && !automatic?.checked) {
      ownMessage('Escribe una referencia o marca “Crear ID automático”.', 'error');
      return null;
    }
    if (!input.value.trim() && automatic?.checked) {
      ownMessage('Generando un ID único…');
      input.value = await reserveAutomaticIncidentId();
    }
    return saveOwnWithAutomaticId();
  };
  const clearOwnWithAutomaticId = clearOwn;
  clearOwn = function () {
    clearOwnWithAutomaticId();
    document.getElementById('ownAutoId').checked = true;
  };
  const showOwnWithAutomaticId = showOwn;
  showOwn = function (row) {
    showOwnWithAutomaticId(row);
    document.getElementById('ownAutoId').checked = false;
  };

  // Imágenes privadas de incidencias. Los archivos se guardan en R2 y la
  // incidencia conserva solo sus referencias, para no cargar la base de datos.
  const imageDrafts = { order: [], store: [], own: [] };
  const imageRecords = { order: null, store: null, own: null };
  const imageField = (anchorId, kind) => {
    const anchor = document.getElementById(anchorId);
    if (!anchor || document.getElementById(kind + 'IncidentImages')) return;
    (anchor.closest('.actions') || anchor).insertAdjacentHTML('beforebegin', `<section class="incident-images"><label>IMÁGENES DE LA INCIDENCIA</label><small>Hasta 4 imágenes JPG, PNG o WebP · máximo 5 MB cada una</small><input id="${kind}IncidentImages" type="file" accept="image/jpeg,image/png,image/webp" multiple><div id="${kind}IncidentImageGrid" class="incident-image-grid"></div><p id="${kind}IncidentImageError" class="error"></p></section>`);
    document.getElementById(kind + 'IncidentImages').onchange = (event) => {
      const files = Array.from(event.target.files || []);
      const current = imageRecords[kind]?.images?.length || 0;
      const invalid = files.find((file) => !['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024);
      const error = document.getElementById(kind + 'IncidentImageError');
      if (invalid) error.textContent = 'Usa imágenes JPG, PNG o WebP de 5 MB como máximo.';
      else if (current + imageDrafts[kind].length + files.length > 4) error.textContent = 'Puedes adjuntar un máximo de 4 imágenes.';
      else { error.textContent = ''; imageDrafts[kind].push(...files); }
      event.target.value = '';
      renderIncidentImages(kind);
    };
  };
  const renderIncidentImages = (kind) => {
    const grid = document.getElementById(kind + 'IncidentImageGrid');
    if (!grid) return;
    const row = imageRecords[kind];
    const saved = (row?.images || []).map((image) => `<a href="/api/incidents/images?incidentId=${encodeURIComponent(row.record_id)}&key=${encodeURIComponent(image.key)}" target="_blank"><img src="/api/incidents/images?incidentId=${encodeURIComponent(row.record_id)}&key=${encodeURIComponent(image.key)}" alt="${esc(image.name)}"><span>${esc(image.name)}</span></a>`).join('');
    const pending = imageDrafts[kind].map((file, index) => `<div><img src="${URL.createObjectURL(file)}" alt="Vista previa"><span>${esc(file.name)}</span><button type="button" data-remove-image="${kind}:${index}">Quitar</button></div>`).join('');
    grid.innerHTML = saved + pending;
    grid.querySelectorAll('[data-remove-image]').forEach((button) => button.onclick = () => { const index = Number(button.dataset.removeImage.split(':')[1]); imageDrafts[kind].splice(index, 1); renderIncidentImages(kind); });
  };
  const resetIncidentImages = (kind, row = null) => { imageDrafts[kind] = []; imageRecords[kind] = row; renderIncidentImages(kind); };
  const uploadIncidentImages = async (kind, row) => {
    const files = imageDrafts[kind];
    if (!files.length) return row;
    const incidentId = row?.record_id;
    if (!incidentId) throw new Error('No se pudo identificar la incidencia para guardar las imágenes.');
    const form = new FormData();
    form.set('incidentId', incidentId);
    files.forEach((file) => form.append('images', file));
    const data = await request('/api/incidents/images', { method: 'POST', body: form });
    const updated = asLegacy(data.incident);
    resetIncidentImages(kind, updated);
    return updated;
  };
  imageField('solved', 'order');
  imageField('storeSolved', 'store');
  imageField('ownSolved', 'own');
  const ticketImageInput = document.getElementById('storeImage');
  if (ticketImageInput) ticketImageInput.onchange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = document.getElementById('storeIncidentImageError');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
      error.textContent = 'Usa una imagen JPG, PNG o WebP de 5 MB como máximo.';
      event.target.value = '';
      return;
    }
    if ((imageRecords.store?.images?.length || 0) + imageDrafts.store.length >= 4) {
      error.textContent = 'Puedes adjuntar un máximo de 4 imágenes.';
      event.target.value = '';
      return;
    }
    error.textContent = '';
    imageDrafts.store.push(file);
    document.getElementById('storePreview').src = URL.createObjectURL(file);
    document.getElementById('storePreview').classList.remove('hidden');
    renderIncidentImages('store');
  };
  const showWithImages = show; show = function (row) { showWithImages(row); resetIncidentImages('order', row); };
  const showStoreWithImages = showStore; showStore = function (row) { showStoreWithImages(row); resetIncidentImages('store', row); };
  const showOwnWithImages = showOwn; showOwn = function (row) { showOwnWithImages(row); resetIncidentImages('own', row); };
  const clearStoreWithImages = clearStore; clearStore = function () { clearStoreWithImages(); resetIncidentImages('store'); };
  const clearOwnWithImages = clearOwn; clearOwn = function () { clearOwnWithImages(); resetIncidentImages('own'); };
  const saveWithImages = save; save = async function (force = false) { const row = await saveWithImages(force); return row ? await uploadIncidentImages('order', row) : row; };
  const saveStoreWithImages = saveStore; saveStore = async function () { const row = await saveStoreWithImages(); return row ? await uploadIncidentImages('store', row) : row; };
  const saveOwnWithImages = saveOwn; saveOwn = async function () { const row = await saveOwnWithImages(); return row ? await uploadIncidentImages('own', row) : row; };

  document.getElementById('storeSaveBtn').onclick = saveStore;
  document.getElementById('storeNewBtn').onclick = clearStore;
  document.getElementById('ownSaveBtn').onclick = saveOwn;
  document.getElementById('ownNewBtn').onclick = clearOwn;
  document.getElementById('saveBtn').onclick = () => save(false);
  document.getElementById('solveBtn').onclick = () => save(true);
  clearOwn();

  installPrintButton('printBtn', async () => { await save(); return current; }, false);
  installPrintButton('labelBtn', async () => { await save(); return current; }, true);
  installPrintButton('storePrintBtn', async () => await saveStore(), false);
  installPrintButton('ownPrintBtn', async () => await saveOwn(), false);
  installPrintButton('ownLabelBtn', async () => await saveOwn(), true);
})();
