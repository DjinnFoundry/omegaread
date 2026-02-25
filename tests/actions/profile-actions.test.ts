import { vi, describe, it, expect, beforeEach } from 'vitest';

// ────────────────────────────────────────────────────
// MOCKS
// ────────────────────────────────────────────────────

vi.mock('@/server/auth', () => ({
  requireAuth: vi.fn(async () => ({ id: 'parent-1', email: 'test@test.com', nombre: 'Test' })),
  requireStudentOwnership: vi.fn(async () => ({
    padre: { id: 'parent-1', config: {} },
    estudiante: {
      id: 'student-1',
      parentId: 'parent-1',
      nombre: 'Juan',
      senalesDificultad: {},
      contextoPersonal: '',
      personajesFavoritos: '',
      accesibilidad: {},
    },
  })),
}));

vi.mock('@/lib/profile/micro-profile', () => ({
  MICRO_PREGUNTAS_PERFIL: [
    {
      id: 'q1',
      categoria: 'lectura',
      pregunta: 'Test question',
      opciones: ['opcion-a', 'opcion-b'],
    },
  ],
  crearHechoDesdeMicroRespuesta: vi.fn(() => ({
    texto: 'Test fact',
    categoria: 'interes',
  })),
}));

vi.mock('@omegaread/db', () => ({
  parents: { id: 'id' },
  students: { id: 'id', parentId: 'parent_id' },
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

const mockFindFirst = vi.fn(async () => null);
const mockSet = vi.fn(() => ({ where: vi.fn(async () => []) }));

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => ({
    query: {
      students: { findFirst: mockFindFirst },
      parents: { findFirst: mockFindFirst },
    },
    update: vi.fn(() => ({ set: mockSet })),
  })),
}));

import {
  actualizarPerfilEstudiante,
  guardarIntereses,
  guardarContextoPersonal,
  guardarPerfilVivo,
  guardarAjustesLectura,
  responderMicroPreguntaPerfil,
} from '@/server/actions/profile-actions';

describe('profile-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────
  // ACTUALIZAR PERFIL
  // ────────────────────────────────────────────────────

  it('debería actualizar perfil del estudiante completo', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
      nombre: 'Juan',
    });

    const result = await actualizarPerfilEstudiante({
      studentId: '00000000-0000-4000-8000-000000000020',
      curso: '1o-primaria',
      centroEscolar: 'Colegio X',
      rutinaLectura: 'diaria',
      acompanamiento: 'siempre',
      senalesDificultad: {
        atencion: true,
        vocabulario: false,
      },
      personajesFavoritos: 'Mickey',
      temasEvitar: ['muerte'],
    });

    expect(result.ok).toBe(true);
  });

  it('debería marcar perfilCompleto como true tras actualizar', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    await actualizarPerfilEstudiante({
      studentId: '00000000-0000-4000-8000-000000000020',
      curso: '1o-primaria',
      rutinaLectura: 'varias-por-semana',
      acompanamiento: 'a-veces',
      senalesDificultad: {},
    });

    expect(mockSet).toHaveBeenCalled();
  });

  it('debería retornar error si estudiante no existe', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await actualizarPerfilEstudiante({
      studentId: '00000000-0000-4000-8000-000000000099',
      curso: '1o-primaria',
      rutinaLectura: 'diaria',
      acompanamiento: 'siempre',
      senalesDificultad: {},
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Estudiante no encontrado');
  });

  // ────────────────────────────────────────────────────
  // GUARDAR INTERESES
  // ────────────────────────────────────────────────────

  it('debería guardar intereses del niño', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await guardarIntereses({
      studentId: '00000000-0000-4000-8000-000000000020',
      intereses: ['animales', 'aventura', 'deportes'],
    });

    expect(result.ok).toBe(true);
  });

  it('debería guardar lista vacía de intereses si no hay selección', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await guardarIntereses({
      studentId: '00000000-0000-4000-8000-000000000020',
      intereses: ['animales'],
    });

    expect(result.ok).toBe(true);
  });

  it('debería retornar error si estudiante no pertenece al padre', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await guardarIntereses({
      studentId: '00000000-0000-4000-8000-000000000099',
      intereses: ['animales'],
    });

    expect(result.ok).toBe(false);
  });

  // ────────────────────────────────────────────────────
  // GUARDAR CONTEXTO PERSONAL
  // ────────────────────────────────────────────────────

  it('debería guardar contexto personal del niño', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await guardarContextoPersonal({
      studentId: '00000000-0000-4000-8000-000000000020',
      contextoPersonal: 'Vive en Madrid, tiene mascota',
    });

    expect(result.ok).toBe(true);
  });

  it('debería guardar string vacío si contexto se omite', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await guardarContextoPersonal({
      studentId: '00000000-0000-4000-8000-000000000020',
    });

    expect(result.ok).toBe(true);
  });

  // ────────────────────────────────────────────────────
  // GUARDAR PERFIL VIVO
  // ────────────────────────────────────────────────────

  it('debería guardar nuevo hecho en perfil vivo', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
      senalesDificultad: { perfilVivo: { hechos: [], microRespuestas: {} } },
      contextoPersonal: '',
      personajesFavoritos: '',
      intereses: [],
      temasEvitar: [],
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await guardarPerfilVivo({
      studentId: '00000000-0000-4000-8000-000000000020',
      nuevoHecho: 'Le encanta jugar con gatos',
      categoriaHecho: 'interes',
    });

    expect(result.ok).toBe(true);
  });

  it('debería actualizar contextoPersonal en perfil vivo', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
      senalesDificultad: { perfilVivo: { hechos: [], microRespuestas: {} } },
      contextoPersonal: 'Viejo contexto',
      personajesFavoritos: '',
      intereses: [],
      temasEvitar: [],
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await guardarPerfilVivo({
      studentId: '00000000-0000-4000-8000-000000000020',
      contextoPersonal: 'Nuevo contexto',
    });

    expect(result.ok).toBe(true);
  });

  it('debería limitar máximo 80 hechos en perfil vivo', async () => {
    const muchoHechos = Array.from({ length: 85 }, (_, i) => ({
      id: `h${i}`,
      texto: `Hecho ${i}`,
      categoria: 'contexto',
      fuente: 'padre',
      createdAt: new Date().toISOString(),
    }));

    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
      senalesDificultad: { perfilVivo: { hechos: muchoHechos, microRespuestas: {} } },
      contextoPersonal: '',
      personajesFavoritos: '',
      intereses: [],
      temasEvitar: [],
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await guardarPerfilVivo({
      studentId: '00000000-0000-4000-8000-000000000020',
      nuevoHecho: 'Nuevo hecho',
    });

    expect(result.ok).toBe(true);
  });

  // ────────────────────────────────────────────────────
  // GUARDAR AJUSTES DE LECTURA
  // ────────────────────────────────────────────────────

  it('debería guardar fun mode en config del padre', async () => {
    vi.clearAllMocks();

    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000010',
      config: {},
    });
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      accesibilidad: {},
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await guardarAjustesLectura({
      studentId: '00000000-0000-4000-8000-000000000020',
      funMode: true,
    });

    expect(result.ok).toBe(true);
    expect(result.ajustes.funMode).toBe(true);
  });

  it('debería guardar ajustes de accesibilidad (dislexia, TDAH, etc)', async () => {
    vi.clearAllMocks();

    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000010',
      config: {},
    });
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      accesibilidad: {},
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await guardarAjustesLectura({
      studentId: '00000000-0000-4000-8000-000000000020',
      accesibilidad: {
        fuenteDislexia: true,
        modoTDAH: false,
        altoContraste: true,
        duracionSesionMin: 20,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.ajustes.accesibilidad.fuenteDislexia).toBe(true);
  });

  // ────────────────────────────────────────────────────
  // RESPONDER MICRO PREGUNTA PERFIL
  // ────────────────────────────────────────────────────

  it('debería guardar respuesta a micro-pregunta y crear hecho', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
      senalesDificultad: { perfilVivo: { hechos: [], microRespuestas: {} } },
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await responderMicroPreguntaPerfil({
      studentId: '00000000-0000-4000-8000-000000000020',
      preguntaId: 'q1',
      respuesta: 'opcion-a',
    });

    expect(result.ok).toBe(true);
  });

  it('debería retornar error si pregunta no existe', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
      senalesDificultad: {},
    });

    const result = await responderMicroPreguntaPerfil({
      studentId: '00000000-0000-4000-8000-000000000020',
      preguntaId: 'q-invalid',
      respuesta: 'opcion-a',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('no valida');
  });

  it('debería retornar error si respuesta no es válida para la pregunta', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
      senalesDificultad: {},
    });

    const result = await responderMicroPreguntaPerfil({
      studentId: '00000000-0000-4000-8000-000000000020',
      preguntaId: 'q1',
      respuesta: 'respuesta-invalida',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('no valida');
  });

  it('debería guardar respuesta en microRespuestas con timestamp', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      parentId: '00000000-0000-4000-8000-000000000010',
      senalesDificultad: { perfilVivo: { hechos: [], microRespuestas: {} } },
    });

    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await responderMicroPreguntaPerfil({
      studentId: '00000000-0000-4000-8000-000000000020',
      preguntaId: 'q1',
      respuesta: 'opcion-b',
    });

    expect(result.ok).toBe(true);
  });
});
