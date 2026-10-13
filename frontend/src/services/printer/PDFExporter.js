import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const PDFExporter = {
  downloadReceipt: async (elementId, filename = 'struk-transaksi.pdf') => {
    try {
      const element = document.getElementById(elementId);
      if (!element) throw new Error('Elemen struk tidak ditemukan');

      // Save original style
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;
      const originalHeight = element.style.height;
      const originalMaxHeight = element.style.maxHeight;
      const originalOverflow = element.style.overflow;

      // Temporarily expand element so html2canvas captures everything
      element.style.width = '300px';
      element.style.maxWidth = 'none';
      element.style.height = 'max-content';
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Restore original style
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.height = originalHeight;
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate PDF dimensions based on paper size (80mm width standard)
      // width: 80mm
      const pdfWidth = 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename);
      
      return true;
    } catch (error) {
      console.error('PDF Export Error:', error);
      throw error;
    }
  }
};
