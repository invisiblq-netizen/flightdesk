// Small real PDF for exercising PDF.js, fit-to-width and page navigation.
module.exports = function fixturePdf() {
  const stream=label=>`BT /F1 22 Tf 48 730 Td (${label}) Tj 0 -40 Td /F1 12 Tf (ENGM - EGLL / TEST123 / A21N) Tj ET`;
  const contents=[stream('SIMBRIEF TEST FLIGHT PLAN'),stream('ROUTE AND FLIGHT LOG')];
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ...contents.map(text=>`<< /Length ${text.length} >>\nstream\n${text}\nendstream`)
  ];
  let pdf='%PDF-1.4\n';const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${object}\nendobj\n`});
  const xref=Buffer.byteLength(pdf);
  pdf+=`xref\n0 ${offsets.length}\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('');
  pdf+=`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf).toString('base64');
};
