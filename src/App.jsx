import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

export default function App() {
  const [cliente, setCliente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ancho, setAncho] = useState('');
  const [alto, setAlto] = useState('');
  const [material, setMaterial] = useState('Acrílico');
  const [costoExtras, setCostoExtras] = useState('');
  const [abono, setAbono] = useState('');
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  
  const [total, setTotal] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cotizaciones, setCotizaciones] = useState([]);

  const precios = {
    'Acrílico': 3.5,
    'Trovicel': 2.0,
    'MDF': 1.8
  };

  const cargarHistorial = async () => {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCotizaciones(data);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const calcularYGuardar = async (e) => {
    e.preventDefault();
    if (!ancho || !alto || !cliente) return;

    const numAncho = parseFloat(ancho);
    const numAlto = parseFloat(alto);
    const extrasVal = parseFloat(costoExtras) || 0;
    const abonoVal = parseFloat(abono) || 0;
    
    const precioBase = precios[material] || 2.5;
    const calculoMaterial = numAncho * numAlto * precioBase;
    const resultadoCalculado = Math.round(calculoMaterial + extrasVal);

    setTotal(resultadoCalculado);
    setCargando(true);
    setMensaje('');

    const { error } = await supabase
      .from('cotizaciones')
      .insert([
        {
          cliente: cliente,
          descripcion: descripcion || 'Trabajo de rotulación / corte',
          ancho: numAncho,
          alto: numAlto,
          material: material,
          extras: extrasVal,
          abono: abonoVal,
          total: resultadoCalculado,
          estado: 'Pendiente'
        },
      ]);

    setCargando(false);

    if (error) {
      console.error('Error al guardar:', error);
      setMensaje('Error al guardar: ' + error.message);
    } else {
      setMensaje('¡Cotización guardada exitosamente!');
      cargarHistorial();
      setCliente('');
      setDescripcion('');
      setAncho('');
      setAlto('');
      setCostoExtras('');
      setAbono('');
    }
  };

  const cambiarEstado = async (id, estadoActual) => {
    const estadosPosibles = ['Pendiente', 'Aprobado', 'En Taller', 'Entregado'];
    const siguienteEstado = estadosPosibles[(estadosPosibles.indexOf(estadoActual) + 1) % estadosPosibles.length];

    const { error } = await supabase
      .from('cotizaciones')
      .update({ estado: siguienteEstado })
      .eq('id', id);

    if (!error) {
      cargarHistorial();
    } else {
      alert('Error al actualizar estado: ' + error.message);
    }
  };

  const eliminarCotizacion = async (id) => {
    const { error } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('id', id);

    if (!error) {
      cargarHistorial();
    } else {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const descargarPDF = (item) => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('COTIZACIÓN - FIXEL PUBLICIDAD', 20, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${item.cliente}`, 20, 35);
    doc.text(`Detalle: ${item.descripcion}`, 20, 45);
    doc.text(`Fecha: ${new Date(item.created_at).toLocaleDateString('es-CL')}`, 20, 55);
    doc.text(`Material: ${item.material} (${item.ancho} x ${item.alto} cm)`, 20, 65);
    
    let yPos = 75;
    if (item.extras > 0) {
      doc.text(`Extras / LED: $${Number(item.extras).toLocaleString('es-CL')} CLP`, 20, yPos);
      yPos += 10;
    }
    doc.text(`Total Estimado: $${Number(item.total).toLocaleString('es-CL')} CLP`, 20, yPos);
    yPos += 10;
    if (item.abono > 0) {
      doc.text(`Abono / Anticipo: $${Number(item.abono).toLocaleString('es-CL')} CLP`, 20, yPos);
      yPos += 10;
      doc.text(`Saldo Pendiente: $${Number(item.total - item.abono).toLocaleString('es-CL')} CLP`, 20, yPos);
      yPos += 10;
    }

    doc.setDrawColor(200);
    doc.line(20, yPos, 190, yPos);

    doc.setFontSize(10);
    doc.text('Gracias por su preferencia - Fixel Publicidad', 20, yPos + 10);

    doc.save(`Cotizacion_${item.cliente}_${item.material}.pdf`);
  };

  const enviarWhatsApp = (item) => {
    const saldo = item.total - (item.abono || 0);
    const texto = `Hola *${item.cliente}*! 👋 Resumen de tu proyecto en *Fixel Publicidad*:\n\n🛠️ *Trabajo:* ${item.descripcion}\n📐 *Medidas:* ${item.ancho} x ${item.alto} cm\n🧱 *Material:* ${item.material}\n${item.extras > 0 ? `💡 *Adicionales/LED:* \$${Number(item.extras).toLocaleString('es-CL')} CLP\n` : ''}💰 *Total:* \$${Number(item.total).toLocaleString('es-CL')} CLP\n${item.abono > 0 ? `📥 *Abonado:* \$${Number(item.abono).toLocaleString('es-CL')} CLP\n⏳ *Saldo pendiente:* \$${Number(saldo).toLocaleString('es-CL')} CLP\n` : ''}Estado: *${item.estado}*.\n\n¡Quedamos atentos!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  // Filtrado avanzado (Búsqueda + Estado)
  const cotizacionesFiltradas = cotizaciones.filter((item) => {
    const textoBusqueda = busqueda.toLowerCase();
    const clienteMatch = item.cliente?.toLowerCase().includes(textoBusqueda);
    const materialMatch = item.material?.toLowerCase().includes(textoBusqueda);
    const descripcionMatch = item.descripcion?.toLowerCase().includes(textoBusqueda);
    
    const cumpleBusqueda = clienteMatch || materialMatch || descripcionMatch;
    const cumpleEstado = filtroEstado === 'TODOS' || item.estado === filtroEstado;

    return cumpleBusqueda && cumpleEstado;
  });

  // Métricas financieras rápidas
  const totalVentas = cotizaciones.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const totalPendienteCobro = cotizaciones
    .filter(i => i.estado !== 'Entregado')
    .reduce((acc, item) => acc + (Number(item.total || 0) - Number(item.abono || 0)), 0);

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'Aprobado': return '#38bdf8';
      case 'En Taller': return '#f59e0b';
      case 'Entregado': return '#4ade80';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: 'sans-serif', padding: '2rem 1rem', color: '#f8fafc' }}>
      <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* RESUMEN FINANCIERO SUPERIOR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Volumen Total Registrado</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
              ${totalVentas.toLocaleString('es-CL')} CLP
            </div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Saldo Pendiente en Taller</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>
              ${totalPendienteCobro.toLocaleString('es-CL')} CLP
            </div>
          </div>
        </div>

        {/* FORMULARIO */}
        <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <h2 style={{ textAlign: 'center', color: '#38bdf8', marginTop: 0, marginBottom: '1.5rem' }}>Cotizador y Producción Fixel</h2>
          
          <form onSubmit={calcularYGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Cliente / Empresa: </label>
                <input 
                  type="text" 
                  value={cliente} 
                  onChange={(e) => setCliente(e.target.value)} 
                  required 
                  placeholder="Ej. Comercial Juan"
                  style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Descripción del trabajo: </label>
                <input 
                  type="text" 
                  value={descripcion} 
                  onChange={(e) => setDescripcion(e.target.value)} 
                  placeholder="Ej. Letrero LED fachada"
                  style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Ancho (cm): </label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={ancho} 
                  onChange={(e) => setAncho(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Alto (cm): </label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={alto} 
                  onChange={(e) => setAlto(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Material: </label>
                <select 
                  value={material} 
                  onChange={(e) => setMaterial(e.target.value)}
                  style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                >
                  <option value="Acrílico">Acrílico</option>
                  <option value="Trovicel">Trovicel</option>
                  <option value="MDF">MDF</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Extras/LED ($): </label>
                <input 
                  type="number" 
                  value={costoExtras} 
                  onChange={(e) => setCostoExtras(e.target.value)} 
                  placeholder="0"
                  style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Abono ($): </label>
                <input 
                  type="number" 
                  value={abono} 
                  onChange={(e) => setAbono(e.target.value)} 
                  placeholder="0"
                  style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={cargando}
                style={{ padding: '12px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {cargando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>

          {total !== null && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#0f172a', borderRadius: '6px', textAlign: 'center', border: '1px solid #334155' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Total estimado:</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
                ${total.toLocaleString('es-CL')} CLP
              </div>
            </div>
          )}

          {mensaje && (
            <p style={{ marginTop: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: mensaje.includes('exitosamente') ? '#4ade80' : '#f87171' }}>
              {mensaje}
            </p>
          )}
        </div>

        {/* HISTORIAL Y GESTIÓN DE PRODUCCIÓN */}
        <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#38bdf8' }}>Historial y Tablero de Producción</h3>
            
            {/* Buscador */}
            <input 
              type="text" 
              placeholder="🔍 Buscar por cliente, material o descripción..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
            />

            {/* Filtros rápidos por estado */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['TODOS', 'Pendiente', 'Aprobado', 'En Taller', 'Entregado'].map((est) => (
                <button
                  key={est}
                  onClick={() => setFiltroEstado(est)}
                  style={{
                    backgroundColor: filtroEstado === est ? '#0284c7' : '#0f172a',
                    color: filtroEstado === est ? 'white' : '#94a3b8',
                    border: '1px solid #334155',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}
                >
                  {est}
                </button>
              ))}
            </div>
          </div>

          {cotizacionesFiltradas.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>No se encontraron registros.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '8px' }}>Cliente / Detalle</th>
                    <th style={{ padding: '8px' }}>Medidas / Mat.</th>
                    <th style={{ padding: '8px' }}>Total / Saldo</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizacionesFiltradas.map((item) => {
                    const saldoPendiente = Number(item.total || 0) - Number(item.abono || 0);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{item.cliente}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.descripcion}</div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div>{item.ancho} x {item.alto} cm</div>
                          <div style={{ color: '#38bdf8', fontSize: '0.8rem' }}>{item.material} {item.extras > 0 ? `(+extras)` : ''}</div>
                        </td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>${Number(item.total).toLocaleString('es-CL')}</div>
                          {item.abono > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Saldo: ${Number(saldoPendiente).toLocaleString('es-CL')}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            onClick={() => cambiarEstado(item.id, item.estado || 'Pendiente')}
                            title="Clic para cambiar estado"
                            style={{ backgroundColor: 'transparent', border: `1px solid ${getColorEstado(item.estado)}`, color: getColorEstado(item.estado), padding: '4px 8px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                          >
                            {item.estado || 'Pendiente'}
                          </button>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                            <button 
                              onClick={() => enviarWhatsApp(item)}
                              title="Enviar WhatsApp"
                              style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '5px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                            >
                              W
                            </button>
                            <button 
                              onClick={() => descargarPDF(item)}
                              title="Descargar PDF"
                              style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '5px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                            >
                              PDF
                            </button>
                            <button 
                              onClick={() => eliminarCotizacion(item.id)}
                              title="Eliminar"
                              style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '5px 6px', borderRadius: '