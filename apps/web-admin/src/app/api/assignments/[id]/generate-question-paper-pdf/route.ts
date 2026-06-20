import { NextResponse } from 'next/server';
import { getSession } from '../../../../../../libs/auth'; // adjust import path as needed
import { getAssignmentById, getLatestAssignmentVersion, getQuestionsByAssignmentId } from '../../../../../../libs/database'; // placeholder DB helpers
import { generatePdfBuffer } from '../../../../../../services/pdfGenerator';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // Authenticate user and role
  const session = await getSession(request);
  if (!session?.user || !['TEACHER', 'HOD', 'PRINCIPAL', 'STUDENT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const assignmentId = params.id;
  // Fetch latest assignment data
  const assignment = await getLatestAssignmentVersion(assignmentId);
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }
  const questions = await getQuestionsByAssignmentId(assignmentId);

  // Generate PDF (returns Uint8Array)
  const pdfBuffer = await generatePdfBuffer(assignment, questions);

  // Build filename
  const safeTitle = assignment.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `question_paper_${safeTitle}_${timestamp}.pdf`;

  const headers = new Headers();
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

  return new NextResponse(pdfBuffer, { status: 200, headers });
}
