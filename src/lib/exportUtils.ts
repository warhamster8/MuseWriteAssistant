import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver';
import type { Chapter } from '../types/narrative';

/**
 * Utility: exportToDocx
 * 
 * Perché esiste: Centralizza la logica di generazione del documento Office/LibreOffice.
 * Cosa fa: Converte la struttura del progetto (Capitoli -> Scene) in un file .docx formattato.
 */
export const exportToDocx = async (projectTitle: string, chapters: Chapter[], authorName: string) => {
  try {
    const sections = [];

    // 1. Pagina di Titolo
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          text: "",
          spacing: { before: 2000 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: projectTitle.toUpperCase(),
              bold: true,
              size: 48,
              font: "Garamond",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: authorName,
              size: 28,
              font: "Garamond",
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 2000 },
        }),
        new Paragraph({
          children: [new PageBreak()],
        }),
      ],
    });

    // 2. Contenuto (Capitoli e Scene)
    const contentChildren: any[] = [];

    chapters.forEach((chapter, cIdx) => {
      // Intestazione Capitolo
      contentChildren.push(
        new Paragraph({
          text: `Capitolo ${cIdx + 1}: ${chapter.title}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      chapter.scenes?.forEach((scene) => {
        // Intestazione Scena
        contentChildren.push(
          new Paragraph({
            text: scene.title,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );

        // Contenuto Scena (Parsing HTML semplice)
        const sceneParagraphs = parseHtmlToDocx(scene.content || "");
        contentChildren.push(...sceneParagraphs);
      });

      // Salto pagina tra i capitoli (opzionale, ma professionale)
      if (cIdx < chapters.length - 1) {
        contentChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });

    sections.push({
      properties: {},
      children: contentChildren,
    });

    const doc = new Document({
      sections,
    });

    // Generazione Blob e Download
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${projectTitle} - Manoscritto.docx`);
    
    return true;
  } catch (error) {
    console.error("[SECURITY LOG] Export Error:", error);
    throw error;
  }
};

/**
 * Funzione helper per mappare i tag HTML di Tiptap in elementi DOCX.
 * Focus su: <p>, <strong>, <em>, <br>, <ul>, <li>.
 */
const parseHtmlToDocx = (html: string): Paragraph[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const paragraphs: Paragraph[] = [];

  const processNode = (node: Node): Paragraph | null => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      
      if (element.tagName === 'P') {
        return new Paragraph({
          children: Array.from(element.childNodes).map(child => processRun(child)).filter(r => r !== null) as TextRun[],
          spacing: { after: 120 },
        });
      }
      
      if (element.tagName === 'UL' || element.tagName === 'OL') {
        // I list items vengono gestiti a livello superiore per semplicità in questa versione
        return null;
      }
    }
    return null;
  };

  const processRun = (node: Node): TextRun | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return new TextRun({ text: node.textContent || "" });
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const baseText = element.innerText || element.textContent || "";
      
      if (element.tagName === 'STRONG' || element.tagName === 'B') {
        return new TextRun({ text: baseText, bold: true });
      }
      if (element.tagName === 'EM' || element.tagName === 'I') {
        return new TextRun({ text: baseText, italics: true });
      }
      if (element.tagName === 'BR') {
        return new TextRun({ break: 1 });
      }
      
      // Fallback per altri tag annidati
      return new TextRun({ text: baseText });
    }
    return null;
  };

  doc.body.childNodes.forEach(node => {
    const p = processNode(node);
    if (p) paragraphs.push(p);
    else if (node.nodeType === Node.ELEMENT_NODE && ((node as HTMLElement).tagName === 'LI')) {
       // Supporto base per liste se Tiptap le sputa fuori direttamente
       paragraphs.push(new Paragraph({
         text: (node as HTMLElement).innerText,
         bullet: { level: 0 }
       }));
    }
  });

  // Se è vuoto, aggiungi un paragrafo vuoto
  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ text: "" }));
  }

  return paragraphs;
};
