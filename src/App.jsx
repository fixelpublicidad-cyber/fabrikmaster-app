import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

export default function App() {
  const [vistaActiva, setVistaActiva] = useState('cotizador');

  // Datos formales del cliente (según tu formato)
  const [empresa, setEmpresa] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [giro, setGiro] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');

  // Detalles del producto
  const [descripcion, setDescripcion] = useState('');
  const [ancho, setAncho] = useState('120');
  const [alto, setAlto] = useState('80');
  const [cantidad, setCantidad] = useState('5');
  const [materialSeleccionado, setMaterialSeleccionado] = useState('Trovicel 3 mm + Gráfica laminado PVC');
  
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
  
  // Egresos
  const [descEgreso, setDescEgreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [catEgreso, setCatEgreso] = useState('Insumos / Materiales');
  const [listaEgresos, setListaEgresos] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cotizaciones, setCotizaciones] = useState([]);

  const cargarDatos = async () => {
    const { data: dataCot, error: errCot } = await supabase
      .from('cotizaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (!errCot && dataCot) setCotizaciones(dataCot);

    const { data: dataEgr, error: errEgr } = await supabase
      .from('egresos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!errEgr && dataEgr) setListaEgresos(dataEgr);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cálculo del valor unitario por m2 y cantidad
  const calcularValores = () => {
    const a = parseFloat(ancho) || 0;
    const h = parseFloat(alto) || 0;
    const cant = parseInt(cantidad) || 1;
    const m2 = (a / 100) * (h / 100);
    const precioM2 = preciosMateriales[materialSeleccionado] || 0;
    
    // Valor unitario neto por cada elemento
    const valorUnitario = Math.round(m2 * precioM2);
    const netoTotal = valorUnitario * cant;
    const extrasVal = parseFloat(costoExtras) || 0;
    const netoFinal = netoTotal + extrasVal;
    const iva = Math.round(netoFinal * 0.19);
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
    
    // Número de cotización automático basado en timestamp corto o contador
    const nroCotizacion = cotizaciones.length + 1001;

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
          costo_material: costoInt,
          margen_utilidad: margenPorcentaje,
          estado: 'Pendiente'
        },
      ]);

    setCargando(false);

    if (error) {
      console.error('Error al guardar:', error);
      setMensaje('Error al guardar: ' + error.message);
    } else {
      setMensaje(`¡Cotización N° ${nroCotizacion} generada con éxito!`);
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
    }
  };

  // Generar PDF formal idéntico al formato solicitado
  const generarPDFFormal = (item) => {
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Cotización', 150, 20);

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date(item.created_at || Date.now()).toLocaleDateString('es-CL')}`, 135, 30);
    doc.text(`Cot. N°: ${item.nro_cotizacion || item.id.slice(0, 6)}`, 135, 36);

    // Datos de Empresa / Cliente
    doc.setFontSize(10);
    doc.text(`EMPRESA: ${item.cliente || '---'}`, 20, 48);
    doc.text(`GIRO: ${item.giro || '---'}`, 110, 48);
    doc.text(`RUT: ${item.rut || '---'}`, 20, 56);
    doc.text(`CONTACTO: ${item.contacto || item.telefono || '---'}`, 110, 56);
    doc.text(`DIRECCIÓN: ${item.direccion || '---'}`, 20, 64);

    // Tabla Cabecera
    doc.setFillColor(0, 0, 0);
    doc.rect(20, 75, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('CANT.', 23, 81);
    doc.text('DESCRIPCIÓN', 50, 81);
    doc.text('VALOR U', 135, 81);
    doc.text('NETO', 165, 81);

    // Fila de Contenido
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(String(item.cantidad || 1), 25, 92);
    doc.text(String(item.descripcion || 'Servicio de taller'), 50, 92, { maxWidth: 80 });
    doc.text(`$${Number(item.valor_unitario || item.total).toLocaleString('es-CL')}`, 135, 92);
    doc.text(`$${Number(item.neto || item.total).toLocaleString('es-CL')}`, 165, 92);

    // Línea divisoria y Totales
    doc.setLineWidth(0.5);
    doc.line(20, 120, 190, 120);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('*TODA COTIZACIÓN TIENE UNA VIGENCIA DE 10 DÍAS*', 20, 135);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal', 130, 135);
    doc.text(`$${Number(item.neto || item.total).toLocaleString('es-CL')}`, 170, 135, { align: 'right' });

    doc.text('IVA 19%', 130, 143);
    doc.text(`$${Number(item.iva || Math.round(item.total * 0.19)).toLocaleString('es-CL')}`, 170, 143, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Total', 130, 151);
    doc.text(`$${Number(item.total).toLocaleString('es-CL')}`, 170, 151, { align: 'right' });

    // Barra inferior negra
    doc.setFillColor(0, 0, 0);
    doc.rect(20, 165, 170, 4, 'F');

    doc.save(`Cotizacion_Fixel_${item.nro_cotizacion || 'formal'}.pdf`);
  };

  const enviarWhatsAppFormal = (item) => {
    const telefono = item.telefono ? item.telefono.replace(/\s+/g, '') : '';
    const texto = `Hola *${item.cliente}*! 👋 Adjuntamos el resumen de su Cotización N° *${item.nro_cotizacion || 'Fixel'}* en *Fixel Publicidad*:\n\n🛠️ *Detalle:* ${item.descripcion}\n💰 *Neto:* \$${Number(item.neto || item.total).toLocaleString('es-CL')} CLP\n🧾 *IVA (19%):* \$${Number(item.iva || 0).toLocaleString('es-CL')} CLP\n📌 *Total a Pagar:* \$${Number(item.total).toLocaleString('es-CL')} CLP\n\n_Validez de la cotización: 10 días._ ¡Quedamos atentos a sus comentarios!`;
    const url = telefono 
      ? `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(texto)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const guardarEgreso = async (e) => {
    e.preventDefault();
    if (!descEgreso || !montoEgreso) return;

    const { error } = await supabase
      .from('egresos')
      .insert([{ descripcion: descEgreso, monto: parseFloat(montoEgreso), categoria: catEgreso }]);

    if (!error) {
      setDescEgreso('');
      setMontoEgreso('');
      cargarDatos();
    } else {
      alert('Error al registrar egreso: ' + error.message);
    }
  };

  const eliminarEgreso = async (id) => {
    const { error } = await supabase.from('egresos').delete().eq('id', id);
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

  const totalVentasCobradas = cotizaciones.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const totalCostoProduccion = cotizaciones.reduce((acc, item) => acc + Number(item.costo_material || 0), 0);
  const totalEgresosTaller = listaEgresos.reduce((acc, item) => acc + Number(item.monto || 0), 0);
  const utilidadNetaReal = totalVentasCobradas - totalCostoProduccion - totalEgresosTaller;

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'Pendiente': return '#94a3b8';
      case 'En Diseño': return '#38bdf8';
      case 'En Corte/Producción': return '#f59e0b';
      case 'Listo': return '#a855f7';
      case 'Entregado': return '#4ade80';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: 'sans-serif', padding: '2rem 1rem', color: '#f8fafc' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* ENCABEZADO Y NAVEGACIÓN */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#1e293b', padding: '1.2rem 1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
          <div>
            <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '1.5rem' }}>Fixel Manager</h2>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Portal Interno de Cotización y Taller</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setVistaActiva('cotizador')}
              style={{ backgroundColor: vistaActiva === 'cotizador' ? '#0284c7' : '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              1. Generar Cotización Formal
            </button>
            <button 
              onClick={() => setVistaActiva('produccion')}
              style={{ backgroundColor: vistaActiva === 'produccion' ? '#0284c7' : '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              2. Tablero de Taller ({cotizaciones.length})
            </button>
            <button 
              onClick={() => setVistaActiva('egresos')}
              style={{ backgroundColor: vistaActiva === 'egresos' ? '#0284c7' : '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              3. Control de Egresos ({listaEgresos.length})
            </button>
          </div>
        </div>

        {/* DASHBOARD FINANCIERO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Ventas Totales</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>${totalVentasCobradas.toLocaleString('es-CL')}</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Costo Producción</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f87171', marginTop: '4px' }}>-${totalCostoProduccion.toLocaleString('es-CL')}</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Egresos del Taller</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f87171', marginTop: '4px' }}>-${totalEgresosTaller.toLocaleString('es-CL')}</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Utilidad Neta Real</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4ade80', marginTop: '4px' }}>${utilidadNetaReal.toLocaleString('es-CL')}</div>
          </div>
        </div>

        {vistaActiva === 'cotizador' && (
          <div style={{ backgroundColor: '#18181b', padding: '2.5rem', borderRadius: '12px', border: '1px solid #27272a', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#ffffff', margin: '0 0 0.5rem 0' }}>Generar Cotización Formal</h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.95rem', marginTop: 0, marginBottom: '1.5rem' }}>
              Portal interno: Asigna datos de empresa, genera número de orden automático y exporta a PDF para WhatsApp.
            </p>

            <form onSubmit={guardarCotizacionFormal} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* DATOS DE LA EMPRESA / CLIENTE (Formato Oficial) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', backgroundColor: '#09090b', padding: '1.2rem', borderRadius: '8px', border: '1px solid #27272a' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Empresa *</label>
                  <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required placeholder="Nombre de empresa" style={{ width: '100%', padding: '10px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Giro</label>
                  <input type="text" value={giro} onChange={(e) => setGiro(e.target.value)} placeholder="Giro comercial" style={{ width: '100%', padding: '10px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>RUT</label>
                  <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="Ej. 76.xxx.xxx-x" style={{ width: '100%', padding: '10px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Contacto</label>
                  <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Nombre del contacto" style={{ width: '100%', padding: '10px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Dirección</label>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección fiscal" style={{ width: '100%', padding: '10px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Teléfono WhatsApp</label>
                  <input type="text" value={telefonoWhatsApp} onChange={(e) => setTelefonoWhatsApp(e.target.value)} placeholder="Ej. 56912345678" style={{ width: '100%', padding: '10px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* PRODUCTO Y MEDIDAS */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Producto / Material</label>
                <select 
                  value={materialSeleccionado} 
                  onChange={(e) => setMaterialSeleccionado(e.target.value)} 
                  style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box', fontSize: '0.95rem' }}
                >
                  {Object.keys(preciosMateriales).map((mat) => (
                    <option key={mat} value={mat}>
                      {mat} — ${preciosMateriales[mat].toLocaleString('es-CL')} / m²
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Descripción detallada del ítem</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Impresión y laminado en Trovicel" style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Ancho (cm)</label>
                  <input type="number" step="0.01" value={ancho} onChange={(e) => setAncho(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Alto (cm)</label>
                  <input type="number" step="0.01" value={alto} onChange={(e) => setAlto(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Cantidad (Cant.)</label>
                  <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* COSTOS INTERNOS Y FINANZAS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#f87171', display: 'block', marginBottom: '0.4rem' }}>Costo Producción ($)</label>
                  <input type="number" value={costoMaterialBase} onChange={(e) => setCostoMaterialBase(e.target.value)} placeholder="Insumos" style={{ width: '100%', padding: '10px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '0.4rem' }}>Extras/LED ($)</label>
                  <input type="number" value={costoExtras} onChange={(e) => setCostoExtras(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '0.4rem' }}>Abono ($)</label>
                  <input type="number" value={abono} onChange={(e) => setAbono(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* TOTALES FORMALES (Neto, IVA, Total) */}
              <div style={{ backgroundColor: '#09090b', padding: '1.2rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Neto</span>
                  <div style={{ fontSize: '1.1rem', color: '#e4e4e7', fontWeight: 'bold' }}>${netoFinal.toLocaleString('es-CL')}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>IVA 19%</span>
                  <div style={{ fontSize: '1.1rem', color: '#e4e4e7', fontWeight: 'bold' }}>${iva.toLocaleString('es-CL')}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Total con IVA</span>
                  <div style={{ fontSize: '1.3rem', color: '#38bdf8', fontWeight: 'bold' }}>${totalConIva.toLocaleString('es-CL')} CLP</div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={cargando}
                style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', width: 'fit-content' }}
              >
                {cargando ? 'Generando...' : 'Generar y Guardar Cotización Formal'}
              </button>
            </form>

            {mensaje && <p style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '0.9rem', color: mensaje.includes('éxito') ? '#4ade80' : '#f87171' }}>{mensaje}</p>}
          </div>
        )}

        {vistaActiva === 'produccion' && (
          <div style={{ backgroundColor: '#18181b', padding: '2rem', borderRadius: '12px', border: '1px solid #27272a', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>Tablero y Seguimiento de Taller</h3>
              <input type="text" placeholder="🔍 Buscar por empresa, RUT o material..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['TODOS', 'Pendiente', 'En Diseño', 'En Corte/Producción', 'Listo', 'Entregado'].map((est) => (
                  <button key={est} onClick={() => setFiltroEstado(est)} style={{ backgroundColor: filtroEstado === est ? '#0284c7' : '#09090b', color: filtroEstado === est ? 'white' : '#a1a1aa', border: '1px solid #27272a', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {est}
                  </button>
                ))}
              </div>
            </div>

            {cotizaciones.filter(item => {
              const b = busqueda.toLowerCase();
              const matchB = item.cliente?.toLowerCase().includes(b) || item.rut?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b);
              const matchE = filtroEstado === 'TODOS' || item.estado === filtroEstado;
              return matchB && matchE;
            }).length === 0 ? (
              <p style={{ color: '#a1a1aa', textAlign: 'center' }}>No se encontraron registros en este estado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                      <th style={{ padding: '10px' }}>N° Cot. / Empresa</th>
                      <th style={{ padding: '10px' }}>Detalle</th>
                      <th style={{ padding: '10px' }}>Total (IVA Incl.)</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Estado Taller</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Acciones PDF / WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizaciones.filter(item => {
                      const b = busqueda.toLowerCase();
                      return (item.cliente?.toLowerCase().includes(b) || item.rut?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b)) && (filtroEstado === 'TODOS' || item.estado === filtroEstado);
                    }).map((item) => {
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #27272a' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>N° {item.nro_cotizacion || item.id.slice(0, 5)}</div>
                            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>{item.cliente}</div>
                            <div style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>RUT: {item.rut || 'S/N'}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ color: '#e4e4e7' }}>{item.descripcion}</div>
                            <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{item.ancho} x {item.alto} cm (Cant: {item.cantidad || 1})</div>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: '#38bdf8' }}>
                            ${Number(item.total).toLocaleString('es-CL')} CLP
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button onClick={() => cambiarEstado(item.id, item.estado || 'Pendiente')} title="Avanzar estado" style={{ backgroundColor: 'transparent', border: `1px solid ${getColorEstado(item.estado)}`, color: getColorEstado(item.estado), padding: '6px 10px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                              {item.estado || 'Pendiente'}
                            </button>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button onClick={() => generarPDFFormal(item)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>PDF</button>
                              <button onClick={() => enviarWhatsAppFormal(item)} style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>WhatsApp</button>
                              <button onClick={() => eliminarCotizacion(item.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>X</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {vistaActiva === 'egresos' && (
          <div style={{ backgroundColor: '#18181b', padding: '2rem', borderRadius: '12px', border: '1px solid #27272a', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginTop: 0, color: '#0284c7', marginBottom: '1.5rem' }}>Registro de Egresos y Gastos del Taller</h3>
            
            <form onSubmit={guardarEgreso} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end', marginBottom: '2rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Descripción del Gasto: </label>
                <input type="text" value={descEgreso} onChange={(e) => setDescEgreso(e.target.value)} required placeholder="Ej. Compra planchas acrílico, luz..." style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Monto ($ CLP): </label>
                <input type="number" value={montoEgreso} onChange={(e) => setMontoEgreso(e.target.value)} required placeholder="0" style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Categoría: </label>
                <select value={catEgreso} onChange={(e) => setCatEgreso(e.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}>
                  <option value="Insumos / Materiales">Insumos / Materiales</option>
                  <option value="Herramientas / Maquinaria">Herramientas / Maquinaria</option>
                  <option value="Servicios Básicos">Servicios Básicos (Luz/Internet)</option>
                  <option value="Otros Gastos">Otros Gastos</option>
                </select>
              </div>
              <button type="submit" style={{ padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Registrar Gasto</button>
            </form>

            <h4 style={{ color: '#a1a1aa', borderBottom: '1px solid #27272a', paddingBottom: '0.5rem' }}>Historial de Egresos</h4>
            {listaEgresos.length === 0 ? (
              <p style={{ color: '#a1a1aa', textAlign: 'center' }}>No hay egresos registrados.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                    <th style={{ padding: '10px' }}>Fecha</th>
                    <th style={{ padding: '10px' }}>Descripción</th>
                    <th style={{ padding: '10px' }}>Categoría</th>
                    <th style={{ padding: '10px' }}>Monto</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {listaEgresos.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '12px' }}>{new Date(item.created_at).toLocaleDateString('es-CL')}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.descripcion}</td>
                      <td style={{ padding: '12px', color: '#38bdf8' }}>{item.categoria}</td>
                      <td style={{ padding: '12px', color: '#f87171', fontWeight: 'bold' }}>-${Number(item.monto).toLocaleString('es-CL')}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button onClick={() => eliminarEgreso(item.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}