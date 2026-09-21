import { Routine } from '../types';

export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'routine-torso-fuerza',
    name: 'Torso: Empuje y Tirón (Basic-Fit)',
    notes: 'Enfoque en técnica estricta, tempo controlado y descanso completo en ejercicios compuestos.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: [
      {
        id: 'ex-1',
        name: 'Press de Banca Plano con Barra',
        notes: 'Retracción escapular activa y pausa de 1 segundo en el pecho.',
        videoUrl: 'https://www.youtube.com/watch?v=vcBig73ojpE',
        sets: [
          { id: 'set-1-1', setNumber: 1, reps: 10, weight: 60, restSeconds: 90 },
          { id: 'set-1-2', setNumber: 2, reps: 8, weight: 70, restSeconds: 90 },
          { id: 'set-1-3', setNumber: 3, reps: 8, weight: 70, restSeconds: 90 },
          { id: 'set-1-4', setNumber: 4, reps: 6, weight: 75, restSeconds: 120 },
        ],
      },
      {
        id: 'ex-2',
        name: 'Remo con Barra (Pendlay Row)',
        notes: 'Espalda recta a 45 grados, tracción hacia el abdomen bajo.',
        videoUrl: 'https://www.youtube.com/watch?v=G8l_8chR5BE',
        sets: [
          { id: 'set-2-1', setNumber: 1, reps: 10, weight: 50, restSeconds: 90 },
          { id: 'set-2-2', setNumber: 2, reps: 10, weight: 55, restSeconds: 90 },
          { id: 'set-2-3', setNumber: 3, reps: 8, weight: 60, restSeconds: 90 },
        ],
      },
      {
        id: 'ex-3',
        name: 'Press Militar con Mancuernas',
        notes: 'Sin hiperextender la zona lumbar, core firme.',
        videoUrl: 'https://www.youtube.com/watch?v=qEwKCR5JCog',
        sets: [
          { id: 'set-3-1', setNumber: 1, reps: 12, weight: 16, restSeconds: 60 },
          { id: 'set-3-2', setNumber: 2, reps: 10, weight: 18, restSeconds: 60 },
          { id: 'set-3-3', setNumber: 3, reps: 10, weight: 18, restSeconds: 60 },
        ],
      },
      {
        id: 'ex-4',
        name: 'Elevaciones Laterales con Mancuernas',
        notes: 'Ligera flexión de codos, elevar hasta altura de los hombros.',
        videoUrl: '',
        sets: [
          { id: 'set-4-1', setNumber: 1, reps: 15, weight: 8, restSeconds: 45 },
          { id: 'set-4-2', setNumber: 2, reps: 15, weight: 8, restSeconds: 45 },
          { id: 'set-4-3', setNumber: 3, reps: 15, weight: 8, restSeconds: 45 },
        ],
      },
    ],
  },
  {
    id: 'routine-pierna-fuerza',
    name: 'Pierna y Glúteo',
    notes: 'Prioridad en profundidad de sentadilla y recorrido completo.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: [
      {
        id: 'ex-leg-1',
        name: 'Sentadilla Trasera con Barra',
        notes: 'Bajar rompiendo el paralelo, rodillas alineadas con las puntas.',
        videoUrl: 'https://www.youtube.com/watch?v=bEv6CCg2BC8',
        sets: [
          { id: 'set-leg-1-1', setNumber: 1, reps: 10, weight: 70, restSeconds: 120 },
          { id: 'set-leg-1-2', setNumber: 2, reps: 8, weight: 80, restSeconds: 120 },
          { id: 'set-leg-1-3', setNumber: 3, reps: 8, weight: 85, restSeconds: 120 },
        ],
      },
      {
        id: 'ex-leg-2',
        name: 'Prensa Inclinada 45°',
        notes: 'Pies a anchura de hombros, no bloquear rodillas arriba.',
        videoUrl: '',
        sets: [
          { id: 'set-leg-2-1', setNumber: 1, reps: 12, weight: 120, restSeconds: 90 },
          { id: 'set-leg-2-2', setNumber: 2, reps: 10, weight: 140, restSeconds: 90 },
          { id: 'set-leg-2-3', setNumber: 3, reps: 10, weight: 140, restSeconds: 90 },
        ],
      },
      {
        id: 'ex-leg-3',
        name: 'Peso Muerto Rumano',
        notes: 'Empuje de caderas hacia atrás, sentir estiramiento en isquios.',
        videoUrl: '',
        sets: [
          { id: 'set-leg-3-1', setNumber: 1, reps: 10, weight: 60, restSeconds: 90 },
          { id: 'set-leg-3-2', setNumber: 2, reps: 10, weight: 60, restSeconds: 90 },
          { id: 'set-leg-3-3', setNumber: 3, reps: 10, weight: 60, restSeconds: 90 },
        ],
      },
    ],
  },
];
