/**
 * Generación de PDFs - Recibos y Cotizaciones
 * Usa jsPDF + autotable
 */
const PDF = {
  formatMoney(n) {
    return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatDate(d) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  },

  async reciboCobro(cobro, paciente) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('CONSULTORIO MÉDICO CC', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('RECIBO DE COBRO — SERVICIOS MÉDICOS PARTICULARES', pageW / 2, y, { align: 'center' });
    y += 10;

    // Línea
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.6);
    doc.line(20, y, pageW - 20, y);
    y += 10;

    // Datos
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const left = 22;
    const col2 = 110;

    doc.setFont('helvetica', 'bold');
    doc.text('N° de Atención:', left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(cobro.numero || '—', left + 35, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(cobro.fecha), col2 + 18, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Paciente:', left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(paciente?.nombre || '—', left + 25, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Edad:', left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(paciente?.edad || '—'), left + 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text('F. Nac:', left + 40, y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(paciente?.fechaNacimiento), left + 58, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Sexo:', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(paciente?.sexo || '—', col2 + 15, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Celular:', left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(paciente?.celular || '—', left + 20, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Médico que atendió:', left, y);
    doc.setFont('helvetica', 'normal');
    if (cobro.medico === 'DR. Cortez') {
      doc.setTextColor(30, 64, 175);
      doc.setFont('helvetica', 'bold');
    }
    doc.text(cobro.medico || '—', left + 42, y);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    y += 12;

    // Tabla de servicios
    const body = (cobro.servicios || []).map(s => [
      s.nombre,
      String(s.cantidad || 1),
      this.formatMoney(s.precio),
      this.formatMoney((s.cantidad || 1) * s.precio)
    ]);

    doc.autoTable({
      startY: y,
      head: [['Servicio', 'Cant.', 'P. Unitario', 'Importe']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });

    y = doc.lastAutoTable.finalY + 10;

    // Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAGADO:', pageW - 70, y);
    doc.setTextColor(30, 64, 175);
    doc.text(this.formatMoney(cobro.total), pageW - 20, y, { align: 'right' });
    doc.setTextColor(0);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Forma de pago: ' + (cobro.formaPago || '—'), 22, y);
    y += 7;

    if (cobro.proximaCita) {
      doc.setFont('helvetica', 'bold');
      doc.text('Próxima cita: ' + this.formatDate(cobro.proximaCita), 22, y);
      y += 10;
    }

    // Mensaje
    y = Math.max(y + 15, 240);
    doc.setDrawColor(200);
    doc.line(20, y, pageW - 20, y);
    y += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80);
    const msg = cobro.mensaje || '¡Gracias por confiarnos tu salud!';
    doc.text(msg, pageW / 2, y, { align: 'center' });

    doc.save(`Recibo_${cobro.numero || 'cobro'}.pdf`);
  },

  async cotizacionLab(cot, paciente) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('CONSULTORIO MÉDICO CC', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('COTIZACIÓN DE LABORATORIO', pageW / 2, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.6);
    doc.line(20, y, pageW - 20, y);
    y += 10;

    doc.setFontSize(10);
    const left = 22;

    doc.setFont('helvetica', 'bold');
    doc.text('Folio:', left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(cot.folio || '—', left + 18, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', 100, y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(cot.fecha), 118, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Estatus:', 155, y);
    doc.setFont('helvetica', 'normal');
    doc.text(cot.estatus || 'PENDIENTE', 175, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Paciente:', left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(paciente?.nombre || '—', left + 25, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Edad:', left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(paciente?.edad || '—'), left + 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text('F. Nac:', left + 40, y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDate(paciente?.fechaNacimiento), left + 58, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Sexo:', 120, y);
    doc.setFont('helvetica', 'normal');
    doc.text(paciente?.sexo || '—', 135, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Celular:', left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(paciente?.celular || '—', left + 20, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Médico solicitante:', left, y);
    doc.setFont('helvetica', 'normal');
    if (cot.medico === 'DR. Cortez') {
      doc.setTextColor(30, 64, 175);
      doc.setFont('helvetica', 'bold');
    }
    doc.text(cot.medico || '—', left + 42, y);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    y += 7;

    if (cot.vigenciaHasta) {
      doc.setFont('helvetica', 'bold');
      doc.text('Vigencia hasta:', left, y);
      doc.setFont('helvetica', 'normal');
      doc.text(this.formatDate(cot.vigenciaHasta), left + 35, y);
      y += 10;
    } else {
      y += 5;
    }

    const body = (cot.estudios || []).map(e => [
      e.nombre,
      this.formatMoney(e.precio)
    ]);

    doc.autoTable({
      startY: y,
      head: [['Estudio', 'Precio']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 50, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });

    y = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', pageW - 60, y);
    doc.setTextColor(30, 64, 175);
    doc.text(this.formatMoney(cot.total), pageW - 20, y, { align: 'right' });
    doc.setTextColor(0);
    y += 8;

    if (cot.estatus === 'PAGADO') {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Forma de pago: ' + (cot.formaPago || '—'), 22, y);
      y += 6;
      doc.text('Fecha de pago: ' + this.formatDate(cot.fechaPago), 22, y);
    }

    y = Math.max(y + 20, 240);
    doc.setDrawColor(200);
    doc.line(20, y, pageW - 20, y);
    y += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80);
    doc.text('¡Gracias por confiarnos tu salud!', pageW / 2, y, { align: 'center' });

    doc.save(`Cotizacion_${cot.folio || 'lab'}.pdf`);
  },

  async corteCaja(datos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('CONSULTORIO MÉDICO CC', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('CORTE DE CAJA', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.text(`Periodo: ${datos.periodoLabel}`, pageW / 2, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(30, 64, 175);
    doc.line(20, y, pageW - 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN GENERAL', 22, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const resumen = [
      ['Total cobrado (médicos + labs)', this.formatMoney(datos.totalGeneral)],
      ['Consultas / servicios médicos', this.formatMoney(datos.totalMedicos)],
      ['Laboratorios pagados', this.formatMoney(datos.totalLabs)],
      ['Número de consultas', String(datos.numConsultas)],
      ['Gastos del periodo', this.formatMoney(datos.totalGastos)],
      ['Utilidad estimada', this.formatMoney(datos.totalGeneral - datos.totalGastos)]
    ];
    resumen.forEach(([label, val]) => {
      doc.text(label, 25, y);
      doc.text(val, pageW - 25, y, { align: 'right' });
      y += 6;
    });
    y += 6;

    // Por médico
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CORTE POR MÉDICO', 22, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    Object.entries(datos.porMedico).forEach(([med, info]) => {
      const color = med === 'DR. Cortez' ? [30, 64, 175] : [0, 0, 0];
      doc.setTextColor(...color);
      doc.setFont('helvetica', med === 'DR. Cortez' ? 'bold' : 'normal');
      doc.text(`${med}: ${info.count} consultas — ${this.formatMoney(info.total)}`, 25, y);
      doc.setTextColor(0);
      y += 6;
    });
    y += 6;

    // Por forma de pago
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('POR FORMA DE PAGO', 22, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    Object.entries(datos.porPago).forEach(([pago, total]) => {
      doc.text(`${pago}: ${this.formatMoney(total)}`, 25, y);
      y += 6;
    });

    y += 15;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageW / 2, y, { align: 'center' });

    doc.save(`Corte_Caja_${datos.periodoLabel.replace(/\s/g, '_')}.pdf`);
  }
};
