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

  // Precios dinámicos cargados desde Supabase
  const [preciosMateriales, setPreciosMateriales] = useState({});

  const [costoMaterialBase, setCostoMaterialBase] = useState('');
  const [costoExtras, setCostoExtras] = useState('');
  const [abono, setAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  
  // Egresos, Inventario y Filtros
  const [descEgreso, setDescEgreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [catEgreso, setCatEgreso] = useState('Insumos / Materiales');
  const [listaEgresos, setListaEgresos] = useState([]);
  
  // Inventario agrupado por categorías
  const [inventario, setInventario] = useState([]);
  const [nuevoMaterialCategoria, setNuevoMaterialCategoria] = useState('Neón LED Flex');
  const [nuevoMaterialNombre, setNuevoMaterialNombre] = useState('');
  const [nuevoMaterialColor, setNuevoMaterialColor] = useState('');
  const [nuevoMaterialEspesor, setNuevoMaterialEspesor] = useState('3mm');
  const [nuevoMaterialStock, setNuevoMaterialStock] = useState('');
  const [nuevoMaterialUnidad, setNuevoMaterialUnidad] = useState('paquetes (5m)');

  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cotizaciones, setCotizaciones] = useState([]);

  const cargarDatos = async () => {
    const { data: dataCot } = await supabase.from('cotizaciones').select('*').order('created_at', { ascending: false });
    if (dataCot) setCotizaciones(dataCot);

    const { data: dataEgr } = await supabase.from('egresos').select('*').order('created_at', { ascending: false });
    if (dataEgr) setListaEgresos(dataEgr);

    const { data: dataInv } = await supabase.from('inventario').select('*').order('categoria', { ascending: true });
    if (dataInv) setInventario(dataInv);

    const { data: dataPrecios } = await supabase.from('precios_materiales').select('*').order('nombre', { ascending: true });
    if (dataPrecios && dataPrecios.length > 0) {
      const mapaPrecios = {};
      dataPrecios.forEach(p => {
        mapaPrecios[p.nombre] = p.precio_m2;
      });
      setPreciosMateriales(mapaPrecios);
    }
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'precios_materiales' }, () => cargarDatos())
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

  const cambiarEstado = async (id, estadoActual) => {
    const estadosPosibles = ['Pendiente', 'En Diseño', 'En Corte/Producción', 'Listo', 'Entregado'];
    const indiceActual = estadosPosibles.indexOf(estadoActual);
    const siguienteEstado = estadosPosibles[(indiceActual !== -1 ? indiceActual + 1 : 0) % estadosPosibles.length];

    const { error } = await supabase.from('cotizaciones').update({ estado: siguienteEstado }).eq('id', id);
    if (!error) cargarDatos();
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

  const categoriasOrden = ['Neón LED Flex', 'Planchas de Acrílico', 'Planchas de Trovicel', 'Vinilos y Impresión', 'General'];
  const inventarioAgrupado = categoriasOrden.reduce((acc, cat) => {
    acc[cat] = inventario.filter(item => (item.categoria || 'General') === cat);
    return acc;
  }, {});

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
            <div onClick={() => setVistaActiva('cotizador')} style={{ flex: '1 1 0px', minWidth: '130px', backgroundColor: vistaActiva === 'cotizador' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'cotizador' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>NUEVA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>1. Cotización</div>
            </div>

            <div onClick={() => setVistaActiva('pendientes')} style={{ flex: '1 1 0px', minWidth: '130px', backgroundColor: vistaActiva === 'pendientes' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'pendientes' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>ORDEN</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>2. Órdenes ({pendientesTrabajos.length})</div>
            </div>

            <div onClick={() => setVistaActiva('produccion')} style={{ flex: '1 1 0px', minWidth: '130px', backgroundColor: vistaActiva === 'produccion' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'produccion' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 'bold' }}>KANBAN</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>3. Taller ({cotizaciones.length})</div>
            </div>

            <div onClick={() => setVistaActiva('crm')} style={{ flex: '1 1 0px', minWidth: '130px', backgroundColor: vistaActiva === 'crm' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'crm' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold' }}>CLIENTES</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>4. CRM ({clientesCRM.length})</div>
            </div>

            <div onClick={() => setVistaActiva('inventario')} style={{ flex: '1 1 0px', minWidth: '130px', backgroundColor: vistaActiva === 'inventario' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'inventario' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 'bold' }}>BODEGA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>6. Inventario</div>
            </div>

            {/* PESTAÑA PRECIOS */}
            <div onClick={() => setVistaActiva('precios')} style={{ flex: '1 1 0px', minWidth: '130px', backgroundColor: vistaActiva === 'precios' ? '#0284c7' : '#0f172a', border: `2px solid ${vistaActiva === 'precios' ? '#38bdf8' : '#334155'}`, padding: '0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 'bold' }}>TARIFAS</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>8. Precios</div>
            </div>
          </div>
        </div>

        {/* 1. COTIZADOR */}
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
                    <option key={mat} value={mat}>{mat} — ${(preciosMateriales[mat] || 0).toLocaleString('es-CL')} / m²</option>
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

        {/* 8. GESTIÓN DE PRECIOS */}
        {vistaActiva === 'precios' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#a855f7' }}>💲 Gestión de Precios y Tarifas por m²</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '-10px' }}>Modifica los valores unitarios de cada material. Los cambios se aplicarán automáticamente al cotizar.</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}>
                  <th style={{ padding: '12px' }}>Producto / Material</th>
                  <th style={{ padding: '12px' }}>Precio Actual por m² ($ CLP)</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(preciosMateriales).map((mat) => (
                  <tr key={mat} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px', fontWeight: 'bold', color: 'white' }}>{mat}</td>
                    <td style={{ padding: '14px', color: '#4ade80', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      ${(preciosMateriales[mat] || 0).toLocaleString('es-CL')}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <button onClick={async () => {
                        const nuevoPrecio = prompt(`Ingrese el nuevo precio por m² para ${mat}:`, preciosMateriales[mat]);
                        if (nuevoPrecio !== null && !isNaN(nuevoPrecio)) {
                          const valNum = parseFloat(nuevoPrecio);
                          // Actualizar en Supabase
                          const { error } = await supabase
                            .from('precios_materiales')
                            .update({ precio_m2: valNum })
                            .eq('nombre', mat);

                          if (!error) {
                            cargarDatos();
                          } else {
                            // Si no existe el registro exacto por nombre, lo insertamos
                            await supabase.from('precios_materiales').insert([{ nombre: mat, precio_m2: valNum }]);
                            cargarDatos();
                          }
                        }
                      }} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Modificar Precio</button>
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