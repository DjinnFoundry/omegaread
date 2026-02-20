import { NextResponse } from 'next/server';
import { obtenerPadreActual } from '@/server/auth';
import { db, students } from '@omegaread/db';
import { eq } from 'drizzle-orm';

/**
 * GET /api/estudiantes
 * Devuelve los estudiantes del padre autenticado
 */
export async function GET() {
  const padre = await obtenerPadreActual();
  if (!padre) {
    return NextResponse.json([], { status: 200 });
  }

  const hijos = await db.query.students.findMany({
    where: eq(students.parentId, padre.id),
    columns: {
      id: true,
      nombre: true,
      mascotaTipo: true,
      mascotaNombre: true,
      diagnosticoCompletado: true,
    },
  });

  return NextResponse.json(hijos);
}
