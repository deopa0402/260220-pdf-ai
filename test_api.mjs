import fs from 'fs';

const minimalPdf = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>> endobj
4 0 obj <</Length 21>> stream
BT /F1 12 Tf 100 700 Td (Hello World) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000212 00000 n 
trailer <</Size 5 /Root 1 0 R>>
startxref
282
%%EOF`;

fs.writeFileSync('test.pdf', minimalPdf);

async function testAnalyze() {
  console.log('Testing /api/analyze...');
  try {
    const pdfBuffer = fs.readFileSync('test.pdf');
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const form = new FormData();
    form.append('file', blob, 'test.pdf');

    const res = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: form,
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
    
    if (res.ok) {
      const data = JSON.parse(text);
      console.log('Testing /api/chat with the returned context...');
      const chatRes = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentContext: data.rawText,
          messages: [{ role: 'user', content: 'What does the document say?' }]
        })
      });
      console.log('Chat Status:', chatRes.status);
      console.log('Chat Response:', await chatRes.text());
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAnalyze();
