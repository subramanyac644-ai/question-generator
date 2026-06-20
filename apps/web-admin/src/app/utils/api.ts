export async function generatePdf(assignmentId: string): Promise<void> {
  const response = await fetch(`/api/assignments/${assignmentId}/generate-question-paper-pdf`, {
    method: 'POST',
    headers: {
      // Assuming auth token is sent automatically via cookies or session
    },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to generate PDF');
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  let fileName = 'question_paper.pdf';
  if (contentDisposition) {
    const match = /filename="?([^\"]+)"?/.exec(contentDisposition);
    if (match && match[1]) fileName = match[1];
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}
