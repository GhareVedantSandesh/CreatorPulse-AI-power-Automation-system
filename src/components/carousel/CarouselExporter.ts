import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import type { CarouselData } from './types';

/**
 * Captures a DOM element natively at exactly 1080x1080 px for high-resolution export.
 */
async function captureSlideTo1080p(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Clone element to prevent layout flickering on screen
  const clone = element.cloneNode(true) as HTMLElement;
  // Slide is natively 540x540. We keep it that size, but scale it 4x during capture.
  clone.style.position = 'fixed';
  clone.style.top = '0';
  clone.style.left = '-9999px';
  clone.style.transform = 'none';
  document.body.appendChild(clone);

  // Give DOM a moment to fetch/paint any external fonts or images
  await new Promise((r) => setTimeout(r, 100));

  const canvas = await html2canvas(clone, {
    scale: 4, // 4x scale on 540px = 2160x2160 resolution!
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  document.body.removeChild(clone);
  return canvas;
}

/**
 * Downloads a single slide as a PNG file.
 */
export async function downloadSlide(
  element: HTMLElement,
  slideIndex: number,
  carouselTitle: string
): Promise<void> {
  const canvas = await captureSlideTo1080p(element);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(), 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = carouselTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.href = url;
  a.download = `${safeName}_slide_${slideIndex + 1}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all selected slides as a ZIP archive of PNG files.
 * @param slideElements Array of rendered slide DOM elements (in order)
 * @param carousel The carousel data (for naming)
 * @param selectedIndices Which slide indices to export (all if undefined)
 */
export async function downloadAllSlidesAsZip(
  slideElements: HTMLElement[],
  carousel: CarouselData,
  selectedIndices?: number[]
): Promise<void> {
  const zip = new JSZip();
  const safeName = (carousel.title || 'carousel').replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const indices = selectedIndices ?? slideElements.map((_, i) => i);

  for (const i of indices) {
    const el = slideElements[i];
    if (!el) continue;
    const canvas = await captureSlideTo1080p(el);
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(), 'image/png'));
    zip.file(`${safeName}_slide_${i + 1}_${carousel.slides[i]?.type || 'slide'}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_carousel.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all selected slides as a single PDF file, ready for LinkedIn Carousel posting.
 */
export async function downloadAllSlidesAsPdf(
  slideElements: HTMLElement[],
  carousel: CarouselData,
  selectedIndices?: number[]
): Promise<void> {
  const safeName = (carousel.title || 'carousel').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const indices = selectedIndices ?? slideElements.map((_, i) => i);
  if (indices.length === 0) return;

  // LinkedIn optimal carousel size is 1080x1080px (square)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [1080, 1080],
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < indices.length; i++) {
    const el = slideElements[indices[i]];
    if (!el) continue;

    const canvas = await captureSlideTo1080p(el);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    if (i > 0) pdf.addPage([1080, 1080]);
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
  }

  pdf.save(`${safeName}_linkedin_carousel.pdf`);
}

/**
 * Generates a PDF of all selected slides and returns it as a Base64 data URI string.
 */
export async function generatePdfBase64(
  slideElements: HTMLElement[],
  selectedIndices?: number[]
): Promise<string> {
  const indices = selectedIndices ?? slideElements.map((_, i) => i);
  if (indices.length === 0) throw new Error('No slides selected');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [1080, 1080],
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < indices.length; i++) {
    const el = slideElements[indices[i]];
    if (!el) continue;

    const canvas = await captureSlideTo1080p(el);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    if (i > 0) pdf.addPage([1080, 1080]);
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
  }

  return pdf.output('datauristring');
}
