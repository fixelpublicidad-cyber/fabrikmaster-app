import React, { useState } from 'react'

export default function App() {
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [material, setMaterial] = useState('acrilico')
  const [total, setTotal] = useState(null)

  const calcularCotizacion = (e) => {
    e.preventDefault()
    const a = parseFloat(ancho) || 0
    const h = parseFloat(alto) || 0
    const areaM2 = (a * h) / 10000 // cálculo de cm² a m²

    let precioBaseM2 = 25000
    if (material === 'pvc') precioBaseM2 = 18000
    if (material === 'neoflex') precioBaseM2 = 35000

    const resultado = Math.round(areaM2 * precioBaseM2)
    setTotal(resultado > 0 ? resultado : 0)
  }

  return (
    <div className="container">
      <h1>Cotizador FabrikMaster OS</h1>
      <form onSubmit={calcularCotizacion}>
        <div className="form-group">
          <label>Ancho (cm):</label>
          <input 
            type="number" 
            value={ancho} 
            onChange={(e) => setAncho(e.target.value)} 
            placeholder="Ej: 100" 
            required 
          />
        </div>

        <div className="form-group">
          <label>Alto (cm):</label>
          <input 
            type="number" 
            value={alto} 
            onChange={(e) => setAlto(e.target.value)} 
            placeholder="Ej: 50" 
            required 
          />
        </div>

        <div className="form-group">
          <label>Material:</label>
          <select value={material} onChange={(e) => setMaterial(e.target.value)}>
            <option value="acrilico">Acrílico</option>
            <option value="pvc">PVC Espumado</option>
            <option value="neoflex">Neon Flex</option>
          </select>
        </div>

        <button type="submit">Calcular Cotización</button>
      </form>

      {total !== null && (
        <div className="result">
          Total estimado: <strong>${total.toLocaleString('es-CL')} CLP</strong>
        </div>
      )}
    </div>
  )
}