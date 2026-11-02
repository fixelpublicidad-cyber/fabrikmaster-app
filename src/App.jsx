import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

export default function App() {
  const [vistaActiva, setVistaActiva] = useState('cotizador');

  const [cliente, setCliente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ancho, setAncho] = useState('');
  const [alto, setAlto] = useState('');
  
  // Catálogo completo basado en las imágenes provistas (Precios por m2)
  const [materialSeleccionado, setMaterialSeleccionado] = useState('Acrílico 3 mm Blanco');
  
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
  
  const [descEgreso, setDescEgreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [catEgreso, setCatEgreso] = useState('Insumos / Materiales');
  const [listaEgresos, setListaEgresos] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [total, setTotal] = useState(null);
  const [margenCalculado, setMargenCalculado] = useState(null);
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

  const calcularYGuardar = async (e) => {
    e.preventDefault();
    if (!ancho || !alto || !cliente) return;

    // Convertir ancho y alto de centímetros a metros para el cálculo por m2
    const numAnchoMetros = parseFloat(ancho) / 100;
    const numAltoMetros = parseFloat(alto) / 100;
    const metrosCuadrados = numAnchoMetros * numAltoMetros;

    const extrasVal = parseFloat(costoExtras) || 0;
    const abonoVal = parseFloat(abono) || 0;
    const costoInt = parseFloat(costoMaterialBase) || 0;
    
    const precioPorM2 = preciosMateriales[materialSeleccionado] || 10000;
    const calculoMaterial = metrosCuadrados * precioPorM2;
    const precioFinal = Math.round(calculoMaterial + extrasVal);

    const utilidadDinero = precioFinal - costoInt;
    const margenPorcentaje = precioFinal > 0 ? Math.round((utilidadDinero / precioFinal) * 100) : 0;

    setTotal(precioFinal);
    setMargenCalculado(margenPorcentaje);
    setCargando(true);
    setMensaje('');

    const { error } = await supabase
      .from('cotizaciones')
      .insert([
        {
          cliente: cliente,
          descripcion: descripcion || 'Trabajo de taller',
          ancho: parseFloat(ancho),
          alto: parseFloat(alto),
          material: materialSeleccionado,
          extras: extrasVal,
          abono: abonoVal,
          total: precioFinal,
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
      setMensaje('¡Cotización y costos guardados con éxito!');
      cargarDatos();
      setCliente('');
      setDescripcion('');
      setAncho('');
      setAlto('');
      setCostoMaterialBase('');
      setCostoExtras('');
      setAbono('');
    }
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
      <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* ENCABEZADO Y NAVEGACIÓN */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#1e293b', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ margin: 0, color: '#38bdf8' }}>Fixel Manager</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setVistaActiva('cotizador')}
              style={{ backgroundColor: vistaActiva === 'cotizador' ? '#0284c7' : '#0f172a', color: 'white', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Cotizador y Producción
            </button>
            <button 
              onClick={() => setVistaActiva('egresos')}
              style={{ backgroundColor: vistaActiva === 'egresos' ? '#0284c7' : '#0f172a', color: 'white', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Control de Egresos ({listaEgresos.length})
            </button>
          </div>
        </div>

        {/* DASHBOARD FINANCIERO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Ventas Totales</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>${totalVentasCobradas.toLocaleString('es-CL')}</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Costo Materiales / Prod.</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f87171', marginTop: '4px' }}>-${totalCostoProduccion.toLocaleString('es-CL')}</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Egresos del Taller</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f87171', marginTop: '4px' }}>-${totalEgresosTaller.toLocaleString('es-CL')}</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Utilidad Neta Real</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4ade80', marginTop: '4px' }}>${utilidadNetaReal.toLocaleString('es-CL')}</div>
          </div>
        </div>

        {vistaActiva === 'cotizador' ? (
          <>
            {/* FORMULARIO */}
            <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
              <h3 style={{ marginTop: 0, color: '#38bdf8', marginBottom: '1.5rem' }}>Nueva Cotización por m² (Catálogo Fixel)</h3>
              
              <form onSubmit={calcularYGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Cliente / Empresa: </label>
                    <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} required placeholder="Ej. Comercial Juan" style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Descripción del trabajo: </label>
                    <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Letrero LED fachada" style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Ancho (cm): </label>
                    <input type="number" step="0.01" value={ancho} onChange={(e) => setAncho(e.target.value)} required placeholder="Ej. 100" style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Alto (cm): </label>
                    <input type="number" step="0.01" value={alto} onChange={(e) => setAlto(e.target.value)} required placeholder="Ej. 50" style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Material / Opción ($/m²): </label>
                    <select value={materialSeleccionado} onChange={(e) => setMaterialSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}>
                      {Object.keys(preciosMateriales).map((mat) => (
                        <option key={mat} value={mat}>
                          {mat} (${preciosMateriales[mat].toLocaleString('es-CL')} / m²)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: '#f87171' }}>Costo Producción ($): </label>
                    <input type="number" value={costoMaterialBase} onChange={(e) => setCostoMaterialBase(e.target.value)} placeholder="Insumos" style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Extras/LED ($): </label>
                    <input type="number" value={costoExtras} onChange={(e) => setCostoExtras(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Abono ($): </label>
                    <input type="number" value={abono} onChange={(e) => setAbono(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                  </div>

                  <button type="submit" disabled={cargando} style={{ padding: '12px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {cargando ? 'Guardando...' : 'Calcular y Guardar'}
                  </button>
                </div>
              </form>

              {total !== null && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#0f172a', borderRadius: '6px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', border: '1px solid #334155', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Precio Total Cliente:</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#38bdf8' }}>${total.toLocaleString('es-CL')} CLP</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Margen de Utilidad Est.:</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4ade80' }}>{margenCalculado}%</div>
                  </div>
                </div>
              )}

              {mensaje && <p style={{ marginTop: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: mensaje.includes('éxito') ? '#4ade80' : '#f87171' }}>{mensaje}</p>}
            </div>

            {/* TABLERO DE PRODUCCIÓN */}
            <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: '#38bdf8' }}>Historial y Tablero de Producción</h3>
                <input type="text" placeholder="🔍 Buscar por cliente, material o descripción..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['TODOS', 'Pendiente', 'En Diseño', 'En Corte/Producción', 'Listo', 'Entregado'].map((est) => (
                    <button key={est} onClick={() => setFiltroEstado(est)} style={{ backgroundColor: filtroEstado === est ? '#0284c7' : '#0f172a', color: filtroEstado === est ? 'white' : '#94a3b8', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {est}
                    </button>
                  ))}
                </div>
              </div>

              {cotizaciones.filter(item => {
                const b = busqueda.toLowerCase();
                const matchB = item.cliente?.toLowerCase().includes(b) || item.material?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b);
                const matchE = filtroEstado === 'TODOS' || item.estado === filtroEstado;
                return matchB && matchE;
              }).length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center' }}>No se encontraron registros.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '8px' }}>Cliente / Detalle</th>
                        <th style={{ padding: '8px' }}>Medidas / Mat.</th>
                        <th style={{ padding: '8px' }}>Finanzas (Venta/Costo/Margen)</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Estado (Flujo Taller)</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotizaciones.filter(item => {
                        const b = busqueda.toLowerCase();
                        return (item.cliente?.toLowerCase().includes(b) || item.material?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b)) && (filtroEstado === 'TODOS' || item.estado === filtroEstado);
                      }).map((item) => {
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{item.cliente}</div>
                              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.descripcion}</div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <div>{item.ancho} x {item.alto} cm</div>
                              <div style={{ color: '#38bdf8', fontSize: '0.8rem' }}>{item.material}</div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>Venta: ${Number(item.total).toLocaleString('es-CL')}</div>
                              <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Costo: -${Number(item.costo_material || 0).toLocaleString('es-CL')}</div>
                              <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>Margen: {item.margen_utilidad || 0}%</div>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <button onClick={() => cambiarEstado(item.id, item.estado || 'Pendiente')} title="Haz clic para avanzar de estado" style={{ backgroundColor: 'transparent', border: `1px solid ${getColorEstado(item.estado)}`, color: getColorEstado(item.estado), padding: '4px 8px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                {item.estado || 'Pendiente'}
                              </button>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button onClick={() => eliminarCotizacion(item.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Eliminar</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* MÓDULO DE EGRESOS */
          <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, color: '#38bdf8', marginBottom: '1.5rem' }}>Registro de Egresos y Gastos del Taller</h3>
            
            <form onSubmit={guardarEgreso} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end', marginBottom: '2rem' }}>
              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Descripción del Gasto: </label>
                <input type="text" value={descEgreso} onChange={(e) => setDescEgreso(e.target.value)} required placeholder="Ej. Compra planchas acrílico, luz..." style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Monto ($ CLP): </label>
                <input type="number" value={montoEgreso} onChange={(e) => setMontoEgreso(e.target.value)} required placeholder="0" style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Categoría: </label>
                <select value={catEgreso} onChange={(e) => setCatEgreso(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}>
                  <option value="Insumos / Materiales">Insumos / Materiales</option>
                  <option value="Herramientas / Maquinaria">Herramientas / Maquinaria</option>
                  <option value="Servicios Básicos">Servicios Básicos (Luz/Internet)</option>
                  <option value="Otros Gastos">Otros Gastos</option>
                </select>
              </div>
              <button type="submit" style={{ padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Registrar Gasto</button>
            </form>

            <h4 style={{ color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Historial de Egresos</h4>
            {listaEgresos.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center' }}>No hay egresos registrados.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '8px' }}>Fecha</th>
                    <th style={{ padding: '8px' }}>Descripción</th>
                    <th style={{ padding: '8px' }}>Categoría</th>
                    <th style={{ padding: '8px' }}>Monto</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {listaEgresos.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '10px' }}>{new Date(item.created_at).toLocaleDateString('es-CL')}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.descripcion}</td>
                      <td style={{ padding: '10px', color: '#38bdf8' }}>{item.categoria}</td>
                      <td style={{ padding: '10px', color: '#f87171', fontWeight: 'bold' }}>-${Number(item.monto).toLocaleString('es-CL')}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button onClick={() => eliminarEgreso(item.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Eliminar</button>
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