import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

export default function App() {
  const [vistaTallerExclusiva, setVistaTallerExclusiva] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('cotizador');

  // Buscador global
  const [busquedaGlobal, setBusquedaGlobal] = useState('');

  // Datos formales del cliente y fiscales
  const [empresa, setEmpresa] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [giro, setGiro] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');
  const [conFactura, setConFactura] = useState(true);

  // Detalles de la Cotización Personalizada
  const [formaLetrero, setFormaLetrero] = useState('No requiere / Estándar');
  const [materialSeleccionado, setMaterialSeleccionado] = useState('Trovicel 3 mm + Gráfica laminado PVC');
  const [ancho, setAncho] = useState('120');
  const [alto, setAlto] = useState('80');
  const [cantidad, setCantidad] = useState('1');
  const [descripcion, setDescripcion] = useState('');
  
  // Notas técnicas especiales para el taller
  const [notasTecnicas, setNotasTecnicas] = useState('');

  // Neón LED 1ra Generación y Acabados Variables
  const [llevaNeon1Gen, setLlevaNeon1Gen] = useState(true);
  const [metrosNeon, setMetrosNeon] = useState('6');
  const [precioManualTotal, setPrecioManualTotal] = useState('');
  const [incluirBastidor, setIncluirBastidor] = useState(false);
  const [incluirInstalacion, setIncluirInstalacion] = useState(false);
  const [costoInstalacion, setCostoInstalacion] = useState('30000');

  const [imagenArchivo, setImagenArchivo] = useState('');
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('');
  const [operadorAsignado, setOperadorAsignado] = useState('Operador 1');

  // Filtros de fecha para el Historial
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Precios dinámicos base
  const [preciosMateriales, setPreciosMateriales] = useState({
    'Acrílico 3 mm Transparente': 80000,
    'Acrílico 4 mm + Gráfica': 90000,
    'Trovicel 3 mm + Gráfica laminado PVC': 32000,
    'Trovicel 5 mm + Gráfica Laminado PVC': 35000,
    'Trovicel 10 mm Corpóreo': 55000,
    'Trovicel 20 mm Corpóreo': 85000,
    'Letrero Circular (Especial)': 120000,
  });

  const [nuevoMatNombre, setNuevoMatNombre] = useState('');
  const [nuevoMatPrecio, setNuevoMatPrecio] = useState('');

  const [abono, setAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  
  // Inventario
  const [inventario, setInventario] = useState([]);
  const [nuevoMaterialCategoria, setNuevoMaterialCategoria] = useState('Neón LED Flex');
  const [nuevoMaterialNombre, setNuevoMaterialNombre] = useState('');
  const [nuevoMaterialColor, setNuevoMaterialColor] = useState('');
  const [nuevoMaterialEspesor, setNuevoMaterialEspesor] = useState('3mm');
  const [nuevoMaterialStock, setNuevoMaterialStock] = useState('');

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
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, []);

  useEffect(() => {
    const handleGlobalPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onloadend = () => setImagenArchivo(reader.result);
          reader.readAsDataURL(blob);
          break;
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const procesarArchivo = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setImagenArchivo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImagenChange = (e) => {
    if (e.target.files && e.target.files[0]) procesarArchivo(e.target.files[0]);
  };

  const calcularValores = () => {
    const a = parseFloat(ancho) || 0;
    const h = parseFloat(alto) || 0;
    const cant = parseInt(cantidad) || 1;
    const m2 = (a / 100) * (h / 100);
    const precioM2 = preciosMateriales[materialSeleccionado] || 40000;
    
    let subtotalMaterial = m2 * precioM2;
    let costoNeon = llevaNeon1Gen ? (parseFloat(metrosNeon) || 0) * 8000 : 0;
    let costoBastidor = incluirBastidor ? (((a + h) * 2) / 100) * 8000 : 0;
    let costoInst = incluirInstalacion ? (parseFloat(costoInstalacion) || 0) : 0;

    let calculoAutomatico = ((subtotalMaterial + costoNeon + costoBastidor) * cant) + costoInst;

    const netoFinal = precioManualTotal !== '' ? (parseFloat(precioManualTotal) || 0) : calculoAutomatico;
    
    const iva = conFactura ? Math.round(netoFinal * 0.19) : 0;
    const totalConIva = netoFinal + iva;
    const valorUnitario = Math.round(totalConIva / cant);

    return { valorUnitario, netoFinal, iva, totalConIva };
  };

  const { netoFinal, iva, totalConIva } = calcularValores();

  const guardarCotizacionFormal = async (e) => {
    e.preventDefault();
    if (!ancho || !alto || !empresa) {
      alert('Por favor complete al menos la Empresa, Ancho y Alto.');
      return;
    }

    const abonoVal = parseFloat(abono) || 0;
    const nroCotizacion = cotizaciones.length + 5;

    const resumenAcabados = [
      formaLetrero !== 'No requiere / Estándar' ? `Forma: ${formaLetrero}` : '',
      llevaNeon1Gen ? `Neón 1ra Gen (${metrosNeon}m)` : 'Sin Neón',
      incluirBastidor ? 'Bastidor Metálico' : '',
      incluirInstalacion ? 'Con Instalación' : ''
    ].filter(Boolean).join(' • ');

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
          material: materialSeleccionado,
          descripcion: `${resumenAcabados} - Medidas: ${ancho}x${alto}cm - Detalle: ${descripcion || 'Personalizado'}`,
          notas_tecnicas: notasTecnicas,
          ancho: parseFloat(ancho),
          alto: parseFloat(alto),
          cantidad: parseInt(cantidad),
          valor_unitario: Math.round(totalConIva / (parseInt(cantidad) || 1)),
          neto: netoFinal,
          iva: iva,
          total: totalConIva,
          extras: 0,
          abono: abonoVal,
          metodo_pago: metodoPago,
          costo_material: 0,
          margen_utilidad: 0,
          imagen_archivo: imagenArchivo,
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
      setTelefonoWhatsApp(''); setDescripcion(''); setNotasTecnicas(''); setAbono('');
      setPrecioManualTotal(''); setFormaLetrero('No requiere / Estándar');
      setFechaEntregaEstimada(''); setImagenArchivo('');
      setOperadorAsignado('Operador 1'); setConFactura(true);
    }
  };

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
    setMaterialSeleccionado(item.material || Object.keys(preciosMateriales)[0]);
    setAncho(String(item.ancho || 120));
    setAlto(String(item.alto || 80));
    setCantidad(String(item.cantidad || 1));
    setDescripcion(item.descripcion || '');
    setNotasTecnicas(item.notas_tecnicas || '');
    setPrecioManualTotal(String(item.neto || ''));
    setImagenArchivo(item.imagen_archivo || '');
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
    doc.text(`Cliente: ${item.cliente}`, 14, 52);
    doc.text(`RUT: ${item.rut || '---'}`, 14, 60);
    doc.text(`Contacto / Tel: ${item.contacto || item.telefono || '---'}`, 14, 68);
    doc.text(`Fecha Entrega: ${item.fecha_entrega ? new Date(item.fecha_entrega).toLocaleDateString('es-CL') : 'Por definir'}`, 14, 76);
    doc.text(`Operador Asignado: ${item.operador || 'Operador 1'}`, 14, 84);

    doc.line(14, 92, 196, 92);

    doc.setFontSize(11);
    doc.text(`Descripción: ${item.descripcion}`, 14, 102);
    doc.text(`Dimensiones: ${item.ancho} x ${item.alto} cm (${item.cantidad || 1} un.)`, 14, 112);
    
    if (item.notas_tecnicas) {
      doc.setTextColor(220, 38, 38);
      doc.text(`NOTAS TÉCNICAS: ${item.notas_tecnicas}`, 14, 122);
      doc.setTextColor(0, 0, 0);
      doc.text(`Estado actual: ${item.estado || 'Pendiente'}`, 14, 132);
      doc.text(`Total a Pagar: $${Number(item.total || 0).toLocaleString('es-CL')} CLP`, 14, 142);
    } else {
      doc.text(`Estado actual: ${item.estado || 'Pendiente'}`, 14, 122);
      doc.text(`Total a Pagar: $${Number(item.total || 0).toLocaleString('es-CL')} CLP`, 14, 132);
    }

    if (item.imagen_archivo) {
      try {
        doc.addImage(item.imagen_archivo, 'JPEG', 14, 150, 80, 50);
      } catch (e) {
        // Ignorar error de imagen
      }
    }

    doc.save(`Orden_${nroStr}_${item.cliente}.pdf`);
  };

  // Gestión de tarifas
  const modificarNombreMaterial = async (nombreAntiguo) => {
    const nuevoNombre = prompt(`Ingrese el nuevo nombre para "${nombreAntiguo}":`, nombreAntiguo);
    if (!nuevoNombre || nuevoNombre.trim() === '' || nuevoNombre === nombreAntiguo) return;

    const precioActual = preciosMateriales[nombreAntiguo];
    await supabase.from('precios_materiales').delete().eq('nombre', nombreAntiguo);
    await supabase.from('precios_materiales').insert([{ nombre: nuevoNombre.trim(), precio_m2: precioActual }]);
    cargarDatos();
  };

  const modificarPrecioMaterial = async (nombre) => {
    const nuevoPrecio = prompt(`Ingrese el nuevo precio por m² para ${nombre}:`, preciosMateriales[nombre]);
    if (nuevoPrecio !== null && !isNaN(nuevoPrecio)) {
      const valNum = parseFloat(nuevoPrecio);
      const { error } = await supabase.from('precios_materiales').update({ precio_m2: valNum }).eq('nombre', nombre);
      if (error) {
        await supabase.from('precios_materiales').insert([{ nombre: nombre, precio_m2: valNum }]);
      }
      cargarDatos();
    }
  };

  const eliminarMaterialTarifa = async (nombre) => {
    if (confirm(`¿Estás seguro de eliminar "${nombre}" de la lista de tarifas?`)) {
      await supabase.from('precios_materiales').delete().eq('nombre', nombre);
      cargarDatos();
    }
  };

  const agregarNuevoMaterialTarifa = async (e) => {
    e.preventDefault();
    if (!nuevoMatNombre || !nuevoMatPrecio) return;
    const valNum = parseFloat(nuevoMatPrecio) || 0;

    await supabase.from('precios_materiales').insert([{ nombre: nuevoMatNombre.trim(), precio_m2: valNum }]);
    setNuevoMatNombre('');
    setNuevoMatPrecio('');
    cargarDatos();
  };

  // Filtrado
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

  const totalVendidoHistorial = trabajosHistorial.reduce((acc, c) => acc + Number(c.total || 0), 0);
  
  const clientesCRM = Array.from(new Set(cotizaciones.map(c => c.cliente))).map(nombreEmpresa => {
    const trabajosCliente = cotizaciones.filter(c => c.cliente === nombreEmpresa);
    return {
      empresa: nombreEmpresa,
      rut: trabajosCliente[0]?.rut || '---',
      giro: trabajosCliente[0]?.giro || '---',
      contacto: trabajosCliente[0]?.contacto || trabajosCliente[0]?.telefono || '---',
      cantidadTrabajos: trabajosCliente.length,
      totalGastado: trabajosCliente.reduce((acc, c) => acc + Number(c.total || 0), 0)
    };
  });

  const categoriasOrden = ['Neón LED Flex', 'Planchas de Acrílico', 'Planchas de Trovicel', 'Vinilos y Impresión', 'General'];
  const inventarioAgrupado = categoriasOrden.reduce((acc, cat) => {
    acc[cat] = inventario.filter(item => (item.categoria || 'General') === cat);
    return acc;
  }, {});

  const renderCardTrabajo = (item) => {
    const nroStr = String(item.nro_cotizacion || 5).padStart(3, '0');
    const estadoActual = item.estado || 'Pendiente';
    const totalTrabajo = Number(item.total || 0);

    return (
      <div key={item.id} style={{ backgroundColor: '#090d16', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>N° {nroStr}</span>
          <button onClick={() => cambiarEstado(item.id, estadoActual)} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>📍 {estadoActual} ➔</button>
        </div>
        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '1.1rem' }}>{item.cliente}</div>
        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{item.descripcion}</div>
        
        {item.notas_tecnicas && (
          <div style={{ backgroundColor: '#451a03', border: '1px solid #f59e0b', padding: '6px 8px', borderRadius: '6px', color: '#fde68a', fontSize: '0.8rem' }}>
            <b>⚠️ Nota Taller:</b> {item.notas_tecnicas}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#38bdf8', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '4px' }}>
          <span>👤 Operador: <b>{item.operador || 'Operador 1'}</b></span>
          <button onClick={() => cambiarOperador(item.id, item.operador)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 'bold' }}>Cambiar</button>
        </div>

        {item.fecha_entrega && <div style={{ color: '#f59e0b', fontSize: '0.75rem' }}>📅 Entrega: {new Date(item.fecha_entrega).toLocaleDateString('es-CL')}</div>}
        
        {item.imagen_archivo ? (
          <div style={{ textAlign: 'center', backgroundColor: '#000', borderRadius: '6px', padding: '4px', border: '1px solid #334155' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>BOCETO / DISEÑO:</span>
            <img src={item.imagen_archivo} alt="Boceto" style={{ width: '100%', height: '130px', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center' }}>Sin boceto adjunto</div>
        )}
        
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
            <p style={{ margin: '5px 0 0 0', color: '#9ca3af', fontSize: '1rem' }}>Mostrando únicamente trabajos activos en maquinaria y corte.</p>
          </div>
          <div style={{ backgroundColor: '#064e3b', color: '#34d399', padding: '10px 20px', borderRadius: '9999px', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
            CONECTADO EN TIEMPO REAL
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
              return (
                <div key={item.id} style={{ backgroundColor: '#111827', borderRadius: '20px', border: '2px solid #374151', padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937', paddingBottom: '1rem' }}>
                    <div>
                      <span style={{ color: '#f97316', fontWeight: '900', fontSize: '1.8rem' }}>N° {nroStr}</span>
                      <h2 style={{ margin: '4px 0 0 0', color: 'white', fontSize: '1.5rem' }}>{item.cliente}</h2>
                    </div>
                    <button
                      onClick={() => cambiarEstado(item.id, item.estado || 'Pendiente')}
                      style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      📍 {item.estado || 'Pendiente'} ➔
                    </button>
                  </div>

                  <div style={{ backgroundColor: '#030712', padding: '1.2rem', borderRadius: '12px', border: '1px dashed #38bdf8', textAlign: 'center' }}>
                    <div style={{ color: '#ef4444', fontSize: '2.5rem', fontWeight: '900' }}>
                      {item.ancho || 0} x {item.alto || 0} <span style={{ fontSize: '1.2rem' }}>cm</span>
                    </div>
                    <div style={{ color: '#e5e7eb', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '4px' }}>
                      {item.cantidad || 1} un. — {item.material}
                    </div>
                  </div>

                  <div style={{ color: '#d1d5db', fontSize: '1rem', backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px' }}>
                    <b>Detalle:</b> {item.descripcion}
                  </div>

                  {item.notas_tecnicas && (
                    <div style={{ backgroundColor: '#451a03', border: '1px solid #f59e0b', padding: '10px', borderRadius: '8px', color: '#fde68a', fontSize: '0.95rem' }}>
                      <b>⚠️ NOTA TÉCNICA TALLER:</b> {item.notas_tecnicas}
                    </div>
                  )}

                  {item.imagen_archivo && (
                    <div style={{ textAlign: 'center', backgroundColor: '#000', borderRadius: '12px', padding: '10px', border: '1px solid #374151' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>BOCETO / PREVIA DE DISEÑO:</span>
                      <img src={item.imagen_archivo} alt="Boceto Taller" style={{ width: '100%', height: '220px', objectFit: 'contain', borderRadius: '8px' }} />
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
              {busquedaGlobal && (
                <button onClick={() => setBusquedaGlobal('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              )}
            </div>

            <a 
              href="?vista=taller" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ backgroundColor: '#15803d', color: 'white', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid #22c55e' }}
            >
              📺 Abrir Pantalla de Taller (Modo TV)
            </a>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', width: '100%', overflowX: 'auto', paddingBottom: '4px' }}>
            <div onClick={() => setVistaActiva('cotizador')} style={{ flex: '1 1 0px', minWidth: '120px', backgroundColor: vistaActiva === 'cotizador' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'cotizador' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>NUEVA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>1. Cotización</div>
            </div>

            <div onClick={() => setVistaActiva('pendientes')} style={{ flex: '1 1 0px', minWidth: '120px', backgroundColor: vistaActiva === 'pendientes' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'pendientes' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>ORDEN</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>2. Órdenes ({pendientesTrabajos.length})</div>
            </div>

            <div onClick={() => setVistaActiva('produccion')} style={{ flex: '1 1 0px', minWidth: '120px', backgroundColor: vistaActiva === 'produccion' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'produccion' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 'bold' }}>KANBAN</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>3. Taller ({cotizacionesFiltradas.length})</div>
            </div>

            <div onClick={() => setVistaActiva('historial')} style={{ flex: '1 1 0px', minWidth: '120px', backgroundColor: vistaActiva === 'historial' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'historial' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold' }}>HISTORIAL</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>4. Listos ({trabajosHistorial.length})</div>
            </div>

            <div onClick={() => setVistaActiva('crm')} style={{ flex: '1 1 0px', minWidth: '120px', backgroundColor: vistaActiva === 'crm' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'crm' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold' }}>CLIENTES</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>5. CRM ({clientesCRM.length})</div>
            </div>

            <div onClick={() => setVistaActiva('inventario')} style={{ flex: '1 1 0px', minWidth: '120px', backgroundColor: vistaActiva === 'inventario' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'inventario' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 'bold' }}>BODEGA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>6. Inventario</div>
            </div>

            <div onClick={() => setVistaActiva('precios')} style={{ flex: '1 1 0px', minWidth: '120px', backgroundColor: vistaActiva === 'precios' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'precios' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 'bold' }}>TARIFAS</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>8. Precios</div>
            </div>
          </div>
        </div>

        {/* 1. COTIZADOR */}
        {vistaActiva === 'cotizador' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2.5rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#ffffff', margin: '0 0 0.5rem 0' }}>Cotización / Orden de trabajo y Calculadora Flexible</h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.95rem', marginTop: 0, marginBottom: '1.5rem' }}>
              Configura las medidas y añade notas técnicas para el operador. Presiona <code style={{ backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>Ctrl + V</code> para pegar un boceto.
            </p>

            <form onSubmit={guardarCotizacionFormal} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Empresa *</label>
                  <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required placeholder="Nombre de empresa" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Giro</label>
                  <input type="text" value={giro} onChange={(e) => setGiro(e.target.value)} placeholder="Giro comercial" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>RUT</label>
                  <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="Ej. 76.xxx.xxx-x" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Contacto</label>
                  <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Nombre del contacto" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Dirección</label>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección fiscal" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Teléfono WhatsApp</label>
                  <input type="text" value={telefonoWhatsApp} onChange={(e) => setTelefonoWhatsApp(e.target.value)} placeholder="Ej. 56912345678" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* TIPO DE VENTA / FACTURACIÓN */}
              <div style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#38bdf8', display: 'block' }}>📄 Régimen Fiscal / Facturación</label>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Selecciona si el trabajo requiere IVA o es una venta directa sin factura.</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setConFactura(true)} style={{ backgroundColor: conFactura ? '#0284c7' : '#1e293b', color: 'white', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    Con Factura / Boleta (+19% IVA)
                  </button>
                  <button type="button" onClick={() => setConFactura(false)} style={{ backgroundColor: !conFactura ? '#f59e0b' : '#1e293b', color: !conFactura ? '#090d16' : 'white', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    Sin Factura (Venta Directa)
                  </button>
                </div>
              </div>

              {/* FORMA Y MATERIAL (CON LA OPCIÓN "NO REQUIERE") */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', display: 'block', marginBottom: '0.4rem' }}>Forma / Geometría del Letrero</label>
                  <select value={formaLetrero} onChange={(e) => setFormaLetrero(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}>
                    <option value="No requiere / Estándar">No requiere / Estándar</option>
                    <option value="Rectangular / Cuadrado">Rectangular / Cuadrado</option>
                    <option value="Circular (1 Cara o 2 Caras)">Circular (1 o 2 Caras)</option>
                    <option value="Silueta / Corpóreo Personalizado">Silueta / Corpóreo Personalizado</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Material Base / Estructura</label>
                  <select value={materialSeleccionado} onChange={(e) => setMaterialSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}>
                    {Object.keys(preciosMateriales).map((mat) => (
                      <option key={mat} value={mat}>
                        {mat} — ${(preciosMateriales[mat] || 0).toLocaleString('es-CL')} / m²
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* NEÓN LED 1RA GENERACIÓN */}
              <div style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f59e0b' }}>💡 Neón LED (1.ª Generación con LED integrado)</label>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Añade metros de neón pre-cableado o integrado.</span>
                  </div>
                  <input type="checkbox" checked={llevaNeon1Gen} onChange={(e) => setLlevaNeon1Gen(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#f59e0b', cursor: 'pointer' }} />
                </div>

                {llevaNeon1Gen && (
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Metros Lineales de Neón 1.ª Gen</label>
                    <input type="number" step="0.5" value={metrosNeon} onChange={(e) => setMetrosNeon(e.target.value)} placeholder="Ej. 6" style={{ width: '100%', padding: '8px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                  </div>
                )}
              </div>

              {/* BASTIDOR E INSTALACIÓN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8' }}>🛠️ Bastidor / Soldadura</label>
                    <input type="checkbox" checked={incluirBastidor} onChange={(e) => setIncluirBastidor(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Estructura posterior soldada y pintada.</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4ade80' }}>🏗️ Instalación en Terreno</label>
                    <input type="checkbox" checked={incluirInstalacion} onChange={(e) => setIncluirInstalacion(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#4ade80', cursor: 'pointer' }} />
                  </div>
                  {incluirInstalacion && (
                    <input type="number" value={costoInstalacion} onChange={(e) => setCostoInstalacion(e.target.value)} placeholder="Costo de instalación ($)" style={{ width: '100%', padding: '6px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  )}
                </div>
              </div>

              {/* PRECIO MANUAL */}
              <div style={{ backgroundColor: '#1e293b', padding: '1.2rem', borderRadius: '8px', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#38bdf8' }}>💲 Precio Neto Manual (Opcional - Sobrescribe el cálculo automático)</label>
                <input 
                  type="number" 
                  value={precioManualTotal} 
                  onChange={(e) => setPrecioManualTotal(e.target.value)} 
                  placeholder="Déjalo en blanco para usar el cálculo automático o escribe tu valor neto" 
                  style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Descripción detallada del ítem</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Letrero con neón 1ra gen y perfil negro" style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>

              {/* NOTAS TÉCNICAS */}
              <div style={{ backgroundColor: '#451a03', padding: '1.2rem', borderRadius: '8px', border: '1px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fde68a' }}>⚠️ Notas Técnicas Especiales / Instrucciones para Operador 1</label>
                <textarea 
                  value={notasTecnicas} 
                  onChange={(e) => setNotasTecnicas(e.target.value)} 
                  placeholder="Ej. Soldar refuerzo extra en la base, cuidar terminación de esquinas, cableado oculto por la derecha..." 
                  rows="3"
                  style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #d97706', borderRadius: '6px', color: 'white', boxSizing: 'border-box', fontFamily: 'sans-serif' }} 
                />
              </div>

              {/* ZONA DE BOCETO */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Imagen de referencia o boceto</label>
                <div 
                  onClick={() => document.getElementById('file-input-oculto').click()}
                  style={{
                    border: '2px dashed #38bdf8',
                    backgroundColor: '#090d16',
                    padding: '1.5rem',
                    borderRadius: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <input 
                    id="file-input-oculto" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImagenChange} 
                    style={{ display: 'none' }} 
                  />
                  
                  {imagenArchivo ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <img src={imagenArchivo} alt="Vista previa boceto" style={{ maxHeight: '160px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px', border: '1px solid #334155' }} />
                      <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 'bold' }}>✓ Imagen cargada correctamente</span>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setImagenArchivo(''); }} 
                        style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        🗑️ Quitar imagen
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: '2rem' }}>🖼️</span>
                      <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.95rem' }}>Haz clic o presiona <b style={{ color: '#38bdf8' }}>Ctrl + V</b> para pegar captura</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Ancho (cm)</label>
                  <input type="number" step="0.01" value={ancho} onChange={(e) => setAncho(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Alto (cm)</label>
                  <input type="number" step="0.01" value={alto} onChange={(e) => setAlto(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Cantidad (Cant.)</label>
                  <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '0.4rem' }}>Abono Inicial ($)</label>
                  <input type="number" value={abono} onChange={(e) => setAbono(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#38bdf8', display: 'block', marginBottom: '0.4rem' }}>Método de Pago</label>
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="WebPay">WebPay</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'block', marginBottom: '0.4rem' }}>Fecha de Entrega</label>
                  <input type="date" value={fechaEntregaEstimada} onChange={(e) => setFechaEntregaEstimada(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a855f7', display: 'block', marginBottom: '0.4rem' }}>Operador Responsable</label>
                  <input type="text" value={operadorAsignado} onChange={(e) => setOperadorAsignado(e.target.value)} placeholder="Ej. Operador 1" style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Neto</span>
                  <div style={{ fontSize: '1.1rem', color: '#e4e4e7', fontWeight: 'bold' }}>${netoFinal.toLocaleString('es-CL')}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{conFactura ? 'IVA 19%' : 'Sin Factura'}</span>
                  <div style={{ fontSize: '1.1rem', color: '#e4e4e7', fontWeight: 'bold' }}>{conFactura ? `$${iva.toLocaleString('es-CL')}` : '$0'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Total a Pagar</span>
                  <div style={{ fontSize: '1.3rem', color: '#38bdf8', fontWeight: 'bold' }}>${totalConIva.toLocaleString('es-CL')} CLP</div>
                </div>
              </div>

              <button type="submit" disabled={cargando} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', width: 'fit-content' }}>
                {cargando ? 'Guardando...' : 'Guardar y Enviar al Taller'}
              </button>
            </form>

            {mensaje && <p style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '0.9rem', color: mensaje.includes('éxito') ? '#4ade80' : '#f87171' }}>{mensaje}</p>}
          </div>
        )}

        {/* 2. ÓRDENES */}
        {vistaActiva === 'pendientes' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#f59e0b' }}>📋 Órdenes de Trabajo Pendientes</h3>
            {pendientesTrabajos.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No hay órdenes pendientes.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                {pendientesTrabajos.map(item => renderCardTrabajo(item))}
              </div>
            )}
          </div>
        )}

        {/* 3. KANBAN TALLER */}
        {vistaActiva === 'produccion' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8' }}>🛠️ Tablero Taller y Kanban ({cotizacionesFiltradas.length})</h3>
            {cotizacionesFiltradas.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No hay trabajos en el taller.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                {cotizacionesFiltradas.map(item => renderCardTrabajo(item))}
              </div>
            )}
          </div>
        )}

        {/* 4. HISTORIAL */}
        {vistaActiva === 'historial' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#38bdf8' }}>📦 Historial de Trabajos Listos y Entregados ({trabajosHistorial.length})</h3>
                <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 'bold' }}>Total ventas en periodo: ${totalVendidoHistorial.toLocaleString('es-CL')} CLP</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', backgroundColor: '#090d16', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>📅 Filtrar por fecha:</span>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ backgroundColor: '#131c2e', border: '1px solid #334155', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }} />
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>a</span>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ backgroundColor: '#131c2e', border: '1px solid #334155', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }} />
                <button onClick={() => { const hoy = new Date().toISOString().substring(0, 10); setFechaDesde(hoy); setFechaHasta(hoy); }} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>Hoy</button>
                {(fechaDesde || fechaHasta) && (
                  <button onClick={() => { setFechaDesde(''); setFechaHasta(''); }} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Ver Todos</button>
                )}
              </div>
            </div>

            {trabajosHistorial.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No hay trabajos en el historial.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                {trabajosHistorial.map(item => renderCardTrabajo(item))}
              </div>
            )}
          </div>
        )}

        {/* 5. CRM CLIENTES */}
        {vistaActiva === 'crm' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8' }}>👥 Directorio de Clientes (CRM)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}>
                  <th style={{ padding: '10px' }}>Empresa</th><th style={{ padding: '10px' }}>RUT</th><th style={{ padding: '10px' }}>Contacto</th><th style={{ padding: '10px' }}>Total Gastado</th>
                </tr>
              </thead>
              <tbody>
                {clientesCRM.map((cli, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: 'white' }}>{cli.empresa}</td>
                    <td style={{ padding: '12px' }}>{cli.rut}</td>
                    <td style={{ padding: '12px' }}>{cli.contacto}</td>
                    <td style={{ padding: '12px', color: '#4ade80', fontWeight: 'bold' }}>${cli.totalGastado.toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. BODEGA */}
        {vistaActiva === 'inventario' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ backgroundColor: '#090d16', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#f97316' }}>➕ Ingresar Insumo o Material por Categoría</h4>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                let nombreFinal = nuevoMaterialNombre;
                if (nuevoMaterialCategoria === 'Neón LED Flex') nombreFinal = `Neón LED 1ra Gen ${nuevoMaterialColor || 'Blanco'}`;
                else if (nuevoMaterialCategoria === 'Planchas de Acrílico') nombreFinal = `Acrílico ${nuevoMaterialEspesor} ${nuevoMaterialColor || 'Transparente'}`;
                else if (nuevoMaterialCategoria === 'Planchas de Trovicel') nombreFinal = `Trovicel ${nuevoMaterialEspesor} ${nuevoMaterialColor || 'Blanco'}`;

                if (!nombreFinal || nuevoMaterialStock === '') return;

                await supabase.from('inventario').insert([
                  { 
                    categoria: nuevoMaterialCategoria, 
                    material: nombreFinal, 
                    color: nuevoMaterialColor, 
                    espesor: nuevoMaterialEspesor,
                    stock: parseInt(nuevoMaterialStock) || 0, 
                    unidad: 'unidades' 
                  }
                ]);
                setNuevoMaterialNombre(''); setNuevoMaterialColor(''); setNuevoMaterialStock('');
                cargarDatos();
              }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Grupo</label>
                  <select value={nuevoMaterialCategoria} onChange={(e) => setNuevoMaterialCategoria(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}>
                    <option value="Neón LED Flex">Neón LED 1ra Gen</option>
                    <option value="Planchas de Acrílico">Planchas de Acrílico</option>
                    <option value="Planchas de Trovicel">Planchas de Trovicel</option>
                    <option value="General">Otros Insumos</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Cantidad Stock</label>
                  <input type="number" value={nuevoMaterialStock} onChange={(e) => setNuevoMaterialStock(e.target.value)} required placeholder="0" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                </div>
                <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '41px' }}>Guardar</button>
              </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {Object.keys(inventarioAgrupado).map((catName) => {
                const itemsGroup = inventarioAgrupado[catName];
                if (itemsGroup.length === 0) return null;
                return (
                  <div key={catName} style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '12px', border: '1px solid #1e293b' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8', borderBottom: '2px solid #38bdf8', paddingBottom: '0.4rem' }}>📦 {catName}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <tbody>
                        {itemsGroup.map((inv) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: 'white' }}>{inv.material}</td>
                            <td style={{ padding: '12px', color: inv.stock < 3 ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>{inv.stock} {inv.unidad}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <button onClick={async () => {
                                const nuevo = prompt(`Actualizar stock para ${inv.material}:`, inv.stock);
                                if (nuevo !== null) {
                                  await supabase.from('inventario').update({ stock: parseInt(nuevo) || 0 }).eq('id', inv.id);
                                  cargarDatos();
                                }
                              }} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Modificar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. PRECIOS */}
        {vistaActiva === 'precios' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#a855f7' }}>💲 Gestión de Precios y Tarifas por m²</h3>
            
            <form onSubmit={agregarNuevoMaterialTarifa} style={{ display: 'flex', gap: '1rem', backgroundColor: '#090d16', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', flexWrap: 'wrap', alignItems: 'end' }}>
              <div style={{ flex: '2 1 200px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nombre del Material / Producto</label>
                <input type="text" value={nuevoMatNombre} onChange={(e) => setNuevoMatNombre(e.target.value)} required placeholder="Ej. Trovicel 20mm" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Precio m² ($)</label>
                <input type="number" value={nuevoMatPrecio} onChange={(e) => setNuevoMatPrecio(e.target.value)} required placeholder="95000" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              </div>
              <button type="submit" style={{ backgroundColor: '#a855f7', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '41px' }}>Agregar</button>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}>
                  <th style={{ padding: '12px' }}>Producto / Material</th>
                  <th style={{ padding: '12px' }}>Precio por m² ($ CLP)</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(preciosMateriales).map((mat) => (
                  <tr key={mat} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px', fontWeight: 'bold', color: 'white' }}>{mat}</td>
                    <td style={{ padding: '14px', color: '#4ade80', fontWeight: 'bold', fontSize: '1.05rem' }}>
                      ${(preciosMateriales[mat] || 0).toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => modificarNombreMaterial(mat)} style={{ backgroundColor: '#334155', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>✏️</button>
                      <button onClick={() => modificarPrecioMaterial(mat)} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>💲</button>
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