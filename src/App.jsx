import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [ancho, setAncho] = useState('');
  const [alto, setAlto] = useState('');
  const [material, setMaterial] = useState('Acrílico');
  const [total, setTotal] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const precios = {
    'Acrílico': 2.5,
    'Trovicel': 1.8,
    'MDF': 1.2
  };

  const calcularYGuardar = async (e) => {
    e.preventDefault();
    if (!ancho || !alto) return;

    const numAncho = parseFloat(ancho);
    const numAlto = parseFloat(alto);
    const precioBase = precios[material] || 2.0;
    const resultadoCalculado = Math.round(numAncho * numAlto * precioBase);

    setTotal(resultadoCalculado);
    setCargando(true);
    setMensaje('');

    // Guardar en la tabla 'cotizaciones' de Supabase
    const { data, error } = await supabase
      .from('cotizaciones')
      .insert([
        {
          ancho: numAncho,
          alto: numAlto,
          material: material,
          total: resultadoCalculado,
        },
      ]);

    setCargando(false);

    if (error) {
      console.error('Error al guardar:', error);
      setMensaje('Error al guardar en la base de datos');
    } else {
      setMensaje('¡Cotización guardada exitosamente!');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '320px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#38bdf8', textAlign: 'center', marginBottom: '1.5rem' }}>Cotizador Fixel App</h2>
        
        <form onSubmit={calcularYGuardar}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Ancho (cm):</label>
            <input 
              type="number" 
              value={ancho} 
              onChange={(e) => setAncho(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }} 
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Alto (cm):</label>
            <input 
              type="number" 
              value={alto} 
              onChange={(e) => setAlto(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }} 
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Material:</label>
            <select 
              value={material} 
              onChange={(e) => setMaterial(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
            >
              <option value="Acrílico">Acrílico</option>
              <option value="Trovicel">Trovicel</option>
              <option value="MDF">MDF</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {cargando ? 'Guardando...' : 'Calcular y Guardar'}
          </button>
        </form>

        {total !== null && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', textAlign: 'center', borderLeft: '4px solid #0284c7' }}>
            <span style={{ fontSize: '1.1rem' }}>Total estimado: <strong>${total.toLocaleString('es-CL')} CLP</strong></span>
          </div>
        )}

        {mensaje && (
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: mensaje.includes('Error') ? '#ef4444' : '#22c55e' }}>
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
}