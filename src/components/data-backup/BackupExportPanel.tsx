import React from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  Dumbbell,
  Flame,
  Layers,
  Trophy,
} from 'lucide-react';
import type {
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  WorkoutHistoryLog,
} from '../../types';

interface BackupExportPanelProps {
  catalog: ExerciseDefinition[];
  routines: Routine[];
  rmLogs: ExerciseRmLog[];
  workoutHistory: WorkoutHistoryLog[];
  exerciseDiary: ExerciseDiary[];
  exportSuccessMessage: string | null;
  onExportRoutines: () => void;
  onExportExercises: () => void;
  onExportRmLogs: () => void;
  onExportHistory: () => void;
  onExportDiary: () => void;
  onExportAll: () => void;
}

export const BackupExportPanel: React.FC<BackupExportPanelProps> = ({
  catalog,
  routines,
  rmLogs,
  workoutHistory,
  exerciseDiary,
  exportSuccessMessage,
  onExportRoutines,
  onExportExercises,
  onExportRmLogs,
  onExportHistory,
  onExportDiary,
  onExportAll,
}) => (
  <div className="space-y-4">
    {exportSuccessMessage && (
      <div className="flex items-center gap-2 p-3 bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] rounded-xl text-xs font-bold animate-in fade-in">
        <CheckCircle2 className="w-4 h-4 text-[#00FF87] shrink-0" />
        <span>{exportSuccessMessage}</span>
      </div>
    )}

    <p className="text-xs text-zinc-400 leading-relaxed">
      Descarga un archivo JSON con tus datos para guardarlo como copia de seguridad en tu dispositivo o transferirlo a otro navegador o móvil.
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
      <div className="flex flex-col justify-between p-4 rounded-2xl border border-white/[0.08] bg-black/25 hover:border-white/20 shadow-lg transition-all">
        <div>
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-400 fill-current" />
            </span>
            <span className="text-[11px] font-extrabold text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full border border-orange-500/30">
              {routines.length} rutinas
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-2.5">
            Solo Rutinas
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Todas tus rutinas con sus series, descansos y ejercicios asociados.
          </p>
        </div>

        <button
          id="btn-export-routines"
          type="button"
          onClick={onExportRoutines}
          className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar Rutinas</span>
        </button>
      </div>

      <div className="flex flex-col justify-between p-4 rounded-2xl border border-white/[0.08] bg-black/25 hover:border-white/20 shadow-lg transition-all">
        <div>
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-cyan-400" />
            </span>
            <span className="text-[11px] font-extrabold text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/30">
              {catalog.length} ejerc.
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-2.5">
            Solo Ejercicios
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Catálogo y biblioteca con sus fotos, vídeos y valores base.
          </p>
        </div>

        <button
          id="btn-export-exercises"
          type="button"
          onClick={onExportExercises}
          className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar Ejercicios</span>
        </button>
      </div>

      <div className="flex flex-col justify-between p-4 rounded-2xl border border-white/[0.08] bg-black/25 hover:border-white/20 shadow-lg transition-all">
        <div>
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-400" />
            </span>
            <span className="text-[11px] font-extrabold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
              {rmLogs.length} RMs
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-2.5">
            Solo Registro de RMs
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Historial completo de marcas personales (1RM) por ejercicio.
          </p>
        </div>

        <button
          id="btn-export-rms"
          type="button"
          onClick={onExportRmLogs}
          className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar RMs</span>
        </button>
      </div>

      <div className="flex flex-col justify-between p-4 rounded-2xl border border-white/[0.08] bg-black/25 hover:border-white/20 shadow-lg transition-all">
        <div>
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-400" />
            </span>
            <span className="text-[11px] font-extrabold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/30">
              {workoutHistory.length} sesiones
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-2.5">
            Solo Historial
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Registro de todas las sesiones de rutinas completadas.
          </p>
        </div>

        <button
          id="btn-export-history"
          type="button"
          onClick={onExportHistory}
          className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar Historial</span>
        </button>
      </div>

      <div className="flex flex-col justify-between p-4 rounded-2xl border border-white/[0.08] bg-black/25 hover:border-white/20 shadow-lg transition-all">
        <div>
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-teal-400" />
            </span>
            <span className="text-[11px] font-extrabold text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/30">
              {exerciseDiary.reduce((sum, diary) => sum + (diary.entries?.length || 0), 0)} notas
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-2.5">
            Solo Diario de Ejercicios
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Todas tus anotaciones personales, sensaciones y detalles técnicos.
          </p>
        </div>

        <button
          id="btn-export-diary"
          type="button"
          onClick={onExportDiary}
          className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar Diario</span>
        </button>
      </div>

      <div className="flex flex-col justify-between p-4.5 rounded-2xl border-2 border-[#00FF87]/40 bg-[#00FF87]/5 hover:border-[#00FF87]/70 shadow-[0_0_20px_rgba(0,255,135,0.1)] transition-all sm:col-span-2 lg:col-span-3">
        <div>
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-xl bg-[#00FF87] text-black flex items-center justify-center shadow-md">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-black text-black bg-[#00FF87] px-2.5 py-0.5 rounded-full">
              Completa
            </span>
          </div>
          <h3 className="text-sm font-extrabold text-white mt-2.5">
            Todo el contenido de la App
          </h3>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
            {catalog.length} ejercicios, {routines.length} rutinas, {rmLogs.length} RMs, {workoutHistory.length} sesiones y {exerciseDiary.reduce((sum, diary) => sum + (diary.entries?.length || 0), 0)} notas del diario.
          </p>
        </div>

        <button
          id="btn-export-all"
          type="button"
          onClick={onExportAll}
          className="mt-4 w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black transition active:scale-[0.97] shadow-[0_0_15px_rgba(0,255,135,0.3)]"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Descargar Todo (.json)</span>
        </button>
      </div>
    </div>
  </div>
);
