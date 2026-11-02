import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  // Pestañas principales del Portal Único Fixel Manager
  const [vistaActiva, setVistaActiva] = useState('cotizador'); // 'cotizador', 'produccion' o 'egresos'

  // Estados del Formulario de Cotización
  const [cliente, setCliente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ancho, setAncho] = useState('120');
  const [alto, setAlto] = useState('80');
  const [cantidad, setCantidad] = useState('1');
  
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
  
  // Estados de Egresos
  const [descEgreso, setDescEgreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [catEgreso, setCatEgreso] = useState('Insumos / Materiales');
  const [listaEgresos, setListaEgresos] = useState([]);

  // Filtros y Listas
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

  const calcularSubtotalEnTiempoReal = () => {
    const a = parseFloat(ancho) || 0;
    const h = parseFloat(alto) || 0;
    const cant = parseInt(cantidad) || 1;
    const m2 = (a / 100) * (h / 100);
    const precioM2 = preciosMateriales[materialSeleccionado] || 0;
    return Math.round(m2 * precioM2 * cant);
  };

  const subtotalActual = calcularSubtotalEnTiempoReal();

  const agregarALaSolicitud = async (e) => {
    e.preventDefault();
    if (!ancho || !alto || !cliente) {
      alert('Por favor completa al menos el Cliente, Ancho y Alto.');
      return;
    }

    const extrasVal = parseFloat(costoExtras) || 0;
    const abonoVal = parseFloat(abono) || 0;
    const costoInt = parseFloat(costoMaterialBase) || 0;
    
    const precioFinal = subtotalActual + extrasVal;
    const utilidadDinero = precioFinal - costoInt;
    const margenPorcentaje = precioFinal > 0 ? Math.round((utilidadDinero / precioFinal) * 100) : 0;

    setCargando(true);
    setMensaje('');

    const { error } = await supabase
      .from('cotizaciones')
      .insert([
        {
          cliente: cliente,
          descripcion: `${descripcion || 'Producto a medida'} (Cant: ${cantidad})`,
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
      setMensaje('¡Solicitud guardada en producción con éxito!');
      cargarDatos();
      setCliente('');
      setDescripcion('');
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
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* ENCABEZADO Y PORTAL DE NAVEGACIÓN POR PESTAÑAS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#1e293b', padding: '1.2rem 1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
          <div>
            <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '1.5rem' }}>Fixel Manager</h2>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Portal Integral de Taller y Producción</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setVistaActiva('cotizador')}
              style={{ backgroundColor: vistaActiva === 'cotizador' ? '#0284c7' : '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              1. Nueva Solicitud / Cotizar[cite: 8]
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
              3. Control de Egresos ({listaEgresos.length})[cite: 5]
            </button>
          </div>
        </div>

        {/* DASHBOARD FINANCIERO GLOBAL */}
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

        {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
        {vistaActiva === 'cotizador' && (
          <div style={{ backgroundColor: '#18181b', padding: '2.5rem', borderRadius: '12px', border: '1px solid #27272a', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#ffffff', margin: '0 0 0.5rem 0' }}>Cotizar</h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.95rem', marginTop: 0, marginBottom: '1.5rem' }}>
              Arma tu solicitud con tus precios. Se registrará automáticamente en el tablero de taller[cite: 8].
            </p>

            <div style={{ backgroundColor: '#0f273d', borderLeft: '4px solid #0284c7', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#38bdf8', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                SOBRE LOS PRECIOS
              </div>
              <div style={{ color: '#d4d4d8', fontSize: '0.9rem' }}>
                Catálogo sincronizado por metro cuadrado ($/m²). El valor se ajusta con las medidas y cantidad.
              </div>
            </div>

            <form onSubmit={agregarALaSolicitud} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Cliente / Empresa *</label>
                  <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} required placeholder="Nombre del cliente" style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Detalle / Nota del trabajo</label>
                  <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Letrero corpóreo fachada" style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Ancho (cm)</label>
                  <input type="number" step="0.01" value={ancho} onChange={(e) => setAncho(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Alto (cm)</label>
                  <input type="number" step="0.01" value={alto} onChange={(e) => setAlto(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Cantidad</label>
                <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>

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

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Subtotal</label>
                <div style={{ width: '100%', padding: '14px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: '#38bdf8', fontWeight: 'bold', fontSize: '1.2rem', boxSizing: 'border-box' }}>
                  ${subtotalActual.toLocaleString('es-CL')} CLP
                </div>
              </div>

              <button 
                type="submit" 
                disabled={cargando}
                style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', width: 'fit-content' }}
              >
                {cargando ? 'Guardando...' : 'Agregar a la solicitud'}
              </button>
            </form>

            {mensaje && <p style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '0.9rem', color: mensaje.includes('éxito') ? '#4ade80' : '#f87171' }}>{mensaje}</p>}
          </div>
        )}

        {vistaActiva === 'produccion' && (
          <div style={{ backgroundColor: '#18181b', padding: '2rem', borderRadius: '12px', border: '1px solid #27272a', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>Tablero y Seguimiento de Taller</h3>
              <input type="text" placeholder="🔍 Buscar por cliente, material o descripción..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              
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
              const matchB = item.cliente?.toLowerCase().includes(b) || item.material?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b);
              const matchE = filtroEstado === 'TODOS' || item.estado === filtroEstado;
              return matchB && matchE;
            }).length === 0 ? (
              <p style={{ color: '#a1a1aa', textAlign: 'center' }}>No se encontraron registros en este estado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                      <th style={{ padding: '10px' }}>Cliente / Detalle</th>
                      <th style={{ padding: '10px' }}>Medidas / Mat.</th>
                      <th style={{ padding: '10px' }}>Finanzas (Venta/Costo/Margen)</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Estado (Flujo Taller)</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizaciones.filter(item => {
                      const b = busqueda.toLowerCase();
                      return (item.cliente?.toLowerCase().includes(b) || item.material?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b)) && (filtroEstado === 'TODOS' || item.estado === filtroEstado);
                    }).map((item) => {
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #27272a' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{item.cliente}</div>
                            <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{item.descripcion}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div>{item.ancho} x {item.alto} cm</div>
                            <div style={{ color: '#38bdf8', fontSize: '0.8rem' }}>{item.material}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>Venta: ${Number(item.total).toLocaleString('es-CL')}</div>
                            <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Costo: -${Number(item.costo_material || 0).toLocaleString('es-CL')}</div>
                            <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>Margen: {item.margen_utilidad || 0}%</div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button onClick={() => cambiarEstado(item.id, item.estado || 'Pendiente')} title="Haz clic para avanzar de estado en el taller" style={{ backgroundColor: 'transparent', border: `1px solid ${getColorEstado(item.estado)}`, color: getColorEstado(item.estado), padding: '6px 10px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                              {item.estado || 'Pendiente'}
                            </button>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button onClick={() => eliminarCotizacion(item.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Eliminar</button>
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