import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

export default function App() {
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
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  
  // Egresos, Inventario y Filtros
  const [descEgreso, setDescEgreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [catEgreso, setCatEgreso] = useState('Insumos / Materiales');
  const [listaEgresos, setListaEgresos] = useState([]);
  const [filtroMes, setFiltroMes] = useState('todos');

  // Inventario local de bodega
  const [inventario, setInventario] = useState([
    { id: 1, material: 'Planchas Acrílico 3mm Blanco', stock: 10, unidad: 'planchas' },
    { id: 2, material: 'Planchas Trovicel 3mm', stock: 15, unidad: 'planchas' },
    { id: 3, material: 'Planchas Trovicel 5mm', stock: 8, unidad: 'planchas' },
    { id: 4, material: 'Vinilo Adhesivo Impresión (Rollo)', stock: 2, unidad: 'rollos' },
  ]);

  const [busqueda, setBusqueda] = useState('');
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
    const handleGlobalPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagenArchivo(reader.result);
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, []);

  const procesarArchivo = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setImagenArchivo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImagenChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarArchivo(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      procesarArchivo(e.dataTransfer.files[0]);
    }
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
          estado: 'Pendiente'
        },
      ]);

    setCargando(false);

    if (error) {
      console.error('Error al guardar:', error);
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
      setImagenArchivo('');
      setFechaEntregaEstimada('');
      setConFactura(true);
    }
  };

  const duplicarCotizacion = (item) => {
    setEmpresa(item.cliente || '');
    setRut(item.rut || '');
    setDireccion(item.direccion || '');
    setGiro(item.giro || '');
    setContacto(item.contacto || '');
    setTelefonoWhatsApp(item.telefono || '');
    setMaterialSeleccionado(item.material || 'Trovicel 3 mm + Gráfica laminado PVC');
    setDescripcion(item.descripcion || '');
    setAncho(String(item.ancho || '120'));
    setAlto(String(item.alto || '80'));
    setCantidad(String(item.cantidad || '1'));
    setCostoMaterialBase(String(item.costo_material || ''));
    setCostoExtras(String(item.extras || ''));
    setAbono(String(item.abono || ''));
    setFechaEntregaEstimada(item.fecha_entrega || '');
    setImagenArchivo(item.imagen_archivo || '');
    setConFactura(item.con_factura !== false);
    setVistaActiva('cotizador');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const registrarAbonoAdicional = async (id, abonoActual, totalTrabajo) => {
    const nuevoPagoStr = prompt('Ingrese el monto del nuevo abono o pago parcial ($ CLP):');
    if (!nuevoPagoStr) return;
    const pagoExtra = parseFloat(nuevoPagoStr) || 0;
    const nuevoTotalAbonado = Number(abonoActual) + pagoExtra;

    if (nuevoTotalAbonado > totalTrabajo) {
      alert('El abono total no puede superar el monto total del trabajo.');
      return;
    }

    const { error } = await supabase.from('cotizaciones').update({ abono: nuevoTotalAbonado }).eq('id', id);
    if (!error) cargarDatos();
  };

  const generarPDFFormal = (item) => {
    const doc = new jsPDF();
    
    doc.setFillColor(255, 255, 255);
    doc.rect(20, 15, 75, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(0, 140, 255);
    doc.text('FIXEL', 22, 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('• NEON LED  •  LETREROS EN ACRÍLICO •', 22, 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('Cotización', 145, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date(item.created_at || Date.now()).toLocaleDateString('es-CL')}`, 135, 30);
    const nroStr = String(item.nro_cotizacion || 5).padStart(3, '0');
    doc.text(`Cot. N°: ${nroStr}`, 135, 36);

    doc.setFontSize(10);
    doc.text(`EMPRESA: ${item.cliente || '---'}`, 20, 50);
    doc.text(`GIRO: ${item.giro || '---'}`, 110, 50);
    doc.text(`RUT: ${item.rut || '---'}`, 20, 58);
    doc.text(`CONTACTO: ${item.contacto || item.telefono || '---'}`, 110, 58);
    doc.text(`DIRECCIÓN: ${item.direccion || '---'}`, 20, 66);

    doc.setFillColor(0, 0, 0);
    doc.rect(20, 76, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('CANT.', 23, 82);
    doc.text('DESCRIPCIÓN', 50, 82);
    doc.text('VALOR U', 135, 82);
    doc.text('NETO', 165, 82);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(String(item.cantidad || 1), 25, 94);
    doc.text(String(item.descripcion || 'Servicio de taller'), 50, 94, { maxWidth: 75 });
    doc.text(`$${Number(item.valor_unitario || item.total).toLocaleString('es-CL')}`, 135, 94);
    doc.text(`$${Number(item.neto || item.total).toLocaleString('es-CL')}`, 165, 94);

    doc.setLineWidth(0.5);
    doc.line(20, 125, 190, 125);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('*TODA COTIZACIÓN TIENE UNA VIGENCIA DE 10 DÍAS*', 20, 138);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal', 130, 138);
    doc.text(`$${Number(item.neto || item.total).toLocaleString('es-CL')}`, 170, 138, { align: 'right' });

    if (item.con_factura !== false) {
      doc.text('IVA 19%', 130, 146);
      doc.text(`$${Number(item.iva || Math.round(item.total * 0.19)).toLocaleString('es-CL')}`, 170, 146, { align: 'right' });
    } else {
      doc.text('Sin Factura (Neto Final)', 110, 146);
      doc.text('$0', 170, 146, { align: 'right' });
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Total', 130, 154);
    doc.text(`$${Number(item.total).toLocaleString('es-CL')}`, 170, 154, { align: 'right' });

    doc.setFillColor(0, 0, 0);
    doc.rect(20, 170, 170, 4, 'F');

    doc.save(`Cotizacion_Fixel_${nroStr}.pdf`);
  };

  const generarPDFOperativo = (item) => {
    const doc = new jsPDF();
    const nroStr = String(item.nro_cotizacion || 5).padStart(3, '0');
    const fechaIngreso = new Date(item.created_at || Date.now()).toLocaleDateString('es-CL');
    const fechaEntregaTxt = item.fecha_entrega ? new Date(item.fecha_entrega).toLocaleDateString('es-CL') : 'Por definir';

    // MARCO EXTERIOR GENERAL
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);

    // ENCABEZADO CON LOGO OFICIAL
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(0, 120, 255);
    doc.text('FIXEL', 105, 20, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('• NEON LED  •  LETREROS EN ACRÍLICO •', 105, 25, { align: 'center' });

    doc.line(10, 30, 200, 30);

    // DATOS CLIENTE
    doc.setFontSize(9.5);
    doc.text(`Empresa: ${item.cliente || '---'}`, 14, 37);
    doc.text(`Contacto: ${item.contacto || item.telefono || '---'}`, 85, 37);
    doc.text(`Solicito: ${item.contacto || '---'}`, 150, 37);

    doc.line(10, 41, 200, 41);

    // N° OC Y FECHAS
    doc.text(`N°DE OC: ${nroStr}`, 14, 48);
    doc.text(`Fecha de Ingreso: ${fechaIngreso}`, 75, 48);
    doc.text(`Fecha de Entrega: ${fechaEntregaTxt}`, 138, 48);

    doc.line(10, 52, 200, 52);

    // IMPRESIÓN
    doc.setFillColor(0, 0, 0);
    doc.rect(10, 52, 32, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Impresión', 12, 58);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('ADHESIVO', 46, 58);
    doc.rect(70, 54, 5, 5);

    doc.text('ONE VISION', 80, 58);
    doc.rect(104, 54, 5, 5);

    doc.text('TELA PVC', 114, 58);
    doc.rect(134, 54, 5, 5);

    doc.text('PANAFLEX', 144, 58);
    doc.rect(168, 54, 5, 5);

    doc.text('BLACKOUT', 174, 58);
    doc.rect(193, 54, 5, 5);

    doc.line(10, 60, 200, 60);

    // LAMINADO
    doc.setFillColor(0, 0, 0);
    doc.rect(10, 60, 32, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Laminado', 12, 66);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('PVC MATE', 46, 66);
    doc.rect(70, 62, 5, 5);

    doc.text('PVC BRILLANTE', 80, 66);
    doc.rect(114, 62, 5, 5);

    doc.text('TROQUEL', 124, 66);
    doc.rect(149, 62, 5, 5);

    doc.text('SIN LAMINAR', 155, 66);
    doc.rect(193, 62, 5, 5);

    doc.line(10, 68, 200, 68);

    // CORTE
    doc.setFillColor(0, 0, 0);
    doc.rect(10, 68, 32, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Corte', 12, 74);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('LASER', 50, 74);
    doc.rect(70, 70, 5, 5);
    doc.setFillColor(255, 0, 0);
    doc.rect(71, 71, 3, 3, 'F');

    doc.text('ROUTER', 88, 74);
    doc.rect(114, 70, 5, 5);

    doc.text('MANUAL', 130, 74);
    doc.rect(149, 70, 5, 5);

    doc.text('INSTALACION', 159, 74);
    doc.rect(193, 70, 5, 5);

    doc.line(10, 76, 200, 76);

    // OBSERVACIONES
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Observaciones: ${item.descripcion || 'Ninguna'}`, 12, 82);

    doc.line(10, 86, 200, 86);

    // FRANJA NEGRA ADVERTENCIA
    doc.setFillColor(0, 0, 0);
    doc.rect(10, 86, 190, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('REVISAR CUIDADOSAMENTE CADA DETALLE DE LOS DISEÑOS E INFORMAR CUALQUIER IRREGULARIDAD O DUDA', 105, 90.5, { align: 'center' });

    // ZONA DE BOCETO / IMAGEN CON MEDIDAS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(200, 0, 0);
    doc.text(`${item.ancho || 0}x${item.alto || 0} cm`, 105, 101, { align: 'center' });

    if (item.imagen_archivo) {
      try {
        doc.addImage(item.imagen_archivo, 'JPEG', 35, 105, 140, 115);
      } catch (e) {
        console.error(e);
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Sin imagen de referencia adjunta', 105, 160, { align: 'center' });
    }

    // PIE DE PÁGINA (FIRMAS Y TÉRMINO)
    doc.line(10, 260, 200, 260);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('GUÍA REVISADA POR: _________________________', 14, 270);
    doc.text('TERMINADO Y REVISADO POR: ___________________', 72, 270);
    doc.text('FECHA TÉRMINO: ____/____/_______', 142, 270);

    doc.save(`Orden_Taller_${nroStr}.pdf`);
  };

  const enviarWhatsAppFormal = (item) => {
    const telefono = item.telefono ? item.telefono.replace(/\s+/g, '') : '';
    const nroStr = String(item.nro_cotizacion || 5).padStart(3, '0');
    const facturaTxt = item.con_factura !== false ? '🧾 *IVA (19% incluido)*' : '📌 *Sin Factura (Venta Directa)*';
    
    // Enlace de seguimiento en tiempo real simulado para el cliente
    const linkSeguimiento = `https://fixel-manager.web.app/seguimiento/${item.id}`;

    const texto = `Hola *${item.cliente}*! 👋 Adjuntamos el resumen de su Cotización N° *${nroStr}* en *Fixel Publicidad*:\n\n🛠️ *Detalle:* ${item.descripcion}\n💰 *Monto Total:* \$${Number(item.total).toLocaleString('es-CL')} CLP\n${facturaTxt}\n\n🔍 Puedes revisar el estado de tu letrero en línea aquí:\n${linkSeguimiento}\n\n_Validez: 10 días._ ¡Quedamos atentos!`;
    
    const url = telefono 
      ? `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(texto)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
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

  const egresosFiltrados = listaEgresos.filter(item => {
    if (filtroMes === 'todos') return true;
    const fechaItem = new Date(item.created_at);
    const mesAnio = `${fechaItem.getFullYear()}-${String(fechaItem.getMonth() + 1).padStart(2, '0')}`;
    return mesAnio === filtroMes;
  });

  const pendientesTrabajos = cotizaciones.filter(c => c.estado === 'Pendiente');
  const trabajosEnDiseno = cotizaciones.filter(c => c.estado === 'En Diseño');
  const trabajosEnProduccion = cotizaciones.filter(c => c.estado === 'En Corte/Producción');
  const trabajosListos = cotizaciones.filter(c => c.estado === 'Listo');
  const trabajosEntregados = cotizaciones.filter(c => c.estado === 'Entregado');

  const totalVentasCobradas = cotizaciones.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const totalCostoProduccion = cotizaciones.reduce((acc, item) => acc + Number(item.costo_material || 0), 0);
  const totalEgresosTaller = egresosFiltrados.reduce((acc, item) => acc + Number(item.monto || 0), 0);
  const utilidadNetaReal = totalVentasCobradas - totalCostoProduccion - totalEgresosTaller;

  const renderCardTrabajo = (item) => {
    const nroStr = String(item.nro_cotizacion || 5).padStart(3, '0');
    const estadoActual = item.estado || 'Pendiente';
    const abonoActual = Number(item.abono || 0);
    const totalTrabajo = Number(item.total || 0);
    const saldoPendiente = totalTrabajo - abonoActual;
    
    return (
      <div key={item.id} style={{ backgroundColor: '#090d16', padding: '1rem', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>N° {nroStr}</span>
          <button onClick={() => cambiarEstado(item.id, estadoActual)} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>📍 {estadoActual} ➔</button>
        </div>
        <div style={{ fontWeight: 'bold', color: 'white' }}>{item.cliente}</div>
        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{item.descripcion}</div>
        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.con_factura !== false ? '📄 Con Factura / IVA' : '📌 Sin Factura (Venta Directa)'}</div>
        {item.fecha_entrega && <div style={{ color: '#f59e0b', fontSize: '0.75rem' }}>📅 Entrega: {new Date(item.fecha_entrega).toLocaleDateString('es-CL')}</div>}
        
        {item.imagen_archivo && <img src={item.imagen_archivo} alt="Boceto" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px' }} />}
        
        <div style={{ backgroundColor: '#131c2e', padding: '8px', borderRadius: '6px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontWeight: 'bold' }}>
            <span>Total:</span>
            <span>${totalTrabajo.toLocaleString('es-CL')} CLP</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', marginTop: '2px' }}>
            <span>Abonado:</span>
            <span>${abonoActual.toLocaleString('es-CL')} ({item.metodo_pago || 'Transferencia'})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: saldoPendiente > 0 ? '#f87171' : '#4ade80', marginTop: '2px' }}>
            <span>Saldo:</span>
            <span>${saldoPendiente.toLocaleString('es-CL')}</span>
          </div>
        </div>

        <button onClick={() => registrarAbonoAdicional(item.id, abonoActual, totalTrabajo)} style={{ backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '5px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
          ➕ Registrar Abono Parcial
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: 'auto' }}>
          <button onClick={() => generarPDFFormal(item)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>PDF Cliente</button>
          <button onClick={() => generarPDFOperativo(item)} style={{ backgroundColor: '#f97316', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>PDF Taller</button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={() => duplicarCotizacion(item)} style={{ flex: 1, backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Duplicar</button>
          <button onClick={() => enviarWhatsAppFormal(item)} style={{ flex: 1, backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>WhatsApp</button>
          <button onClick={() => eliminarCotizacion(item.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>🗑️</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', fontFamily: 'sans-serif', padding: '2rem 1rem', color: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* ENCABEZADO Y CUADROS DE NAVEGACIÓN */}
        <div style={{ backgroundColor: '#131c2e', padding: '1.5rem', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 12px 30px rgba(0,0,0,0.4)' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '1.8rem', fontWeight: 'bold' }}>Fixel Manager</h2>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Portal Interno de Control, Cotización y Operación de Taller</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', overflowX: 'auto', paddingBottom: '4px' }}>
            
            <div 
              onClick={() => setVistaActiva('cotizador')}
              style={{
                flex: '1 1 0px',
                minWidth: '180px',
                backgroundColor: vistaActiva === 'cotizador' ? '#0284c7' : '#0f172a',
                border: `2px solid ${vistaActiva === 'cotizador' ? '#38bdf8' : '#334155'}`,
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: vistaActiva === 'cotizador' ? '#e0f2fe' : '#94a3b8', fontWeight: 'bold', letterSpacing: '0.05em' }}>NUEVA</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>1. Cotización</div>
            </div>

            <div 
              onClick={() => setVistaActiva('pendientes')}
              style={{
                flex: '1 1 0px',
                minWidth: '180px',
                backgroundColor: vistaActiva === 'pendientes' ? '#0284c7' : '#0f172a',
                border: `2px solid ${vistaActiva === 'pendientes' ? '#38bdf8' : '#334155'}`,
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.05em' }}>ORDEN DE TRABAJO</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>
                2. Órdenes ({pendientesTrabajos.length})
              </div>
            </div>

            <div 
              onClick={() => setVistaActiva('produccion')}
              style={{
                flex: '1 1 0px',
                minWidth: '180px',
                backgroundColor: vistaActiva === 'produccion' ? '#0284c7' : '#0f172a',
                border: `2px solid ${vistaActiva === 'produccion' ? '#38bdf8' : '#334155'}`,
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 'bold', letterSpacing: '0.05em' }}>TALLER / KANBAN</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>
                3. Taller ({cotizaciones.length})
              </div>
            </div>

            <div 
              onClick={() => setVistaActiva('calendario')}
              style={{
                flex: '1 1 0px',
                minWidth: '180px',
                backgroundColor: vistaActiva === 'calendario' ? '#0284c7' : '#0f172a',
                border: `2px solid ${vistaActiva === 'calendario' ? '#38bdf8' : '#334155'}`,
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 'bold', letterSpacing: '0.05em' }}>AGENDA</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>
                4. Calendario Entregas
              </div>
            </div>

            <div 
              onClick={() => setVistaActiva('inventario')}
              style={{
                flex: '1 1 0px',
                minWidth: '180px',
                backgroundColor: vistaActiva === 'inventario' ? '#0284c7' : '#0f172a',
                border: `2px solid ${vistaActiva === 'inventario' ? '#38bdf8' : '#334155'}`,
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 'bold', letterSpacing: '0.05em' }}>BODEGA</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>
                5. Inventario
              </div>
            </div>

            <div 
              onClick={() => setVistaActiva('egresos')}
              style={{
                flex: '1 1 0px',
                minWidth: '180px',
                backgroundColor: vistaActiva === 'egresos' ? '#0284c7' : '#0f172a',
                border: `2px solid ${vistaActiva === 'egresos' ? '#38bdf8' : '#334155'}`,
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 'bold', letterSpacing: '0.05em' }}>FINANZAS</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>
                6. Egresos y Caja
              </div>
            </div>

          </div>
        </div>

        {/* DASHBOARD FINANCIERO EXCLUSIVO DE LA PESTAÑA FINANZAS */}
        {vistaActiva === 'egresos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: '#131c2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Ventas Totales</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>${totalVentasCobradas.toLocaleString('es-CL')}</div>
            </div>
            <div style={{ backgroundColor: '#131c2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Costo Producción</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f87171', marginTop: '4px' }}>-${totalCostoProduccion.toLocaleString('es-CL')}</div>
            </div>
            <div style={{ backgroundColor: '#131c2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Egresos del Taller</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f87171', marginTop: '4px' }}>-${totalEgresosTaller.toLocaleString('es-CL')}</div>
            </div>
            <div style={{ backgroundColor: '#131c2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Utilidad Neta Real</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4ade80', marginTop: '4px' }}>${utilidadNetaReal.toLocaleString('es-CL')}</div>
            </div>
          </div>
        )}

        {/* 1. FORMULARIO DE COTIZACIÓN */}
        {vistaActiva === 'cotizador' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2.5rem', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#ffffff', margin: '0 0 0.5rem 0' }}>Nueva Cotización Formal</h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.95rem', marginTop: 0, marginBottom: '1.5rem' }}>
              Genera una orden interna, presiona <code style={{ backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>Ctrl + V</code> en cualquier parte para pegar una imagen de referencia, y exporta el PDF.
            </p>

            <form onSubmit={guardarCotizacionFormal} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Empresa *</label>
                  <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required placeholder="Nombre de empresa" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Giro</label>
                  <input type="text" value={giro} onChange={(e) => setGiro(e.target.value)} placeholder="Giro comercial" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>RUT</label>
                  <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="Ej. 76.xxx.xxx-x" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Contacto</label>
                  <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Nombre del contacto" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Dirección</label>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección fiscal" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Teléfono WhatsApp</label>
                  <input type="text" value={telefonoWhatsApp} onChange={(e) => setTelefonoWhatsApp(e.target.value)} placeholder="Ej. 56912345678" style={{ width: '100%', padding: '10px', backgroundColor: '#131c2e', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* TIPO DE VENTA / FACTURACIÓN */}
              <div style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#38bdf8', display: 'block' }}>📄 Régimen Fiscal / Facturación</label>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Selecciona si el trabajo requiere IVA o es una venta directa sin factura para cuadrar cuentas.</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setConFactura(true)}
                    style={{ backgroundColor: conFactura ? '#0284c7' : '#1e293b', color: 'white', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                  >
                    Con Factura / Boleta (+19% IVA)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setConFactura(false)}
                    style={{ backgroundColor: !conFactura ? '#f59e0b' : '#1e293b', color: !conFactura ? '#090d16' : 'white', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                  >
                    Sin Factura (Venta Directa)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Producto / Material</label>
                <select 
                  value={materialSeleccionado} 
                  onChange={(e) => setMaterialSeleccionado(e.target.value)} 
                  style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box', fontSize: '0.95rem' }}
                >
                  {Object.keys(preciosMateriales).map((mat) => (
                    <option key={mat} value={mat}>
                      {mat} — ${preciosMateriales[mat].toLocaleString('es-CL')} / m²
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Descripción detallada del ítem</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Impresión y laminado en Trovicel" style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>

              {/* ZONA DE ARRASTRE Y PEGADO CON CTRL+V */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Imágenes de referencia (opcional)</label>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  style={{
                    backgroundColor: '#090d16',
                    border: '2px dashed #334155',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.8rem'
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>🖼️</div>
                  <div style={{ fontSize: '0.95rem', color: '#e2e8f0' }}>Arrastra imágenes o presiona <code style={{ color: '#38bdf8' }}>Ctrl + V</code> en cualquier parte</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>También puedes usar el botón de abajo. Pre-captura o boceto de diseño.</div>
                  
                  {imagenArchivo && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#131c2e', padding: '8px 12px', borderRadius: '8px', border: '1px solid #38bdf8' }}>
                      <img src={imagenArchivo} alt="Pre-captura" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                      <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 'bold' }}>✓ Imagen cargada correctamente</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <label style={{ backgroundColor: '#1e293b', color: 'white', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid #334155', display: 'inline-block' }}>
                    Elegir archivos
                    <input type="file" accept="image/*" onChange={handleImagenChange} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Ancho (cm)</label>
                  <input type="number" step="0.01" value={ancho} onChange={(e) => setAncho(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Alto (cm)</label>
                  <input type="number" step="0.01" value={alto} onChange={(e) => setAlto(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e4e4e7', display: 'block', marginBottom: '0.4rem' }}>Cantidad (Cant.)</label>
                  <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#f87171', display: 'block', marginBottom: '0.4rem' }}>Costo Producción ($)</label>
                  <input type="number" value={costoMaterialBase} onChange={(e) => setCostoMaterialBase(e.target.value)} placeholder="Insumos" style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '0.4rem' }}>Extras/LED ($)</label>
                  <input type="number" value={costoExtras} onChange={(e) => setCostoExtras(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '0.4rem' }}>Abono Inicial ($)</label>
                  <input type="number" value={abono} onChange={(e) => setAbono(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#38bdf8', display: 'block', marginBottom: '0.4rem' }}>Método de Pago</label>
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="WebPay">WebPay</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'block', marginBottom: '0.4rem' }}>Fecha de Entrega</label>
                  <input type="date" value={fechaEntregaEstimada} onChange={(e) => setFechaEntregaEstimada(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Neto</span>
                  <div style={{ fontSize: '1.1rem', color: '#e4e4e7', fontWeight: 'bold' }}>${netoFinal.toLocaleString('es-CL')}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{conFactura ? 'IVA 19%' : 'Sin Factura'}</span>
                  <div style={{ fontSize: '1.1rem', color: '#e4e4e7', fontWeight: 'bold' }}>{conFactura ? `$${iva.toLocaleString('es-CL')}` : '$0'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Total a Pagar</span>
                  <div style={{ fontSize: '1.3rem', color: '#38bdf8', fontWeight: 'bold' }}>${totalConIva.toLocaleString('es-CL')} CLP</div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={cargando}
                style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', width: 'fit-content' }}
              >
                {cargando ? 'Generando...' : 'Generar y Guardar Cotización Formal'}
              </button>
            </form>

            {mensaje && <p style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '0.9rem', color: mensaje.includes('éxito') ? '#4ade80' : '#f87171' }}>{mensaje}</p>}
          </div>
        )}

        {/* 2. ORDEN DE TRABAJO */}
        {vistaActiva === 'pendientes' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b', fontSize: '1.4rem' }}>📋 Órdenes de Trabajo Pendientes</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Listado exclusivo de órdenes de trabajo iniciales o pendientes de confirmación.
            </p>

            {pendientesTrabajos.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>¡Excelente! No hay órdenes de trabajo pendientes en este momento.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                {pendientesTrabajos.map((item) => renderCardTrabajo(item))}
              </div>
            )}
          </div>
        )}

        {/* 3. TALLER / KANBAN */}
        {vistaActiva === 'produccion' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.4rem' }}>🛠️ Tablero de Taller y Fases de Producción</h3>
              <input type="text" placeholder="🔍 Buscar por empresa, RUT o material..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
            </div>

            {cotizaciones.length === 0 ? (
              <p style={{ color: '#a1a1aa', textAlign: 'center', padding: '2rem' }}>No hay trabajos registrados en el taller.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* 1. Pendientes */}
                <div>
                  <h4 style={{ color: '#f59e0b', borderBottom: '2px solid #f59e0b', paddingBottom: '0.4rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>⏳ Órdenes Pendientes</span>
                    <span style={{ fontSize: '0.85rem', backgroundColor: '#f59e0b22', padding: '2px 8px', borderRadius: '8px' }}>{pendientesTrabajos.length} trabajos</span>
                  </h4>
                  {pendientesTrabajos.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No hay trabajos pendientes.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {pendientesTrabajos.filter(item => {
                        const b = busqueda.toLowerCase();
                        return item.cliente?.toLowerCase().includes(b) || item.rut?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b);
                      }).map((item) => renderCardTrabajo(item))}
                    </div>
                  )}
                </div>

                {/* 2. En Diseño */}
                <div>
                  <h4 style={{ color: '#38bdf8', borderBottom: '2px solid #38bdf8', paddingBottom: '0.4rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🎨 En Diseño</span>
                    <span style={{ fontSize: '0.85rem', backgroundColor: '#38bdf822', padding: '2px 8px', borderRadius: '8px' }}>{trabajosEnDiseno.length} trabajos</span>
                  </h4>
                  {trabajosEnDiseno.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No hay trabajos en diseño.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {trabajosEnDiseno.filter(item => {
                        const b = busqueda.toLowerCase();
                        return item.cliente?.toLowerCase().includes(b) || item.rut?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b);
                      }).map((item) => renderCardTrabajo(item))}
                    </div>
                  )}
                </div>

                {/* 3. En Corte / Producción */}
                <div>
                  <h4 style={{ color: '#f97316', borderBottom: '2px solid #f97316', paddingBottom: '0.4rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>⚙️ En Corte / Producción</span>
                    <span style={{ fontSize: '0.85rem', backgroundColor: '#f9731622', padding: '2px 8px', borderRadius: '8px' }}>{trabajosEnProduccion.length} trabajos</span>
                  </h4>
                  {trabajosEnProduccion.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No hay trabajos en producción.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {trabajosEnProduccion.filter(item => {
                        const b = busqueda.toLowerCase();
                        return item.cliente?.toLowerCase().includes(b) || item.rut?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b);
                      }).map((item) => renderCardTrabajo(item))}
                    </div>
                  )}
                </div>

                {/* 4. Listo para Entregar */}
                <div>
                  <h4 style={{ color: '#a855f7', borderBottom: '2px solid #a855f7', paddingBottom: '0.4rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>✅ Listo para Entregar</span>
                    <span style={{ fontSize: '0.85rem', backgroundColor: '#a855f722', padding: '2px 8px', borderRadius: '8px' }}>{trabajosListos.length} trabajos</span>
                  </h4>
                  {trabajosListos.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No hay trabajos listos.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {trabajosListos.filter(item => {
                        const b = busqueda.toLowerCase();
                        return item.cliente?.toLowerCase().includes(b) || item.rut?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b);
                      }).map((item) => renderCardTrabajo(item))}
                    </div>
                  )}
                </div>

                {/* 5. Entregado */}
                <div>
                  <h4 style={{ color: '#4ade80', borderBottom: '2px solid #4ade80', paddingBottom: '0.4rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>📦 Entregado</span>
                    <span style={{ fontSize: '0.85rem', backgroundColor: '#4ade8022', padding: '2px 8px', borderRadius: '8px' }}>{trabajosEntregados.length} trabajos</span>
                  </h4>
                  {trabajosEntregados.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No hay trabajos entregados.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {trabajosEntregados.filter(item => {
                        const b = busqueda.toLowerCase();
                        return item.cliente?.toLowerCase().includes(b) || item.rut?.toLowerCase().includes(b) || item.descripcion?.toLowerCase().includes(b);
                      }).map((item) => renderCardTrabajo(item))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* 4. CALENDARIO DE ENTREGAS */}
        {vistaActiva === 'calendario' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, color: '#a855f7', marginBottom: '0.5rem' }}>📅 Calendario y Plazos de Entrega</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Trabajos ordenados cronológicamente por su fecha de entrega programada.
            </p>

            {cotizaciones.filter(c => c.fecha_entrega).length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No hay trabajos con fecha de entrega programada aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cotizaciones.filter(c => c.fecha_entrega).sort((a,b) => new Date(a.fecha_entrega) - new Date(b.fecha_entrega)).map((item) => (
                  <div key={item.id} style={{ backgroundColor: '#090d16', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 'bold' }}>📅 Fecha: {new Date(item.fecha_entrega).toLocaleDateString('es-CL')}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white', marginTop: '2px' }}>{item.cliente}</div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>{item.descripcion}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.estado}</span>
                      <button onClick={() => generarPDFOperativo(item)} style={{ backgroundColor: '#f97316', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>PDF Taller</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. INVENTARIO / BODEGA */}
        {vistaActiva === 'inventario' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, color: '#f97316', marginBottom: '0.5rem' }}>📦 Control de Inventario y Bodega</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Stock disponible de planchas, acrílicos y materiales para tu taller.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}>
                  <th style={{ padding: '12px' }}>Material / Insumo</th>
                  <th style={{ padding: '12px' }}>Stock Actual</th>
                  <th style={{ padding: '12px' }}>Unidad</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventario.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '14px', fontWeight: 'bold', color: 'white' }}>{inv.material}</td>
                    <td style={{ padding: '14px', color: inv.stock < 5 ? '#f87171' : '#4ade80', fontWeight: 'bold', fontSize: '1.1rem' }}>{inv.stock}</td>
                    <td style={{ padding: '14px', color: '#94a3b8' }}>{inv.unidad}</td>
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <button onClick={() => {
                        const nuevo = prompt(`Actualizar stock para ${inv.material}:`, inv.stock);
                        if (nuevo !== null) {
                          setInventario(inventario.map(i => i.id === inv.id ? {...i, stock: parseInt(nuevo) || 0} : i));
                        }
                      }} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Modificar Stock</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. EGRESOS Y FINANZAS */}
        {vistaActiva === 'egresos' && (
          <div style={{ backgroundColor: '#131c2e', padding: '2rem', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#0284c7' }}>Registro de Egresos y Gastos del Taller</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Filtrar Mes:</label>
                <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={{ padding: '8px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}>
                  <option value="todos">Todos los periodos</option>
                  <option value="2026-11">Noviembre 2026</option>
                  <option value="2026-12">Diciembre 2026</option>
                  <option value="2027-01">Enero 2027</option>
                </select>
              </div>
            </div>
            
            <form onSubmit={guardarEgreso} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end', marginBottom: '2rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Descripción del Gasto: </label>
                <input type="text" value={descEgreso} onChange={(e) => setDescEgreso(e.target.value)} required placeholder="Ej. Compra planchas acrílico, luz..." style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Monto ($ CLP): </label>
                <input type="number" value={montoEgreso} onChange={(e) => setMontoEgreso(e.target.value)} required placeholder="0" style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Categoría: </label>
                <select value={catEgreso} onChange={(e) => setCatEgreso(e.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}>
                  <option value="Insumos / Materiales">Insumos / Materiales</option>
                  <option value="Herramientas / Maquinaria">Herramientas / Maquinaria</option>
                  <option value="Servicios Básicos">Servicios Básicos (Luz/Internet)</option>
                  <option value="Otros Gastos">Otros Gastos</option>
                </select>
              </div>
              <button type="submit" style={{ padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Registrar Gasto</button>
            </form>

            <h4 style={{ color: '#a1a1aa', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Historial de Egresos</h4>
            {egresosFiltrados.length === 0 ? (
              <p style={{ color: '#a1a1aa', textAlign: 'center' }}>No hay egresos registrados para este periodo.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#a1a1aa' }}>
                    <th style={{ padding: '10px' }}>Fecha</th>
                    <th style={{ padding: '10px' }}>Descripción</th>
                    <th style={{ padding: '10px' }}>Categoría</th>
                    <th style={{ padding: '10px' }}>Monto</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {egresosFiltrados.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
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