import React from 'react';
import {
  AlertTriangle,
  FileJson,
  Info,
  RefreshCw,
  Upload,
} from 'lucide-react';
import type {
  BackupImportActions,
  BackupImportState,
} from '../../hooks/data-backup/useDataBackup';

interface BackupImportPanelProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  state: BackupImportState;
  actions: BackupImportActions;
}

export const BackupImportPanel: React.FC<BackupImportPanelProps> = ({
  fileInputRef,
  state,
  actions,
}) => (
  <div className="space-y-4">
    <input
      ref={fileInputRef}
      type="file"
      accept=".json,application/json"
      onChange={actions.onFileChange}
      className="hidden"
      id="file-input-backup"
    />

    {!state.parsedData ? (
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={actions.onDrop}
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
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3.5 bg-black/30 border border-white/[0.08] rounded-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] flex items-center justify-center shrink-0">
              <FileJson className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                {state.selectedFile?.name}
              </span>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 flex-wrap">
                {state.parsedData.hasExercises && (
                  <span className="text-[#00FF87] font-semibold">
                    {state.parsedData.catalog.length} ejercicios
                  </span>
                )}
                {state.parsedData.hasExercises && (state.parsedData.hasRoutines || state.parsedData.hasRmLogs || state.parsedData.hasHistory || state.parsedData.hasDiary) && <span>•</span>}
                {state.parsedData.hasRoutines && (
                  <span className="text-blue-400 font-semibold">
                    {state.parsedData.routines.length} rutinas
                  </span>
                )}
                {state.parsedData.hasRoutines && (state.parsedData.hasRmLogs || state.parsedData.hasHistory || state.parsedData.hasDiary) && <span>•</span>}
                {state.parsedData.hasRmLogs && (
                  <span className="text-amber-400 font-semibold">
                    {state.parsedData.rmLogs.length} RMs
                  </span>
                )}
                {state.parsedData.hasRmLogs && (state.parsedData.hasHistory || state.parsedData.hasDiary) && <span>•</span>}
                {state.parsedData.hasHistory && (
                  <span className="text-purple-400 font-semibold">
                    {state.parsedData.workoutHistory.length} sesiones
                  </span>
                )}
                {state.parsedData.hasHistory && state.parsedData.hasDiary && <span>•</span>}
                {state.parsedData.hasDiary && (
                  <span className="text-teal-400 font-semibold">
                    {state.parsedData.exerciseDiary.reduce((sum, diary) => sum + (diary.entries?.length || 0), 0)} notas diario ({state.parsedData.exerciseDiary.length} ejercicios)
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={actions.onResetFile}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] text-xs font-medium"
            title="Cambiar archivo"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
            Método de importación
          </label>

          <label
            htmlFor="radio-import-merge"
            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
              state.importMode === 'merge'
                ? 'border-[#00FF87] bg-[#00FF87]/10 shadow-[0_0_12px_rgba(0,255,135,0.15)]'
                : 'border-white/[0.08] bg-black/25 hover:bg-black/35'
            }`}
          >
            <input
              id="radio-import-merge"
              type="radio"
              name="importMode"
              value="merge"
              checked={state.importMode === 'merge'}
              onChange={() => actions.onImportModeChange('merge')}
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

              {state.importMode === 'merge' && (
                <div className="mt-3 pt-2.5 border-t border-white/[0.08]">
                  <label
                    htmlFor="chk-replace-duplicates"
                    className="flex items-start gap-2.5 cursor-pointer"
                  >
                    <input
                      id="chk-replace-duplicates"
                      type="checkbox"
                      checked={state.replaceDuplicateExercises}
                      onChange={(event) => actions.onReplaceDuplicateExercisesChange(event.target.checked)}
                      className="mt-0.5 rounded accent-[#00FF87] w-3.5 h-3.5 cursor-pointer"
                    />
                    <div className="text-[11px] leading-snug">
                      <span className="font-semibold text-white block">
                        Si un ejercicio ya existe, sobrescribirlo con el del archivo
                      </span>
                      <span className="text-zinc-400 block mt-0.5">
                        {state.replaceDuplicateExercises
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

          <label
            htmlFor="radio-import-overwrite"
            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
              state.importMode === 'overwrite'
                ? 'border-amber-500/80 bg-amber-500/10 shadow-lg'
                : 'border-white/[0.08] bg-black/25 hover:bg-black/35'
            }`}
          >
            <input
              id="radio-import-overwrite"
              type="radio"
              name="importMode"
              value="overwrite"
              checked={state.importMode === 'overwrite'}
              onChange={() => actions.onImportModeChange('overwrite')}
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

    {state.parseError && (
      <div className="flex items-start gap-2 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <span>{state.parseError}</span>
      </div>
    )}

    <div className="flex items-center gap-2 p-3 bg-black/25 rounded-xl border border-white/[0.06] text-[11px] text-zinc-400">
      <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      <span>
        Los datos importados se guardan localmente en tu base de datos IndexedDB de forma segura.
      </span>
    </div>
  </div>
);
