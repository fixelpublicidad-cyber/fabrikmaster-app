import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

export default function App() {
  const [cliente, setCliente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ancho, setAncho] = useState('');
  const [alto, setAlto] = useState('');
  const [material, setMaterial] = useState('Acrílico');
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
    const precioBase = precios[material] || 2.5;
    const resultadoCalculado = Math.round(numAncho * numAlto * precioBase);

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
          total: resultadoCalculado,
        },
      ]);

    setCargando(false);

    if (error) {
      console.error('Error al guardar:', error);
      setMensaje('Error al guardar: ' + error.message);
    } else {
      setMensaje('¡Cotización guardada exitosamente!');
      cargarHistorial();
      // Limpiar formulario opcionalmente
      setCliente('');
      setDescripcion('');
      setAncho('');
      setAlto('');
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
    doc.text(`Cliente: ${item.cliente || 'General'}`, 20, 35);
    doc.text(`Detalle: ${item.descripcion || 'Sin descripción'}`, 20, 45);
    doc.text(`Fecha: ${new Date(item.created_at).toLocaleDateString('es-CL')}`, 20, 55);
    doc.text(`Material: ${item.material}`, 20, 65);
    doc.text(`Dimensiones: ${item.ancho} cm x ${item.alto} cm`, 20, 75);
    doc.text(`Total Estimado: $${Number(item.total).toLocaleString('es-CL')} CLP`, 20, 85);

    doc.setDrawColor(200);
    doc.line(20, 95, 190, 95);

    doc.setFontSize(10);
    doc.text('Gracias por su preferencia - Fixel Publicidad', 20, 105);

    doc.save(`Cotizacion_${item.cliente || 'Fixel'}_${item.material}.pdf`);
  };

  const enviarWhatsApp = (item) => {
    const texto = `Hola *${item.cliente}*! 👋 Aquí tienes el resumen de tu cotización en *Fixel Publicidad*:\n\n🛠️ *Trabajo:* ${item.descripcion}\n📐 *Medidas:* ${item.ancho} x ${item.alto} cm\n🧱 *Material:* ${item.material}\n💰 *Total:* \$${Number(item.total).toLocaleString('es-CL')} CLP\n\nQuedamos atentos a tus comentarios. ¡Saludos!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: 'sans-serif', padding: '2rem 1rem', color: '#f8fafc' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* FORMULARIO DE COTIZACIÓN */}
        <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <h2 style={{ textAlign: 'center', color: '#38bdf8', marginTop: 0, marginBottom: '1.5rem' }}>Cotizador Fixel</h2>
          
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
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

              <button 
                type="submit" 
                disabled={cargando}
                style={{ padding: '12px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {cargando ? 'Guardando...' : 'Calcular y Guardar'}
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

        {/* HISTORIAL DE COTIZACIONES */}
        <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#38bdf8' }}>Historial de Cotizaciones</h3>

          {cotizaciones.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>No hay cotizaciones guardadas aún.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>Cliente</th>
                    <th style={{ padding: '10px' }}>Detalle</th>
                    <th style={{ padding: '10px' }}>Medidas</th>
                    <th style={{ padding: '10px' }}>Material</th>
                    <th style={{ padding: '10px' }}>Total</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizaciones.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.cliente || 'S/N'}</td>
                      <td style={{ padding: '10px', color: '#cbd5e1' }}>{item.descripcion}</td>
                      <td style={{ padding: '10px' }}>{item.ancho} x {item.alto} cm</td>
                      <td style={{ padding: '10px' }}>{item.material}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#38bdf8' }}>${Number(item.total).toLocaleString('es-CL')} CLP</td>
                      <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button 
                          onClick={() => enviarWhatsApp(item)}
                          title="Enviar por WhatsApp"
                          style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          WApp
                        </button>
                        <button 
                          onClick={() => descargarPDF(item)}
                          title="Descargar PDF"
                          style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          PDF
                        </button>
                        <button 
                          onClick={() => eliminarCotizacion(item.id)}
                          title="Eliminar"
                          style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}