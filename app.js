/*
 * APP HORAS EXTRAS — Interfaz (GitHub Pages)
 * Departamento de Agua Potable y Alcantarillado · Lagos de Moreno
 */
(function () {
  'use strict';
  var R = window.Reportes;
  var CDN = {
    pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfjsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    pdflib: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    pdfmake: 'https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/pdfmake.min.js',
    vfs: 'https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/vfs_fonts.js',
    exceljs: 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
  };
  var PAGINAS_POR_BLOQUE = 4;

  var E = {
    token: leer('hx_token'), usuario: null, vista: 'semana',
    lunes: semanaInicial(), pestana: 'FUGA_AGUA', datos: null,
    cat: null, pend: [], revision: null, zoom: 1, logo: null, miniaturas: {}
  };

  // ===================== UTILIDADES =====================
  function leer(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function guardar(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
  function h(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function hoyIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function semanaInicial() {
    var hoy = hoyIso(), lunes = R.lunesDe(hoy), dia = R.diaSem(hoy);
    return dia <= 1 ? R.sumar(lunes, -7) : lunes;   // lunes y martes: semana anterior
  }
  function rango(lunes) { var d = R.sumar(lunes, 6); return Number(lunes.slice(8)) + (lunes.slice(0, 7) === d.slice(0, 7) ? '' : ' de ' + mesTxt(lunes)) + ' al ' + Number(d.slice(8)) + ' de ' + mesTxt(d) + ' de ' + d.slice(0, 4); }
  function mesTxt(iso) { return R.MESES[Number(iso.slice(5, 7)) - 1].toLowerCase(); }
  function aviso(msg, ms) { var a = $('#aviso'); a.textContent = msg; a.classList.add('ver'); clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.classList.remove('ver'); }, ms || 3500); }
  function cargarScript(url) {
    return new Promise(function (ok, mal) {
      if ($('script[src="' + url + '"]')) return ok();
      var s = document.createElement('script'); s.src = url; s.onload = function () { ok(); }; s.onerror = function () { mal(new Error('No se pudo cargar ' + url)); };
      document.head.appendChild(s);
    });
  }
  function descargar(blob, nombre) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  var OJO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OJO_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.8 10.8 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 5.1-5.9M9.9 4.2A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a19.9 19.9 0 0 1-2.2 3.3M14.1 14.1a3 3 0 1 1-4.2-4.2"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  /** Campo de contraseña con botón de ojo para ver lo que se escribe */
  function campoClave(id, atributos) {
    return '<span class="clave"><input type="password" id="' + id + '" ' + (atributos || '') + '><button type="button" data-ojo="' + id + '" aria-label="Mostrar contraseña" aria-pressed="false">' + OJO + '</button></span>';
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-ojo]');
    if (!b) return;
    var inp = document.getElementById(b.getAttribute('data-ojo')); if (!inp) return;
    var ver = inp.type === 'password';
    inp.type = ver ? 'text' : 'password';
    b.innerHTML = ver ? OJO_NO : OJO;
    b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    b.setAttribute('aria-pressed', ver ? 'true' : 'false');
    inp.focus();
  });
  function b64aBytes(b64) { var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function bytesAB64(bytes) { var s = '', paso = 0x8000; for (var i = 0; i < bytes.length; i += paso) s += String.fromCharCode.apply(null, bytes.subarray(i, i + paso)); return btoa(s); }
  function nombrePest(clave) { var p = pestanas().find(function (x) { return x.clave === clave; }); return p ? p.nombre : clave; }
  function pestanas() { return (E.datos && E.datos.pestanas) || (E.cat && E.cat.pestanas) || []; }

  // ===================== API =====================
  function api(accion) {
    var args = Array.prototype.slice.call(arguments, 1);
    var url = (window.APP_CONFIG || {}).API_URL;
    if (!url || /PEGAR/.test(url)) return Promise.reject(new Error('Falta la URL del motor en config.js.'));
    var conToken = ['login'].indexOf(accion) === -1;
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: accion, args: conToken ? [E.token].concat(args) : args }) })
      .then(function (r) { if (!r.ok) throw new Error('El motor respondió ' + r.status + '.'); return r.json(); })
      .then(function (j) {
        if (j.error) {
          if (j.error === 'SESION_EXPIRADA') { salirLocal(); throw new Error('La sesión terminó. Vuelve a entrar.'); }
          throw new Error(j.error);
        }
        return j.data;
      });
  }
  function fallo(e) { aviso(e.message || String(e), 6000); console.error(e); }

  // ===================== INICIO / ACCESO =====================
  function iniciar() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
    if (!E.token) return pantallaLogin();
    api('estado').then(function (u) { E.usuario = u; if (u.debeCambiar) return pantallaCambiarClave(true); entrar(); })
      .catch(function () { pantallaLogin(); });
  }
  function salirLocal() { E.token = ''; guardar('hx_token', ''); E.usuario = null; pantallaLogin(); }

  function pantallaLogin(msg) {
    $('#app').innerHTML = '<div class="login"><form class="tarjeta" id="fLogin">' +
      '<img src="logo.jpg" alt="Agua Potable Lagos de Moreno">' +
      '<div style="text-align:center"><b>DEPARTAMENTO DE AGUA POTABLE Y ALCANTARILLADO</b><br><span class="muted">FORMATO ÚNICO DE HORAS EXTRAS</span></div>' +
      '<label class="col"><span class="etq">USUARIO</span><input type="text" id="lU" autocomplete="username" autocapitalize="none" required></label>' +
      '<label class="col"><span class="etq">CONTRASEÑA</span>' + campoClave('lC', 'autocomplete="current-password" required') + '</label>' +
      '<div class="error" id="lE">' + h(msg || '') + '</div>' +
      '<button class="btn pri" type="submit">Entrar</button></form></div>';
    $('#fLogin').onsubmit = function (ev) {
      ev.preventDefault();
      var b = $('#fLogin button'); b.disabled = true; $('#lE').textContent = '';
      api('login', $('#lU').value, $('#lC').value).then(function (r) {
        if (!r.ok) { $('#lE').textContent = r.mensaje; b.disabled = false; return; }
        E.token = r.token; guardar('hx_token', r.token); E.usuario = r;
        if (r.debeCambiar) pantallaCambiarClave(true); else entrar();
      }).catch(function (e) { $('#lE').textContent = e.message; b.disabled = false; });
    };
  }

  function pantallaCambiarClave(obligatorio) {
    var html = '<form class="col" id="fClave">' +
      '<h2 style="margin:0">' + (obligatorio ? 'Crea tu contraseña' : 'Cambiar contraseña') + '</h2>' +
      (obligatorio ? '<p class="muted" style="margin:0">Es tu primer acceso o se restableció tu contraseña. Escribe la temporal y una nueva de al menos 8 caracteres.</p>' : '') +
      '<label class="col"><span class="etq">CONTRASEÑA ACTUAL</span>' + campoClave('cA', 'required autocomplete="current-password"') + '</label>' +
      '<label class="col"><span class="etq">NUEVA CONTRASEÑA</span>' + campoClave('cN', 'minlength="8" required autocomplete="new-password"') + '</label>' +
      '<label class="col"><span class="etq">REPITE LA NUEVA</span>' + campoClave('cR', 'minlength="8" required autocomplete="new-password"') + '</label>' +
      '<div class="error" id="cE"></div><div class="fila"><button class="btn pri" type="submit">Guardar</button>' + (obligatorio ? '' : '<button class="btn" type="button" id="cX">Cancelar</button>') + '</div></form>';
    if (obligatorio) $('#app').innerHTML = '<div class="login"><div class="tarjeta">' + html + '</div></div>';
    else abrirModal(html);
    if ($('#cX')) $('#cX').onclick = cerrarModal;
    $('#fClave').onsubmit = function (ev) {
      ev.preventDefault();
      if ($('#cN').value !== $('#cR').value) { $('#cE').textContent = 'Las contraseñas nuevas no coinciden.'; return; }
      api('cambiarClave', $('#cA').value, $('#cN').value).then(function (r) {
        if (!r.ok) { $('#cE').textContent = r.mensaje; return; }
        aviso('Contraseña guardada.'); if (obligatorio) { E.usuario.debeCambiar = false; entrar(); } else cerrarModal();
      }).catch(function (e) { $('#cE').textContent = e.message; });
    };
  }

  function entrar() {
    fetch('logo.jpg').then(function (r) { return r.blob(); }).then(function (b) {
      var fr = new FileReader(); fr.onload = function () { E.logo = fr.result; }; fr.readAsDataURL(b);
    }).catch(function () {});
    api('catalogos').then(function (c) { E.cat = c; ir(E.vista); }).catch(fallo);
  }

  function marco(contenido) {
    var u = E.usuario || {};
    var nav = [['semana', 'Semana'], ['revisar', 'Revisar hojas' + (E.pend.filter(function (p) { return p.estado === 'LISTA'; }).length ? '<span class="badge">' + E.pend.filter(function (p) { return p.estado === 'LISTA'; }).length + '</span>' : '')],
      ['historico', 'Histórico'], ['config', 'Configuración']];
    $('#app').innerHTML = '<header class="enc"><div class="enc-marca"><img src="logo.jpg" alt=""><div class="enc-tit"><b>DEPARTAMENTO DE AGUA POTABLE Y ALCANTARILLADO</b><span>FORMATO ÚNICO DE HORAS EXTRAS</span></div></div>' +
      '<nav aria-label="Menú">' + nav.map(function (n) { return '<button data-ir="' + n[0] + '" class="' + (E.vista === n[0] ? 'activo' : '') + '">' + n[1] + '</button>'; }).join('') +
      '<span class="usuario">' + h(u.nombre || '') + '</span><button data-accion="clave" title="Cambiar contraseña">Contraseña</button><button data-accion="salir">Salir</button></nav></header>' +
      '<main class="contenedor" id="main">' + contenido + '</main>';
    $$('[data-ir]').forEach(function (b) { b.onclick = function () { ir(b.getAttribute('data-ir')); }; });
    $('[data-accion=salir]').onclick = function () { api('logout').catch(function () {}); salirLocal(); };
    $('[data-accion=clave]').onclick = function () { pantallaCambiarClave(false); };
  }

  function ir(vista) {
    E.vista = vista;
    if (vista === 'semana') return vistaSemana();
    if (vista === 'revisar') return vistaRevisar();
    if (vista === 'historico') return vistaHistorico();
    if (vista === 'config') return vistaConfig();
  }

  // ===================== SEMANA =====================
  function vistaSemana() {
    marco('<div class="muted">Cargando semana…</div>');
    Promise.all([api('semana', E.lunes), api('pendientes')]).then(function (r) {
      E.datos = r[0]; E.pend = r[1]; E.lunes = r[0].lunes;
      pintarSemana();
    }).catch(function (e) { fallo(e); marco('<div class="tarjeta">No se pudo cargar: ' + h(e.message) + '</div>'); });
  }

  function pintarSemana() {
    var d = E.datos, pests = d.pestanas;
    var conteo = {};
    d.registros.forEach(function (r) { conteo[r.p] = conteo[r.p] || {}; conteo[r.p][r.no] = true; });
    var cerrada = estadoCerrada(d, E.lunes);
    var listas = E.pend.filter(function (p) { return p.estado === 'LISTA'; }).length, espera = E.pend.filter(function (p) { return p.estado === 'EN_ESPERA'; }).length;
    var tabs = pests.map(function (p) { return { clave: p.clave, nombre: p.nombre, n: Object.keys(conteo[p.clave] || {}).length }; }).concat([{ clave: 'RESUMEN', nombre: 'Resumen', n: '' }]);
    var html = '<section class="fila entre">' +
      '<div class="fila"><button class="icono" id="sAnt" aria-label="Semana anterior">‹</button>' +
      '<div class="col" style="gap:0"><span class="etq">SEMANA</span><b style="font-size:20px">' + h(rango(E.lunes)) + '</b></div>' +
      '<button class="icono" id="sSig" aria-label="Semana siguiente">›</button>' +
      '<input type="date" id="sFecha" value="' + E.lunes + '" aria-label="Ir a la semana de" style="width:160px">' +
      (cerrada ? '<span class="chip gris" title="Marcada por ' + h(cerrada.por) + ' el ' + h(cerrada.en) + '">Cerrada (impresa)</span>' : '<span class="chip ok">Abierta</span>') + '</div>' +
      '<div class="fila"><button class="btn pri" id="sSubir">Subir hojas escaneadas</button><button class="btn" id="sPdf">PDF</button><button class="btn" id="sXls">Excel</button></div></section>' +
      (listas || espera ? '<div class="tarjeta" style="padding:12px 16px;background:#fff7d1;border-color:#ecd27a">' +
        (listas ? '<b>' + listas + ' hoja(s) leída(s) por revisar.</b> <a href="#" id="sIrRev">Revisar ahora</a> ' : '') +
        (espera ? '<span class="muted">' + espera + ' en espera de lectura (se reintenta sola).</span>' : '') + '</div>' : '') +
      '<div class="tabs" role="tablist">' + tabs.map(function (t) {
        return '<button role="tab" data-tab="' + t.clave + '" class="' + (E.pestana === t.clave ? 'activo ' : '') + (t.n === 0 ? 'vacia' : '') + '">' + h(t.nombre) + (t.n !== '' ? ' <span class="n">' + (t.n || '–') + '</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<label class="tabs-movil col"><span class="etq">PESTAÑA</span><select id="sTabM">' + tabs.map(function (t) { return '<option value="' + t.clave + '"' + (E.pestana === t.clave ? ' selected' : '') + '>' + h(t.nombre) + (t.n ? ' (' + t.n + ')' : '') + '</option>'; }).join('') + '</select></label>' +
      '<div id="sCont"></div>';
    marco(html);
    $('#sAnt').onclick = function () { E.lunes = R.sumar(E.lunes, -7); vistaSemana(); };
    $('#sSig').onclick = function () { E.lunes = R.sumar(E.lunes, 7); vistaSemana(); };
    $('#sFecha').onchange = function () { if (this.value) { E.lunes = R.lunesDe(this.value); vistaSemana(); } };
    $('#sSubir').onclick = modalSubir;
    $('#sPdf').onclick = function () { modalDescargas('PDF'); };
    $('#sXls').onclick = function () { modalDescargas('EXCEL'); };
    if ($('#sIrRev')) $('#sIrRev').onclick = function (ev) { ev.preventDefault(); ir('revisar'); };
    $$('[data-tab]').forEach(function (b) { b.onclick = function () { E.pestana = b.getAttribute('data-tab'); pintarSemana(); }; });
    $('#sTabM').onchange = function () { E.pestana = this.value; pintarSemana(); };
    if (E.pestana === 'RESUMEN') pintarResumenSemana(); else pintarPestana();
  }

  function pintarResumenSemana() {
    var d = E.datos, dias = R.diasDe(E.lunes), tot = [0, 0, 0, 0, 0, 0, 0];
    var filas = d.pestanas.map(function (p) {
      var s = R.armarSemana(d, E.lunes, p.clave);
      s.totalesDia.forEach(function (v, i) { tot[i] += v; });
      return '<tr><td>' + h(p.nombre) + '</td>' + s.totalesDia.map(function (v, i) { return '<td class="c' + (d.festivos[dias[i]] ? ' fest' : '') + '">' + (v || '') + '</td>'; }).join('') + '<td class="c"><b>' + s.total + '</b></td><td class="c">' + s.filas.length + '</td></tr>';
    }).join('');
    $('#sCont').innerHTML = '<section class="tarjeta"><h2>Resumen de la semana</h2><div class="tabla-caja"><table class="t"><thead><tr><th style="text-align:left">Pestaña</th>' +
      dias.map(function (x, i) { return '<th class="' + (d.festivos[x] ? 'fest' : '') + '">' + R.DIAS[i] + ' ' + x.slice(8) + (d.festivos[x] ? '<br><small>FESTIVO</small>' : '') + '</th>'; }).join('') + '<th>Total</th><th>Empleados</th></tr></thead><tbody>' + filas +
      '<tr class="tot"><td>Total</td>' + tot.map(function (v) { return '<td class="c">' + (v || '') + '</td>'; }).join('') + '<td class="c">' + tot.reduce(function (a, b) { return a + b; }, 0) + '</td><td></td></tr></tbody></table></div></section>';
  }

  function pintarPestana() {
    var d = E.datos, s = R.armarSemana(d, E.lunes, E.pestana), dias = s.dias;
    var empleados = (E.cat && E.cat.empleados) || [];
    var filas = s.filas.map(function (f, k) {
      var celdas = f.horas.map(function (v, i) { return '<td class="h' + (d.festivos[dias[i]] ? ' fest' : '') + '" data-no="' + f.no + '" data-f="' + dias[i] + '" data-v="' + v + '">' + (v || '') + '</td>'; }).join('');
      var extra = s.porEmpleado ? '<td class="txt">' + h(f.motivo) + '</td><td class="txt editable" data-lugar-no="' + f.no + '" title="Toca para editar">' + h(f.lugar) + '</td>' :
        (k === 0 ? '<td class="txt editable" id="tdMotivo" rowspan="' + s.filas.length + '" title="Toca para editar">' + h(s.motivo) + '</td><td class="txt editable" id="tdLugar" rowspan="' + s.filas.length + '" title="Toca para editar">' + h(s.lugar) + '</td>' : '');
      return '<tr><td class="c">' + (k + 1) + '</td><td><b>' + h(f.mostrar) + '</b><br><span class="muted">' + h(f.nombre) + '</span></td><td class="c">' + h(f.no) + '</td>' + celdas +
        '<td class="c"><b>' + f.total + '</b></td>' + extra + '<td class="c"><button class="btn chico peligro" data-quitar="' + f.no + '" aria-label="Quitar a ' + h(f.mostrar) + ' de esta semana">Quitar</button></td></tr>';
    }).join('');
    var opcEmp = empleados.filter(function (e) { return e.activo; }).map(function (e) { return '<option value="' + h(e.no) + '">' + h(R.titulo(e.nom + ' ' + e.ap)) + ' (' + h(e.no) + ')</option>'; }).join('');
    var html = '<section class="tarjeta"><div class="fila entre" style="margin-bottom:10px"><h2 style="margin:0">' + h(s.pestana.nombre) + ' · Tiempo extraordinario</h2>' +
      '<span class="muted">' + s.filas.length + ' empleados · Total semana: <b style="color:var(--texto)">' + s.total + ' h</b></span></div>' +
      '<div class="tabla-caja"><table class="t" style="min-width:1050px"><thead><tr><th>No.</th><th style="text-align:left">Empleado</th><th>No. Empl.</th>' +
      dias.map(function (x, i) { return '<th class="' + (d.festivos[x] ? 'fest' : '') + '">' + R.DIAS[i] + ' ' + x.slice(8) + (d.festivos[x] ? '<br><small>FESTIVO</small>' : '') + '</th>'; }).join('') +
      '<th>Total</th><th style="width:190px">Motivo o justificación</th><th style="width:300px">Lugar donde se prestó el servicio</th><th></th></tr></thead><tbody>' +
      (filas || '<tr><td colspan="14" class="c muted" style="padding:20px">Sin registros esta semana. Sube las hojas escaneadas o agrega horas abajo.</td></tr>') +
      (s.filas.length ? '<tr class="tot"><td colspan="3" style="text-align:right">Horas:</td>' + s.totalesDia.map(function (v) { return '<td class="c">' + v + '</td>'; }).join('') + '<td class="c">' + s.total + '</td><td colspan="3"></td></tr>' : '') +
      '</tbody></table></div>' +
      '<p class="muted" style="margin:8px 0 0">Toca una celda de horas para corregirla. Toca el motivo o el lugar para editarlos. Los cambios quedan en la bitácora.</p>' +
      '<form class="fila" id="fAgregar" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--borde)">' +
      '<span class="etq">AGREGAR HORAS:</span><input list="dlEmp" id="aEmp" placeholder="Empleado o No." style="width:260px" aria-label="Empleado">' +
      '<datalist id="dlEmp">' + opcEmp + '</datalist>' +
      '<select id="aDia" aria-label="Día">' + dias.map(function (x, i) { return '<option value="' + x + '">' + R.DIAS[i] + ' ' + x.slice(8) + '</option>'; }).join('') + '</select>' +
      '<input type="number" id="aH" min="1" max="24" step="1" placeholder="Horas" style="width:90px" aria-label="Horas">' +
      '<button class="btn" type="submit">Agregar</button></form></section>' +
      '<section class="grid2">' +
      '<div class="tarjeta"><div class="fila entre"><h3 style="margin:0">Fotos de evidencia (solo van al Excel)</h3><label class="btn chico">+ Agregar fotos<input type="file" id="fFotos" accept="image/*" multiple hidden></label></div>' +
      '<div class="fotos" id="listaFotos" style="margin-top:10px"></div></div>' +
      '<div class="tarjeta"><h3>Firmas del formato</h3><div class="grid2" style="font-size:13px">' + (d.firmantes || []).map(function (f) {
        return '<div style="background:#faf6f1;border-radius:8px;padding:10px"><div class="muted">' + h(f.etiqueta) + '</div><b>' + h(f.nombre) + '</b><div class="muted">' + h(f.puesto) + '</div></div>';
      }).join('') + '</div><div class="fila" style="margin-top:12px"><button class="btn osc" id="bCerrar"></button><span class="muted">Solo marca la semana como impresa; se puede seguir editando.</span></div></div></section>';
    $('#sCont').innerHTML = html;
    var cerrada = estadoCerrada(d, E.lunes);
    $('#bCerrar').textContent = cerrada ? 'Reabrir semana' : 'Cerrar semana';
    $('#bCerrar').onclick = function () { api('cerrarSemana', E.lunes, !cerrada).then(vistaSemana).catch(fallo); };
    $$('td.h').forEach(function (td) { td.onclick = function () { editarCelda(td); }; });
    $$('[data-quitar]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('¿Quitar todas las horas de este empleado en ' + s.pestana.nombre + ' esta semana?')) return;
        api('quitarEmpleado', E.lunes, E.pestana, b.getAttribute('data-quitar')).then(function () { aviso('Empleado quitado.'); vistaSemana(); }).catch(fallo);
      };
    });
    if ($('#tdMotivo')) $('#tdMotivo').onclick = function () { editarTexto('Motivo o justificación', s.motivo, function (t) { return api('fijarMotivo', E.lunes, E.pestana, t); }); };
    if ($('#tdLugar')) $('#tdLugar').onclick = function () { editarTexto('Lugar donde se prestó el servicio', s.lugar, function (t) { return api('fijarLugar', E.lunes, E.pestana, t, ''); }); };
    $$('[data-lugar-no]').forEach(function (td) {
      td.onclick = function () { var no = td.getAttribute('data-lugar-no'); editarTexto('Lugar (No. ' + no + ')', td.textContent, function (t) { return api('fijarLugar', E.lunes, E.pestana, t, no); }); };
    });
    $('#fAgregar').onsubmit = function (ev) {
      ev.preventDefault();
      var no = String($('#aEmp').value).replace(/\D/g, '');
      var horas = Number($('#aH').value);
      if (!no) return aviso('Elige el empleado.');
      if (!(horas >= 1 && horas <= 24)) return aviso('Horas entre 1 y 24.');
      if (!empleados.some(function (e) { return e.no === no; })) return aviso('El No. ' + no + ' no está en el catálogo. Dalo de alta en Configuración → Empleados.');
      var previo = s.filas.find(function (f) { return f.no === no; });
      var idx = R.diasDe(E.lunes).indexOf($('#aDia').value);
      var suma = (previo ? previo.horas[idx] : 0) + horas;
      api('fijarHoras', E.lunes, E.pestana, no, $('#aDia').value, suma).then(function () { aviso('Horas agregadas.'); vistaSemana(); }).catch(fallo);
    };
    $('#fFotos').onchange = function () { subirFotos(this.files); };
    pintarFotos();
  }

  function editarCelda(td) {
    if (td.querySelector('input')) return;
    var v = td.getAttribute('data-v');
    td.innerHTML = '<input type="number" class="celda-input" min="0" max="24" step="1" value="' + (Number(v) || '') + '" aria-label="Horas">';
    var inp = td.querySelector('input'); inp.focus(); inp.select();
    var hecho = false;
    var fin = function (guardarlo) {
      if (hecho) return; hecho = true;
      var nuevo = Math.round(Number(inp.value) || 0);
      if (!guardarlo || nuevo === Number(v)) { td.innerHTML = Number(v) || ''; return; }
      td.innerHTML = '…';
      api('fijarHoras', E.lunes, E.pestana, td.getAttribute('data-no'), td.getAttribute('data-f'), nuevo).then(function () { aviso('Guardado.'); vistaSemana(); }).catch(function (e) { fallo(e); td.innerHTML = Number(v) || ''; });
    };
    inp.onkeydown = function (ev) { if (ev.key === 'Enter') fin(true); if (ev.key === 'Escape') fin(false); };
    inp.onblur = function () { fin(true); };
  }

  function editarTexto(titulo, actual, fnGuardar) {
    abrirModal('<h2 style="margin:0">' + h(titulo) + '</h2><textarea id="tTexto" style="min-height:180px">' + h(actual) + '</textarea>' +
      '<div class="fila" style="justify-content:flex-end"><button class="btn" id="tX">Cancelar</button><button class="btn pri" id="tOk">Guardar</button></div>');
    $('#tX').onclick = cerrarModal;
    $('#tOk').onclick = function () { fnGuardar($('#tTexto').value).then(function () { cerrarModal(); aviso('Guardado.'); vistaSemana(); }).catch(fallo); };
  }

  function pintarFotos() {
    var cont = $('#listaFotos'); if (!cont) return;
    var fotos = (E.datos.fotos || []).filter(function (f) { return f.s === E.lunes && f.p === E.pestana; }).sort(function (a, b) { return a.orden - b.orden; });
    if (!fotos.length) { cont.innerHTML = '<div class="muted">Sin fotos para esta semana y pestaña.</div>'; return; }
    cont.innerHTML = fotos.map(function (f) {
      return '<div class="foto" data-foto="' + f.id + '">' + (E.miniaturas[f.id] ? '<img src="' + E.miniaturas[f.id] + '" alt="Foto">' : 'Cargando…') + '<button data-borrar-foto="' + f.id + '" aria-label="Eliminar foto">×</button></div>';
    }).join('');
    $$('[data-borrar-foto]').forEach(function (b) {
      b.onclick = function () { if (!confirm('¿Eliminar esta foto?')) return; api('eliminarFoto', b.getAttribute('data-borrar-foto')).then(function () { aviso('Foto eliminada.'); vistaSemana(); }).catch(fallo); };
    });
    var faltan = fotos.filter(function (f) { return !E.miniaturas[f.id]; }).map(function (f) { return f.id; });
    if (faltan.length) api('fotosDatos', faltan).then(function (lista) {
      lista.forEach(function (x) { if (x.b64) E.miniaturas[x.id] = 'data:image/jpeg;base64,' + x.b64; });
      if (E.vista === 'semana') pintarFotos();
    }).catch(function () {});
  }

  function reducirImagen(file, max) {
    return new Promise(function (ok, mal) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var esc = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
      };
      img.onerror = function () { mal(new Error('No se pudo abrir la imagen ' + file.name)); };
      img.src = url;
    });
  }

  function subirFotos(files) {
    var lista = Array.prototype.slice.call(files || []);
    if (!lista.length) return;
    var i = 0;
    var sig = function () {
      if (i >= lista.length) { aviso(lista.length + ' foto(s) agregadas.'); return vistaSemana(); }
      var f = lista[i++];
      aviso('Subiendo foto ' + i + ' de ' + lista.length + '…', 60000);
      reducirImagen(f, 1280).then(function (b64) { return api('subirFoto', E.lunes, E.pestana, f.name.replace(/\.[^.]+$/, ''), b64); }).then(sig).catch(function (e) { fallo(e); sig(); });
    };
    sig();
  }

  // ===================== SUBIR HOJAS =====================
  function modalSubir() {
    abrirModal('<h2 style="margin:0">Subir hojas escaneadas</h2>' +
      '<p class="muted" style="margin:0">Sube el PDF con todas las hojas que llegaron (o fotos de las hojas). La app lo divide en bloques de ' + PAGINAS_POR_BLOQUE + ' páginas y los manda a leer. Después revisas cada hoja antes de guardarla.</p>' +
      '<label class="opcion sel"><input type="file" id="uArch" accept="application/pdf,image/*" multiple><span>PDF escaneado o fotos (JPG/PNG)</span></label>' +
      '<div id="uProg" hidden><div class="progreso"><div id="uBar" style="width:0%"></div></div><p class="muted" id="uTxt"></p></div>' +
      '<div class="fila" style="justify-content:flex-end"><button class="btn" id="uX">Cerrar</button><button class="btn pri" id="uOk">Subir y leer</button></div>');
    $('#uX').onclick = cerrarModal;
    $('#uOk').onclick = function () {
      var files = Array.prototype.slice.call($('#uArch').files || []);
      if (!files.length) return aviso('Elige el PDF o las fotos.');
      $('#uOk').disabled = true; $('#uX').disabled = true; $('#uProg').hidden = false;
      subirArchivos(files).then(function (r) {
        $('#uTxt').textContent = 'Listo: ' + r.leidas + ' hoja(s) leídas' + (r.espera ? ', ' + r.espera + ' en espera (se reintentan solas)' : '') + '.' + (r.mensaje ? ' ' + r.mensaje : '');
        $('#uX').disabled = false; $('#uX').textContent = 'Cerrar';
        $('#uOk').disabled = false; $('#uOk').textContent = 'Revisar ahora';
        $('#uOk').onclick = function () { cerrarModal(); ir('revisar'); };
      }).catch(function (e) { fallo(e); $('#uTxt').textContent = 'Error: ' + e.message; $('#uOk').disabled = false; $('#uX').disabled = false; });
    };
  }

  /** Une fotos en un PDF o toma el PDF; lo divide en bloques y los sube uno por uno. */
  function subirArchivos(files) {
    var txt = function (t) { $('#uTxt').textContent = t; };
    return cargarScript(CDN.pdflib).then(function () {
      var PDFLib = window.PDFLib;
      var pdfs = files.filter(function (f) { return /pdf/i.test(f.type) || /\.pdf$/i.test(f.name); });
      var imgs = files.filter(function (f) { return /^image\//.test(f.type); });
      var trabajos = [];
      pdfs.forEach(function (f) { trabajos.push(f.arrayBuffer().then(function (b) { return { nombre: f.name, doc: PDFLib.PDFDocument.load(b, { ignoreEncryption: true }) }; })); });
      if (imgs.length) {
        trabajos.push(PDFLib.PDFDocument.create().then(function (doc) {
          return imgs.reduce(function (p, f) {
            return p.then(function () { return reducirImagen(f, 2000); }).then(function (b64) {
              return doc.embedJpg(b64aBytes(b64)).then(function (im) {
                var pg = doc.addPage([im.width, im.height]); pg.drawImage(im, { x: 0, y: 0, width: im.width, height: im.height });
              });
            });
          }, Promise.resolve()).then(function () { return { nombre: 'fotos_' + hoyIso() + '.pdf', doc: Promise.resolve(doc) }; });
        }));
      }
      return Promise.all(trabajos).then(function (lista) {
        return Promise.all(lista.map(function (x) { return x.doc.then(function (d) { return { nombre: x.nombre, doc: d }; }); }));
      }).then(function (docs) {
        var bloques = [];
        docs.forEach(function (d) {
          var n = d.doc.getPageCount(), lote = 'L' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
          for (var i = 0; i < n; i += PAGINAS_POR_BLOQUE) bloques.push({ nombre: d.nombre, doc: d.doc, desde: i, hasta: Math.min(n, i + PAGINAS_POR_BLOQUE), lote: lote });
        });
        var tot = { leidas: 0, espera: 0, mensaje: '' }, k = 0;
        return bloques.reduce(function (p, b) {
          return p.then(function () {
            k++; txt('Leyendo bloque ' + k + ' de ' + bloques.length + ' (páginas ' + (b.desde + 1) + '–' + b.hasta + ' de ' + b.nombre + ')… puede tardar hasta un minuto por bloque.');
            $('#uBar').style.width = Math.round(100 * (k - 1) / bloques.length) + '%';
            return PDFLib.PDFDocument.create().then(function (nuevo) {
              var idx = []; for (var i = b.desde; i < b.hasta; i++) idx.push(i);
              return nuevo.copyPages(b.doc, idx).then(function (pgs) { pgs.forEach(function (pg) { nuevo.addPage(pg); }); return nuevo.save(); });
            }).then(function (bytes) {
              return api('subirBloque', b.nombre, b.desde + 1, b.hasta - b.desde, bytesAB64(bytes), b.lote);
            }).then(function (r) { tot.leidas += r.leidas; tot.espera += r.espera; if (r.mensaje) tot.mensaje = r.mensaje; });
          });
        }, Promise.resolve()).then(function () { $('#uBar').style.width = '100%'; return tot; });
      });
    });
  }

  // ===================== REVISAR =====================
  function vistaRevisar(idAbrir) {
    marco('<div class="muted">Cargando hojas…</div>');
    api('pendientes').then(function (p) {
      E.pend = p;
      var listas = p.filter(function (x) { return x.estado === 'LISTA'; });
      var id = idAbrir || (listas[0] && listas[0].id);
      if (!p.length) {
        marco('<section class="tarjeta"><h2>No hay hojas por revisar</h2><p class="muted">Sube el PDF de las hojas que llegaron, o captura una hoja a mano.</p><div class="fila"><button class="btn pri" id="rSubir">Subir hojas escaneadas</button><button class="btn" id="rManual">Captura manual</button></div></section>');
        $('#rSubir').onclick = modalSubir; $('#rManual').onclick = function () { abrirRevision(null); };
        return;
      }
      if (id) abrirRevision(id); else pintarListaPendientes(null);
    }).catch(fallo);
  }

  function chipsPaginas(actual) {
    return '<div class="paginas" aria-label="Páginas por revisar">' + E.pend.map(function (p) {
      var cls = p.id === actual ? 'p-act' : p.estado === 'LISTA' ? 'p-ok' : p.estado === 'EN_ESPERA' ? 'p-warn' : 'p-err';
      var et = p.estado === 'LISTA' ? 'Por revisar' : p.estado === 'EN_ESPERA' ? 'En espera' : 'Error';
      return '<button class="' + cls + '" data-pag="' + p.id + '" data-est="' + p.estado + '" title="' + h(p.mensaje || '') + '">' + h(p.archivo).slice(0, 18) + ' · p.' + p.pagina + ' · ' + et + '</button>';
    }).join('') + '<button class="p-warn" id="rManual2">+ Captura manual</button></div>';
  }

  function pintarListaPendientes(actual) {
    marco('<section class="tarjeta"><h2>Hojas en proceso</h2>' + chipsPaginas(actual) + '<p class="muted">Las hojas "En espera" se leen solas cuando Gemini vuelve a estar disponible. Las de "Error" se pueden reintentar.</p></section>');
    enlazarChips();
  }

  function enlazarChips() {
    $$('[data-pag]').forEach(function (b) {
      b.onclick = function () {
        var est = b.getAttribute('data-est'), id = b.getAttribute('data-pag');
        if (est === 'LISTA') return abrirRevision(id);
        var p = E.pend.find(function (x) { return x.id === id; });
        if (confirm((p.mensaje || 'Esta hoja aún no se lee.') + '\n\n¿Intentar leerla ahora?')) {
          aviso('Leyendo…', 60000);
          api('reintentarPagina', id).then(function (r) { aviso(r.ok ? 'Leída.' : (r.mensaje || 'Sigue en espera.')); vistaRevisar(); }).catch(fallo);
        }
      };
    });
    if ($('#rManual2')) $('#rManual2').onclick = function () { abrirRevision(null); };
  }

  function abrirRevision(id) {
    var cargar = id ? api('paginaRevision', id) : Promise.resolve({ id: '', archivo: '', pagina: '', pdf: '', propuesta: { fecha: '', renglones: [{ no: '', horas: null, avisos: [] }], trabajos: [], lugares: [], lugarTexto: '', avisos: [], pestana: '', razonPestana: 'Captura manual: elige la pestaña.', elegirPestana: true, totalEscrito: null } });
    marco('<div class="muted">Abriendo hoja…</div>');
    cargar.then(function (r) {
      E.revision = r; E.zoom = 1; E.giro = 0;
      r.propuesta.renglones.forEach(function (x) { x.avisos = x.avisos || []; });
      if (r.propuesta.elegirPestana) { r.sugerida = r.propuesta.pestana; r.propuesta.pestana = ''; }
      pintarRevision();
    }).catch(function (e) { fallo(e); vistaRevisar(); });
  }

  function pintarRevision() {
    var r = E.revision, p = r.propuesta, pests = (E.cat && E.cat.pestanas) || [];
    var modo = (pests.find(function (x) { return x.clave === p.pestana; }) || {}).modo;
    var porEmp = modo === 'POR_EMPLEADO';
    var html = '<section class="tarjeta" style="padding:12px 16px">' + chipsPaginas(r.id) + '</section>' +
      '<div class="rev">' +
      '<section class="tarjeta rev-img">' + (r.pdf ? '<div class="fila entre" style="margin-bottom:8px"><h2 style="margin:0;font-size:15px">' + h(r.archivo) + ' · página ' + r.pagina + '</h2>' +
        '<div class="fila"><button class="icono" id="zI" aria-label="Girar a la izquierda" title="Girar a la izquierda">↺</button><button class="icono" id="zG" aria-label="Girar a la derecha" title="Girar a la derecha">↻</button><button class="icono" id="zM" aria-label="Alejar">−</button><button class="icono" id="zP" aria-label="Acercar">+</button></div></div><div class="visor" id="visor"><canvas id="lienzo"></canvas></div>'
        : '<h2 style="font-size:15px">Captura manual</h2><p class="muted">Escribe los datos de la hoja. Sirve si una hoja no se puede leer o si Gemini no está disponible.</p>') + '</section>' +
      '<section class="rev-form">' +
      '<div class="tarjeta grid2">' +
      '<label class="col"><span class="etq">FECHA QUE SE LABORÓ</span><input type="date" id="rFecha" value="' + h(p.fecha) + '">' +
      '<span class="muted">' + (p.fechaTexto ? 'Leído: "' + h(p.fechaTexto) + '"' : '') + (p.fecha ? ' · Semana del ' + h(R.dmy(R.lunesDe(p.fecha))) : '') + (p.festivo ? ' · <b>Festivo: ' + h(p.festivo) + '</b>' : '') + '</span></label>' +
      '<label class="col"><span class="etq">ACTIVIDAD DE ESTA HOJA (PESTAÑA)</span><select id="rPest"><option value="">Elige la actividad…</option>' +
      pests.filter(function (x) { return x.clave !== 'POCEROS_FESTIVOS'; }).map(function (x) { return '<option value="' + x.clave + '"' + (p.pestana === x.clave ? ' selected' : '') + '>' + h(x.nombre) + '</option>'; }).join('') + '</select>' +
      '<span class="muted" style="color:' + (p.confirmarPestana || !p.pestana ? 'var(--warn)' : 'var(--ok)') + '">' + h(p.razonPestana || '') + '</span>' +
      (r.sugerida && !p.pestana ? '<button class="btn chico" id="rUsarSug" type="button">Usar la sugerida: ' + h(nombrePest(r.sugerida)) + '</button>' : '') + '</label></div>' +
      '<div class="tarjeta"><h2 style="font-size:15px">Renglones</h2><div class="tabla-caja"><table class="t" style="min-width:640px"><thead><tr><th>No. Empl.</th><th style="text-align:left">Empleado</th><th>Horas</th><th>Horario</th>' + (porEmp ? '<th>Lugar</th>' : '') + '<th></th></tr></thead><tbody>' +
      p.renglones.map(function (x, i) {
        var nuevo = x.no && !empleado(x.no);
        return '<tr class="' + (x.avisos.length ? 'con-aviso' : '') + '"><td><input class="inp-no" data-i="' + i + '" data-c="no" value="' + h(x.no) + '" inputmode="numeric" aria-label="No. de empleado"></td>' +
          '<td>' + (nuevo ? '<div class="fila" style="gap:6px"><input type="text" data-i="' + i + '" data-c="nombres" placeholder="Nombre(s)" value="' + h(x.nombres || '') + '" style="width:140px"><input type="text" data-i="' + i + '" data-c="apellidos" placeholder="Apellidos" value="' + h(x.apellidos || '') + '" style="width:160px"></div><div class="aviso-renglon">Empleado nuevo: escribe nombre y apellidos' + (x.nombreLeido ? ' (se leyó "' + h(x.nombreLeido) + '")' : '') + '.</div>'
            : '<b>' + h(x.no ? nombreEmp(x.no) : (x.nombreLeido || '')) + '</b>' + (x.nombreLeido && x.no ? '<br><span class="muted">Leído: ' + h(x.nombreLeido) + '</span>' : '')) +
          x.avisos.map(function (a) { return '<div class="aviso-renglon">⚠ ' + h(a) + '</div>'; }).join('') + (x.pestana ? '<div class="aviso-renglon" style="color:var(--azul2)">Va a la pestaña ' + h(nombrePest(x.pestana)) + '</div>' : '') + '</td>' +
          '<td class="c"><input class="inp-h" type="number" min="1" max="24" step="1" data-i="' + i + '" data-c="horas" value="' + (x.horas == null ? '' : x.horas) + '" aria-label="Horas"></td>' +
          '<td class="c">' + h(x.horario || '') + '</td>' +
          (porEmp ? '<td><input type="text" data-i="' + i + '" data-c="lugar" value="' + h(x.lugar || '') + '" style="width:200px" aria-label="Lugar"></td>' : '') +
          '<td class="c"><button class="btn chico peligro" data-borrar="' + i + '" aria-label="Quitar renglón">×</button></td></tr>';
      }).join('') + '</tbody></table></div><button class="btn chico" id="rAgregar" style="margin-top:8px">+ Agregar renglón</button></div>' +
      (porEmp ? '' : '<div class="tarjeta"><label class="col"><span class="etq">LUGAR DONDE SE PRESTÓ EL SERVICIO (SE AGREGA CON SU FECHA)</span><textarea id="rLugar">' + h(p.lugarTexto) + '</textarea></label></div>') +
      '<div class="tarjeta"><h2 style="font-size:15px">Revisión automática</h2><div class="avisos">' + avisosHtml(p) + '</div></div>' +
      '<div class="fila" style="justify-content:flex-end">' + (r.id ? '<button class="btn peligro" id="rDescartar">Descartar página</button>' : '') + '<button class="btn pri" id="rGuardar">Guardar y pasar a la siguiente</button></div>' +
      '</section></div>';
    marco(html);
    enlazarChips();
    if (r.pdf) dibujarPagina();
    if ($('#zG')) { $('#zG').onclick = function () { E.giro = ((E.giro || 0) + 90) % 360; dibujarPagina(); }; $('#zI').onclick = function () { E.giro = ((E.giro || 0) + 270) % 360; dibujarPagina(); }; }
    if ($('#zM')) { $('#zM').onclick = function () { E.zoom = Math.max(0.5, E.zoom - 0.25); dibujarPagina(); }; $('#zP').onclick = function () { E.zoom = Math.min(3, E.zoom + 0.25); dibujarPagina(); }; }
    $('#rFecha').onchange = function () {
      var vieja = p.fecha; p.fecha = this.value;
      if ($('#rLugar')) {
        var t = $('#rLugar').value;
        if (vieja && t.indexOf(R.dmy(vieja)) === 0) $('#rLugar').value = R.dmy(p.fecha) + t.slice(10);
        else if (!/^\d{2}\/\d{2}\/\d{4}/.test(t)) $('#rLugar').value = R.dmy(p.fecha) + ' ' + t;
      }
      p.lugarTexto = $('#rLugar') ? $('#rLugar').value : p.lugarTexto;
      pintarRevision();
    };
    $('#rPest').onchange = function () { p.pestana = this.value; leerFormulario(); pintarRevision(); };
    if ($('#rUsarSug')) $('#rUsarSug').onclick = function () { p.pestana = r.sugerida; leerFormulario(); pintarRevision(); };
    $$('[data-c]').forEach(function (inp) {
      inp.onchange = function () {
        var i = Number(inp.getAttribute('data-i')), c = inp.getAttribute('data-c'), x = p.renglones[i];
        x[c] = c === 'horas' ? (inp.value === '' ? null : Math.round(Number(inp.value))) : inp.value;
        if (c === 'no') { x.no = String(inp.value).replace(/\D/g, ''); x.avisos = []; leerFormulario(); pintarRevision(); }
      };
    });
    $$('[data-borrar]').forEach(function (b) { b.onclick = function () { leerFormulario(); p.renglones.splice(Number(b.getAttribute('data-borrar')), 1); pintarRevision(); }; });
    $('#rAgregar').onclick = function () { leerFormulario(); p.renglones.push({ no: '', horas: null, avisos: [] }); pintarRevision(); };
    if ($('#rDescartar')) $('#rDescartar').onclick = function () {
      if (!confirm('¿Descartar esta página? No se guardará nada de ella.')) return;
      api('descartarPagina', r.id).then(function () { aviso('Página descartada.'); siguiente(); }).catch(fallo);
    };
    $('#rGuardar').onclick = guardarRevision;
  }

  function avisosHtml(p) {
    var lista = (p.avisos || []).slice();
    var suma = p.renglones.reduce(function (a, x) { return a + (Number(x.horas) || 0); }, 0);
    if (p.totalEscrito != null) {
      lista = lista.filter(function (a) { return !/total escrito/.test(a.texto); });
      lista.unshift(suma === p.totalEscrito ? { nivel: 'ok', texto: 'Suma de horas (' + suma + ') igual al total escrito a mano (' + p.totalEscrito + ').' } : { nivel: 'revisar', texto: 'La suma de horas (' + suma + ') no coincide con el total escrito a mano (' + p.totalEscrito + ').' });
    }
    if (!p.pestana) lista.unshift({ nivel: 'error', texto: 'Elige la actividad de esta hoja antes de guardar.' });
    if (!p.fecha) lista.unshift({ nivel: 'error', texto: 'Falta la fecha que se laboró.' });
    if (!lista.length) return '<div class="muted">Sin avisos.</div>';
    var et = { ok: 'Correcto', revisar: 'Revisar', error: 'Falta' };
    return lista.map(function (a) { return '<div class="av ' + a.nivel + '"><b>' + et[a.nivel] + '</b><span>' + h(a.texto) + '</span></div>'; }).join('');
  }

  function empleado(no) { return ((E.cat && E.cat.empleados) || []).find(function (e) { return e.no === String(no); }); }
  function nombreEmp(no) { var e = empleado(no); return e ? R.titulo(e.nom + ' ' + e.ap) : 'No. ' + no + ' (nuevo)'; }

  function leerFormulario() {
    var p = E.revision.propuesta;
    $$('[data-c]').forEach(function (inp) {
      var i = Number(inp.getAttribute('data-i')), c = inp.getAttribute('data-c'), x = p.renglones[i]; if (!x) return;
      if (c === 'horas') x.horas = inp.value === '' ? null : Math.round(Number(inp.value));
      else if (c === 'no') x.no = String(inp.value).replace(/\D/g, '');
      else x[c] = inp.value;
    });
    if ($('#rLugar')) p.lugarTexto = $('#rLugar').value;
    if ($('#rFecha')) p.fecha = $('#rFecha').value;
  }

  function dibujarPagina() {
    var r = E.revision;
    cargarScript(CDN.pdfjs).then(function () {
      var pdfjsLib = window.pdfjsLib; pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfjsWorker;
      var p = r._doc ? Promise.resolve(r._doc) : pdfjsLib.getDocument({ data: b64aBytes(r.pdf) }).promise.then(function (d) { r._doc = d; return d; });
      return p.then(function (doc) { return doc.getPage(r.pagEnBloque); }).then(function (pg) {
        var visor = $('#visor'); if (!visor) return;
        var giro = ((pg.rotate || 0) + (E.giro || 0)) % 360;
        var base = pg.getViewport({ scale: 1, rotation: giro }), esc = (visor.clientWidth - 4) / base.width * E.zoom;
        var vp = pg.getViewport({ scale: esc * (window.devicePixelRatio || 1), rotation: giro }), c = $('#lienzo');
        c.width = vp.width; c.height = vp.height; c.style.width = (vp.width / (window.devicePixelRatio || 1)) + 'px';
        return pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      });
    }).catch(function (e) { var v = $('#visor'); if (v) v.innerHTML = '<p class="muted" style="padding:20px">No se pudo mostrar la imagen: ' + h(e.message) + '</p>'; });
  }

  function guardarRevision() {
    leerFormulario();
    var r = E.revision, p = r.propuesta;
    if (!p.fecha) return aviso('Falta la fecha que se laboró.');
    if (!p.pestana) return aviso('Elige la actividad (pestaña) de esta hoja.');
    var reng = p.renglones.filter(function (x) { return x.no || x.horas; });
    for (var i = 0; i < reng.length; i++) {
      var x = reng[i];
      if (!x.no) return aviso('Renglón ' + (i + 1) + ': falta el No. de empleado.');
      if (!(x.horas >= 1 && x.horas <= 24)) return aviso('Renglón ' + (i + 1) + ': horas entre 1 y 24.');
      if (!empleado(x.no) && (!String(x.nombres || '').trim() || !String(x.apellidos || '').trim())) return aviso('Renglón ' + (i + 1) + ': escribe nombre y apellidos del empleado nuevo ' + x.no + '.');
    }
    if (!reng.length) return aviso('La hoja no tiene renglones.');
    var b = $('#rGuardar'); b.disabled = true; b.textContent = 'Guardando…';
    api('guardarHoja', r.id, { fecha: p.fecha, pestana: p.pestana, totalEscrito: p.totalEscrito, lugarTexto: p.lugarTexto, archivo: r.archivo, pagina: r.pagina,
      renglones: reng.map(function (x) { return { no: x.no, horas: x.horas, nombres: x.nombres || '', apellidos: x.apellidos || '', lugar: x.lugar || '' }; }) })
      .then(function (res) {
        aviso('Hoja guardada en ' + res.pestanas.map(nombrePest).join(', ') + ' (semana del ' + R.dmy(res.semana) + ').');
        var nuevos = reng.filter(function (x) { return !empleado(x.no); });
        var recargar = nuevos.length ? api('catalogos').then(function (c) { E.cat = c; }) : Promise.resolve();
        return recargar.then(siguiente);
      }).catch(function (e) { fallo(e); b.disabled = false; b.textContent = 'Guardar y pasar a la siguiente'; });
  }

  function siguiente() {
    api('pendientes').then(function (p) {
      E.pend = p;
      var sig = p.find(function (x) { return x.estado === 'LISTA'; });
      if (sig) abrirRevision(sig.id);
      else { aviso('No quedan hojas por revisar.'); E.vista = 'semana'; vistaSemana(); }
    }).catch(fallo);
  }

  // ===================== DESCARGAS (PDF / EXCEL) =====================
  function modalDescargas(tipoInicial) {
    var pests = pestanas();
    var mesActual = E.lunes.slice(0, 7);
    abrirModal('<div class="fila entre"><h2 style="margin:0">Descargar</h2><button class="icono" id="dX" aria-label="Cerrar">×</button></div>' +
      '<div class="grid2"><button class="btn" data-tipo="PDF">PDF</button><button class="btn" data-tipo="EXCEL">Excel</button></div>' +
      '<div id="dPdfTipo" class="col"><span class="etq">TIPO DE PDF</span>' +
      '<label class="opcion sel"><input type="radio" name="dTp" value="FORMATOS" checked><span><b>Formatos para firma</b><br><span class="muted">El formato oficial de cada semana y pestaña, con sus firmas. "Hoja 1 de N" cuando no cabe.</span></span></label>' +
      '<label class="opcion"><input type="radio" name="dTp" value="HISTORICO"><span><b>Reporte histórico con gráficas</b><br><span class="muted">Resumen del mes o del año: horas por pestaña, por mes, por día y por empleado.</span></span></label></div>' +
      '<div class="grid2"><label class="col"><span class="etq">PERIODO</span><select id="dPer"><option value="SEMANA">Semana del ' + h(rango(E.lunes)) + '</option><option value="OTRA">Otra semana…</option><option value="MES">Mes…</option><option value="ANIO">Año…</option></select></label>' +
      '<label class="col" id="dValCaja"><span class="etq" id="dValEtq">&nbsp;</span><input type="date" id="dSem" value="' + E.lunes + '" hidden><input type="month" id="dMes" value="' + mesActual + '" hidden><input type="number" id="dAnio" value="' + E.lunes.slice(0, 4) + '" min="2025" max="2100" hidden></label></div>' +
      '<fieldset style="border:none;margin:0;padding:0"><legend class="etq" style="margin-bottom:8px">PESTAÑAS</legend><div class="grid2">' +
      pests.map(function (p) { return '<label class="fila" style="gap:8px;min-height:36px"><input type="checkbox" class="dP" value="' + p.clave + '" checked>' + h(p.nombre) + '</label>'; }).join('') + '</div></fieldset>' +
      '<label class="fila" id="dFotosCaja" style="gap:8px"><input type="checkbox" id="dFotos" checked> Incluir fotos en el Excel</label>' +
      '<p class="muted" id="dNota" style="margin:0"></p>' +
      '<div class="fila" style="justify-content:flex-end"><button class="btn pri" id="dOk">Generar</button></div>');
    var tipo = tipoInicial;
    var pintar = function () {
      $$('[data-tipo]').forEach(function (b) { b.className = 'btn' + (b.getAttribute('data-tipo') === tipo ? ' pri' : ''); });
      $('#dPdfTipo').hidden = tipo !== 'PDF'; $('#dFotosCaja').hidden = tipo !== 'EXCEL';
      $$('.opcion').forEach(function (o) { o.classList.toggle('sel', o.querySelector('input').checked); });
      var per = $('#dPer').value;
      $('#dSem').hidden = per !== 'OTRA'; $('#dMes').hidden = per !== 'MES'; $('#dAnio').hidden = per !== 'ANIO';
      $('#dValEtq').innerHTML = per === 'OTRA' ? 'SEMANA DE' : per === 'MES' ? 'MES' : per === 'ANIO' ? 'AÑO' : '&nbsp;';
      $('#dNota').textContent = tipo === 'EXCEL' && per === 'ANIO' ? 'El año completo se descarga sin fotos (con fotos sería demasiado pesado). Para revisar con fotos, descarga por mes.' : '';
    };
    $$('[data-tipo]').forEach(function (b) { b.onclick = function () { tipo = b.getAttribute('data-tipo'); pintar(); }; });
    $$('input[name=dTp]').forEach(function (i) { i.onchange = pintar; });
    $('#dPer').onchange = pintar;
    $('#dX').onclick = cerrarModal;
    pintar();
    $('#dOk').onclick = function () {
      var per = $('#dPer').value, desde, hasta, titulo;
      if (per === 'SEMANA') { desde = E.lunes; hasta = R.sumar(E.lunes, 6); titulo = 'Semana del ' + rango(E.lunes); }
      else if (per === 'OTRA') { desde = R.lunesDe($('#dSem').value || E.lunes); hasta = R.sumar(desde, 6); titulo = 'Semana del ' + rango(desde); }
      else if (per === 'MES') { var m = $('#dMes').value || mesActual; desde = m + '-01'; hasta = finDeMes(m); titulo = R.MESES[Number(m.slice(5)) - 1] + ' ' + m.slice(0, 4); }
      else { var a = String($('#dAnio').value || E.lunes.slice(0, 4)); desde = a + '-01-01'; hasta = a + '-12-31'; titulo = 'Año ' + a; }
      var claves = $$('.dP').filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (!claves.length) return aviso('Elige al menos una pestaña.');
      var tp = (($$('input[name=dTp]').find(function (i) { return i.checked; }) || {}).value) || 'FORMATOS';
      var b = $('#dOk'); b.disabled = true; b.textContent = 'Generando…';
      var fin = function () { b.disabled = false; b.textContent = 'Generar'; };
      var trabajo;
      if (tipo === 'PDF' && tp === 'FORMATOS') trabajo = generarFormatos(desde, hasta, claves);
      else if (tipo === 'PDF') trabajo = generarHistorico(desde, hasta, claves, titulo, per);
      else trabajo = generarExcel(desde, hasta, claves, $('#dFotos').checked && per !== 'ANIO');
      trabajo.then(function () { fin(); aviso('Descarga lista.'); }).catch(function (e) { fin(); fallo(e); });
    };
  }

  function finDeMes(m) { var d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)), 0)); return d.toISOString().slice(0, 10); }

  function cargarPdfMake() {
    return cargarScript(CDN.pdfmake).then(function () { return cargarScript(CDN.vfs); });
  }

  function datosPeriodo(desde, hasta) {
    if (E.datos && desde >= E.datos.desde && hasta <= E.datos.hasta) return Promise.resolve(E.datos);
    return api('periodo', desde, hasta);
  }

  function generarFormatos(desde, hasta, claves) {
    return Promise.all([cargarPdfMake(), datosPeriodo(desde, hasta)]).then(function (r) {
      var d = r[1], bloques = [];
      R.semanasDe(desde, hasta).forEach(function (l) { claves.forEach(function (c) { bloques.push({ lunes: l, clave: c }); }); });
      var doc = R.pdfFormatos(d, bloques, { logo: E.logo });
      return new Promise(function (ok) {
        window.pdfMake.createPdf(doc).getBlob(function (blob) { descargar(blob, 'Formatos_Horas_Extras_' + desde + '_al_' + hasta + '.pdf'); ok(); });
      });
    });
  }

  function generarHistorico(desde, hasta, claves, titulo, per) {
    var anterior = null;
    if (per === 'MES') { var m = desde.slice(0, 7), y = Number(m.slice(0, 4)), mm = Number(m.slice(5)) - 1; if (mm === 0) { mm = 12; y--; } var ma = y + '-' + String(mm).padStart(2, '0'); anterior = { desde: ma + '-01', hasta: finDeMes(ma) }; }
    if (per === 'ANIO') { var ya = Number(desde.slice(0, 4)) - 1; anterior = { desde: ya + '-01-01', hasta: ya + '-12-31' }; }
    var d0 = anterior ? anterior.desde : desde;
    return Promise.all([cargarPdfMake(), api('periodo', d0, hasta)]).then(function (r) {
      var d = r[1];
      d.registros = d.registros.filter(function (x) { return claves.indexOf(x.p) !== -1; });
      d.pestanas = d.pestanas.filter(function (x) { return claves.indexOf(x.clave) !== -1; });
      var doc = R.pdfHistorico(d, desde, hasta, titulo, { logo: E.logo, anterior: anterior });
      return new Promise(function (ok) { window.pdfMake.createPdf(doc).getBlob(function (blob) { descargar(blob, 'Reporte_Historico_Horas_Extras_' + desde + '_al_' + hasta + '.pdf'); ok(); }); });
    });
  }

  function generarExcel(desde, hasta, claves, conFotos) {
    return Promise.all([cargarScript(CDN.exceljs), api('periodo', desde, hasta)]).then(function (r) {
      var d = r[1], fotos = {};
      var ids = conFotos ? (d.fotos || []).filter(function (f) { return claves.indexOf(f.p) !== -1; }).map(function (f) { return f.id; }) : [];
      var traer = function (lista) {
        if (!lista.length) return Promise.resolve();
        aviso('Descargando fotos (' + (ids.length - lista.length) + ' de ' + ids.length + ')…', 60000);
        return api('fotosDatos', lista).then(function (res) {
          res.forEach(function (x) { if (x.b64) fotos[x.id] = x.b64; });
          var faltan = lista.slice(res.length);
          return traer(faltan);
        });
      };
      return traer(ids).then(function () {
        var wb = R.excel(window.ExcelJS, d, desde, hasta, { fotos: fotos, pestanas: claves });
        return wb.xlsx.writeBuffer();
      }).then(function (buf) {
        descargar(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'TIEMPO_EXTRA_' + desde + '_al_' + hasta + '.xlsx');
      });
    });
  }

  // ===================== HISTÓRICO =====================
  function vistaHistorico() {
    var anio = E.lunes.slice(0, 4);
    var opMeses = ['<option value="ANIO">Año ' + anio + '</option>'].concat(R.MESES.map(function (m, i) { var v = anio + '-' + String(i + 1).padStart(2, '0'); return '<option value="' + v + '"' + (v === E.lunes.slice(0, 7) ? ' selected' : '') + '>' + R.titulo(m) + ' ' + anio + '</option>'; }));
    marco('<section class="fila" style="align-items:flex-end">' +
      '<label class="col"><span class="etq">AÑO</span><input type="number" id="hAnio" value="' + anio + '" min="2025" max="2100" style="width:110px"></label>' +
      '<label class="col"><span class="etq">PERIODO</span><select id="hPer" style="min-width:200px">' + opMeses.join('') + '</select></label>' +
      '<label class="col"><span class="etq">PESTAÑA</span><select id="hPest"><option value="">Todas</option>' + pestanas().map(function (p) { return '<option value="' + p.clave + '">' + h(p.nombre) + '</option>'; }).join('') + '</select></label>' +
      '<label class="col"><span class="etq">EMPLEADO</span><input type="text" id="hEmp" placeholder="Nombre o No. de empleado" style="width:240px"></label>' +
      '<button class="btn pri" id="hPdf" style="margin-left:auto">Reporte histórico (PDF con gráficas)</button></section>' +
      '<div id="hCont"><div class="muted">Cargando…</div></div>');
    var cargar = function () {
      var a = $('#hAnio').value, per = $('#hPer').value;
      if (per !== 'ANIO' && per.slice(0, 4) !== a) per = 'ANIO';
      var desde = per === 'ANIO' ? a + '-01-01' : per + '-01', hasta = per === 'ANIO' ? a + '-12-31' : finDeMes(per);
      $('#hCont').innerHTML = '<div class="muted">Cargando…</div>';
      api('periodo', desde, hasta).then(function (d) { E.hist = { d: d, desde: desde, hasta: hasta, per: per }; pintarHistorico(); }).catch(fallo);
    };
    $('#hAnio').onchange = function () { vistaHistorico.anio = this.value; var a = this.value; $('#hPer').innerHTML = ['<option value="ANIO">Año ' + a + '</option>'].concat(R.MESES.map(function (m, i) { return '<option value="' + a + '-' + String(i + 1).padStart(2, '0') + '">' + R.titulo(m) + ' ' + a + '</option>'; })).join(''); cargar(); };
    $('#hPer').onchange = cargar;
    $('#hPest').onchange = pintarHistorico;
    $('#hEmp').oninput = function () { clearTimeout(vistaHistorico.t); vistaHistorico.t = setTimeout(pintarHistorico, 300); };
    $('#hPdf').onclick = function () { modalDescargas('PDF'); setTimeout(function () { var r = $$('input[name=dTp]')[1]; if (r) { r.checked = true; r.onchange(); } }, 0); };
    cargar();
  }

  function pintarHistorico() {
    if (!E.hist || !$('#hCont')) return;
    var d = E.hist.d, pest = $('#hPest').value, q = R.norm($('#hEmp').value);
    var filtrado = Object.assign({}, d, {
      registros: d.registros.filter(function (r) {
        if (pest && r.p !== pest) return false;
        if (q) { var n = R.norm(R.nombreMostrar(d, r.no, r.n)) + ' ' + r.no; return q.split(' ').every(function (t) { return n.indexOf(t) !== -1; }); }
        return true;
      })
    });
    var res = R.resumen(filtrado, E.hist.desde, E.hist.hasta);
    var items = d.pestanas.filter(function (p) { return !pest || p.clave === pest; }).map(function (p, j) { return { l: p.nombre, v: res.porPestana[p.clave] || 0, c: R.COLORES[d.pestanas.indexOf(p) % R.COLORES.length] }; });
    var meses = Object.keys(res.porMes).sort();
    var graf2 = E.hist.per === 'ANIO'
      ? R.svgApiladas(meses.map(function (m) { return { l: R.MESES[Number(m.slice(5)) - 1].slice(0, 3), v: res.porMes[m] }; }), d.pestanas, 560, 230)
      : R.svgBarrasV(Object.keys(res.porSemana).sort().map(function (s) { return { l: s.slice(8) + '/' + s.slice(5, 7), v: res.porSemana[s] }; }), 560, 230);
    var semanas = R.semanasDe(E.hist.desde, E.hist.hasta).filter(function (l) { return filtrado.registros.some(function (r) { return r.s === l; }); }).reverse();
    $('#hCont').innerHTML = '<section class="grid4">' +
      kpi('Horas del periodo', res.total) + kpi('Empleados con horas', res.empleados) + kpi('Horas en días festivos', res.festivas) + kpi('Semanas con registros', semanas.length) + '</section>' +
      '<section class="grid2" style="margin-top:16px"><div class="tarjeta grafica"><h3>Horas por pestaña</h3>' + R.svgBarrasH(items, 520) + '</div>' +
      '<div class="tarjeta grafica"><h3>' + (E.hist.per === 'ANIO' ? 'Horas por mes' : 'Horas por semana') + '</h3>' + graf2 + '</div></section>' +
      '<section class="grid2" style="margin-top:16px"><div class="tarjeta grafica"><h3>Horas por día de la semana</h3>' + R.svgBarrasV(R.DIAS.map(function (x, i) { return { l: x, v: res.porDia[i] }; }), 520, 200) + '</div>' +
      '<div class="tarjeta"><h3>Empleados con más horas</h3><table class="t"><thead><tr><th>#</th><th style="text-align:left">Empleado</th><th>Horas</th></tr></thead><tbody>' +
      res.porEmpleado.slice(0, 10).map(function (e, i) { return '<tr><td class="c">' + (i + 1) + '</td><td>' + h(e.nombre) + ' <span class="muted">(' + h(e.no) + ')</span></td><td class="c"><b>' + e.h + '</b></td></tr>'; }).join('') + '</tbody></table></div></section>' +
      '<section class="tarjeta" style="margin-top:16px"><h3>Semanas</h3><div class="tabla-caja"><table class="t" style="min-width:700px"><thead><tr><th style="text-align:left">Semana</th><th style="text-align:left">Pestañas con registros</th><th>Horas</th><th>Estatus</th><th></th></tr></thead><tbody>' +
      semanas.map(function (l) {
        var rs = filtrado.registros.filter(function (r) { return r.s === l; }), ps = [];
        rs.forEach(function (r) { if (ps.indexOf(r.p) === -1) ps.push(r.p); });
        var c = estadoCerrada(d, l);
        return '<tr><td><b>' + h(rango(l)) + '</b></td><td>' + h(ps.map(nombrePest).join(', ')) + '</td><td class="c">' + rs.reduce(function (a, r) { return a + r.h; }, 0) + '</td><td class="c">' + (c ? 'Cerrada' : 'Abierta') + '</td>' +
          '<td class="c"><button class="btn chico" data-ver="' + l + '">Ver</button></td></tr>';
      }).join('') + '</tbody></table></div></section>';
    $$('[data-ver]').forEach(function (b) { b.onclick = function () { E.lunes = b.getAttribute('data-ver'); ir('semana'); }; });
  }
  /** Semana cerrada: marca general ('*') o, si no existe, semanas importadas del Excel ya impresas. */
  function estadoCerrada(d, lunes) {
    var g = d.semanas.find(function (s) { return s.s === lunes && s.p === '*'; });
    if (g) return g.estado === 'CERRADA' ? g : null;
    var imp = d.semanas.find(function (s) { return s.s === lunes && s.estado === 'CERRADA'; });
    return imp ? { por: 'importación 2026', en: '' } : null;
  }
  function kpi(t, v) { return '<div class="kpi"><span>' + h(t) + '</span><b>' + h(v) + '</b></div>'; }

  // ===================== CONFIGURACIÓN =====================
  function vistaConfig(sub) {
    sub = sub || vistaConfig.sub || 'empleados'; vistaConfig.sub = sub;
    var subs = [['empleados', 'Empleados'], ['festivos', 'Días festivos'], ['firmantes', 'Firmantes'], ['textos', 'Textos por pestaña'], ['parametros', 'Formato'], ['usuarios', 'Usuarios'], ['bitacora', 'Bitácora']];
    if ((E.usuario || {}).rol !== 'ADMIN') subs = subs.filter(function (s) { return s[0] !== 'usuarios'; });
    marco('<div class="tabs">' + subs.map(function (s) { return '<button data-sub="' + s[0] + '" class="' + (s[0] === sub ? 'activo' : '') + '">' + s[1] + '</button>'; }).join('') + '</div>' +
      '<label class="tabs-movil col"><span class="etq">SECCIÓN</span><select id="cSubM">' + subs.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === sub ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label>' +
      '<div id="cCont"><div class="muted">Cargando…</div></div>');
    $$('[data-sub]').forEach(function (b) { b.onclick = function () { vistaConfig(b.getAttribute('data-sub')); }; });
    $('#cSubM').onchange = function () { vistaConfig(this.value); };
    var recargar = sub === 'usuarios' || sub === 'bitacora' ? Promise.resolve(E.cat) : api('catalogos').then(function (c) { E.cat = c; return c; });
    recargar.then(function () {
      ({ empleados: cfgEmpleados, festivos: cfgFestivos, firmantes: cfgFirmantes, textos: cfgTextos, parametros: cfgParametros, usuarios: cfgUsuarios, bitacora: cfgBitacora })[sub]();
    }).catch(fallo);
  }

  function cfgEmpleados() {
    var lista = E.cat.empleados;
    var pintar = function () {
      var q = R.norm($('#eBus').value);
      var f = lista.filter(function (e) { return !q || R.norm(e.no + ' ' + e.ap + ' ' + e.nom).indexOf(q) !== -1; });
      $('#eTabla').innerHTML = f.map(function (e) {
        return '<tr' + (e.notas ? ' class="con-aviso"' : '') + '><td class="c">' + h(e.no) + '</td><td>' + h(e.ap) + '</td><td>' + h(e.nom) + '</td><td>' + h(nombrePest(e.hab || '')) + '</td><td>' + h(e.ub || '') + '</td><td class="c">' + (e.activo ? 'Sí' : 'No') + '</td><td class="txt">' + h(e.notas || '') + '</td><td class="c"><button class="btn chico" data-edit="' + h(e.no) + '">Editar</button></td></tr>';
      }).join('');
      $$('[data-edit]').forEach(function (b) { b.onclick = function () { formEmpleado(lista.find(function (x) { return x.no === b.getAttribute('data-edit'); })); }; });
    };
    $('#cCont').innerHTML = '<section class="tarjeta"><div class="fila entre"><h2 style="margin:0">Catálogo de empleados (' + lista.length + ')</h2><div class="fila"><input type="text" id="eBus" placeholder="Buscar" style="width:220px"><button class="btn pri" id="eNuevo">+ Nuevo empleado</button></div></div>' +
      '<p class="muted">En el PDF y el Excel el nombre sale como APELLIDOS NOMBRE(S), igual que el formato oficial. Los renglones en amarillo tienen una nota por confirmar.</p>' +
      '<div class="tabla-caja"><table class="t" style="min-width:900px"><thead><tr><th>No.</th><th style="text-align:left">Apellidos</th><th style="text-align:left">Nombre(s)</th><th style="text-align:left">Área habitual</th><th style="text-align:left">Ubicación (poceros)</th><th>Activo</th><th style="text-align:left">Notas</th><th></th></tr></thead><tbody id="eTabla"></tbody></table></div></section>';
    $('#eBus').oninput = pintar; $('#eNuevo').onclick = function () { formEmpleado(null); };
    pintar();
  }

  function formEmpleado(e) {
    e = e || { no: '', ap: '', nom: '', ub: '', activo: true };
    abrirModal('<h2 style="margin:0">' + (e.no ? 'Editar empleado ' + h(e.no) : 'Nuevo empleado') + '</h2>' +
      '<div class="grid2"><label class="col"><span class="etq">NO. DE EMPLEADO</span><input type="text" id="fNo" value="' + h(e.no) + '"' + (e.no ? ' readonly' : '') + ' inputmode="numeric"></label>' +
      '<label class="col"><span class="etq">ACTIVO</span><select id="fAct"><option value="1"' + (e.activo ? ' selected' : '') + '>Sí</option><option value="0"' + (!e.activo ? ' selected' : '') + '>No</option></select></label>' +
      '<label class="col"><span class="etq">APELLIDOS</span><input type="text" id="fAp" value="' + h(e.ap) + '"></label>' +
      '<label class="col"><span class="etq">NOMBRE(S)</span><input type="text" id="fNom" value="' + h(e.nom) + '"></label></div>' +
      '<label class="col"><span class="etq">UBICACIÓN HABITUAL (solo poceros)</span><input type="text" id="fUb" value="' + h(e.ub || '') + '"></label>' +
      '<div class="fila" style="justify-content:flex-end"><button class="btn" id="fX">Cancelar</button><button class="btn pri" id="fOk">Guardar</button></div>');
    $('#fX').onclick = cerrarModal;
    $('#fOk').onclick = function () {
      api('guardarEmpleado', { no: $('#fNo').value, ap: $('#fAp').value, nom: $('#fNom').value, ub: $('#fUb').value, activo: $('#fAct').value === '1' })
        .then(function () { cerrarModal(); aviso('Empleado guardado.'); vistaConfig('empleados'); }).catch(fallo);
    };
  }

  function cfgFestivos() {
    var l = E.cat.festivos;
    $('#cCont').innerHTML = '<section class="tarjeta"><h2>Días festivos</h2><p class="muted">Las horas de poceros en estos días van a "Poceros festivos" (se pagan distinto). En las demás pestañas solo se marca el día como festivo. Los marcados "confirmar" se detectaron en el Excel 2026.</p>' +
      '<form class="fila" id="fFes"><input type="date" id="fesF" required><input type="text" id="fesD" placeholder="Descripción" style="width:260px"><button class="btn pri" type="submit">Agregar</button></form>' +
      '<div class="tabla-caja" style="margin-top:12px"><table class="t"><thead><tr><th>Fecha</th><th>Día</th><th style="text-align:left">Descripción</th><th></th></tr></thead><tbody>' +
      l.map(function (f) { return '<tr><td class="c">' + h(R.dmy(f.fecha)) + '</td><td class="c">' + R.DIAS[R.diaSem(f.fecha)] + '</td><td>' + h(f.desc) + '</td><td class="c"><button class="btn chico peligro" data-del="' + f.fecha + '">Quitar</button></td></tr>'; }).join('') + '</tbody></table></div></section>';
    $('#fFes').onsubmit = function (ev) { ev.preventDefault(); api('guardarFestivo', $('#fesF').value, $('#fesD').value).then(function () { aviso('Festivo guardado.'); vistaConfig('festivos'); }).catch(fallo); };
    $$('[data-del]').forEach(function (b) { b.onclick = function () { api('eliminarFestivo', b.getAttribute('data-del')).then(function () { vistaConfig('festivos'); }).catch(fallo); }; });
  }

  function cfgFirmantes() {
    var f = E.cat.firmantes.slice(); while (f.length < 4) f.push({ etiqueta: '', nombre: '', puesto: '', puesto2: '' });
    $('#cCont').innerHTML = '<section class="tarjeta"><h2>Firmantes del formato</h2><div class="grid2">' + f.map(function (x, i) {
      return '<div class="col" style="background:#faf6f1;border-radius:8px;padding:12px"><label class="col"><span class="etq">ETIQUETA</span><input type="text" data-f="' + i + '" data-k="etiqueta" value="' + h(x.etiqueta) + '"></label>' +
        '<label class="col"><span class="etq">NOMBRE</span><input type="text" data-f="' + i + '" data-k="nombre" value="' + h(x.nombre) + '"></label>' +
        '<label class="col"><span class="etq">PUESTO</span><input type="text" data-f="' + i + '" data-k="puesto" value="' + h(x.puesto) + '"></label>' +
        '<label class="col"><span class="etq">SEGUNDO RENGLÓN DEL PUESTO (opcional)</span><input type="text" data-f="' + i + '" data-k="puesto2" value="' + h(x.puesto2 || '') + '"></label></div>';
    }).join('') + '</div><div class="fila" style="justify-content:flex-end;margin-top:12px"><button class="btn pri" id="fiOk">Guardar firmantes</button></div></section>';
    $('#fiOk').onclick = function () {
      $$('[data-f]').forEach(function (i) { f[Number(i.getAttribute('data-f'))][i.getAttribute('data-k')] = i.value; });
      api('guardarFirmantes', f).then(function () { aviso('Firmantes guardados.'); }).catch(fallo);
    };
  }

  function cfgTextos() {
    $('#cCont').innerHTML = '<section class="tarjeta"><h2>Textos por pestaña</h2><p class="muted">"Motivo" es el texto fijo que sale en el formato. "Palabras clave" sirven para que la app reconozca la actividad de cada hoja (separadas por comas).</p>' +
      E.cat.pestanas.map(function (p) {
        return '<div class="col" style="border-top:1px solid var(--borde);padding:12px 0"><b>' + h(p.nombre) + (p.modo === 'POR_EMPLEADO' ? ' <span class="muted">(motivo automático por empleado según los días)</span>' : '') + '</b>' +
          (p.modo === 'POR_EMPLEADO' ? '' : '<label class="col"><span class="etq">MOTIVO</span><textarea data-mot="' + p.clave + '" style="min-height:60px">' + h(p.motivo) + '</textarea></label>') +
          '<label class="col"><span class="etq">PALABRAS CLAVE</span><input type="text" data-pal="' + p.clave + '" value="' + h(p.palabras || '') + '"></label>' +
          '<div><button class="btn chico" data-gp="' + p.clave + '">Guardar ' + h(p.nombre) + '</button></div></div>';
      }).join('') + '</section>';
    $$('[data-gp]').forEach(function (b) {
      b.onclick = function () {
        var c = b.getAttribute('data-gp'), m = $('[data-mot="' + c + '"]'), p = E.cat.pestanas.find(function (x) { return x.clave === c; });
        api('guardarPestana', c, m ? m.value : p.motivo, $('[data-pal="' + c + '"]').value).then(function () { aviso('Guardado.'); }).catch(fallo);
      };
    });
  }

  function cfgParametros() {
    var p = E.cat.parametros, et = { AYUNTAMIENTO: 'Primera línea', DIRECCION: 'Dirección', DEPENDENCIA: 'Dependencia', REPORTE: 'Reporte', FILAS_POR_HOJA: 'Renglones por hoja del PDF', MAX_HORAS_DIA: 'Aviso: máximo de horas por día' };
    $('#cCont').innerHTML = '<section class="tarjeta"><h2>Datos del formato</h2><div class="grid2">' + Object.keys(et).map(function (k) {
      return '<label class="col"><span class="etq">' + h(et[k]).toUpperCase() + '</span><div class="fila" style="flex-wrap:nowrap"><input type="text" data-par="' + k + '" value="' + h(p[k] || '') + '" style="flex:1"><button class="btn chico" data-gpar="' + k + '">Guardar</button></div></label>';
    }).join('') + '</div></section>';
    $$('[data-gpar]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-gpar'); api('guardarParametro', k, $('[data-par="' + k + '"]').value).then(function () { aviso('Guardado.'); }).catch(fallo); }; });
  }

  function cfgUsuarios() {
    api('listarUsuarios').then(function (l) {
      $('#cCont').innerHTML = '<section class="tarjeta"><div class="fila entre"><h2 style="margin:0">Usuarios</h2></div>' +
        '<p class="muted">Para el periodo de vacaciones, crea un usuario de APOYO y desactívalo cuando regreses. APOYO puede hacer todo excepto administrar usuarios.</p>' +
        '<form class="fila" id="uNuevo"><input type="text" id="uU" placeholder="Usuario (sin espacios)" required><input type="text" id="uN" placeholder="Nombre completo" required style="width:240px"><select id="uR"><option value="APOYO">APOYO</option><option value="ADMIN">ADMIN</option></select><button class="btn pri" type="submit">Crear usuario</button></form>' +
        '<div class="tabla-caja" style="margin-top:12px"><table class="t"><thead><tr><th style="text-align:left">Usuario</th><th style="text-align:left">Nombre</th><th>Rol</th><th>Activo</th><th>Último acceso</th><th></th></tr></thead><tbody>' +
        l.map(function (u) {
          return '<tr><td>' + h(u.usuario) + '</td><td>' + h(u.nombre) + '</td><td class="c">' + h(u.rol) + '</td><td class="c">' + (u.activo ? 'Sí' : 'No') + '</td><td class="c">' + h(u.ultimo || '') + '</td>' +
            '<td class="c"><div class="fila" style="justify-content:center"><button class="btn chico" data-act="' + h(u.usuario) + '" data-v="' + (u.activo ? 0 : 1) + '">' + (u.activo ? 'Desactivar' : 'Activar') + '</button><button class="btn chico" data-rest="' + h(u.usuario) + '">Nueva contraseña</button></div></td></tr>';
        }).join('') + '</tbody></table></div></section>';
      $('#uNuevo').onsubmit = function (ev) {
        ev.preventDefault();
        api('crearUsuario', $('#uU').value, $('#uN').value, $('#uR').value).then(function (r) {
          if (!r.ok) return aviso(r.mensaje);
          abrirModal('<h2 style="margin:0">Usuario creado</h2><p>Usuario: <b>' + h($('#uU').value.toLowerCase()) + '</b><br>Contraseña temporal: <b style="font-size:20px">' + h(r.clave) + '</b></p><p class="muted">Al entrar por primera vez se le pedirá cambiarla.</p><div class="fila" style="justify-content:flex-end"><button class="btn pri" id="mOk">Listo</button></div>');
          $('#mOk').onclick = function () { cerrarModal(); vistaConfig('usuarios'); };
        }).catch(fallo);
      };
      $$('[data-act]').forEach(function (b) { b.onclick = function () { api('activarUsuario', b.getAttribute('data-act'), b.getAttribute('data-v') === '1').then(function (r) { if (r && r.ok === false) aviso(r.mensaje); vistaConfig('usuarios'); }).catch(fallo); }; });
      $$('[data-rest]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('¿Crear una contraseña temporal nueva para ' + b.getAttribute('data-rest') + '?')) return;
          api('restablecerClave', b.getAttribute('data-rest')).then(function (r) { abrirModal('<h2 style="margin:0">Contraseña temporal</h2><p style="font-size:20px"><b>' + h(r.clave) + '</b></p><div class="fila" style="justify-content:flex-end"><button class="btn pri" id="mOk">Listo</button></div>'); $('#mOk').onclick = cerrarModal; }).catch(fallo);
        };
      });
    }).catch(fallo);
  }

  function cfgBitacora() {
    api('bitacora', 200).then(function (l) {
      $('#cCont').innerHTML = '<section class="tarjeta"><h2>Bitácora (últimos 200 movimientos)</h2><div class="tabla-caja"><table class="t"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th style="text-align:left">Detalle</th></tr></thead><tbody>' +
        l.map(function (x) { return '<tr><td class="c">' + h(x.fecha) + '</td><td class="c">' + h(x.usuario) + '</td><td class="c">' + h(x.accion) + '</td><td>' + h(x.detalle) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    }).catch(fallo);
  }

  // ===================== MODAL =====================
  function abrirModal(html) { var m = $('#modal'); m.innerHTML = '<div class="modal-caja" role="dialog" aria-modal="true">' + html + '</div>'; m.hidden = false; var f = m.querySelector('input,select,textarea,button'); if (f) f.focus(); }
  function cerrarModal() { var m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('#modal').hidden) cerrarModal(); });

  iniciar();
})();
