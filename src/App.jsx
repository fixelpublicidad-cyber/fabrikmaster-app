import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

export default function App() {
  const [vistaTallerExclusiva, setVistaTallerExclusiva] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('cotizador');
  const [busquedaGlobal, setBusquedaGlobal] = useState('');

  const [empresa, setEmpresa] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [giro, setGiro] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');
  const [conFactura, setConFactura] = useState(true);

  const [itemsCotizacion, setItemsCotizacion] = useState([
    {
      id: Date.now(),
      formaLetrero: 'No requiere / Estándar',
      materialSeleccionado: 'Trovicel 5 mm + Gráfica Laminado PVC',
      ancho: '100',
      alto: '50',
      cantidad: '1',
      descripcion: '',
      notasTecnicas: '',
      llevaNeon1Gen: false,
      metrosNeon: '0',
      precioManual: '',
      incluirBastidor: false,
      imagenArchivo: ''
    }
  ]);

  const [abono, setAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('');
  const [operadorAsignado, setOperadorAsignado] = useState('Operador 1');

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [preciosMateriales, setPreciosMateriales] = useState({
    'Trovicel 5 mm + Gráfica Laminado PVC': 35000,
    'Trovicel 3 mm + Gráfica laminado PVC': 32000,
    'Acrílico 3 mm Transparente': 80000,
    'Acrílico 4 mm + Gráfica': 90000,
    'Trovicel 10 mm Corpóreo': 55000,
    'Trovicel 20 mm Corpóreo': 85000,
    'Panaflex FILM Backlight - Backlite': 16000,
  });

  const [nuevoMatNombre, setNuevoMatNombre] = useState('');
  const [nuevoMatPrecio, setNuevoMatPrecio] = useState('');
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cotizaciones, setCotizaciones] = useState([]);

  const cargarDatos = async () => {
    const { data: dataCot } = await supabase.from('cotizaciones').select('*').order('created_at', { ascending: false });
    if (dataCot) setCotizaciones(dataCot);
    const { data: dataInv } = await supabase.from('inventario').select('*').order('categoria', { ascending: true });
    if (dataInv) setInventario(dataInv);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vista') === 'taller') setVistaTallerExclusiva(true);
    cargarDatos();
  }, []);

  const agregarItemFormulario = () => {
    setItemsCotizacion([
      ...itemsCotizacion,
      {
        id: Date.now(),
        formaLetrero: 'No requiere / Estándar',
        materialSeleccionado: Object.keys(preciosMateriales)[0],
        ancho: '100',
        alto: '50',
        cantidad: '1',
        descripcion: '',
        notasTecnicas: '',
        llevaNeon1Gen: false,
        metrosNeon: '0',
        precioManual: '',
        incluirBastidor: false,
        imagenArchivo: ''
      }
    ]);
  };

  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...itemsCotizacion];
    nuevosItems[index][campo] = valor;
    setItemsCotizacion(nuevosItems);
  };

  const eliminarItemFormulario = (index) => {
    if (itemsCotizacion.length === 1) return;
    setItemsCotizacion(itemsCotizacion.filter((_, i) => i !== index));
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
    let subtotalMaterial = m2 * precioM2;
    let costoNeon = item.llevaNeon1Gen ? (parseFloat(item.metrosNeon) || 0) * 8000 : 0;
    let costoBastidor = item.incluirBastidor ? (((parseFloat(item.ancho) || 0) + (parseFloat(item.alto) || 0)) * 2 / 100) * 8000 : 0;
    let calculoAutomatico = subtotalMaterial + costoNeon + costoBastidor;
    return item.precioManual !== '' ? (parseFloat(item.precioManual) || 0) : calculoAutomatico;
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
      alert('Por favor complete la empresa.');
      return;
    }
    setCargando(true);
    const nroCotizacion = cotizaciones.length + 5;
    const { error } = await supabase.from('cotizaciones').insert([
      {
        cliente: empresa,
        rut,
        direccion,
        giro,
        contacto,
        telefono: telefonoWhatsApp,
        nro_cotizacion: nroCotizacion,
        material: `${itemsCotizacion.length} ítems`,
        descripcion: 'Solicitud multi-ítem',
        items_json: itemsCotizacion,
        neto: netoGlobal,
        iva: ivaGlobal,
        total: totalGlobal,
        con_factura: conFactura,
        estado: 'Pendiente'
      }
    ]);
    setCargando(false);
    if (!error) {
      alert('¡Orden guardada con éxito!');
      cargarDatos();
    }
  };

  const clientesCRM = Array.from(new Set(cotizaciones.map(c => c.cliente))).map(nombreEmpresa => {
    const trabajosCliente = cotizaciones.filter(c => c.cliente === nombreEmpresa);
    return {
      empresa: nombreEmpresa,
      rut: trabajosCliente[0]?.rut || '---',
      giro: trabajosCliente[0]?.giro || '---',
      contacto: trabajosCliente[0]?.contacto || '---',
      totalGastado: trabajosCliente.reduce((acc, c) => acc + Number(c.total || 0), 0)
    };
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', fontFamily: 'sans-serif', padding: '2rem 1rem', color: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        <div style={{ backgroundColor: '#131c2e', padding: '1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, color: '#38bdf8' }}>Fixel Manager</h2>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Portal de Taller</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setVistaActiva('cotizador')} style={{ background: vistaActiva === 'cotizador' ? '#0284c7' : '#1e293b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cotizador</button>
            <button onClick={() => setVistaActiva('crm')} style={{ background: vistaActiva === 'crm' ? '#0284c7' : '#1e293b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>CRM Clientes ({clientesCRM.length})</button>
          </div>
        </div>

        {vistaActiva === 'cotizador' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h1 style={{ color: '#ffffff', margin: 0 }}>Nueva Cotización Multi-ítem</h1>
            
            <form onSubmit={guardarCotizacionFormal} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', backgroundColor: '#090d16', padding: '1.5rem', borderRadius: '12px' }}>
                <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required placeholder="Empresa *" style={{ padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                <input type="text" value={giro} onChange={(e) => setGiro(e.target.value)} placeholder="Giro" style={{ padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="RUT" style={{ padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Contacto" style={{ padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
              </div>

              <div style={{ backgroundColor: '#090d16', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: '#38bdf8', margin: 0 }}>Ítems de la Solicitud[cite: 5]</h3>
                  <button type="button" onClick={agregarItemFormulario} style={{ backgroundColor: '#f97316', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Agregar a la solicitud[cite: 5]</button>
                </div>

                {itemsCotizacion.map((item, index) => (
                  <div key={item.id} style={{ backgroundColor: '#131c2e', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <select value={item.materialSeleccionado} onChange={(e) => actualizarItem(index, 'materialSeleccionado', e.target.value)} style={{ padding: '8px', backgroundColor: '#090d16', color: 'white', border: '1px solid #334155', borderRadius: '6px', flex: 1 }}>
                        {Object.keys(preciosMateriales).map(mat => <option key={mat} value={mat}>{mat}</option>)}
                      </select>
                      <button type="button" onClick={() => eliminarItemFormulario(index)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginLeft: '10px' }}>Quitar[cite: 5]</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      <input type="number" value={item.ancho} onChange={(e) => actualizarItem(index, 'ancho', e.target.value)} placeholder="Ancho cm" style={{ padding: '6px', background: '#090d16', color: 'white', border: '1px solid #334155', borderRadius: '4px' }} />
                      <input type="number" value={item.alto} onChange={(e) => actualizarItem(index, 'alto', e.target.value)} placeholder="Alto cm" style={{ padding: '6px', background: '#090d16', color: 'white', border: '1px solid #334155', borderRadius: '4px' }} />
                      <input type="number" value={item.cantidad} onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)} placeholder="Cant" style={{ padding: '6px', background: '#090d16', color: 'white', border: '1px solid #334155', borderRadius: '4px' }} />
                      <div style={{ textAlign: 'right', color: '#4ade80', fontWeight: 'bold', alignSelf: 'center' }}>Subtotal: ${Math.round(calcularTotalItem(item)).toLocaleString('es-CL')}[cite: 5]</div>
                    </div>
                  </div>
                ))}

                <div style={{ textAlign: 'right', fontSize: '1.2rem', color: '#38bdf8', fontWeight: 'bold' }}>
                  Total referencial: ${Math.round(totalGlobal).toLocaleString('es-CL')}[cite: 5]
                </div>
              </div>

              <button type="submit" disabled={cargando} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: 'fit-content' }}>
                {cargando ? 'Guardando...' : 'Guardar Orden'}
              </button>
            </form>
          </div>
        )}

        {vistaActiva === 'crm' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px' }}>
            <h3 style={{ color: '#38bdf8' }}>Directorio de Clientes CRM</h3>
            <ul>
              {clientesCRM.map((c, i) => <li key={i} style={{ color: 'white', margin: '8px 0' }}>{c.empresa} — Gasto total: ${c.totalGastado.toLocaleString('es-CL')}</li>)}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}