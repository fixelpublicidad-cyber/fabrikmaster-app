import { useState } from 'react';
import { supabase } from './supabaseClient';

function App() {
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
    if (!ancho || !alto) return;

    const numAncho = parseFloat(ancho);
    const numAlto = parseFloat(alto);
    const precioBase = precios[material] || 2.5;
    const resultadoCalculado = Math.round(numAncho * numAlto * precioBase);

    setTotal(resultadoCalculado);
    setCargando(true);
    setMensaje('');

    const { data, error } = await supabase
      .from('cotizaciones')
      .insert([
        {
          ancho: numAncho,
          alto: numAlto,
          material: material,
          total: resultadoCalculado,
        },
      ])
      .select();

    setCargando(false);

    if (error) {
      console.error('Error detallado al guardar:', error.message);
      setMensaje('Error al guardar: ' + error.message);
    } else {
      setMensaje('¡Cotización guardada exitosamente!');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Cotizador Fixel</h1>
      
      <form onSubmit={calcularYGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label>Ancho (m): </label>
          <input 
            type="number" 
            step="0.01" 
            value={ancho} 
            onChange={(e) => setAncho(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        <div>
          <label>Alto (m): </label>
          <input 
            type="number" 
            step="0.01" 
            value={alto} 
            onChange={(e) => setAlto(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        <div>
          <label>Material: </label>
          <select 
            value={material} 
            onChange={(e) => setMaterial(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            <option value="Acrílico">Acrílico</option>
            <option value="Trovicel">Trovicel</option>
            <option value="MDF">MDF</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={cargando}
          style={{ padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {cargando ? 'Guardando...' : 'Calcular y Guardar'}
        </button>
      </form>

      {total !== null && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
          <h3>Total estimado: ${total} CLP</h3>
        </div>
      )}

      {mensaje && (
        <p style={{ marginTop: '1rem', fontWeight: 'bold', color: mensaje.includes('exitosamente') ? 'green' : 'red' }}>
          {mensaje}
        </p>
      )}
    </div>
  );
}

export default App;