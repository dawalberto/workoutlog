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
  ArrowRight,
  RefreshCw,
  Info,
  Trophy,
  Calendar
} from 'lucide-react';
import { ExerciseDefinition, Routine, ExerciseRmLog, WorkoutHistoryLog } from '../types';
import {
  parseImportedData,
  mergeCatalogs,
  mergeRoutines,
  mergeRmLogs,
  mergeWorkoutHistory,
  syncRoutinesWithCatalog,
  downloadJsonFile,
  ParsedBackupData
} from '../utils/backup';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: ExerciseDefinition[];
  routines: Routine[];
  rmLogs: ExerciseRmLog[];
  workoutHistory: WorkoutHistoryLog[];
  onImportComplete: (
    newCatalog: ExerciseDefinition[],
    newRoutines: Routine[],
    newRmLogs: ExerciseRmLog[],
    newWorkoutHistory: WorkoutHistoryLog[],
    summary: {
      exercisesAdded: number;
      exercisesReplaced: number;
      routinesAdded: number;
      exercisesInRoutinesUpdated?: number;
      rmLogsAdded?: number;
      rmLogsUpdated?: number;
      historyAdded?: number;
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

  // Handle Export All (Exercises + Routines & Sets + RM Logs + Workout History)
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
    };
    downloadJsonFile(filename, exportPayload);
    setExportSuccessMessage(
      `Se han exportado ${catalog.length} ejercicios, ${routines.length} rutinas, ${rmLogs.length} RMs y ${workoutHistory.length} sesiones.`
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

        if (!result.hasExercises && !result.hasRoutines && !result.hasRmLogs && !result.hasHistory) {
          setParseError('No se encontraron ejercicios, rutinas, registros de RM ni historial válidos en el archivo.');
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

        onImportComplete(newCatalog, newRoutines, newRmLogs, newWorkoutHistory, {
          exercisesAdded: newCatalog.length,
          exercisesReplaced: 0,
          routinesAdded: newRoutines.length,
          exercisesInRoutinesUpdated: 0,
          rmLogsAdded: newRmLogs.length,
          rmLogsUpdated: 0,
          historyAdded: newWorkoutHistory.length,
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

        onImportComplete(catalogMerge.merged, routinesMerge.merged, rmMerge.merged, historyMerge.merged, {
          exercisesAdded: catalogMerge.addedCount,
          exercisesReplaced: catalogMerge.replacedCount,
          routinesAdded: routinesMerge.addedCount,
          exercisesInRoutinesUpdated: routinesMerge.updatedExercisesCount,
          rmLogsAdded: rmMerge.addedCount,
          rmLogsUpdated: rmMerge.updatedCount,
          historyAdded: historyMerge.addedCount,
          mode: 'merge',
        });
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-zinc-900 text-emerald-400 shrink-0">
              <FileJson className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                Copia de Seguridad & Datos
              </h2>
              <p className="text-xs text-zinc-500">
                Exporta o restaura tus ejercicios y rutinas en formato JSON
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-zinc-100 bg-zinc-50/70 shrink-0">
          <div className="flex items-center gap-1.5 bg-zinc-200/80 p-1 rounded-xl w-fit">
            <button
              id="tab-backup-export"
              type="button"
              onClick={() => setActiveTab('export')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'export'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar</span>
            </button>
            <button
              id="tab-backup-import"
              type="button"
              onClick={() => setActiveTab('import')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'import'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Importar</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              {exportSuccessMessage && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{exportSuccessMessage}</span>
                </div>
              )}

              <p className="text-xs text-zinc-600 leading-relaxed">
                Descarga un archivo JSON con tus datos para guardarlo como copia de seguridad en tu dispositivo o transferirlo a otro navegador o móvil.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* Option A: Only Exercises */}
                <div className="flex flex-col justify-between p-4 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-emerald-600" />
                      </span>
                      <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                        {catalog.length} ejerc.
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 mt-2.5">
                      Solo Ejercicios
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Catálogo y biblioteca con sus fotos, vídeos y valores base.
                    </p>
                  </div>

                  <button
                    id="btn-export-exercises"
                    type="button"
                    onClick={handleExportExercises}
                    className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 transition active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Ejercicios</span>
                  </button>
                </div>

                {/* Option B: Only RM Logs */}
                <div className="flex flex-col justify-between p-4 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-amber-600" />
                      </span>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                        {rmLogs.length} RMs
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 mt-2.5">
                      Solo Registro de RMs
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Historial completo de marcas personales (1RM) por ejercicio.
                    </p>
                  </div>

                  <button
                    id="btn-export-rms"
                    type="button"
                    onClick={handleExportRmLogs}
                    className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 transition active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar RMs</span>
                  </button>
                </div>

                {/* Option C: Only Workout History */}
                <div className="flex flex-col justify-between p-4 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </span>
                      <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                        {workoutHistory.length} sesiones
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 mt-2.5">
                      Solo Historial
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Registro de todas las sesiones de rutinas completadas.
                    </p>
                  </div>

                  <button
                    id="btn-export-history"
                    type="button"
                    onClick={handleExportHistory}
                    className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 transition active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Historial</span>
                  </button>
                </div>

                {/* Option D: All (Exercises + Routines & Sets + RMs + History) */}
                <div className="flex flex-col justify-between p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 hover:border-emerald-500/60 shadow-xs transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </span>
                      <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Completa
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 mt-2.5">
                      Todo el contenido
                    </h3>
                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                      {catalog.length} ejercicios, {routines.length} rutinas, {rmLogs.length} RMs y {workoutHistory.length} sesiones.
                    </p>
                  </div>

                  <button
                    id="btn-export-all"
                    type="button"
                    onClick={handleExportAll}
                    className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white transition active:scale-98 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
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
                  className="border-2 border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/70 hover:bg-zinc-50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-800 mt-3">
                    Selecciona o arrastra tu archivo JSON
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                    Acepta copias de WorkoutLog con ejercicios, rutinas, RMs y/o historial de sesiones.
                  </p>
                  <button
                    type="button"
                    className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-100 shadow-2xs"
                  >
                    Examinar archivo
                  </button>
                </div>
              ) : (
                /* File Loaded & Configuration Options */
                <div className="space-y-4">
                  {/* File Detected Card */}
                  <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-zinc-900 text-emerald-400 flex items-center justify-center shrink-0">
                        <FileJson className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-900 block truncate">
                          {selectedFile?.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 flex-wrap">
                          {parsedData.hasExercises && (
                            <span className="text-emerald-700 font-semibold">
                              {parsedData.catalog.length} ejercicios
                            </span>
                          )}
                          {parsedData.hasExercises && (parsedData.hasRoutines || parsedData.hasRmLogs || parsedData.hasHistory) && <span>•</span>}
                          {parsedData.hasRoutines && (
                            <span className="text-blue-700 font-semibold">
                              {parsedData.routines.length} rutinas
                            </span>
                          )}
                          {parsedData.hasRoutines && (parsedData.hasRmLogs || parsedData.hasHistory) && <span>•</span>}
                          {parsedData.hasRmLogs && (
                            <span className="text-amber-700 font-semibold">
                              {parsedData.rmLogs.length} RMs
                            </span>
                          )}
                          {parsedData.hasRmLogs && parsedData.hasHistory && <span>•</span>}
                          {parsedData.hasHistory && (
                            <span className="text-purple-700 font-semibold">
                              {parsedData.workoutHistory.length} sesiones
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetFile}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 text-xs font-medium"
                      title="Cambiar archivo"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mode Options: Radio Buttons */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                      Método de importación
                    </label>

                    {/* Radio 1: Merge */}
                    <label
                      htmlFor="radio-import-merge"
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        importMode === 'merge'
                          ? 'border-emerald-500 bg-emerald-50/30 shadow-2xs'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50'
                      }`}
                    >
                      <input
                        id="radio-import-merge"
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900">
                            Combinar con los datos actuales
                          </span>
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            Recomendado
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-snug">
                          Añade los nuevos datos a tu biblioteca y rutinas sin perder lo que ya tienes guardado.
                        </p>

                        {/* Checkbox for duplicate exercise handling */}
                        {importMode === 'merge' && (
                          <div className="mt-3 pt-2.5 border-t border-emerald-200/60">
                            <label
                              htmlFor="chk-replace-duplicates"
                              className="flex items-start gap-2.5 cursor-pointer"
                            >
                              <input
                                id="chk-replace-duplicates"
                                type="checkbox"
                                checked={replaceDuplicateExercises}
                                onChange={(e) => setReplaceDuplicateExercises(e.target.checked)}
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <div className="text-[11px] leading-snug">
                                <span className="font-semibold text-zinc-800 block">
                                  Si un ejercicio ya existe, sobrescribirlo con el del archivo
                                </span>
                                <span className="text-zinc-500 block mt-0.5">
                                  {replaceDuplicateExercises
                                    ? 'Se actualizarán las notas, imagen o vídeos tanto en la biblioteca como en tus rutinas con la versión importada (conservando tus series grabadas).'
                                    : 'Se conservará intacto el ejercicio que ya tienes guardado en la app.'}
                                </span>
                                <span className="text-[10px] text-zinc-400 block mt-0.5 italic">
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
                          ? 'border-amber-500 bg-amber-50/40 shadow-2xs'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50'
                      }`}
                    >
                      <input
                        id="radio-import-overwrite"
                        type="radio"
                        name="importMode"
                        value="overwrite"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-900">
                            Sobrescribir toda la información actual de la app
                          </span>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-snug">
                          Reemplaza por completo tu biblioteca de ejercicios y rutinas actuales por los datos contenidos en el archivo.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {parseError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-[11px] text-zinc-500">
                <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>
                  Los datos importados se guardan localmente en tu navegador de forma segura.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-zinc-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition"
          >
            Cerrar
          </button>

          {activeTab === 'import' && parsedData && (
            <button
              id="btn-confirm-import"
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Importando...' : 'Confirmar e Importar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
