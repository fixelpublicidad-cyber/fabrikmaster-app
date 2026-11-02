import { useState } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [cliente, setCliente] = useState('');
  const [ancho, setAncho] = useState('');
  const [alto, setAlto] = useState('');
  const [material, setMaterial] = useState('Acrílico');
  const [total, setTotal] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const precios = {
    'Acrílico': 3.5,
    'Trovicel': 2.0,
    'MDF': 1.8
  };

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

    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .insert([
          {
            cliente: cliente,
            ancho: numAncho,
            alto: numAlto,
            material: material,
            total: resultadoCalculado,
          },
        ])
        .select();

      if (error) {
        console.error('Error detallado de Supabase:', error);
        setMensaje('Error: ' + error.message);
      } else {
        setMensaje('¡Cotización guardada exitosamente!');
      }
    } catch (err) {
      console.error('Error de red:', err);
      setMensaje('Error de conexión al guardar.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', color: '#f8fafc' }}>
        <h2 style={{ textAlign: 'center', color: '#38bdf8', marginBottom: '1.5rem' }}>Cotizador Fixel</h2>
        
        <form onSubmit={calcularYGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Nombre del Cliente: </label>
            <input 
              type="text" 
              value={cliente} 
              onChange={(e) => setCliente(e.target.value)} 
              required 
              placeholder="Ej. Juan Pérez"
              style={{ width: '100%', padding: '10px', marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
            />
          </div>

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
            style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '0.5rem' }}
          >
            {cargando ? 'Guardando...' : 'Calcular y Guardar'}
          </button>
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
    </div>
  );
}

export default App;