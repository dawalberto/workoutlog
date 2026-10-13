import React, { useRef, useState } from 'react';
import { Download, FileJson, Upload, X } from 'lucide-react';
import type {
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  WorkoutHistoryLog,
} from '../types';
import {
  downloadJsonFile,
  isRoutineCountAllowed,
  mergeCatalogs,
  mergeExerciseDiary,
  mergeRmLogs,
  mergeRoutines,
  mergeWorkoutHistory,
  normalizeExerciseTitle,
  parseImportedData,
  ROUTINE_LIMIT_ERROR_MESSAGE,
  syncRoutinesWithCatalog,
  type ParsedBackupData,
} from '../utils/backup';
import { BackupExportPanel } from './data-backup/BackupExportPanel';
import { BackupImportPanel } from './data-backup/BackupImportPanel';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: ExerciseDefinition[];
  routines: Routine[];
  rmLogs: ExerciseRmLog[];
  workoutHistory: WorkoutHistoryLog[];
  exerciseDiary: ExerciseDiary[];
  isSyncEnabled: boolean;
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
  isSyncEnabled,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [replaceDuplicateExercises, setReplaceDuplicateExercises] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportRoutines = () => {
    const filename = `workoutlog-rutinas-${new Date().toISOString().split('T')[0]}.json`;

    const routineExerciseNames = new Set<string>();
    routines.forEach((routine) => {
      routine.exercises.forEach((exercise) => {
        if (exercise.name) {
          routineExerciseNames.add(normalizeExerciseTitle(exercise.name));
        }
      });
    });

    const associatedCatalog = catalog.filter((exercise) =>
      routineExerciseNames.has(normalizeExerciseTitle(exercise.name))
    );

    const existingNames = new Set(associatedCatalog.map((exercise) => normalizeExerciseTitle(exercise.name)));
    routines.forEach((routine) => {
      routine.exercises.forEach((exercise) => {
        const normalizedName = normalizeExerciseTitle(exercise.name);
        if (normalizedName && !existingNames.has(normalizedName)) {
          existingNames.add(normalizedName);
          associatedCatalog.push({
            id: 'def-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            name: exercise.name.trim(),
            category: exercise.category || 'Otros',
            imageUrl: exercise.imageUrl || '',
            videoUrl: exercise.videoUrl || '',
            notes: exercise.notes || '',
            defaultSetsCount: exercise.sets?.length || 3,
            defaultReps: Number(exercise.sets?.[0]?.reps) || 10,
            defaultWeight: Number(exercise.sets?.[0]?.weight) || 0,
            defaultRestSeconds: Number(exercise.sets?.[0]?.restSeconds) || 60,
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
    const totalEntries = exerciseDiary.reduce((accumulator, diary) => accumulator + (diary.entries?.length || 0), 0);
    setExportSuccessMessage(`Se han exportado ${totalEntries} registros del diario (${exerciseDiary.length} ejercicios).`);
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

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
    const totalDiaryEntries = exerciseDiary.reduce((accumulator, diary) => accumulator + (diary.entries?.length || 0), 0);
    setExportSuccessMessage(
      `Se han exportado ${catalog.length} ejercicios, ${routines.length} rutinas, ${rmLogs.length} RMs, ${workoutHistory.length} sesiones y ${totalDiaryEntries} notas del diario.`
    );
    setTimeout(() => setExportSuccessMessage(null), 4000);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

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

        if (!isRoutineCountAllowed(newRoutines.length, isSyncEnabled)) {
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
        const catalogMerge = mergeCatalogs(catalog, parsedData.catalog, replaceDuplicateExercises);
        const routinesMerge = mergeRoutines(routines, parsedData.routines, {
          importedCatalog: parsedData.catalog,
          existingCatalog: catalog,
          replaceDuplicates: replaceDuplicateExercises,
        });
        const rmMerge = mergeRmLogs(rmLogs, parsedData.rmLogs, replaceDuplicateExercises);
        const historyMerge = mergeWorkoutHistory(workoutHistory, parsedData.workoutHistory);
        const diaryMerge = mergeExerciseDiary(exerciseDiary, parsedData.exerciseDiary, replaceDuplicateExercises);

        if (!isRoutineCountAllowed(routinesMerge.merged.length, isSyncEnabled)) {
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
    } catch (error) {
      console.error('Import processing error', error);
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
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] shrink-0 bg-[#1C1C1E]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] shrink-0">
              <FileJson className="w-4 h-4 text-[#00FF87]" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                Copia de Seguridad &amp; Datos
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

        <div className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-5 space-y-4">
          {activeTab === 'export' && (
            <BackupExportPanel
              catalog={catalog}
              routines={routines}
              rmLogs={rmLogs}
              workoutHistory={workoutHistory}
              exerciseDiary={exerciseDiary}
              exportSuccessMessage={exportSuccessMessage}
              onExportRoutines={handleExportRoutines}
              onExportExercises={handleExportExercises}
              onExportRmLogs={handleExportRmLogs}
              onExportHistory={handleExportHistory}
              onExportDiary={handleExportDiary}
              onExportAll={handleExportAll}
            />
          )}
          {activeTab === 'import' && (
            <BackupImportPanel
              fileInputRef={fileInputRef}
              selectedFile={selectedFile}
              parsedData={parsedData}
              parseError={parseError}
              importMode={importMode}
              replaceDuplicateExercises={replaceDuplicateExercises}
              onFileChange={handleFileChange}
              onDrop={handleDrop}
              onImportModeChange={setImportMode}
              onReplaceDuplicateExercisesChange={setReplaceDuplicateExercises}
              onResetFile={handleResetFile}
            />
          )}
        </div>

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
