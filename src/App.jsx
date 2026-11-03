import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

export default function App() {
  const [vistaTallerExclusiva, setVistaTallerExclusiva] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('cotizador');

  // Datos formales del cliente
  const [empresa, setEmpresa] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [giro, setGiro] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');
  const [conFactura, setConFactura] = useState(true);

  // Detalles del trabajo
  const [descripcion, setDescripcion] = useState('');
  const [ancho, setAncho] = useState('120');
  const [alto, setAlto] = useState('80');
  const [cantidad, setCantidad] = useState('1');
  const [materialSeleccionado, setMaterialSeleccionado] = useState('Trovicel 3 mm + Gráfica laminado PVC');
  const [imagenArchivo, setImagenArchivo] = useState('');
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('');
  const [operadorAsignado, setOperadorAsignado] = useState('Operador 1');

  const preciosMateriales = {
    'Acrílico 3 mm Blanco': 90000,
    'Acrílico 3 mm Negro': 90000,
    'Acrílico 3 mm Transparente': 80000,
    'Acrílico 4 mm Negro': 110000,
    'Acrílico 4 mm Transparente': 100000,
    'Acrílico 4 mm + Gráfica': 90000,
    'Acrílico 4 mm transparente + corte': 75000,
    'Acrílico Blanco 3 mm': 85000,
    'Adhesivo impreso sin laminar': 10000,
    'Adhesivo impreso troquelado Laminado': 18000,
    'Adhesivo impreso troquelado sin laminar': 15000,
    'Adhesivo laminado barniz': 14000,
    'Adhesivo Laminado pvc Brillante': 14000,
    'Adhesivo Laminado pvc mate': 14000,
    'Adhesivo Troquelado': 18000,
    'Aluminio Compuesto 4 mm + Gráfica': 75000,
    'One Vision': 14000,
    'Pai 1 mm + Gráfica': 35000,
    'Panaflex FILM Backligt - Backlite': 16000,
    'Tela Panaflex': 12000,
    'Tela PVC': 9000,
    'Trovicel 3 mm + Gráfica laminado PVC': 32000,
    'Trovicel 3 mm + Gráfica Sin Laminar': 30000,
    'Trovicel 5 mm + Gráfica Laminado PVC': 35000,
    'Trovicel 5 mm + Gráfica Sin laminar': 32000
  };

  const [costoMaterialBase, setCostoMaterialBase] = useState('');
  const [costoExtras, setCostoExtras] = useState('');
  const [abono, setAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  
  // Egresos, Inventario y Filtros
  const [descEgreso, setDescEgreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [catEgreso, setCatEgreso] = useState('Insumos / Materiales');
  const [listaEgresos, setListaEgresos] = useState([]);
  
  // Inventario sincronizado con Supabase
  const [inventario, setInventario] = useState([]);
  const [nuevoMaterialNombre, setNuevoMaterialNombre] = useState('');
  const [nuevoMaterialStock, setNuevoMaterialStock] = useState('');
  const [nuevoMaterialUnidad, setNuevoMaterialUnidad] = useState('planchas');

  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cotizaciones, setCotizaciones] = useState([]);

  const cargarDatos = async () => {
    const { data: dataCot } = await supabase.from('cotizaciones').select('*').order('created_at', { ascending: false });
    if (dataCot) setCotizaciones(dataCot);

    const { data: dataEgr } = await supabase.from('egresos').select('*').order('created_at', { ascending: false });
    if (dataEgr) setListaEgresos(dataEgr);

    const { data: dataInv } = await supabase.from('inventario').select('*').order('material', { ascending: true });
    if (dataInv) setInventario(dataInv);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vista') === 'taller') {
      setVistaTallerExclusiva(true);
    }

    cargarDatos();

    const canal = supabase
      .channel('cambios-taller')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, () => cargarDatos())
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
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

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) procesarArchivo(e.dataTransfer.files[0]);
  };

  const calcularValores = () => {
    const a = parseFloat(ancho) || 0;
    const h = parseFloat(alto) || 0;
    const cant = parseInt(cantidad) || 1;
    const m2 = (a / 100) * (h / 100);
    const precioM2 = preciosMateriales[materialSeleccionado] || 0;
    
    const valorUnitario = Math.round(m2 * precioM2);
    const netoTotal = valorUnitario * cant;
    const extrasVal = parseFloat(costoExtras) || 0;
    const netoFinal = netoTotal + extrasVal;
    
    const iva = conFactura ? Math.round(netoFinal * 0.19) : 0;
    const totalConIva = netoFinal + iva;

    return { valorUnitario, netoFinal, iva, totalConIva };
  };

  const { valorUnitario, netoFinal, iva, totalConIva } = calcularValores();

  const guardarCotizacionFormal = async (e) => {
    e.preventDefault();
    if (!ancho || !alto || !empresa) {
      alert('Por favor complete al menos la Empresa, Ancho y Alto.');
      return;
    }

    const abonoVal = parseFloat(abono) || 0;
    const costoInt = parseFloat(costoMaterialBase) || 0;
    const utilidadDinero = netoFinal - costoInt;
    const margenPorcentaje = netoFinal > 0 ? Math.round((utilidadDinero / netoFinal) * 100) : 0;
    const nroCotizacion = cotizaciones.length + 5;

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
          descripcion: `${materialSeleccionado} (${ancho}x${alto}cm) - ${descripcion || 'Trabajo de taller'}`,
          ancho: parseFloat(ancho),
          alto: parseFloat(alto),
          cantidad: parseInt(cantidad),
          valor_unitario: valorUnitario,
          neto: netoFinal,
          iva: iva,
          total: totalConIva,
          extras: parseFloat(costoExtras) || 0,
          abono: abonoVal,
          metodo_pago: metodoPago,
          costo_material: costoInt,
          margen_utilidad: margenPorcentaje,
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
      setMensaje(`¡Cotización N° ${String(nroCotizacion).padStart(3, '0')} generada con éxito!`);
      cargarDatos();
      setEmpresa('');
      setRut('');
      setDireccion('');
      setGiro('');
      setContacto('');
      setTelefonoWhatsApp('');
      setDescripcion('');
      setCostoMaterialBase('');
      setCostoExtras('');
      setAbono('');
      setFechaEntregaEstimada('');
      setImagenArchivo('');
      setOperadorAsignado('Operador 1');
      setConFactura(true);
    }
  };

  const duplicarCotizacion = (item) => {
    setEmpresa(item.cliente || '');
    setRut(item.rut || '');
    setDireccion(item.direccion || '');
    setGiro(item.giro || '');
    setContacto(item.contacto || '');
    setTelefonoWhatsApp(item.telefono || '');
    setMaterialSeleccionado(item.material || 'Trovicel 3 mm + Gráfica laminado PVC');
    setDescripcion(item.descripcion || '');
    setAncho(String(item.ancho || '120'));
    setAlto(String(item.alto || '80'));
    setCantidad(String(item.cantidad || '1'));
    setCostoMaterialBase(String(item.costo_material || ''));
    setCostoExtras(String(item.extras || ''));
    setAbono(String(item.abono || ''));
    setFechaEntregaEstimada(item.fecha_entrega || '');
    setImagenArchivo(item.imagen_archivo || '');
    setOperadorAsignado(item.operador || 'Operador 1');
    setConFactura(item.con_factura !== false);
    setVistaActiva('cotizador');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const registrarAbonoAdicional = async (id, abonoActual, totalTrabajo) => {
    const nuevoPagoStr = prompt('Ingrese el monto del nuevo abono o pago parcial ($ CLP):');
    if (!nuevoPagoStr) return;
    const pagoExtra = parseFloat(nuevoPagoStr) || 0;
    const nuevoTotalAbonado = Number(abonoActual) + pagoExtra;

    if (nuevoTotalAbonado > totalTrabajo) {
      alert('El abono total no puede superar el monto total del trabajo.');
      return;
    }

    const { error } = await supabase.from('cotizaciones').update({ abono: nuevoTotalAbonado }).eq('id', id);
    if (!error) cargarDatos();
  };

  const cambiarOperador = async (id, operadorActual) => {
    const nuevoOp = prompt('Asignar operador (Ej. Operador 1):', operadorActual);
    if (!nuevoOp) return;
    const { error } = await supabase.from('cotizaciones').update({ operador: nuevoOp }).eq('id', id);
    if (!error) cargarDatos();
  };

  const cambiarEstado = async (id, estadoActual) => {
    const estadosPosibles = ['Pendiente', 'En Diseño', 'En Corte/Producción', 'Listo', 'Entregado'];
    const indiceActual = estadosPosibles.indexOf(estadoActual);
    const siguienteEstado = estadosPosibles[(indiceActual !== -1 ? indiceActual + 1 : 0) % estadosPosibles.length];

    const { error } = await supabase.from('cotizaciones').update({ estado: siguienteEstado }).eq('id', id);
    if (!error) cargarDatos();
  };

  const eliminarCotizacion = async (id) => {
    const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
    if (!error) cargarDatos();
  };

  const generarReportePDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(0, 120, 255);
    doc.text('FIXEL PUBLICIDAD - REPORTE FINANCIERO', 105, 20, { align: 'center' });
    doc.save('Reporte_Financiero_Fixel.pdf');
  };

  const generarPDFFormal = (item) => {
    const doc = new jsPDF();
    doc.save(`Cotizacion_Fixel_${item.nro_cotizacion || 5}.pdf`);
  };

  const generarPDFOperativo = (item) => {
    const doc = new jsPDF();
    doc.save(`Orden_Taller_${item.nro_cotizacion || 5}.pdf`);
  };

  const enviarWhatsAppFormal = (item) => {
    const telefono = item.telefono ? item.telefono.replace(/\s+/g, '') : '';
    const texto = `Hola *${item.cliente}*! 👋 Adjuntamos su Cotización N° *${item.nro_cotizacion || 5}* en *Fixel Publicidad*:\n\n🛠️ *Detalle:* ${item.descripcion}\n💰 *Monto:* \$${Number(item.total).toLocaleString('es-CL')} CLP`;
    const url = telefono ? `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(texto)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const guardarEgreso = async (e) => {
    e.preventDefault();
    if (!descEgreso || !montoEgreso) return;
    await supabase.from('egresos').insert([{ descripcion: descEgreso, monto: parseFloat(montoEgreso), categoria: catEgreso }]);
    setDescEgreso('');
    setMontoEgreso('');
    cargarDatos();
  };

  const pendientesTrabajos = cotizaciones.filter(c => c.estado === 'Pendiente');
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

  const renderCardTrabajo = (item) => {
    const nroStr = String(item.nro_cotizacion || 5).padStart(3, '0');
    const estadoActual = item.estado || 'Pendiente';
    const abonoActual = Number(item.abono || 0);
    const totalTrabajo = Number(item.total || 0);
    
    return (
      <div key={item.id} style={{ backgroundColor: '#090d16', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>N° {nroStr}</span>
          <button onClick={() => cambiarEstado(item.id, estadoActual)} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>📍 {estadoActual} ➔</button>
        </div>
        <div style={{ fontWeight: 'bold', color: 'white' }}>{item.cliente}</div>
        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{item.descripcion}</div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#38bdf8', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '4px' }}>
          <span>👤 Operador: <b>{item.operador || 'Operador 1'}</b></span>
          <button onClick={() => cambiarOperador(item.id, item.operador)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 'bold' }}>Cambiar</button>
        </div>

        {item.fecha_entrega && <div style={{ color: '#f59e0b', fontSize: '0.75rem' }}>📅 Entrega: {new Date(item.fecha_entrega).toLocaleDateString('es-CL')}</div>}
        {item.imagen_archivo && <img src={item.imagen_archivo} alt="Boceto" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }} />}
        
        <div style={{ backgroundColor: '#131c2e', padding: '8px', borderRadius: '6px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontWeight: 'bold' }}>
            <span>Total:</span>
            <span>${totalTrabajo.toLocaleString('es-CL')} CLP</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: 'auto' }}>
          <button onClick={() => generarPDFFormal(item)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>PDF Cliente</button>
          <button onClick={() => generarPDFOperativo(item)} style={{ backgroundColor: '#f97316', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>PDF Taller</button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={() => duplicarCotizacion(item)} style={{ flex: 1, backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Duplicar</button>
          <button onClick={() => enviarWhatsAppFormal(item)} style={{ flex: 1, backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>WhatsApp</button>
          <button onClick={() => eliminarCotizacion(item.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>🗑️</button>
        </div>
      </div>
    );
  };

  // ==========================================
  // PANTALLA EXCLUSIVA PARA EL TALLER (MODO TV)
  // ==========================================
  if (vistaTallerExclusiva) {
    const ordenesTaller = cotizaciones.filter(c => c.estado !== 'Entregado');
    return (
      <div style={{ backgroundColor: '#030712', minHeight: '100vh', padding: '2rem', color: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', padding: '1.5rem 2rem', borderRadius: '16px', border: '2px solid #1f2937', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, color: '#38bdf8', fontSize: '2.6rem', fontWeight: '900' }}>
              FIXEL <span style={{ color: '#f97316', fontSize: '1.6rem' }}>• PANTALLA DE TALLER EN VIVO</span>
            </h1>
            <p style={{ margin: '5px 0 0 0', color: '#9ca3af', fontSize: '1rem' }}>Actualización automática activada. Solo gestione el estado y visualice los diseños.</p>
          </div>
          <div style={{ backgroundColor: '#064e3b', color: '#34d399', padding: '10px 20px', borderRadius: '9999px', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
            CONECTADO EN TIEMPO REAL
          </div>
        </div>

        {ordenesTaller.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem', backgroundColor: '#111827', borderRadius: '16px', border: '1px solid #1f2937' }}>
            <h2 style={{ color: '#9ca3af' }}>No hay órdenes pendientes en este momento.</h2>
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

  // ==========================================
  // PORTAL ADMINISTRATIVO DE CONTROL (USUARIO)
  // ==========================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', fontFamily: 'sans-serif', padding: '2rem 1rem', color: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        <div style={{ backgroundColor: '#131c2e', padding: '1.5rem', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 12px 30px rgba(0,0,0,0.4)' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '1.8rem', fontWeight: 'bold' }}>Fixel Manager</h2>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Portal de Control Administrativo del Taller</span>
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
            <div onClick={() => setVistaActiva('cotizador')} style={{ flex: '1 1 0px', minWidth: '140px', backgroundColor: vistaActiva === 'cotizador' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'cotizador' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>NUEVA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>1. Cotización</div>
            </div>

            <div onClick={() => setVistaActiva('pendientes')} style={{ flex: '1 1 0px', minWidth: '140px', backgroundColor: vistaActiva === 'pendientes' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'pendientes' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>ORDEN</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>2. Órdenes ({pendientesTrabajos.length})</div>
            </div>

            <div onClick={() => setVistaActiva('produccion')} style={{ flex: '1 1 0px', minWidth: '140px', backgroundColor: vistaActiva === 'produccion' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'produccion' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 'bold' }}>KANBAN</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>3. Taller ({cotizaciones.length})</div>
            </div>

            <div onClick={() => setVistaActiva('crm')} style={{ flex: '1 1 0px', minWidth: '140px', backgroundColor: vistaActiva === 'crm' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'crm' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold' }}>CLIENTES</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>4. CRM ({clientesCRM.length})</div>
            </div>

            <div onClick={() => setVistaActiva('calendario')} style={{ flex: '1 1 0px', minWidth: '140px', backgroundColor: vistaActiva === 'calendario' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'calendario' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 'bold' }}>AGENDA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>5. Calendario</div>
            </div>

            <div onClick={() => setVistaActiva('inventario')} style={{ flex: '1 1 0px', minWidth: '140px', backgroundColor: vistaActiva === 'inventario' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'inventario' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 'bold' }}>BODEGA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>6. Inventario</div>
            </div>

            <div onClick={() => setVistaActiva('egresos')} style={{ flex: '1 1 0px', minWidth: '140px', backgroundColor: vistaActiva === 'egresos' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'egresos' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 'bold' }}>CAJA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>7. Finanzas</div>
            </div>
          </div>
        </div>

        {/* VISTAS ADMINISTRATIVAS */}
        {vistaActiva === 'cotizador' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2.5rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#ffffff', margin: '0 0 1.5rem 0' }}>Nueva Cotización / Orden de Taller</h1>
            <form onSubmit={guardarCotizacionFormal} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Empresa *</label>
                  <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required placeholder="Nombre de empresa" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Contacto / Teléfono</label>
                  <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Teléfono" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Producto / Material</label>
                <select value={materialSeleccionado} onChange={(e) => setMaterialSeleccionado(e.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box', fontSize: '0.95rem' }}>
                  {Object.keys(preciosMateriales).map((mat) => (
                    <option key={mat} value={mat}>{mat} — ${preciosMateriales[mat].toLocaleString('es-CL')} / m²</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Descripción / Observaciones</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles para el taller" style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Imagen de Referencia o Boceto (Pega con Ctrl + V o sube archivo)</label>
                <input type="file" accept="image/*" onChange={handleImagenChange} style={{ color: 'white' }} />
                {imagenArchivo && <p style={{ color: '#4ade80', fontSize: '0.85rem' }}>✓ Imagen cargada con éxito</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Ancho (cm)</label>
                  <input type="number" value={ancho} onChange={(e) => setAncho(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Alto (cm)</label>
                  <input type="number" value={alto} onChange={(e) => setAlto(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Cantidad</label>
                  <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              <button type="submit" disabled={cargando} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', width: 'fit-content' }}>
                {cargando ? 'Guardando...' : 'Guardar y Enviar al Taller'}
              </button>
            </form>
            {mensaje && <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#4ade80' }}>{mensaje}</p>}
          </div>
        )}

        {vistaActiva === 'pendientes' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#f59e0b' }}>📋 Órdenes de Trabajo Pendientes</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
              {pendientesTrabajos.map(item => renderCardTrabajo(item))}
            </div>
          </div>
        )}

        {vistaActiva === 'produccion' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8' }}>🛠️ Tablero Kanban de Taller</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
              {cotizaciones.map(item => renderCardTrabajo(item))}
            </div>
          </div>
        )}

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

        {vistaActiva === 'calendario' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#a855f7' }}>📅 Calendario de Entregas</h3>
            {cotizaciones.filter(c => c.fecha_entrega).map(item => (
              <div key={item.id} style={{ backgroundColor: '#090d16', padding: '1rem', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <b style={{ color: '#f59e0b' }}>Entrega: {new Date(item.fecha_entrega).toLocaleDateString('es-CL')}</b>
                  <div style={{ color: 'white' }}>{item.cliente} - {item.descripcion}</div>
                </div>
                <span style={{ color: '#38bdf8' }}>{item.estado}</span>
              </div>
            ))}
          </div>
        )}

        {/* 6. BODEGA / INVENTARIO CONECTADO A SUPABASE */}
        {vistaActiva === 'inventario' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ backgroundColor: '#090d16', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#f97316' }}>➕ Agregar Nuevo Material a la Bodega (Cloud)</h4>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!nuevoMaterialNombre || nuevoMaterialStock === '') return;
                
                const { error } = await supabase.from('inventario').insert([
                  { material: nuevoMaterialNombre, stock: parseInt(nuevoMaterialStock) || 0, unidad: nuevoMaterialUnidad }
                ]);

                if (!error) {
                  setNuevoMaterialNombre('');
                  setNuevoMaterialStock('');
                  cargarDatos();
                } else {
                  alert('Error al agregar material: ' + error.message);
                }
              }} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nombre del Material / Insumo</label>
                  <input type="text" value={nuevoMaterialNombre} onChange={(e) => setNuevoMaterialNombre(e.target.value)} required placeholder="Ej. Planchas Acrílico 4mm" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Stock Inicial</label>
                  <input type="number" value={nuevoMaterialStock} onChange={(e) => setNuevoMaterialStock(e.target.value)} required placeholder="0" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Unidad</label>
                  <select value={nuevoMaterialUnidad} onChange={(e) => setNuevoMaterialUnidad(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}>
                    <option value="planchas">planchas</option>
                    <option value="rollos">rollos</option>
                    <option value="metros">metros</option>
                    <option value="unidades">unidades</option>
                  </select>
                </div>
                <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '41px' }}>Guardar</button>
              </form>
            </div>

            <div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#f97316' }}>📦 Control de Inventario y Bodega</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}>
                    <th style={{ padding: '12px' }}>Material / Insumo</th>
                    <th style={{ padding: '12px' }}>Stock Actual</th>
                    <th style={{ padding: '12px' }}>Unidad</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No hay materiales registrados en la bodega.</td>
                    </tr>
                  ) : (
                    inventario.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '14px', fontWeight: 'bold', color: 'white' }}>{inv.material}</td>
                        <td style={{ padding: '14px', color: inv.stock < 5 ? '#f87171' : '#4ade80', fontWeight: 'bold', fontSize: '1.1rem' }}>{inv.stock}</td>
                        <td style={{ padding: '14px', color: '#94a3b8' }}>{inv.unidad}</td>
                        <td style={{ padding: '14px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button onClick={async () => {
                            const nuevo = prompt(`Actualizar stock para ${inv.material}:`, inv.stock);
                            if (nuevo !== null) {
                              const { error } = await supabase.from('inventario').update({ stock: parseInt(nuevo) || 0 }).eq('id', inv.id);
                              if (!error) cargarDatos();
                            }
                          }} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Modificar Stock</button>
                          
                          <button onClick={async () => {
                            if (confirm(`¿Eliminar ${inv.material} de la bodega?`)) {
                              const { error } = await supabase.from('inventario').delete().eq('id', inv.id);
                              if (!error) cargarDatos();
                            }
                          }} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {vistaActiva === 'egresos' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#0284c7' }}>Finanzas y Egresos</h3>
              <button onClick={generarReportePDF} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Descargar Reporte PDF</button>
            </div>
            <form onSubmit={guardarEgreso} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <input type="text" value={descEgreso} onChange={(e) => setDescEgreso(e.target.value)} required placeholder="Descripción del gasto" style={{ padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              <input type="number" value={montoEgreso} onChange={(e) => setMontoEgreso(e.target.value)} required placeholder="Monto $" style={{ padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              <button type="submit" style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Registrar Gasto</button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}