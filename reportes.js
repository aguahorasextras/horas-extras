/*
 * APP HORAS EXTRAS — Armado de semanas, PDF (pdfmake) y Excel (ExcelJS).
 * Funciona en el navegador (window.Reportes) y en Node (module.exports) para pruebas.
 * "datos" = respuesta de semana() o periodo() del motor.
 */
(function (raiz) {
  'use strict';
  var DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  var DIAS_LARGOS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
  var MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  var MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  // ---------- fechas ----------
  function aFecha(iso) { var p = iso.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }
  function aIso(d) { return d.toISOString().slice(0, 10); }
  function sumar(iso, n) { var d = aFecha(iso); d.setUTCDate(d.getUTCDate() + n); return aIso(d); }
  function diaSem(iso) { return (aFecha(iso).getUTCDay() + 6) % 7; }
  function lunesDe(iso) { return sumar(iso, -diaSem(iso)); }
  function diasDe(lunes) { var r = []; for (var i = 0; i < 7; i++) r.push(sumar(lunes, i)); return r; }
  function dmy(iso) { var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function fechaLarga(iso) { var p = iso.split('-'); return p[2] + ' DE ' + MESES[Number(p[1]) - 1] + ' ' + p[0]; }

  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); }
  function titulo(s) {
    return String(s || '').toLowerCase().replace(/(^|[\s.(-])([a-záéíóúñü])/g, function (a, b, c) { return b + c.toUpperCase(); })
      .replace(/\b(De|Del|La|Los|Y)\b/g, function (x) { return x.toLowerCase(); });
  }
  function nombreOficial(datos, no, respaldo) {
    var e = datos.empleados && datos.empleados[no];
    return e ? norm((e.ap || '') + ' ' + (e.nom || '')) : norm(respaldo || '');
  }
  function nombreMostrar(datos, no, respaldo) {
    var e = datos.empleados && datos.empleados[no];
    return e ? titulo(((e.nom || '') + ' ' + (e.ap || '')).trim()) : titulo(respaldo || '');
  }

  function motivoPorDias(fechas, festivos) {
    var fest = false, nombres = [];
    fechas.slice().sort().forEach(function (f) {
      if (festivos[f]) { fest = true; return; }
      var d = DIAS_LARGOS[diaSem(f)];
      if (nombres.indexOf(d) === -1) nombres.push(d);
    });
    var partes = (fest ? ['FESTIVO'] : []).concat(nombres);
    if (partes.length <= 1) return partes.join('');
    return partes.slice(0, -1).join(' ') + ' Y ' + partes[partes.length - 1];
  }

  function unirTextos(lista) {
    var out = '';
    lista.forEach(function (t) {
      t = String(t || '').trim(); if (!t) return;
      if (out && !/[.;]$/.test(out)) out += '.';
      out += (out ? ' ' : '') + t;
    });
    return out;
  }

  /** Arma la tabla de una pestaña en una semana. */
  function armarSemana(datos, lunes, clave) {
    var pest = (datos.pestanas || []).find(function (p) { return p.clave === clave; }) || { clave: clave, nombre: clave, modo: 'BLOQUE', motivo: '' };
    var dias = diasDe(lunes);
    var regs = datos.registros.filter(function (r) { return r.s === lunes && r.p === clave; });
    var orden = [], filas = {};
    regs.forEach(function (r) {
      if (!filas[r.no]) { filas[r.no] = { no: r.no, nombre: nombreOficial(datos, r.no, r.n), mostrar: nombreMostrar(datos, r.no, r.n), horas: [0, 0, 0, 0, 0, 0, 0], fechas: [], ids: [] }; orden.push(r.no); }
      var i = dias.indexOf(r.f);
      if (i !== -1) { filas[r.no].horas[i] += r.h; if (filas[r.no].fechas.indexOf(r.f) === -1) filas[r.no].fechas.push(r.f); }
      filas[r.no].ids.push(r.id);
    });
    var lugares = (datos.lugares || []).filter(function (l) { return l.s === lunes && l.p === clave; });
    var porEmpleado = pest.modo === 'POR_EMPLEADO';
    var lista = orden.map(function (no) {
      var f = filas[no];
      f.total = f.horas.reduce(function (a, b) { return a + b; }, 0);
      if (porEmpleado) {
        var propios = lugares.filter(function (l) { return String(l.no) === String(no); }).map(function (l) { return l.t; });
        var unicos = []; propios.forEach(function (t) { if (unicos.indexOf(t) === -1) unicos.push(t); });
        f.lugar = unicos.join(', ') || norm((datos.empleados[no] || {}).ub || '');
        f.motivo = motivoPorDias(f.fechas, datos.festivos || {});
      }
      return f;
    });
    var sem = (datos.semanas || []).find(function (s) { return s.s === lunes && s.p === clave; });
    var motivo = porEmpleado ? '' : ((sem && sem.motivo) || pest.motivo || '');
    var bloque = lugares.filter(function (l) { return !l.no || !porEmpleado; })
      .sort(function (a, b) { return (a.f || '').localeCompare(b.f || ''); })
      .map(function (l) { return l.t; });
    var vistos = [], lugar = unirTextos(bloque.filter(function (t) { if (vistos.indexOf(t) !== -1) return false; vistos.push(t); return true; }));
    var totDia = [0, 0, 0, 0, 0, 0, 0];
    lista.forEach(function (f) { f.horas.forEach(function (h, i) { totDia[i] += h; }); });
    var cerrada = (datos.semanas || []).find(function (s) { return s.s === lunes && s.p === '*'; });
    return {
      lunes: lunes, dias: dias, pestana: pest, filas: lista, motivo: motivo, lugar: porEmpleado ? '' : lugar, porEmpleado: porEmpleado,
      totalesDia: totDia, total: totDia.reduce(function (a, b) { return a + b; }, 0),
      estado: cerrada ? cerrada.estado : (sem && sem.estado === 'CERRADA' ? 'CERRADA' : 'ABIERTA')
    };
  }

  /** Semanas (lunes) dentro del periodo */
  function semanasDe(desde, hasta) { var r = []; for (var l = lunesDe(desde); l <= hasta; l = sumar(l, 7)) r.push(l); return r; }

  // ---------- PDF: formato semanal para firma ----------
  function paginarSemana(s, filasPorHoja) {
    var maxChars = 1400;
    var n = Math.max(1, Math.ceil(s.filas.length / filasPorHoja), Math.ceil((s.lugar || '').length / maxChars));
    var porHoja = Math.ceil(s.filas.length / n) || 1;
    // Divide el lugar en n partes por oraciones
    var partes = [];
    if (n > 1 && s.lugar) {
      var oraciones = s.lugar.split(/(?<=\.)\s+/), objetivo = s.lugar.length / n, actual = '';
      oraciones.forEach(function (o) {
        if (actual && (actual.length + o.length > objetivo) && partes.length < n - 1) { partes.push(actual); actual = o; }
        else actual = actual ? actual + ' ' + o : o;
      });
      partes.push(actual);
    } else partes = [s.lugar || ''];
    var hojas = [];
    for (var i = 0; i < n; i++) hojas.push({ filas: s.filas.slice(i * porHoja, (i + 1) * porHoja), lugar: partes[i] || '', inicio: i * porHoja });
    return hojas;
  }

  function celda(t, o) { var c = { text: t == null ? '' : String(t) }; for (var k in (o || {})) c[k] = o[k]; return c; }

  function paginaFormato(s, hoja, iHoja, nHojas, ctx, ultima) {
    var p = ctx.parametros || {};
    var festivos = ctx.festivos || {};
    var cuerpo = [];
    var encab = [celda('No.', { bold: true, alignment: 'center', rowSpan: 2 }), celda('Nombre del Empleado', { bold: true, alignment: 'center', rowSpan: 2 }), celda('No. Empl.', { bold: true, alignment: 'center', rowSpan: 2 }),
      celda('TIEMPO EXTRAORDINARIO DEVENGADO (EN HORAS)', { bold: true, alignment: 'center', colSpan: 7 }), {}, {}, {}, {}, {}, {},
      celda('Suma Total Horas Extras', { bold: true, alignment: 'center', rowSpan: 2, fontSize: 6.5 }), celda('Motivo ó Justificación', { bold: true, alignment: 'center', rowSpan: 2 }), celda('Lugar donde se prestó el servicio', { bold: true, alignment: 'center', rowSpan: 2 })];
    var dias = [{}, {}, {}].concat(s.dias.map(function (d, i) {
      return celda(DIAS[i] + ' ' + d.slice(8) + (festivos[d] ? '\nFESTIVO' : ''), { bold: true, alignment: 'center', fontSize: festivos[d] ? 6 : 7 });
    })).concat([{}, {}, {}]);
    cuerpo.push(encab, dias);
    var nFilas = Math.max(hoja.filas.length, 1);
    hoja.filas.forEach(function (f, k) {
      var fila = [celda(hoja.inicio + k + 1, { alignment: 'center' }), celda(f.nombre), celda(f.no, { alignment: 'center' })]
        .concat(f.horas.map(function (h) { return celda(h || '', { alignment: 'center' }); }))
        .concat([celda(f.total, { alignment: 'center', bold: true })]);
      if (s.porEmpleado) fila.push(celda(f.motivo, { alignment: 'center', fontSize: 7 }), celda(f.lugar, { alignment: 'center', fontSize: 7 }));
      else if (k === 0) fila.push(celda(s.motivo, { rowSpan: nFilas, alignment: 'center', fontSize: 7 }), celda(hoja.lugar, { rowSpan: nFilas, fontSize: 7, alignment: 'justify' }));
      else fila.push({}, {});
      cuerpo.push(fila);
    });
    if (!hoja.filas.length) cuerpo.push([celda(''), celda('Sin registros'), celda('')].concat([0, 0, 0, 0, 0, 0, 0].map(function () { return celda(''); })).concat([celda(''), celda(s.motivo, { fontSize: 7 }), celda('')]));
    var tot = [0, 0, 0, 0, 0, 0, 0];
    hoja.filas.forEach(function (f) { f.horas.forEach(function (h, i) { tot[i] += h; }); });
    var totHoja = tot.reduce(function (a, b) { return a + b; }, 0);
    var sinBorde = [false, false, false, false];
    cuerpo.push([celda('', { border: sinBorde }), celda('', { border: sinBorde }), celda('Horas:', { bold: true, alignment: 'right', border: sinBorde })]
      .concat(tot.map(function (h) { return celda(h, { alignment: 'center', bold: true }); }))
      .concat([celda(totHoja, { alignment: 'center', bold: true }), celda('', { border: sinBorde }), celda('', { border: sinBorde })]));

    var f = ctx.firmantes || [];
    var firma = function (x) {
      if (!x) return { text: '' };
      return { stack: [
        { text: x.etiqueta || '', bold: true, fontSize: 8, margin: [0, 0, 0, 22] },
        { canvas: [{ type: 'line', x1: 10, y1: 0, x2: 170, y2: 0, lineWidth: 0.6 }] },
        { text: x.nombre || '', fontSize: 8, margin: [0, 3, 0, 0] },
        { text: x.puesto || '', bold: true, fontSize: 7 },
        x.puesto2 ? { text: x.puesto2, bold: true, fontSize: 7 } : { text: '' }
      ], alignment: 'center' };
    };
    var contenido = [
      { columns: [
        { width: '*', stack: [
          { text: p.AYUNTAMIENTO || '', bold: true, fontSize: 10 },
          { text: 'DIRECCIÓN: ' + (p.DIRECCION || ''), bold: true, fontSize: 9, margin: [0, 2, 0, 0] },
          { text: 'DEPENDENCIA: ' + (p.DEPENDENCIA || ''), bold: true, fontSize: 9 },
          { text: 'REPORTE: ' + (p.REPORTE || ''), bold: true, fontSize: 9 },
          { text: 'SEMANA DEL:  ' + fechaLarga(s.dias[0]), bold: true, fontSize: 9 },
          { text: 'AL:                  ' + fechaLarga(s.dias[6]), bold: true, fontSize: 9 },
          { text: 'AÑO: ' + s.dias[6].slice(0, 4), bold: true, fontSize: 9 }
        ] },
        { width: 200, stack: [
          ctx.logo ? { image: ctx.logo, width: 120, alignment: 'right' } : { text: '' },
          { text: 'Hoja __' + (iHoja + 1) + '__ de __' + nHojas + '__', fontSize: 9, alignment: 'right', margin: [0, 4, 0, 0] },
          { text: 'ÁREA: ' + norm(s.pestana.nombre), fontSize: 8, bold: true, alignment: 'right' }
        ] }
      ] },
      { margin: [0, 8, 0, 0], fontSize: 8, table: { headerRows: 2, dontBreakRows: true, widths: [14, 135, 30, 25, 25, 25, 25, 25, 25, 25, 32, 112, 176], body: cuerpo }, layout: { hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; }, paddingLeft: function () { return 3; }, paddingRight: function () { return 3; }, paddingTop: function () { return 2; }, paddingBottom: function () { return 2; } } },
      { margin: [0, 18, 0, 0], columns: [firma(f[0]), firma(f[1]), firma(f[2]), firma(f[3])] }
    ];
    if (!ultima) contenido.push({ text: '', pageBreak: 'after' });
    return contenido;
  }

  /** Doc de pdfmake con los formatos para firma: bloques = [{lunes, clave}] */
  function pdfFormatos(datos, bloques, opciones) {
    opciones = opciones || {};
    var filasPorHoja = Number((datos.parametros || {}).FILAS_POR_HOJA) || 12;
    var ctx = { parametros: datos.parametros, firmantes: datos.firmantes, festivos: datos.festivos, logo: opciones.logo };
    var paginas = [];
    bloques.forEach(function (b) {
      var s = armarSemana(datos, b.lunes, b.clave);
      if (!s.filas.length && !opciones.incluirVacias) return;
      var hojas = paginarSemana(s, filasPorHoja);
      hojas.forEach(function (h, i) { paginas.push({ s: s, h: h, i: i, n: hojas.length }); });
    });
    var content = [];
    paginas.forEach(function (pg, k) { content = content.concat(paginaFormato(pg.s, pg.h, pg.i, pg.n, ctx, k === paginas.length - 1)); });
    if (!content.length) content.push({ text: 'No hay registros en el periodo y pestañas elegidos.', margin: [0, 40, 0, 0] });
    return { pageSize: 'LETTER', pageOrientation: 'landscape', pageMargins: [20, 18, 20, 18], defaultStyle: { fontSize: 8 }, content: content, info: { title: 'Formato Tiempo Extraordinario' } };
  }

  // ---------- Resúmenes ----------
  function resumen(datos, desde, hasta) {
    var regs = datos.registros.filter(function (r) { return r.f >= desde && r.f <= hasta; });
    var porPest = {}, porMes = {}, porEmp = {}, porDia = [0, 0, 0, 0, 0, 0, 0], porSemana = {}, festivas = 0, total = 0;
    regs.forEach(function (r) {
      total += r.h;
      porPest[r.p] = (porPest[r.p] || 0) + r.h;
      var mes = r.f.slice(0, 7); porMes[mes] = porMes[mes] || {}; porMes[mes][r.p] = (porMes[mes][r.p] || 0) + r.h;
      porEmp[r.no] = porEmp[r.no] || { no: r.no, nombre: nombreMostrar(datos, r.no, r.n), h: 0 }; porEmp[r.no].h += r.h;
      porDia[diaSem(r.f)] += r.h;
      porSemana[r.s] = (porSemana[r.s] || 0) + r.h;
      if (datos.festivos && datos.festivos[r.f]) festivas += r.h;
    });
    var emps = Object.keys(porEmp).map(function (k) { return porEmp[k]; }).sort(function (a, b) { return b.h - a.h; });
    return { total: total, porPestana: porPest, porMes: porMes, porEmpleado: emps, porDia: porDia, porSemana: porSemana, festivas: festivas, empleados: emps.length };
  }

  // ---------- Gráficas SVG (para la pantalla y el PDF) ----------
  var COLORES = ['#F7890C', '#1d5fa8', '#2f8f5b', '#8a4fbf', '#c23b5e', '#3aa0b8', '#7a6a2e', '#5b6b7a'];
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function svgBarrasH(items, ancho) {
    ancho = ancho || 520; var alto = items.length * 20 + 8, max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + ancho + '" height="' + alto + '" viewBox="0 0 ' + ancho + ' ' + alto + '">';
    items.forEach(function (it, k) {
      var y = 2 + k * 20, w = Math.round((ancho - 210) * it.v / max);
      s += '<text x="0" y="' + (y + 14) + '" font-size="11" font-family="Helvetica" fill="#16222e">' + esc(it.l) + '</text>';
      s += '<rect x="150" y="' + (y + 3) + '" width="' + Math.max(w, 1) + '" height="15" rx="2" fill="' + (it.c || COLORES[0]) + '"/>';
      s += '<text x="' + (156 + w) + '" y="' + (y + 14) + '" font-size="11" font-family="Helvetica" fill="#16222e">' + it.v + '</text>';
    });
    return s + '</svg>';
  }
  function svgBarrasV(items, ancho, alto) {
    ancho = ancho || 520; alto = alto || 200;
    var max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1])), n = Math.max(items.length, 1), paso = (ancho - 20) / n, base = alto - 24;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + ancho + '" height="' + alto + '" viewBox="0 0 ' + ancho + ' ' + alto + '">';
    s += '<line x1="10" y1="' + base + '" x2="' + (ancho - 10) + '" y2="' + base + '" stroke="#d9b48f" stroke-width="1"/>';
    items.forEach(function (it, k) {
      var h = Math.round((base - 20) * it.v / max), x = 10 + k * paso + paso * 0.15, w = paso * 0.7;
      s += '<rect x="' + x.toFixed(1) + '" y="' + (base - h) + '" width="' + w.toFixed(1) + '" height="' + Math.max(h, 0) + '" rx="2" fill="' + (it.c || COLORES[0]) + '"/>';
      s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (base - h - 4) + '" font-size="9" text-anchor="middle" font-family="Helvetica" fill="#16222e">' + (it.v || '') + '</text>';
      s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (alto - 8) + '" font-size="9" text-anchor="middle" font-family="Helvetica" fill="#4f5f6f">' + esc(it.l) + '</text>';
    });
    return s + '</svg>';
  }
  function svgApiladas(meses, pestanas, ancho, alto) {
    ancho = ancho || 520; alto = alto || 220;
    var tot = meses.map(function (m) { return pestanas.reduce(function (a, p) { return a + (m.v[p.clave] || 0); }, 0); });
    var max = Math.max.apply(null, tot.concat([1])), n = Math.max(meses.length, 1), paso = (ancho - 20) / n, base = alto - 24;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + ancho + '" height="' + alto + '" viewBox="0 0 ' + ancho + ' ' + alto + '">';
    s += '<line x1="10" y1="' + base + '" x2="' + (ancho - 10) + '" y2="' + base + '" stroke="#d9b48f" stroke-width="1"/>';
    meses.forEach(function (m, k) {
      var x = 10 + k * paso + paso * 0.15, w = paso * 0.7, y = base;
      pestanas.forEach(function (p, j) {
        var h = (base - 20) * (m.v[p.clave] || 0) / max; if (h <= 0) return;
        y -= h; s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + COLORES[j % COLORES.length] + '"/>';
      });
      s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" font-size="9" text-anchor="middle" font-family="Helvetica" fill="#16222e">' + (tot[k] || '') + '</text>';
      s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (alto - 8) + '" font-size="9" text-anchor="middle" font-family="Helvetica" fill="#4f5f6f">' + esc(m.l) + '</text>';
    });
    return s + '</svg>';
  }

  // ---------- PDF: reporte histórico con gráficas ----------
  function pdfHistorico(datos, desde, hasta, titulo_, opciones) {
    opciones = opciones || {};
    var r = resumen(datos, desde, hasta);
    var pest = datos.pestanas || [];
    var nombre = {}; pest.forEach(function (p) { nombre[p.clave] = p.nombre; });
    var itemsPest = pest.map(function (p, j) { return { l: p.nombre, v: r.porPestana[p.clave] || 0, c: COLORES[j % COLORES.length] }; });
    var meses = Object.keys(r.porMes).sort().map(function (m) { return { l: MESES_CORTOS[Number(m.slice(5)) - 1], v: r.porMes[m] }; });
    var leyenda = { columns: pest.map(function (p, j) { return { text: [{ text: '■ ', color: COLORES[j % COLORES.length] }, { text: p.nombre }], fontSize: 7 }; }), margin: [0, 2, 0, 8] };
    var semanas = Object.keys(r.porSemana).sort().map(function (s) { return { l: s.slice(8) + '/' + s.slice(5, 7), v: r.porSemana[s] }; });
    var top = r.porEmpleado.slice(0, 10);
    var kpi = function (t, v) { return { stack: [{ text: t, fontSize: 8, color: '#4f5f6f' }, { text: String(v), fontSize: 18, bold: true, color: '#9A4A00' }], margin: [0, 0, 0, 6] }; };
    var porPestTabla = [[{ text: 'Pestaña', bold: true }, { text: 'Horas', bold: true, alignment: 'right' }, { text: '%', bold: true, alignment: 'right' }]]
      .concat(pest.map(function (p) { var v = r.porPestana[p.clave] || 0; return [p.nombre, { text: String(v), alignment: 'right' }, { text: r.total ? (100 * v / r.total).toFixed(1) + '%' : '0%', alignment: 'right' }]; }))
      .concat([[{ text: 'Total', bold: true }, { text: String(r.total), bold: true, alignment: 'right' }, { text: '100%', alignment: 'right' }]]);
    var content = [
      { columns: [
        { width: '*', stack: [{ text: 'REPORTE HISTÓRICO DE HORAS EXTRAS', bold: true, fontSize: 14, color: '#9A4A00' },
          { text: (datos.parametros || {}).DEPENDENCIA || '', fontSize: 9 }, { text: titulo_ + ' · del ' + dmy(desde) + ' al ' + dmy(hasta), fontSize: 9, margin: [0, 2, 0, 0] }] },
        opciones.logo ? { width: 130, image: opciones.logo, fit: [130, 60], alignment: 'right' } : { width: 1, text: '' }
      ] },
      { margin: [0, 12, 0, 4], columns: [kpi('Horas totales', r.total), kpi('Empleados con horas', r.empleados), kpi('Horas en días festivos', r.festivas), kpi('Semanas con registros', semanas.length)] },
      { columns: [
        { width: '55%', stack: [{ text: 'Horas por pestaña', bold: true, margin: [0, 6, 0, 4] }, { svg: svgBarrasH(itemsPest, 400), width: 400 }] },
        { width: '45%', stack: [{ text: 'Detalle por pestaña', bold: true, margin: [0, 6, 0, 4] }, { table: { widths: ['*', 50, 45], body: porPestTabla }, layout: 'lightHorizontalLines', fontSize: 8 }] }
      ] },
      { text: meses.length > 1 ? 'Horas por mes y pestaña' : 'Horas por semana', bold: true, margin: [0, 12, 0, 4] },
      meses.length > 1 ? { svg: svgApiladas(meses, pest, 740, 170), width: 740 } : { svg: svgBarrasV(semanas, 740, 190), width: 740 },
      meses.length > 1 ? leyenda : { text: '' },
      { columns: [
        { width: '50%', stack: [{ text: 'Horas por día de la semana', bold: true, margin: [0, 8, 0, 4] }, { svg: svgBarrasV(DIAS.map(function (d, i) { return { l: d, v: r.porDia[i] }; }), 360, 170), width: 360 }] },
        { width: '50%', stack: [{ text: 'Los 10 empleados con más horas', bold: true, margin: [0, 8, 0, 4] },
          { table: { widths: [16, '*', 40], body: [[{ text: '#', bold: true }, { text: 'Empleado', bold: true }, { text: 'Horas', bold: true, alignment: 'right' }]].concat(top.map(function (e, i) { return [String(i + 1), e.nombre + ' (' + e.no + ')', { text: String(e.h), alignment: 'right' }]; })) }, layout: 'lightHorizontalLines', fontSize: 8 }] }
      ] }
    ];
    if (opciones.anterior) {
      var ra = resumen(datos, opciones.anterior.desde, opciones.anterior.hasta);
      var dif = r.total - ra.total;
      content.splice(2, 0, { text: 'Contra el periodo anterior (' + dmy(opciones.anterior.desde) + ' al ' + dmy(opciones.anterior.hasta) + '): ' + ra.total + ' h → ' + r.total + ' h (' + (dif >= 0 ? '+' : '') + dif + ' h' + (ra.total ? ', ' + (dif >= 0 ? '+' : '') + (100 * dif / ra.total).toFixed(1) + '%' : '') + ')', fontSize: 9, margin: [0, 0, 0, 4] });
    }
    return { pageSize: 'LETTER', pageOrientation: 'landscape', pageMargins: [26, 22, 26, 22], defaultStyle: { fontSize: 9 }, content: content, info: { title: 'Reporte histórico de horas extras' } };
  }

  // ---------- Excel ----------
  /**
   * Genera el libro con el mismo acomodo del Excel actual. fotos = {idFoto: base64 jpeg} (opcional).
   * Devuelve el workbook de ExcelJS (la página lo descarga con writeBuffer).
   */
  function excel(ExcelJS, datos, desde, hasta, opciones) {
    opciones = opciones || {};
    var fotos = opciones.fotos || {};
    var wb = new ExcelJS.Workbook();
    wb.creator = 'App Horas Extras';
    var p = datos.parametros || {};
    var semanas = semanasDe(desde, hasta);
    var pests = (datos.pestanas || []).filter(function (x) { return !opciones.pestanas || opciones.pestanas.indexOf(x.clave) !== -1; });
    var fuente = { name: 'Times New Roman', size: 10 };
    var borde = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    // Resumen (antes Hoja5)
    var res = wb.addWorksheet('RESUMEN');
    res.getCell(1, 1).value = 'SEMANA';
    pests.forEach(function (pp, j) {
      var c0 = 2 + j * 8;
      res.mergeCells(1, c0, 1, c0 + 7);
      res.getCell(1, c0).value = norm(pp.nombre);
      DIAS.concat(['TOTAL']).forEach(function (d, k) { res.getCell(2, c0 + k).value = d; });
    });
    semanas.forEach(function (l, i) {
      var fila = 3 + i;
      res.getCell(fila, 1).value = dmy(l) + ' al ' + dmy(sumar(l, 6));
      pests.forEach(function (pp, j) {
        var s = armarSemana(datos, l, pp.clave), c0 = 2 + j * 8;
        s.totalesDia.forEach(function (h, k) { res.getCell(fila, c0 + k).value = h; });
        res.getCell(fila, c0 + 7).value = s.total;
      });
    });
    res.getRow(1).font = { bold: true }; res.getRow(2).font = { bold: true };
    res.getColumn(1).width = 26;
    res.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

    pests.forEach(function (pp) {
      var ws = wb.addWorksheet(String(pp.hojaExcel || pp.nombre).slice(0, 31), { pageSetup: { orientation: 'landscape', paperSize: 1, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      [3.6, 38, 8, 7, 7, 7, 7, 7, 7, 7, 13, 51, 65].forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
      var fila = 2;
      semanas.forEach(function (l) {
        var s = armarSemana(datos, l, pp.clave);
        if (!s.filas.length) return;
        var inicio = fila;
        ws.getCell(fila, 1).value = p.AYUNTAMIENTO || ''; ws.getCell(fila, 1).font = { name: 'Times New Roman', size: 10, bold: true };
        fila++;
        ws.getCell(fila, 2).value = 'DIRECCIÓN: ' + (p.DIRECCION || ''); ws.getCell(fila, 13).value = 'Hoja __1___ de __1___';
        [['DEPENDENCIA: ' + (p.DEPENDENCIA || '')], ['REPORTE: ' + (p.REPORTE || '')], ['SEMANA DEL:  ' + fechaLarga(s.dias[0])], ['AL:                       ' + fechaLarga(s.dias[6])], ['AÑO: ' + s.dias[6].slice(0, 4)]]
          .forEach(function (t) { fila++; ws.getCell(fila, 2).value = t[0]; });
        for (var r0 = inicio + 1; r0 <= fila; r0++) { ws.getCell(r0, 2).font = { name: 'Times New Roman', size: 10, bold: true }; }
        fila += 2;
        var h1 = fila, h2 = fila + 1;
        ['No.', 'Nombre del Empleado', 'No. Empl.'].forEach(function (t, i) { ws.mergeCells(h1, i + 1, h2, i + 1); ws.getCell(h1, i + 1).value = t; });
        ws.mergeCells(h1, 4, h1, 10); ws.getCell(h1, 4).value = 'TIEMPO EXTRAORDINARIO DEVENGADO (EN HORAS)';
        ws.mergeCells(h1, 11, h2, 11); ws.getCell(h1, 11).value = 'Suma Total Horas Extras';
        ws.mergeCells(h1, 12, h2, 12); ws.getCell(h1, 12).value = 'Motivo ó Justificación';
        ws.mergeCells(h1, 13, h2, 13); ws.getCell(h1, 13).value = 'Lugar donde se presto el servicio';
        s.dias.forEach(function (d, i) { ws.getCell(h2, 4 + i).value = DIAS[i] + ' ' + d.slice(8) + ((datos.festivos || {})[d] ? ' FEST.' : ''); });
        for (var rr = h1; rr <= h2; rr++) for (var cc = 1; cc <= 13; cc++) { var ce = ws.getCell(rr, cc); ce.font = { name: 'Times New Roman', size: 8, bold: true }; ce.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; ce.border = borde; }
        ws.getRow(h1).height = 19.5; ws.getRow(h2).height = 19.5;
        fila = h2 + 1;
        var primera = fila;
        s.filas.forEach(function (f, k) {
          ws.getCell(fila, 1).value = k + 1; ws.getCell(fila, 2).value = f.nombre; ws.getCell(fila, 3).value = Number(f.no) || f.no;
          f.horas.forEach(function (h, i) { if (h) ws.getCell(fila, 4 + i).value = h; });
          ws.getCell(fila, 11).value = { formula: 'SUM(D' + fila + ':J' + fila + ')', result: f.total };
          if (s.porEmpleado) { ws.getCell(fila, 12).value = f.motivo; ws.getCell(fila, 13).value = f.lugar; }
          for (var c = 1; c <= 13; c++) { var x = ws.getCell(fila, c); x.border = borde; x.font = fuente; x.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center', wrapText: c >= 12 }; }
          fila++;
        });
        var ultima = fila - 1;
        if (!s.porEmpleado) {
          if (ultima > primera) { ws.mergeCells(primera, 12, ultima, 12); ws.mergeCells(primera, 13, ultima, 13); }
          ws.getCell(primera, 12).value = s.motivo; ws.getCell(primera, 13).value = s.lugar;
          ws.getCell(primera, 13).font = { name: 'Times New Roman', size: 8 };
          ws.getCell(primera, 12).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          ws.getCell(primera, 13).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          var lineas = Math.ceil((s.lugar || '').length / 70);
          var alto = Math.max(15, Math.ceil(lineas * 11 / Math.max(1, ultima - primera + 1)));
          for (var q = primera; q <= ultima; q++) ws.getRow(q).height = alto;
        }
        ws.getCell(fila, 3).value = 'Horas:'; ws.getCell(fila, 3).font = { name: 'Times New Roman', size: 8, bold: true }; ws.getCell(fila, 3).alignment = { horizontal: 'right' };
        for (var dcol = 4; dcol <= 11; dcol++) {
          var letra = String.fromCharCode(64 + dcol);
          ws.getCell(fila, dcol).value = { formula: 'SUM(' + letra + primera + ':' + letra + ultima + ')', result: dcol < 11 ? s.totalesDia[dcol - 4] : s.total };
          ws.getCell(fila, dcol).font = { name: 'Times New Roman', size: 9, bold: true }; ws.getCell(fila, dcol).alignment = { horizontal: 'center' }; ws.getCell(fila, dcol).border = borde;
        }
        fila += 2;
        var f4 = datos.firmantes || [];
        var colF = [2, 3, 12, 13];
        f4.slice(0, 4).forEach(function (fi, i) {
          var col = colF[i];
          ws.getCell(fila, col).value = fi.etiqueta; ws.getCell(fila, col).font = { name: 'Times New Roman', size: 9, bold: true };
          ws.getCell(fila + 3, col).value = fi.nombre; ws.getCell(fila + 4, col).value = fi.puesto; if (fi.puesto2) ws.getCell(fila + 5, col).value = fi.puesto2;
          [fila, fila + 3, fila + 4, fila + 5].forEach(function (rw) { ws.getCell(rw, col).alignment = { horizontal: 'center' }; });
          ws.getCell(fila + 4, col).font = { name: 'Times New Roman', size: 9, bold: true };
        });
        if (f4[1]) { ws.mergeCells(fila + 3, 3, fila + 3, 11); ws.mergeCells(fila + 4, 3, fila + 4, 11); ws.mergeCells(fila, 3, fila, 11); }
        fila += 7;
        // Fotos de la semana en filas de 3
        var fs = (datos.fotos || []).filter(function (x) { return x.s === l && x.p === pp.clave && fotos[x.id]; }).sort(function (a, b) { return a.orden - b.orden; });
        var cols = [0, 5, 11];
        for (var k2 = 0; k2 < fs.length; k2 += 3) {
          fs.slice(k2, k2 + 3).forEach(function (ft, j) {
            var id = wb.addImage({ base64: fotos[ft.id], extension: 'jpeg' });
            ws.addImage(id, { tl: { col: cols[j] + 0.2, row: fila - 1 }, ext: { width: 230, height: 300 } });
          });
          fila += 17;
        }
        if (fs.length) fila += 1;
        fila += 2;
      });
      if (fila === 2) ws.getCell(2, 2).value = 'Sin registros en el periodo.';
    });
    return wb;
  }

  var api = { DIAS: DIAS, MESES: MESES, lunesDe: lunesDe, sumar: sumar, diasDe: diasDe, dmy: dmy, fechaLarga: fechaLarga, diaSem: diaSem, norm: norm, titulo: titulo,
    armarSemana: armarSemana, semanasDe: semanasDe, pdfFormatos: pdfFormatos, pdfHistorico: pdfHistorico, resumen: resumen, excel: excel,
    svgBarrasH: svgBarrasH, svgBarrasV: svgBarrasV, svgApiladas: svgApiladas, nombreMostrar: nombreMostrar, motivoPorDias: motivoPorDias, COLORES: COLORES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.Reportes = api;
})(typeof window !== 'undefined' ? window : this);
