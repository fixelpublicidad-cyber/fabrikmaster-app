import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

export default function App() {
  const [vistaTallerExclusiva, setVistaTallerExclusiva] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('cotizador');
  const [busquedaGlobal, setBusquedaGlobal] = useState('');

  // Datos formales del cliente y fiscales (CRM)
  const [empresa, setEmpresa] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [giro, setGiro] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');
  const [conFactura, setConFactura] = useState(true);

  // Lista de ítems en la solicitud
  const [itemsCotizacion, setItemsCotizacion] = useState([]);

  // Estados temporales para agregar un nuevo ítem de forma limpia
  const [nuevoMatItem, setNuevoMatItem] = useState('Trovicel 5 mm + Grafica Laminado PVC');
  const [nuevoAncho, setNuevoAncho] = useState('100');
  const [nuevoAlto, setNuevoAlto] = useState('50');
  const [nuevaCant, setNuevaCant] = useState('1');
  const [nuevaNota, setNuevaNota] = useState('');

  // Boceto general único para toda la orden
  const [bocetoGeneral, setBocetoGeneral] = useState('');

  const [abono, setAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('');
  const [operadorAsignado, setOperadorAsignado] = useState('Operador 1');

  // Filtros de fecha para el Historial
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Módulo de Finanzas / Caja (Ingresos y Egresos)
  const [transaccionesCaja, setTransaccionesCaja] = useState([]);
  const [tipoTransaccion, setTipoTransaccion] = useState('Egreso');
  const [montoTransaccion, setMontoTransaccion] = useState('');
  const [categoriaTransaccion, setCategoriaTransaccion] = useState('Materiales / Insumos');
  const [descripcionTransaccion, setDescripcionTransaccion] = useState('');

  // Precios dinámicos base
  const [preciosMateriales, setPreciosMateriales] = useState({
    'Trovicel 5 mm + Grafica Laminado PVC': 35000,
    'Trovicel 3 mm + Gráfica laminado PVC': 32000,
    'Acrílico 3 mm Transparente': 80000,
    'Acrílico 4 mm + Gráfica': 90000,
    'Trovicel 10 mm Corpóreo': 55000,
    'Trovicel 20 mm Corpóreo': 85000,
    'Panaflex FILM Backlight - Backlite': 16000,
  });

  const [nuevoMatNombre, setNuevoMatNombre] = useState('');
  const [nuevoMatPrecio, setNuevoMatPrecio] = useState('');
  
  // Inventario y Bodega
  const [inventario, setInventario] = useState([]);
  const [nuevoInvMaterial, setNuevoInvMaterial] = useState('');
  const [nuevoInvCategoria, setNuevoInvCategoria] = useState('Planchas / Soportes');
  const [nuevoInvStock, setNuevoInvStock] = useState('');
  const [nuevoInvUnidad, setNuevoInvUnidad] = useState('planchas');

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cotizaciones, setCotizaciones] = useState([]);

  const cargarDatos = async () => {
    const { data: dataCot } = await supabase.from('cotizaciones').select('*').order('created_at', { ascending: false });
    if (dataCot) setCotizaciones(dataCot);

    const { data: dataInv } = await supabase.from('inventario').select('*').order('categoria', { ascending: true });
    if (dataInv) setInventario(dataInv);

    const { data: dataPrecios } = await supabase.from('precios_materiales').select('*').order('nombre', { ascending: true });
    if (dataPrecios && dataPrecios.length > 0) {
      const mapaPrecios = {};
      dataPrecios.forEach(p => { mapaPrecios[p.nombre] = p.precio_m2; });
      setPreciosMateriales(mapaPrecios);
    }

    const { data: dataCaja } = await supabase.from('transacciones_caja').select('*').order('created_at', { ascending: false });
    if (dataCaja) setTransaccionesCaja(dataCaja);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vista') === 'taller') setVistaTallerExclusiva(true);
    cargarDatos();

    const canal = supabase
      .channel('cambios-taller')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'precios_materiales' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacciones_caja' }, () => cargarDatos())
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, []);

  const agregarItemALista = (e) => {
    e.preventDefault();
    const newItem = {
      id: Date.now(),
      materialSeleccionado: nuevoMatItem,
      ancho: nuevoAncho,
      alto: nuevoAlto,
      cantidad: nuevaCant,
      notasTecnicas: nuevaNota
    };
    setItemsCotizacion([...itemsCotizacion, newItem]);
    setNuevaNota('');
  };

  const eliminarItemFormulario = (id) => {
    setItemsCotizacion(itemsCotizacion.filter(item => item.id !== id));
  };

  const handlePasteBocetoGeneral = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onloadend = () => { setBocetoGeneral(reader.result); };
        reader.readAsDataURL(blob);
        e.preventDefault();
      }
    }
  };

  const calcularMetrosCuadrados = (item) => {
    const a = parseFloat(item.ancho) || 0;
    const h = parseFloat(item.alto) || 0;
    const cant = parseInt(item.cantidad) || 1;
    return ((a / 100) * (h / 100)) * cant;
  };

  const calcularTotalItem = (item) => {
    const m2 = calcularMetrosCuadrados(item);
    const precioM2 = preciosMateriales[item.materialSeleccionado] || 40000;
    return m2 * precioM2;
  };

  const calcularTotalesGlobales = () => {
    let netoGlobal = itemsCotizacion.reduce((acc, item) => acc + calcularTotalItem(item), 0);
    let ivaGlobal = conFactura ? Math.round(netoGlobal * 0.19) : 0;
    let totalGlobal = netoGlobal + ivaGlobal;
    return { netoGlobal, ivaGlobal, totalGlobal };
  };

  const { netoGlobal, ivaGlobal, totalGlobal } = calcularTotalesGlobales();

  const guardarCotizacionFormal = async (e) => {
    e.preventDefault();
    if (!empresa) {
      alert('Por favor complete el nombre de la empresa o cliente.');
      return;
    }
    if (itemsCotizacion.length === 0) {
      alert('Debe agregar al menos un producto a la solicitud.');
      return;
    }

    const abonoVal = parseFloat(abono) || 0;
    const nroCotizacion = cotizaciones.length + 5;

    const descripcionGeneral = itemsCotizacion.map((it, idx) => 
      `[Ít.${idx + 1}] ${it.materialSeleccionado} (${it.ancho}x${it.alto}cm) x${it.cantidad}`
    ).join(' | ');

    const notasUnificadas = itemsCotizacion.map((it, idx) => 
      it.notasTecnicas ? `Ít.${idx + 1}: ${it.notasTecnicas}` : ''
    ).filter(Boolean).join(' • ');

    setCargando(true);
    setMensaje('');

    const { error } = await supabase
      .from('cotizaciones')
      .insert([
        {
          cliente: empresa,
          rut: rut,
          direccion: direccion,
          giro: giro,
          contacto: contacto,
          telefono: telefonoWhatsApp,
          nro_cotizacion: nroCotizacion,
          material: `${itemsCotizacion.length} ítems en solicitud`,
          descripcion: descripcionGeneral,
          notas_tecnicas: notasUnificadas,
          items_json: itemsCotizacion,
          ancho: parseFloat(itemsCotizacion[0]?.ancho || 0),
          alto: parseFloat(itemsCotizacion[0]?.alto || 0),
          cantidad: itemsCotizacion.reduce((acc, it) => acc + (parseInt(it.cantidad) || 1), 0),
          valor_unitario: totalGlobal,
          neto: netoGlobal,
          iva: ivaGlobal,
          total: totalGlobal,
          extras: 0,
          abono: abonoVal,
          metodo_pago: metodoPago,
          costo_material: 0,
          margen_utilidad: 0,
          imagen_archivo: bocetoGeneral,
          con_factura: conFactura,
          fecha_entrega: fechaEntregaEstimada || null,
          operador: operadorAsignado,
          estado: 'Pendiente'
        },
      ]);

    setCargando(false);

    if (error) {
      setMensaje('Error al guardar: ' + error.message);
    } else {
      setMensaje(`¡Orden de Trabajo N° ${String(nroCotizacion).padStart(3, '0')} guardada con éxito!`);
      cargarDatos();
      setEmpresa(''); setRut(''); setDireccion(''); setGiro(''); setContacto('');
      setTelefonoWhatsApp(''); setAbono(''); setBocetoGeneral(''); setItemsCotizacion([]);
      setFechaEntregaEstimada(''); setConFactura(true);
    }
  };

  const guardarTransaccionCaja = async (e) => {
    e.preventDefault();
    if (!montoTransaccion || !descripcionTransaccion) return;
    const valNum = parseFloat(montoTransaccion) || 0;
    const { error } = await supabase.from('transacciones_caja').insert([
      { tipo: tipoTransaccion, monto: valNum, categoria: categoriaTransaccion, descripcion: descripcionTransaccion }
    ]);
    if (!error) {
      setMontoTransaccion('');
      setDescripcionTransaccion('');
      cargarDatos();
    }
  };

  const eliminarTransaccion = async (id) => {
    if (confirm('¿Eliminar este registro de caja?')) {
      await supabase.from('transacciones_caja').delete().eq('id', id);
      cargarDatos();
    }
  };

  const totalIngresosCaja = transaccionesCaja.filter(t => t.tipo === 'Ingreso').reduce((acc, t) => acc + Number(t.monto || 0), 0);
  const totalEgresosCaja = transaccionesCaja.filter(t => t.tipo === 'Egreso').reduce((acc, t) => acc + Number(t.monto || 0), 0);
  const balanceCaja = totalIngresosCaja - totalEgresosCaja;

  const cambiarEstado = async (id, estadoActual) => {
    const estadosPosibles = ['Pendiente', 'En Diseño', 'En Corte/Producción', 'Listo', 'Entregado'];
    const indiceActual = estadosPosibles.indexOf(estadoActual);
    const siguienteEstado = estadosPosibles[(indiceActual !== -1 ? indiceActual + 1 : 0) % estadosPosibles.length];
    const { error } = await supabase.from('cotizaciones').update({ estado: siguienteEstado }).eq('id', id);
    if (!error) cargarDatos();
  };

  const cambiarOperador = async (id, operadorActual) => {
    const nuevoOp = prompt('Asignar operador (Ej. Operador 1):', operadorActual);
    if (!nuevoOp) return;
    const { error } = await supabase.from('cotizaciones').update({ operador: nuevoOp }).eq('id', id);
    if (!error) cargarDatos();
  };

  const eliminarCotizacion = async (id) => {
    if (confirm('¿Estás seguro de eliminar esta orden?')) {
      const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
      if (!error) cargarDatos();
    }
  };

  const duplicarOrden = (item) => {
    setEmpresa(item.cliente || '');
    setRut(item.rut || '');
    setDireccion(item.direccion || '');
    setGiro(item.giro || '');
    setContacto(item.contacto || '');
    setTelefonoWhatsApp(item.telefono || '');
    if (item.items_json && item.items_json.length > 0) {
      setItemsCotizacion(item.items_json);
    }
    setBocetoGeneral(item.imagen_archivo || '');
    setOperadorAsignado(item.operador || 'Operador 1');
    setVistaActiva('cotizador');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generarPDFOrden = (item) => {
    const doc = new jsPDF();
    const nroStr = String(item.nro_cotizacion || 5).padStart(3, '0');
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(22);
    doc.text('FIXEL MANAGER', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Orden de Trabajo N° ${nroStr}`, 150, 22);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Cliente / Empresa: ${item.cliente}`, 14, 50);
    doc.text(`Giro: ${item.giro || '---'} | RUT: ${item.rut || '---'}`, 14, 58);
    doc.text(`Contacto / Tel: ${item.contacto || '---'} (${item.telefono || '---'})`, 14, 66);
    doc.text(`Fecha Entrega: ${item.fecha_entrega ? new Date(item.fecha_entrega).toLocaleDateString('es-CL') : 'Por definir'}`, 14, 74);
    doc.text(`Operador Asignado: ${item.operador || 'Operador 1'}`, 14, 82);

    doc.line(14, 88, 196, 88);

    doc.setFontSize(11);
    doc.text('Detalle de la Solicitud (Ítems):', 14, 96);

    let posY = 104;
    const listaItems = item.items_json || [];
    
    listaItems.forEach((it, idx) => {
      if (posY > 250) { doc.addPage(); posY = 20; }
      doc.text(`• [Ítem ${idx + 1}] ${it.materialSeleccionado}`, 14, posY);
      posY += 6;
      doc.text(`  Medidas: ${it.ancho} × ${it.alto} cm | Cantidad: ${it.cantidad || 1} un.`, 14, posY);
      posY += 6;
      if (it.notasTecnicas) {
        doc.setTextColor(220, 38, 38);
        doc.text(`  Nota Taller: ${it.notasTecnicas}`, 14, posY);
        doc.setTextColor(0, 0, 0);
        posY += 6;
      }
      posY += 2;
    });

    posY += 6;
    doc.text(`Estado actual: ${item.estado || 'Pendiente'}`, 14, posY);
    posY += 8;
    doc.text(`Total a Pagar: $${Number(item.total || 0).toLocaleString('es-CL')} CLP`, 14, posY);

    doc.save(`Orden_${nroStr}_${item.cliente}.pdf`);
  };

  const modificarNombreMaterial = async (nombreAntiguo) => {
    const nuevoNombre = prompt(`Nuevo nombre para "${nombreAntiguo}":`, nombreAntiguo);
    if (!nuevoNombre || nuevoNombre.trim() === '' || nuevoNombre === nombreAntiguo) return;
    const precioActual = preciosMateriales[nombreAntiguo];
    await supabase.from('precios_materiales').delete().eq('nombre', nombreAntiguo);
    await supabase.from('precios_materiales').insert([{ nombre: nuevoNombre.trim(), precio_m2: precioActual }]);
    cargarDatos();
  };

  const modificarPrecioMaterial = async (nombre) => {
    const nuevoPrecio = prompt(`Nuevo precio por m² para ${nombre}:`, preciosMateriales[nombre]);
    if (nuevoPrecio !== null && !isNaN(nuevoPrecio)) {
      const valNum = parseFloat(nuevoPrecio);
      const { error } = await supabase.from('precios_materiales').update({ precio_m2: valNum }).eq('nombre', nombre);
      if (error) await supabase.from('precios_materiales').insert([{ nombre: nombre, precio_m2: valNum }]);
      cargarDatos();
    }
  };

  const eliminarMaterialTarifa = async (nombre) => {
    if (confirm(`¿Eliminar "${nombre}" de las tarifas?`)) {
      await supabase.from('precios_materiales').delete().eq('nombre', nombre);
      cargarDatos();
    }
  };

  const agregarNuevoMaterialTarifa = async (e) => {
    e.preventDefault();
    if (!nuevoMatNombre || !nuevoMatPrecio) return;
    const valNum = parseFloat(nuevoMatPrecio) || 0;
    await supabase.from('precios_materiales').insert([{ nombre: nuevoMatNombre.trim(), precio_m2: valNum }]);
    setNuevoMatNombre(''); setNuevoMatPrecio('');
    cargarDatos();
  };

  // Funciones de Inventario
  const agregarNuevoInventario = async (e) => {
    e.preventDefault();
    if (!nuevoInvMaterial || !nuevoInvStock) return;
    const stockVal = parseFloat(nuevoInvStock) || 0;
    const { error } = await supabase.from('inventario').insert([
      { material: nuevoInvMaterial.trim(), categoria: nuevoInvCategoria, stock: stockVal, unidad: nuevoInvUnidad }
    ]);
    if (!error) {
      setNuevoInvMaterial('');
      setNuevoInvStock('');
      cargarDatos();
    }
  };

  const eliminarInventarioItem = async (id) => {
    if (confirm('¿Eliminar este ítem del inventario?')) {
      await supabase.from('inventario').delete().eq('id', id);
      cargarDatos();
    }
  };

  const cotizacionesFiltradas = cotizaciones.filter(c => {
    if (!busquedaGlobal) return true;
    const txt = busquedaGlobal.toLowerCase();
    return (c.cliente || '').toLowerCase().includes(txt) || String(c.nro_cotizacion || '').includes(txt);
  });

  const pendientesTrabajos = cotizacionesFiltradas.filter(c => c.estado === 'Pendiente');
  
  const trabajosHistorial = cotizacionesFiltradas.filter(c => {
    const esFinalizado = c.estado === 'Listo' || c.estado === 'Entregado';
    if (!esFinalizado) return false;
    const fechaRegistro = c.created_at ? c.created_at.substring(0, 10) : '';
    if (fechaDesde && fechaRegistro < fechaDesde) return false;
    if (fechaHasta && fechaRegistro > fechaHasta) return false;
    return true;
  });

  const clientesCRM = Array.from(new Set(cotizaciones.map(c => c.cliente))).map(nombreEmpresa => {
    const trabajosCliente = cotizaciones.filter(c => c.cliente === nombreEmpresa);
    return {
      empresa: nombreEmpresa,
      rut: trabajosCliente[0]?.rut || '---',
      giro: trabajosCliente[0]?.giro || '---',
      contacto: trabajosCliente[0]?.contacto || '---',
      cantidadTrabajos: trabajosCliente.length,
      totalGastado: trabajosCliente.reduce((acc, c) => acc + Number(c.total || 0), 0)
    };
  });

  const renderCardTrabajo = (item) => {
    const nroStr = String(item.nro_cotizacion || 5).padStart(3, '0');
    const estadoActual = item.estado || 'Pendiente';
    const totalTrabajo = Number(item.total || 0);
    const listaItems = item.items_json || [];

    return (
      <div key={item.id} style={{ backgroundColor: '#090d16', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>N° {nroStr}</span>
          <button onClick={() => cambiarEstado(item.id, estadoActual)} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>📍 {estadoActual} ➔</button>
        </div>
        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '1.1rem' }}>{item.cliente}</div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Giro: {item.giro || '---'} | Cont: {item.contacto || '---'}</div>
        
        {listaItems.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {listaItems.map((it, idx) => (
              <div key={idx} style={{ backgroundColor: '#131c2e', padding: '6px', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid #1e293b' }}>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{it.materialSeleccionado}</span>
                <div style={{ color: '#cbd5e1' }}>{it.ancho} × {it.alto} cm (Cant: {it.cantidad})</div>
                {it.notasTecnicas && <div style={{ color: '#fde68a', marginTop: '2px' }}>⚠️ {it.notasTecnicas}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{item.descripcion}</div>
        )}

        {item.imagen_archivo && (
          <div style={{ textAlign: 'center', backgroundColor: '#000', borderRadius: '6px', padding: '4px', border: '1px solid #334155' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>BOCETO GENERAL:</span>
            <img src={item.imagen_archivo} alt="Boceto" style={{ width: '100%', height: '110px', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#38bdf8', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '4px' }}>
          <span>👤 Operador: <b>{item.operador || 'Operador 1'}</b></span>
          <button onClick={() => cambiarOperador(item.id, item.operador)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 'bold' }}>Cambiar</button>
        </div>

        {item.fecha_entrega && <div style={{ color: '#f59e0b', fontSize: '0.75rem' }}>📅 Entrega: {new Date(item.fecha_entrega).toLocaleDateString('es-CL')}</div>}
        
        <div style={{ backgroundColor: '#131c2e', padding: '8px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontWeight: 'bold' }}>
          <span>Total:</span>
          <span>${totalTrabajo.toLocaleString('es-CL')} CLP</span>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', flexWrap: 'wrap' }}>
          <button onClick={() => generarPDFOrden(item)} style={{ flex: '1', backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>📥 PDF</button>
          <button onClick={() => duplicarOrden(item)} style={{ flex: '1', backgroundColor: '#334155', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>⚡ Duplicar</button>
          <button onClick={() => eliminarCotizacion(item.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>🗑️</button>
        </div>
      </div>
    );
  };

  // MODO TV TALLER
  if (vistaTallerExclusiva) {
    const ordenesTaller = cotizaciones.filter(c => c.estado === 'En Corte/Producción');
    return (
      <div style={{ backgroundColor: '#030712', minHeight: '100vh', padding: '2rem', color: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', padding: '1.5rem 2rem', borderRadius: '16px', border: '2px solid #1f2937', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, color: '#38bdf8', fontSize: '2.6rem', fontWeight: '900' }}>
              FIXEL <span style={{ color: '#f97316', fontSize: '1.6rem' }}>• PANTALLA DE TALLER EN VIVO (PRODUCCIÓN)</span>
            </h1>
            <p style={{ margin: '5px 0 0 0', color: '#9ca3af', fontSize: '1rem' }}>Mostrando trabajos activos en maquinaria y corte.</p>
          </div>
        </div>

        {ordenesTaller.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem', backgroundColor: '#111827', borderRadius: '16px', border: '1px solid #1f2937' }}>
            <h2 style={{ color: '#9ca3af' }}>No hay trabajos en proceso de corte o producción en este momento.</h2>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem' }}>
            {ordenesTaller.map(item => {
              const nroStr = String(item.nro_cotizacion || 5).padStart(3, '0');
              const listaItems = item.items_json || [];
              return (
                <div key={item.id} style={{ backgroundColor: '#111827', borderRadius: '20px', border: '2px solid #374151', padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937', paddingBottom: '1rem' }}>
                    <div>
                      <span style={{ color: '#f97316', fontWeight: '900', fontSize: '1.8rem' }}>N° {nroStr}</span>
                      <h2 style={{ margin: '4px 0 0 0', color: 'white', fontSize: '1.5rem' }}>{item.cliente}</h2>
                    </div>
                    <button onClick={() => cambiarEstado(item.id, item.estado || 'Pendiente')} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>📍 {item.estado || 'Pendiente'} ➔</button>
                  </div>

                  {listaItems.map((it, idx) => (
                    <div key={idx} style={{ backgroundColor: '#030712', padding: '1rem', borderRadius: '12px', border: '1px dashed #38bdf8' }}>
                      <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '1.1rem' }}>{it.materialSeleccionado}</div>
                      <div style={{ color: '#ef4444', fontSize: '2rem', fontWeight: '900' }}>
                        {it.ancho} × {it.alto} <span style={{ fontSize: '1.1rem' }}>cm</span>
                      </div>
                      <div style={{ color: '#e5e7eb', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '4px' }}>
                        Cant: {it.cantidad} un.
                      </div>
                      {it.notasTecnicas && (
                        <div style={{ backgroundColor: '#451a03', border: '1px solid #f59e0b', padding: '8px', borderRadius: '6px', color: '#fde68a', fontSize: '0.9rem', marginTop: '6px' }}>
                          <b>⚠️ NOTA TÉCNICA:</b> {it.notasTecnicas}
                        </div>
                      )}
                    </div>
                  ))}

                  {item.imagen_archivo && (
                    <div style={{ backgroundColor: '#000', padding: '6px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>BOCETO GENERAL:</span>
                      <img src={item.imagen_archivo} alt="Boceto Taller" style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '4px' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937', padding: '10px 14px', borderRadius: '10px' }}>
                    <span style={{ color: '#9ca3af' }}>Asignado a:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '1.1rem' }}>👤 {item.operador || 'Operador 1'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', fontFamily: 'sans-serif', padding: '2rem 1rem', color: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* ENCABEZADO Y NAVEGACIÓN COMPLETA */}
        <div style={{ backgroundColor: '#131c2e', padding: '1.5rem', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 12px 30px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '1.8rem', fontWeight: 'bold' }}>Fixel Manager</h2>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Portal de Control Administrativo del Taller</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#090d16', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <span>🔍</span>
              <input 
                type="text" 
                value={busquedaGlobal} 
                onChange={(e) => setBusquedaGlobal(e.target.value)} 
                placeholder="Buscar orden o empresa..." 
                style={{ backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <a href="?vista=taller" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#15803d', color: 'white', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid #22c55e' }}>
              📺 Pantalla Taller (Modo TV)
            </a>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', width: '100%', overflowX: 'auto', paddingBottom: '4px' }}>
            <div onClick={() => setVistaActiva('cotizador')} style={{ flex: '1 1 0px', minWidth: '110px', backgroundColor: vistaActiva === 'cotizador' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'cotizador' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>NUEVA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>1. Cotización</div>
            </div>
            <div onClick={() => setVistaActiva('pendientes')} style={{ flex: '1 1 0px', minWidth: '110px', backgroundColor: vistaActiva === 'pendientes' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'pendientes' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>ORDEN</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>2. Órdenes ({pendientesTrabajos.length})</div>
            </div>
            <div onClick={() => setVistaActiva('produccion')} style={{ flex: '1 1 0px', minWidth: '110px', backgroundColor: vistaActiva === 'produccion' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'produccion' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 'bold' }}>KANBAN</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>3. Taller ({cotizacionesFiltradas.length})</div>
            </div>
            <div onClick={() => setVistaActiva('historial')} style={{ flex: '1 1 0px', minWidth: '110px', backgroundColor: vistaActiva === 'historial' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'historial' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold' }}>HISTORIAL</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>4. Listos ({trabajosHistorial.length})</div>
            </div>
            <div onClick={() => setVistaActiva('caja')} style={{ flex: '1 1 0px', minWidth: '110px', backgroundColor: vistaActiva === 'caja' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'caja' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 'bold' }}>FINANZAS</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>5. Caja</div>
            </div>
            <div onClick={() => setVistaActiva('crm')} style={{ flex: '1 1 0px', minWidth: '110px', backgroundColor: vistaActiva === 'crm' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'crm' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold' }}>CLIENTES</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>6. CRM ({clientesCRM.length})</div>
            </div>
            <div onClick={() => setVistaActiva('inventario')} style={{ flex: '1 1 0px', minWidth: '110px', backgroundColor: vistaActiva === 'inventario' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'inventario' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 'bold' }}>BODEGA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>7. Inventario</div>
            </div>
            <div onClick={() => setVistaActiva('precios')} style={{ flex: '1 1 0px', minWidth: '110px', backgroundColor: vistaActiva === 'precios' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'precios' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 'bold' }}>TARIFAS</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>8. Precios</div>
            </div>
          </div>
        </div>

        {/* 1. COTIZADOR */}
        {vistaActiva === 'cotizador' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2.5rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', color: '#ffffff', margin: '0 0 0.5rem 0' }}>Nueva Cotización</h1>
              <p style={{ color: '#a1a1aa', fontSize: '0.95rem', margin: 0 }}>Rellena los datos del cliente y añade los ítems que requieras a la solicitud.</p>
            </div>

            <form onSubmit={guardarCotizacionFormal} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', backgroundColor: '#090d16', padding: '1.5rem', borderRadius: '12px', border: '1px solid #1e293b' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Empresa *</label>
                  <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required placeholder="Ej. maki sushi" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Giro</label>
                  <input type="text" value={giro} onChange={(e) => setGiro(e.target.value)} placeholder="Ej. restaurante" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>RUT</label>
                  <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="Ej. 76.xxx.xxx-x" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Contacto</label>
                  <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Ej. Ricardo" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Dirección</label>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección fiscal" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Teléfono WhatsApp</label>
                  <input type="text" value={telefonoWhatsApp} onChange={(e) => setTelefonoWhatsApp(e.target.value)} placeholder="Ej. +56 9 4818 7646" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#38bdf8', display: 'block' }}>📄 Régimen Fiscal / Facturación</label>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Selecciona si el trabajo requiere IVA o es una venta directa sin factura.</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setConFactura(true)} style={{ backgroundColor: conFactura ? '#0284c7' : '#1e293b', color: 'white', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    Con Factura (+19% IVA)
                  </button>
                  <button type="button" onClick={() => setConFactura(false)} style={{ backgroundColor: !conFactura ? '#f59e0b' : '#1e293b', color: !conFactura ? '#090d16' : 'white', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    Sin Factura (Venta Directa)
                  </button>
                </div>
              </div>

              <div style={{ backgroundColor: '#090d16', padding: '1.5rem', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.8rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', letterSpacing: '0.5px' }}>TU SOLICITUD</h3>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>GUARDADO · LO RETOMAS CUANDO KIERAS</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', padding: '0.5rem 0', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  <div>PRODUCTO</div>
                  <div style={{ textAlign: 'center' }}>CANTIDAD</div>
                  <div style={{ textAlign: 'right' }}>SUBTOTAL</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {itemsCotizacion.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontStyle: 'italic' }}>
                      No hay productos en la solicitud. Agrega ítems usando el formulario de abajo.
                    </div>
                  ) : (
                    itemsCotizacion.map((item) => {
                      const m2Total = calcularMetrosCuadrados(item);
                      const subtotalItem = calcularTotalItem(item);

                      return (
                        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', padding: '1rem 0', borderBottom: '1px solid #1e293b', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '1.05rem', marginBottom: '2px' }}>
                              {item.materialSeleccionado}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                              {item.ancho} × {item.alto} cm {item.notasTecnicas && <span style={{ color: '#fde68a' }}>({item.notasTecnicas})</span>}
                            </div>
                          </div>

                          <div style={{ textAlign: 'center', color: '#f8fafc', fontSize: '1rem', fontWeight: '500' }}>
                            {m2Total.toFixed(3).replace('.', ',')} m²
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 'bold' }}>
                              ${Math.round(subtotalItem).toLocaleString('es-CL')}
                            </span>
                            <button type="button" onClick={() => eliminarItemFormulario(item.id)} style={{ backgroundColor: '#1e293b', color: '#f87171', border: '1px solid #334155', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                              Quitar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ backgroundColor: '#131c2e', padding: '1rem', borderRadius: '10px', border: '1px dashed #334155', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <span style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 'bold' }}>+ Agregar nuevo producto a la tabla:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem', alignItems: 'center' }}>
                    <select value={nuevoMatItem} onChange={(e) => setNuevoMatItem(e.target.value)} style={{ padding: '8px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}>
                      {Object.keys(preciosMateriales).map((mat) => (
                        <option key={mat} value={mat}>{mat}</option>
                      ))}
                    </select>
                    <input type="number" value={nuevoAncho} onChange={(e) => setNuevoAncho(e.target.value)} placeholder="Ancho cm" style={{ padding: '8px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                    <input type="number" value={nuevoAlto} onChange={(e) => setNuevoAlto(e.target.value)} placeholder="Alto cm" style={{ padding: '8px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                    <input type="number" min="1" value={nuevaCant} onChange={(e) => setNuevaCant(e.target.value)} placeholder="Cant" style={{ padding: '8px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <input type="text" value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} placeholder="⚠️ Nota técnica opcional (ej. corte especial)..." style={{ flex: 1, padding: '8px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                    <button type="button" onClick={agregarItemALista} style={{ backgroundColor: '#f97316', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Añadir a la Tabla
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', paddingTop: '1rem', borderTop: '2px solid #1e293b', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                  <div style={{ color: '#94a3b8' }}>Neto <span style={{ color: 'white', fontWeight: 'bold', marginLeft: '10px' }}>${Math.round(netoGlobal).toLocaleString('es-CL')}</span></div>
                  <div style={{ color: '#94a3b8' }}>{conFactura ? 'IVA 19%' : 'Sin Factura'} <span style={{ color: 'white', fontWeight: 'bold', marginLeft: '10px' }}>${Math.round(ivaGlobal).toLocaleString('es-CL')}</span></div>
                  <div style={{ color: '#f59e0b', fontSize: '1.3rem', fontWeight: 'bold', marginTop: '4px' }}>Total referencial <span style={{ color: '#38bdf8', marginLeft: '10px' }}>${Math.round(totalGlobal).toLocaleString('es-CL')}</span></div>
                </div>

              </div>

              <div style={{ backgroundColor: '#090d16', border: '2px dashed #334155', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', outline: 'none' }} tabIndex={0} onPaste={handlePasteBocetoGeneral}>
                <span style={{ color: '#38bdf8', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>🖼️ Boceto o Imagen General de la Orden (Haz clic aquí y presiona <b>Ctrl + V</b> para pegar)</span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '10px' }}>Adjunta una sola imagen de referencia para toda la solicitud.</span>
                {bocetoGeneral ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <img src={bocetoGeneral} alt="Boceto General" style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '6px', border: '1px solid #38bdf8' }} />
                    <button type="button" onClick={() => setBocetoGeneral('')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Quitar Boceto General</button>
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', padding: '15px' }}>Ningún boceto pegado aún</div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '12px', border: '1px solid #1e293b' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '0.4rem' }}>Abono Inicial ($)</label>
                  <input type="number" value={abono} onChange={(e) => setAbono(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#38bdf8', display: 'block', marginBottom: '0.4rem' }}>Método de Pago</label>
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="WebPay">WebPay</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'block', marginBottom: '0.4rem' }}>Fecha de Entrega</label>
                  <input type="date" value={fechaEntregaEstimada} onChange={(e) => setFechaEntregaEstimada(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a855f7', display: 'block', marginBottom: '0.4rem' }}>Operador Responsable</label>
                  <input type="text" value={operadorAsignado} onChange={(e) => setOperadorAsignado(e.target.value)} placeholder="Operador 1" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                </div>
              </div>

              <button type="submit" disabled={cargando} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', width: 'fit-content' }}>
                {cargando ? 'Guardando...' : 'Guardar Orden y Registrar en Base de Clientes'}
              </button>
            </form>

            {mensaje && <p style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '0.9rem', color: mensaje.includes('éxito') ? '#4ade80' : '#f87171' }}>{mensaje}</p>}
          </div>
        )}

        {/* PESTAÑAS RESTANTES */}
        {vistaActiva === 'pendientes' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#f59e0b' }}>📋 Órdenes de Trabajo Pendientes</h3>
            {pendientesTrabajos.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No hay órdenes pendientes.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>{pendientesTrabajos.map(item => renderCardTrabajo(item))}</div>}
          </div>
        )}

        {vistaActiva === 'produccion' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8' }}>🛠️ Tablero Taller y Kanban ({cotizacionesFiltradas.length})</h3>
            {cotizacionesFiltradas.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No hay trabajos en el taller.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>{cotizacionesFiltradas.map(item => renderCardTrabajo(item))}</div>}
          </div>
        )}

        {vistaActiva === 'historial' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#38bdf8' }}>📦 Historial de Trabajos Listos y Entregados ({trabajosHistorial.length})</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', backgroundColor: '#090d16', padding: '1rem', borderRadius: '8px' }}>
              <div><label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Desde</label><input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ padding: '6px', background: '#131c2e', color: 'white', border: '1px solid #334155', borderRadius: '4px' }} /></div>
              <div><label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Hasta</label><input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ padding: '6px', background: '#131c2e', color: 'white', border: '1px solid #334155', borderRadius: '4px' }} /></div>
            </div>
            {trabajosHistorial.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No hay trabajos en el historial.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>{trabajosHistorial.map(item => renderCardTrabajo(item))}</div>}
          </div>
        )}

        {vistaActiva === 'caja' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#4ade80' }}>💰 Control de Caja: Ingresos y Egresos del Taller</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Ingresos</span>
                <div style={{ fontSize: '1.4rem', color: '#4ade80', fontWeight: 'bold', marginTop: '4px' }}>${totalIngresosCaja.toLocaleString('es-CL')} CLP</div>
              </div>
              <div style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Egresos (Gastos)</span>
                <div style={{ fontSize: '1.4rem', color: '#ef4444', fontWeight: 'bold', marginTop: '4px' }}>${totalEgresosCaja.toLocaleString('es-CL')} CLP</div>
              </div>
              <div style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Balance Neto Caja</span>
                <div style={{ fontSize: '1.4rem', color: balanceCaja >= 0 ? '#38bdf8' : '#f87171', fontWeight: 'bold', marginTop: '4px' }}>${balanceCaja.toLocaleString('es-CL')} CLP</div>
              </div>
            </div>

            <form onSubmit={guardarTransaccionCaja} style={{ display: 'flex', gap: '1rem', backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', flexWrap: 'wrap', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Tipo</label>
                <select value={tipoTransaccion} onChange={(e) => setTipoTransaccion(e.target.value)} style={{ padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontWeight: 'bold' }}>
                  <option value="Egreso">Egreso (Gasto)</option>
                  <option value="Ingreso">Ingreso</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Categoría</label>
                <select value={categoriaTransaccion} onChange={(e) => setCategoriaTransaccion(e.target.value)} style={{ padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}>
                  <option value="Materiales / Insumos">Materiales / Insumos</option>
                  <option value="Herramientas / Maquinaria">Herramientas / Maquinaria</option>
                  <option value="Arriendo / Servicios Básicos">Arriendo / Servicios</option>
                  <option value="Sueldos / Operadores">Sueldos / Operadores</option>
                  <option value="Otros Gastos">Otros Gastos</option>
                </select>
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Monto ($)</label>
                <input type="number" value={montoTransaccion} onChange={(e) => setMontoTransaccion(e.target.value)} required placeholder="Ej. 45000" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              </div>
              <div style={{ flex: '2 1 200px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Descripción / Detalle</label>
                <input type="text" value={descripcionTransaccion} onChange={(e) => setDescripcionTransaccion(e.target.value)} required placeholder="Ej. Compra planchas trovicel proveedor" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              </div>
              <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '41px' }}>Registrar</button>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}>
                  <th style={{ padding: '12px' }}>Tipo</th>
                  <th style={{ padding: '12px' }}>Categoría</th>
                  <th style={{ padding: '12px' }}>Descripción</th>
                  <th style={{ padding: '12px' }}>Monto</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {transaccionesCaja.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No hay transacciones registradas en caja.</td></tr>
                ) : (
                  transaccionesCaja.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: t.tipo === 'Ingreso' ? '#4ade80' : '#ef4444' }}>{t.tipo}</td>
                      <td style={{ padding: '14px', color: 'white' }}>{t.categoria}</td>
                      <td style={{ padding: '14px', color: '#cbd5e1' }}>{t.descripcion}</td>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: t.tipo === 'Ingreso' ? '#4ade80' : '#ef4444' }}>${Number(t.monto || 0).toLocaleString('es-CL')}</td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button onClick={() => eliminarTransaccion(t.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {vistaActiva === 'crm' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8' }}>👥 Directorio de Clientes (CRM)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead><tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}><th style={{ padding: '10px' }}>Empresa</th><th style={{ padding: '10px' }}>Giro</th><th style={{ padding: '10px' }}>RUT</th><th style={{ padding: '10px' }}>Contacto</th><th style={{ padding: '10px' }}>Trabajos</th><th style={{ padding: '10px' }}>Total Gastado</th></tr></thead>
              <tbody>{clientesCRM.map((cli, idx) => (<tr key={idx} style={{ borderBottom: '1px solid #334155' }}><td style={{ padding: '12px', fontWeight: 'bold', color: 'white' }}>{cli.empresa}</td><td style={{ padding: '12px' }}>{cli.giro}</td><td style={{ padding: '12px' }}>{cli.rut}</td><td style={{ padding: '12px' }}>{cli.contacto}</td><td style={{ padding: '12px' }}>{cli.cantidadTrabajos}</td><td style={{ padding: '12px', color: '#4ade80', fontWeight: 'bold' }}>${cli.totalGastado.toLocaleString('es-CL')}</td></tr>))}</tbody>
            </table>
          </div>
        )}

        {/* 7. INVENTARIO Y BODEGA CON ALERTA DE STOCK BAJO */}
        {vistaActiva === 'inventario' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#f97316' }}>📦 Inventario y Bodega del Taller</h3>

            <form onSubmit={agregarNuevoInventario} style={{ display: 'flex', gap: '1rem', backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', flexWrap: 'wrap', alignItems: 'end' }}>
              <div style={{ flex: '2 1 200px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Material / Insumo *</label>
                <input type="text" value={nuevoInvMaterial} onChange={(e) => setNuevoInvMaterial(e.target.value)} required placeholder="Ej. Trovicel 5mm" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Categoría</label>
                <select value={nuevoInvCategoria} onChange={(e) => setNuevoInvCategoria(e.target.value)} style={{ padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}>
                  <option value="Planchas / Soportes">Planchas / Soportes</option>
                  <option value="Vinilos / Adhesivos">Vinilos / Adhesivos</option>
                  <option value="Iluminación / LEDs">Iluminación / LEDs</option>
                  <option value="Tintas / Insumos">Tintas / Insumos</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div style={{ flex: '1 1 100px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Stock *</label>
                <input type="number" step="any" value={nuevoInvStock} onChange={(e) => setNuevoInvStock(e.target.value)} required placeholder="10" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Unidad</label>
                <input type="text" value={nuevoInvUnidad} onChange={(e) => setNuevoInvUnidad(e.target.value)} placeholder="planchas / metros" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              </div>
              <button type="submit" style={{ backgroundColor: '#f97316', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '41px' }}>Registrar</button>
            </form>

            {inventario.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Sin registros de inventario actualmente.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}>
                    <th style={{ padding: '12px' }}>Material / Insumo</th>
                    <th style={{ padding: '12px' }}>Categoría</th>
                    <th style={{ padding: '12px' }}>Stock Actual</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.map(inv => {
                    const esStockBajo = Number(inv.stock || 0) <= 2;
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: esStockBajo ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                        <td style={{ padding: '14px', fontWeight: 'bold', color: 'white' }}>
                          {inv.material}
                          {esStockBajo && (
                            <span style={{ marginLeft: '10px', backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ef4444' }}>
                              ⚠️ Stock Crítico
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px', color: '#cbd5e1' }}>{inv.categoria}</td>
                        <td style={{ padding: '14px', color: esStockBajo ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
                          {inv.stock} {inv.unidad}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <button onClick={() => eliminarInventarioItem(inv.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️ Eliminar</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {vistaActiva === 'precios' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#a855f7' }}>💲 Gestión de Precios y Tarifas por m²</h3>
            <form onSubmit={agregarNuevoMaterialTarifa} style={{ display: 'flex', gap: '1rem', backgroundColor: '#090d16', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', flexWrap: 'wrap', alignItems: 'end' }}>
              <div style={{ flex: '2 1 200px' }}><label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nombre</label><input type="text" value={nuevoMatNombre} onChange={(e) => setNuevoMatNombre(e.target.value)} required placeholder="Ej. Trovicel 20mm" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} /></div>
              <div style={{ flex: '1 1 120px' }}><label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Precio m² ($)</label><input type="number" value={nuevoMatPrecio} onChange={(e) => setNuevoMatPrecio(e.target.value)} required placeholder="95000" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} /></div>
              <button type="submit" style={{ backgroundColor: '#a855f7', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '41px' }}>Agregar</button>
            </form>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead><tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}><th style={{ padding: '12px' }}>Material</th><th style={{ padding: '12px' }}>Precio m²</th><th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th></tr></thead>
              <tbody>
                {Object.keys(preciosMateriales).map(mat => (
                  <tr key={mat} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px', fontWeight: 'bold', color: 'white' }}>{mat}</td>
                    <td style={{ padding: '14px', color: '#4ade80', fontWeight: 'bold' }}>${(preciosMateriales[mat] || 0).toLocaleString('es-CL')}</td>
                    <td style={{ padding: '14px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => modificarNombreMaterial(mat)} style={{ backgroundColor: '#334155', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>✏️</button>
                      <button onClick={() => modificarPrecioMaterial(mat)} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>💲</button>
                      <button onClick={() => eliminarMaterialTarifa(mat)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}