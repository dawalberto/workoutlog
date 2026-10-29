import { useRef, useState } from 'react';
import type {
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  WorkoutHistoryLog,
} from '../../types';
import { useAppStore } from '../../store/appStore';
import { ANALYTICS_EVENTS } from '../../utils/analytics';
import { selectPersistedData } from '../../store/selectors';
import { useShallow } from 'zustand/react/shallow';
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
} from '../../utils/backup';

export type BackupTab = 'export' | 'import';
export type BackupImportMode = 'merge' | 'overwrite';

export interface BackupExportData {
  catalog: ExerciseDefinition[];
  routines: Routine[];
  rmLogs: ExerciseRmLog[];
  workoutHistory: WorkoutHistoryLog[];
  exerciseDiary: ExerciseDiary[];
  exportSuccessMessage: string | null;
}

export interface BackupExportActions {
  onExportRoutines: () => void;
  onExportExercises: () => void;
  onExportRmLogs: () => void;
  onExportHistory: () => void;
  onExportDiary: () => void;
  onExportAll: () => void;
}

export interface BackupImportState {
  selectedFile: File | null;
  parsedData: ParsedBackupData | null;
  parseError: string | null;
  importMode: BackupImportMode;
  replaceDuplicateExercises: boolean;
}

export interface BackupImportActions {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onImportModeChange: (mode: BackupImportMode) => void;
  onReplaceDuplicateExercisesChange: (replace: boolean) => void;
  onResetFile: () => void;
}

export function useDataBackup() {
  const {
    catalog,
    routines,
    rmLogs,
    workoutHistory,
    exerciseDiary,
  } = useAppStore(useShallow(selectPersistedData));
  const isOpen = useAppStore((state) => state.isBackupModalOpen);
  const onClose = useAppStore((state) => state.closeBackupModal);
  const isSyncEnabled = useAppStore((state) => state.isSyncEnabled);
  const importBackup = useAppStore((state) => state.importBackup);
  const recordAnalyticsEvent = useAppStore((state) => state.recordAnalyticsEvent);

  const trackBackup = (name: typeof ANALYTICS_EVENTS.BACKUP_EXPORT | typeof ANALYTICS_EVENTS.BACKUP_IMPORT, backupType: string) => {
    recordAnalyticsEvent(name, { backup_type: backupType });
  };

  const [activeTab, setActiveTab] = useState<BackupTab>('export');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<BackupImportMode>('merge');
  const [replaceDuplicateExercises, setReplaceDuplicateExercises] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportRoutines = () => {
    const filename = `workoutlog-rutinas-${new Date().toISOString().split('T')[0]}.json`;
    const routineExerciseNames = new Set<string>();
    routines.forEach((routine) => {
      routine.exercises.forEach((exercise) => {
        if (exercise.name) routineExerciseNames.add(normalizeExerciseTitle(exercise.name));
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
            categories: exercise.categories,
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

    downloadJsonFile(filename, {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'routines',
      routines,
      catalog: associatedCatalog,
    });
    trackBackup(ANALYTICS_EVENTS.BACKUP_EXPORT, 'routines');
    setExportSuccessMessage(
      `Se han exportado ${routines.length} rutinas y ${associatedCatalog.length} ejercicios asociados.`
    );
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  const handleExportExercises = () => {
    const filename = `workoutlog-ejercicios-${new Date().toISOString().split('T')[0]}.json`;
    downloadJsonFile(filename, {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'exercises',
      catalog,
    });
    trackBackup(ANALYTICS_EVENTS.BACKUP_EXPORT, 'exercises');
    setExportSuccessMessage(`Se han exportado ${catalog.length} ejercicios.`);
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  const handleExportRmLogs = () => {
    const filename = `workoutlog-rms-${new Date().toISOString().split('T')[0]}.json`;
    downloadJsonFile(filename, {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'rms',
      rmLogs,
    });
    trackBackup(ANALYTICS_EVENTS.BACKUP_EXPORT, 'rms');
    setExportSuccessMessage(`Se han exportado ${rmLogs.length} ejercicios de RMs.`);
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  const handleExportHistory = () => {
    const filename = `workoutlog-historial-${new Date().toISOString().split('T')[0]}.json`;
    downloadJsonFile(filename, {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'history',
      workoutHistory,
    });
    trackBackup(ANALYTICS_EVENTS.BACKUP_EXPORT, 'history');
    setExportSuccessMessage(`Se han exportado ${workoutHistory.length} sesiones del historial.`);
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  const handleExportDiary = () => {
    const filename = `workoutlog-diario-${new Date().toISOString().split('T')[0]}.json`;
    downloadJsonFile(filename, {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'diary',
      exerciseDiary,
    });
    const totalEntries = exerciseDiary.reduce((sum, diary) => sum + (diary.entries?.length || 0), 0);
    trackBackup(ANALYTICS_EVENTS.BACKUP_EXPORT, 'diary');
    setExportSuccessMessage(
      `Se han exportado ${totalEntries} registros del diario (${exerciseDiary.length} ejercicios).`
    );
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  const handleExportAll = () => {
    const filename = `workoutlog-backup-completo-${new Date().toISOString().split('T')[0]}.json`;
    downloadJsonFile(filename, {
      app: 'WorkoutLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'all',
      catalog,
      routines,
      rmLogs,
      workoutHistory,
      exerciseDiary,
    });
    const totalDiaryEntries = exerciseDiary.reduce((sum, diary) => sum + (diary.entries?.length || 0), 0);
    trackBackup(ANALYTICS_EVENTS.BACKUP_EXPORT, 'all');
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
    reader.onerror = () => setParseError('Error de lectura al cargar el archivo.');
    reader.readAsText(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
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
        importBackup({
          catalog: newCatalog,
          routines: newRoutines,
          rmLogs: newRmLogs,
          workoutHistory: newWorkoutHistory,
          exerciseDiary: newExerciseDiary,
        }, {
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
        trackBackup(ANALYTICS_EVENTS.BACKUP_IMPORT, 'overwrite');
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
        importBackup({
          catalog: catalogMerge.merged,
          routines: routinesMerge.merged,
          rmLogs: rmMerge.merged,
          workoutHistory: historyMerge.merged,
          exerciseDiary: diaryMerge.merged,
        }, {
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
        });
        trackBackup(ANALYTICS_EVENTS.BACKUP_IMPORT, 'merge');
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    isOpen,
    onClose,
    activeTab,
    setActiveTab,
    isProcessing,
    parsedData,
    fileInputRef,
    handleExecuteImport,
    exportData: {
      catalog,
      routines,
      rmLogs,
      workoutHistory,
      exerciseDiary,
      exportSuccessMessage,
    },
    exportActions: {
      onExportRoutines: handleExportRoutines,
      onExportExercises: handleExportExercises,
      onExportRmLogs: handleExportRmLogs,
      onExportHistory: handleExportHistory,
      onExportDiary: handleExportDiary,
      onExportAll: handleExportAll,
    },
    importState: {
      selectedFile,
      parsedData,
      parseError,
      importMode,
      replaceDuplicateExercises,
    },
    importActions: {
      onFileChange: handleFileChange,
      onDrop: handleDrop,
      onImportModeChange: setImportMode,
      onReplaceDuplicateExercisesChange: setReplaceDuplicateExercises,
      onResetFile: handleResetFile,
    },
  };
}
