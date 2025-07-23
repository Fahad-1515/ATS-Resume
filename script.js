const fileInput = document.getElementById("fileInput");
    const dropZone = document.getElementById("dropZone");
    const tableBody = document.getElementById("scoreTableBody");
    let scoredResumes = [];

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('bg-blue-100');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('bg-blue-100'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('bg-blue-100');
      handleFiles({ target: { files: e.dataTransfer.files } });
    });
    fileInput.addEventListener('change', handleFiles);

    async function handleFiles(event) {
      const jobDesc = document.getElementById('jobDescription').value.trim();
      if (!jobDesc) return alert("Paste job description first.");
      const keywords = Array.from(new Set(jobDesc.toLowerCase().match(/\b\w{3,}\b/g)));

      const files = [...event.target.files];
      scoredResumes = [];

      for (let file of files) {
        if (file.type !== "application/pdf") continue;
        const text = await extractTextFromPDF(file);
        const score = getATSScore(text.toLowerCase(), keywords);
        const matchedWords = getMatchedWords(text.toLowerCase(), keywords);
        const url = URL.createObjectURL(file);
        scoredResumes.push({ name: file.name, score, matchedWords, url });
      }

      scoredResumes.sort((a, b) => b.score - a.score);
      renderTable();
    }

    function renderTable() {
      tableBody.innerHTML = '';
      scoredResumes.forEach(res => {
        tableBody.innerHTML += `
          <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="py-3 px-4">${res.name}</td>
            <td class="py-3 px-4">
              <div class="w-full bg-gray-200 rounded-full h-4">
                <div class="h-4 rounded-full ${res.score >= 80 ? 'bg-green-500' : res.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}" style="width:${res.score}%"></div>
              </div>
              <span class="text-sm mt-1 inline-block">${res.score}/100</span>
            </td>
            <td class="py-3 px-4 text-sm">${res.matchedWords.join(', ')}</td>
            <td class="py-3 px-4 text-blue-600 underline"><a href="${res.url}" target="_blank">View PDF</a></td>
          </tr>`;
      });
    }

    async function extractTextFromPDF(file) {
      const typedarray = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        text += strings.join(' ');
      }
      return text;
    }

    function getATSScore(text, keywords) {
      let matched = 0;
      for (let word of keywords) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(text)) matched++;
      }
      return Math.round((matched / keywords.length) * 100);
    }

    function getMatchedWords(text, keywords) {
      return keywords.filter(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
    }

function exportToCSV() {
  const rows = [['Candidate', 'ATS Score', 'Matched Skills']]; // Removed 'PDF Link'
  scoredResumes.forEach(r =>
    rows.push([r.name, `${r.score}/100`, r.matchedWords.join('; ')])
  );
  const csv = rows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ats_results.csv';
  a.click();
}


    function exportToPDF() {
      if (scoredResumes.length === 0) return alert("No data to export.");
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const tableData = scoredResumes.map(res => [
        res.name,
        `${res.score}/100`,
        res.matchedWords.join(', '),
        res.url
      ]);

      doc.setFontSize(18);
      doc.text("ATS Resume Matcher Results", 14, 20);

      doc.autoTable({
        startY: 30,
        head: [['Candidate', 'ATS Score', 'Matched Skills', 'PDF Link']],
        body: tableData,
        styles: { fontSize: 10, cellWidth: 'wrap' },
        columnStyles: { 3: { cellWidth: 60 } }
      });

      doc.save('ats_results.pdf');
    }
