import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export async function loadPDF(url: string) {
  const doc = await pdfjsLib.getDocument(url).promise;
  return doc;
}

export { pdfjsLib };
