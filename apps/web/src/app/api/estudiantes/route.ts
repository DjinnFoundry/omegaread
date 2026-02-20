import { NextResponse } from 'next/server';
import { obtenerPadreActual } from '@/server/auth';
import { db, students } from '@omegaread/db';
import { eq } from 'drizzle-orm';

/**
 * GET /api/estudiantes
 * Devuelve los estudiantes del padre autenticado.
 * Devuelve 401 si no hay sesión de padre activa.
 */
export async function GET() {
  const padre = await obtenerPadreActual();
  if (!padre) {
    return NextResponse.json(
      { error: 'No hay sesión activa. Un padre debe iniciar sesión primero.' },
      { status: 401 },
    );
  }

  const hijos = await db.query.students.findMany({
    where: eq(students.parentId, padre.id),
    columns: {
      id: true,
      nombre: true,
    },
  });

  return NextResponse.json(hijos);
}
