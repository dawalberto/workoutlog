import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Dumbbell,
  Flame,
  ArrowRight,
  RefreshCw,
  Info,
  Trophy,
  Calendar,
  BookOpen
} from 'lucide-react';
import { ExerciseDefinition, Routine, ExerciseRmLog, WorkoutHistoryLog, ExerciseDiary } from '../types';
import {
  parseImportedData,
  mergeCatalogs,
  mergeRoutines,
  mergeRmLogs,
  mergeWorkoutHistory,
  mergeExerciseDiary,
  syncRoutinesWithCatalog,
  downloadJsonFile,
  normalizeExerciseTitle,
  isRoutineCountAllowed,
  ROUTINE_LIMIT_ERROR_MESSAGE,
  ParsedBackupData
} from '../utils/backup';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: ExerciseDefinition[];
  routines: Routine[];
  rmLogs: ExerciseRmLog[];
  workoutHistory: WorkoutHistoryLog[];
  exerciseDiary: ExerciseDiary[];
  isPremiumActive: boolean;
  onImportComplete: (
    newCatalog: ExerciseDefinition[],
    newRoutines: Routine[],
    newRmLogs: ExerciseRmLog[],
    newWorkoutHistory: WorkoutHistoryLog[],
    newExerciseDiary: ExerciseDiary[],
    summary: {
      exercisesAdded: number;
      exercisesReplaced: number;
      routinesAdded: number;
      exercisesInRoutinesUpdated?: number;
      rmLogsAdded?: number;
      rmLogsUpdated?: number;
      historyAdded?: number;
      diaryAdded?: number;
      diaryUpdated?: number;
      mode: 'merge' | 'overwrite';
    }
  ) => void;
}

type TabType = 'export' | 'import';
type ImportMode = 'merge' | 'overwrite';

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  catalog,
  routines,
  rmLogs,
  workoutHistory,
  exerciseDiary,
  isPremiumActive,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('export');

  // Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [replaceDuplicateExercises, setReplaceDuplicateExercises] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Export Only Routines (and their associated exercises)
  const handleExportRoutines = () => {
    const filename = `workoutlog-rutinas-${new Date().toISOString().split('T')[0]}.json`;

    // Extract all exercises associated with these routines from catalog
    const routineExerciseNames = new Set<string>();
    routines.forEach((r) => {
      r.exercises.forEach((ex) => {
        if (ex.name) {
          routineExerciseNames.add(normalizeExerciseTitle(ex.name));
        }
      });
    });

    const associatedCatalog = catalog.filter((c) =>
      routineExerciseNames.has(normalizeExerciseTitle(c.name))
    );

    // If any routine exercise isn't in catalog, create a default definition so the export is fully self-contained
    const existingNames = new Set(associatedCatalog.map((c) => normalizeExerciseTitle(c.name)));
    routines.forEach((r) => {
      r.exercises.forEach((ex) => {
        const norm = normalizeExerciseTitle(ex.name);
        if (norm && !existingNames.has(norm)) {
          existingNames.add(norm);
          associatedCatalog.push({
            id: 'def-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            name: ex.name.trim(),
            category: ex.category || 'Otros',
            imageUrl: ex.imageUrl || '',
            videoUrl: ex.videoUrl || '',
            notes: ex.notes || '',
            defaultSetsCount: ex.sets?.length || 3,
            defaultReps: Number(ex.sets?.[0]?.reps) || 10,
            defaultWeight: Number(ex.sets?.[0]?.weight) || 0,
            defaultRestSeconds: Number(ex.sets?.[0]?.restSeconds) || 60,
            createdAt: new Date().toISOString(),
          });
        }
      });
    });

    const exportPayload = {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'routines',
      routines,
      catalog: associatedCatalog,
    };

    downloadJsonFile(filename, exportPayload);
    setExportSuccessMessage(
      `Se han exportado ${routines.length} rutinas y ${associatedCatalog.length} ejercicios asociados.`
    );
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  // Handle Export Only Exercises
  const handleExportExercises = () => {
    const filename = `workoutlog-ejercicios-${new Date().toISOString().split('T')[0]}.json`;
    const exportPayload = {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'exercises',
      catalog,
    };
    downloadJsonFile(filename, exportPayload);
    setExportSuccessMessage(`Se han exportado ${catalog.length} ejercicios.`);
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  // Handle Export Only RM Logs
  const handleExportRmLogs = () => {
    const filename = `workoutlog-rms-${new Date().toISOString().split('T')[0]}.json`;
    const exportPayload = {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'rms',
      rmLogs,
    };
    downloadJsonFile(filename, exportPayload);
    setExportSuccessMessage(`Se han exportado ${rmLogs.length} ejercicios de RMs.`);
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  // Handle Export Only Workout History
  const handleExportHistory = () => {
    const filename = `workoutlog-historial-${new Date().toISOString().split('T')[0]}.json`;
    const exportPayload = {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'history',
      workoutHistory,
    };
    downloadJsonFile(filename, exportPayload);
    setExportSuccessMessage(`Se han exportado ${workoutHistory.length} sesiones del historial.`);
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  // Handle Export Only Exercise Diary
  const handleExportDiary = () => {
    const filename = `workoutlog-diario-${new Date().toISOString().split('T')[0]}.json`;
    const exportPayload = {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'diary',
      exerciseDiary,
    };
    downloadJsonFile(filename, exportPayload);
    const totalEntries = exerciseDiary.reduce((acc, d) => acc + (d.entries?.length || 0), 0);
    setExportSuccessMessage(`Se han exportado ${totalEntries} registros del diario (${exerciseDiary.length} ejercicios).`);
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  // Handle Export All (Exercises + Routines & Sets + RM Logs + Workout History + Exercise Diary)
  const handleExportAll = () => {
    const filename = `workoutlog-backup-completo-${new Date().toISOString().split('T')[0]}.json`;
    const exportPayload = {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'all',
      catalog,
      routines,
      rmLogs,
      workoutHistory,
      exerciseDiary,
    };
    downloadJsonFile(filename, exportPayload);
    const totalDiaryEntries = exerciseDiary.reduce((acc, d) => acc + (d.entries?.length || 0), 0);
    setExportSuccessMessage(
      `Se han exportado ${catalog.length} ejercicios, ${routines.length} rutinas, ${rmLogs.length} RMs, ${workoutHistory.length} sesiones y ${totalDiaryEntries} notas del diario.`
    );
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParsedData(null);

    if (!file.name.toLowerCase().endsWith('.json')) {
      setParseError('El archivo debe tener formato .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseImportedData(text);

        if (!result.hasExercises && !result.hasRoutines && !result.hasRmLogs && !result.hasHistory && !result.hasDiary) {
          setParseError('No se encontraron ejercicios, rutinas, registros de RM, historial ni diario válidos en el archivo.');
          return;
        }

        setParsedData(result);
      } catch (err) {
        console.error('JSON parse error', err);
        setParseError('Error al leer el archivo JSON. Verifica que el archivo no esté corrupto.');
      }
    };
    reader.onerror = () => {
      setParseError('Error de lectura al cargar el archivo.');
    };
    reader.readAsText(file);
  };

  // Handle Execute Import
  const handleExecuteImport = () => {
    if (!parsedData) return;
    setIsProcessing(true);

    try {
      if (importMode === 'overwrite') {
        const newCatalog = parsedData.catalog;
        const newRoutines = syncRoutinesWithCatalog(parsedData.routines, newCatalog);
        const newRmLogs = parsedData.rmLogs;
        const newWorkoutHistory = parsedData.workoutHistory;
        const newExerciseDiary = parsedData.exerciseDiary;

        if (!isRoutineCountAllowed(newRoutines.length, isPremiumActive)) {
          setParseError(ROUTINE_LIMIT_ERROR_MESSAGE);
          return;
        }

        onImportComplete(newCatalog, newRoutines, newRmLogs, newWorkoutHistory, newExerciseDiary, {
          exercisesAdded: newCatalog.length,
          exercisesReplaced: 0,
          routinesAdded: newRoutines.length,
          exercisesInRoutinesUpdated: 0,
          rmLogsAdded: newRmLogs.length,
          rmLogsUpdated: 0,
          historyAdded: newWorkoutHistory.length,
          diaryAdded: newExerciseDiary.length,
          diaryUpdated: 0,
          mode: 'overwrite',
        });
        onClose();
      } else {
        // Merge mode
        const catalogMerge = mergeCatalogs(catalog, parsedData.catalog, replaceDuplicateExercises);
        const routinesMerge = mergeRoutines(routines, parsedData.routines, {
          importedCatalog: parsedData.catalog,
          existingCatalog: catalog,
          replaceDuplicates: replaceDuplicateExercises,
        });
        const rmMerge = mergeRmLogs(rmLogs, parsedData.rmLogs, replaceDuplicateExercises);
        const historyMerge = mergeWorkoutHistory(workoutHistory, parsedData.workoutHistory);
        const diaryMerge = mergeExerciseDiary(exerciseDiary, parsedData.exerciseDiary, replaceDuplicateExercises);

        if (!isRoutineCountAllowed(routinesMerge.merged.length, isPremiumActive)) {
          setParseError(ROUTINE_LIMIT_ERROR_MESSAGE);
          return;
        }

        onImportComplete(
          catalogMerge.merged,
          routinesMerge.merged,
          rmMerge.merged,
          historyMerge.merged,
          diaryMerge.merged,
          {
            exercisesAdded: catalogMerge.addedCount,
            exercisesReplaced: catalogMerge.replacedCount,
            routinesAdded: routinesMerge.addedCount,
            exercisesInRoutinesUpdated: routinesMerge.updatedExercisesCount,
            rmLogsAdded: rmMerge.addedCount,
            rmLogsUpdated: rmMerge.updatedCount,
            historyAdded: historyMerge.addedCount,
            diaryAdded: diaryMerge.addedCount,
            diaryUpdated: diaryMerge.updatedCount,
            mode: 'merge',
          }
        );
        onClose();
      }
    } catch (e) {
      console.error('Import processing error', e);
      setParseError('Ocurrió un error inesperado al procesar los datos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-[#1C1C1E] rounded-2xl sm:rounded-3xl border border-white/[0.1] shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] shrink-0 bg-[#1C1C1E]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] shrink-0">
              <FileJson className="w-4 h-4 text-[#00FF87]" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                Copia de Seguridad & Datos
              </h2>
              <p className="text-xs text-zinc-400">
                Exporta o restaura tus ejercicios y rutinas en formato JSON
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-white/[0.08] bg-black/20 shrink-0">
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.08] p-1 rounded-xl w-fit">
            <button
              id="tab-backup-export"
              type="button"
              onClick={() => setActiveTab('export')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                activeTab === 'export'
                  ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
            <button
              id="tab-backup-import"
              type="button"
              onClick={() => setActiveTab('import')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                activeTab === 'import'
                  ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-5 space-y-4">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
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
                {/* Option 1: Only Routines & their associated exercises */}
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
                    onClick={handleExportRoutines}
                    className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Rutinas</span>
                  </button>
                </div>

                {/* Option 2: Only Exercises */}
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
                    onClick={handleExportExercises}
                    className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Ejercicios</span>
                  </button>
                </div>

                {/* Option 3: Only RM Logs */}
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
                    onClick={handleExportRmLogs}
                    className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar RMs</span>
                  </button>
                </div>

                {/* Option 4: Only Workout History */}
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
                    onClick={handleExportHistory}
                    className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Historial</span>
                  </button>
                </div>

                {/* Option 5: Only Exercise Diary */}
                <div className="flex flex-col justify-between p-4 rounded-2xl border border-white/[0.08] bg-black/25 hover:border-white/20 shadow-lg transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-teal-400" />
                      </span>
                      <span className="text-[11px] font-extrabold text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/30">
                        {exerciseDiary.reduce((sum, d) => sum + (d.entries?.length || 0), 0)} notas
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
                    onClick={handleExportDiary}
                    className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-white transition active:scale-[0.97]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Diario</span>
                  </button>
                </div>

                {/* Option 6: All (Exercises + Routines & Sets + RMs + History + Diary) */}
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
                      {catalog.length} ejercicios, {routines.length} rutinas, {rmLogs.length} RMs, {workoutHistory.length} sesiones y {exerciseDiary.reduce((sum, d) => sum + (d.entries?.length || 0), 0)} notas del diario.
                    </p>
                  </div>

                  <button
                    id="btn-export-all"
                    type="button"
                    onClick={handleExportAll}
                    className="mt-4 w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black transition active:scale-[0.97] shadow-[0_0_15px_rgba(0,255,135,0.3)]"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Descargar Todo (.json)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="file-input-backup"
              />

              {!parsedData ? (
                /* File Picker Dropzone */
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 hover:border-[#00FF87]/50 bg-black/25 hover:bg-black/35 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 text-[#00FF87] flex items-center justify-center mx-auto shadow-md">
                    <Upload className="w-6 h-6 text-[#00FF87]" />
                  </div>
                  <h4 className="text-sm font-bold text-white mt-3">
                    Selecciona o arrastra tu archivo JSON
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    Acepta copias de WorkoutLog con ejercicios, rutinas, RMs, historial o diario.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white shadow-md active:scale-95 transition-all"
                  >
                    Examinar archivo
                  </button>
                </div>
              ) : (
                /* File Loaded & Configuration Options */
                <div className="space-y-4">
                  {/* File Detected Card */}
                  <div className="flex items-center justify-between p-3.5 bg-black/30 border border-white/[0.08] rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] flex items-center justify-center shrink-0">
                        <FileJson className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {selectedFile?.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 flex-wrap">
                          {parsedData.hasExercises && (
                            <span className="text-[#00FF87] font-semibold">
                              {parsedData.catalog.length} ejercicios
                            </span>
                          )}
                          {parsedData.hasExercises && (parsedData.hasRoutines || parsedData.hasRmLogs || parsedData.hasHistory || parsedData.hasDiary) && <span>•</span>}
                          {parsedData.hasRoutines && (
                            <span className="text-blue-400 font-semibold">
                              {parsedData.routines.length} rutinas
                            </span>
                          )}
                          {parsedData.hasRoutines && (parsedData.hasRmLogs || parsedData.hasHistory || parsedData.hasDiary) && <span>•</span>}
                          {parsedData.hasRmLogs && (
                            <span className="text-amber-400 font-semibold">
                              {parsedData.rmLogs.length} RMs
                            </span>
                          )}
                          {parsedData.hasRmLogs && (parsedData.hasHistory || parsedData.hasDiary) && <span>•</span>}
                          {parsedData.hasHistory && (
                            <span className="text-purple-400 font-semibold">
                              {parsedData.workoutHistory.length} sesiones
                            </span>
                          )}
                          {parsedData.hasHistory && parsedData.hasDiary && <span>•</span>}
                          {parsedData.hasDiary && (
                            <span className="text-teal-400 font-semibold">
                              {parsedData.exerciseDiary.reduce((sum, d) => sum + (d.entries?.length || 0), 0)} notas diario ({parsedData.exerciseDiary.length} ejercicios)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetFile}
                      className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] text-xs font-medium"
                      title="Cambiar archivo"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mode Options: Radio Buttons */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                      Método de importación
                    </label>

                    {/* Radio 1: Merge */}
                    <label
                      htmlFor="radio-import-merge"
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        importMode === 'merge'
                          ? 'border-[#00FF87] bg-[#00FF87]/10 shadow-[0_0_12px_rgba(0,255,135,0.15)]'
                          : 'border-white/[0.08] bg-black/25 hover:bg-black/35'
                      }`}
                    >
                      <input
                        id="radio-import-merge"
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="mt-0.5 accent-[#00FF87] w-4 h-4 cursor-pointer"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            Combinar con los datos actuales
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/30">
                            Recomendado
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          Añade los nuevos datos a tu biblioteca y rutinas sin perder lo que ya tienes guardado.
                        </p>

                        {/* Checkbox for duplicate exercise handling */}
                        {importMode === 'merge' && (
                          <div className="mt-3 pt-2.5 border-t border-white/[0.08]">
                            <label
                              htmlFor="chk-replace-duplicates"
                              className="flex items-start gap-2.5 cursor-pointer"
                            >
                              <input
                                id="chk-replace-duplicates"
                                type="checkbox"
                                checked={replaceDuplicateExercises}
                                onChange={(e) => setReplaceDuplicateExercises(e.target.checked)}
                                className="mt-0.5 rounded accent-[#00FF87] w-3.5 h-3.5 cursor-pointer"
                              />
                              <div className="text-[11px] leading-snug">
                                <span className="font-semibold text-white block">
                                  Si un ejercicio ya existe, sobrescribirlo con el del archivo
                                </span>
                                <span className="text-zinc-400 block mt-0.5">
                                  {replaceDuplicateExercises
                                    ? 'Se actualizarán las notas, imagen o vídeos tanto en la biblioteca como en tus rutinas con la versión importada (conservando tus series grabadas).'
                                    : 'Se conservará intacto el ejercicio que ya tienes guardado en la app.'}
                                </span>
                                <span className="text-[10px] text-zinc-500 block mt-0.5 italic">
                                  * Detectado por título (sin distinguir mayúsculas ni acentos). Las series y cargas de tus rutinas siempre se conservan.
                                </span>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Radio 2: Overwrite All */}
                    <label
                      htmlFor="radio-import-overwrite"
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        importMode === 'overwrite'
                          ? 'border-amber-500/80 bg-amber-500/10 shadow-lg'
                          : 'border-white/[0.08] bg-black/25 hover:bg-black/35'
                      }`}
                    >
                      <input
                        id="radio-import-overwrite"
                        type="radio"
                        name="importMode"
                        value="overwrite"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                        className="mt-0.5 accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">
                            Sobrescribir toda la información actual de la app
                          </span>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          Reemplaza por completo tu biblioteca de ejercicios y rutinas actuales por los datos contenidos en el archivo.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {parseError && (
                <div className="flex items-start gap-2 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-black/25 rounded-xl border border-white/[0.06] text-[11px] text-zinc-400">
                <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>
                  Los datos importados se guardan localmente en tu base de datos IndexedDB de forma segura.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-white/[0.08] bg-black/30 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-xs font-bold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition"
          >
            Cerrar
          </button>

          {activeTab === 'import' && parsedData && (
            <button
              id="btn-confirm-import"
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[48px] text-xs font-extrabold rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_15px_rgba(0,255,135,0.3)] transition active:scale-[0.97] disabled:opacity-50"
            >
              <Upload className="w-4 h-4 stroke-[3]" />
              <span>{isProcessing ? 'Importando...' : 'Confirmar e Importar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
