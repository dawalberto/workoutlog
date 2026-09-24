import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Plus,
  Search,
  Dumbbell,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Edit2,
  Check,
  X,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ExerciseDefinition, ExerciseRmLog, RmRecord } from '../types';
import {
  getLatestRmRecord,
  getHighestRmRecord,
  formatRmDate,
  getTodayDateString,
} from '../utils/rmCalculations';
import { normalizeExerciseTitle } from '../utils/backup';

interface RmLogsViewProps {
  catalog: ExerciseDefinition[];
  rmLogs: ExerciseRmLog[];
  onSaveRmLogs: (updated: ExerciseRmLog[]) => void;
  onGoToCatalog: () => void;
}

export const RmLogsView: React.FC<RmLogsViewProps> = ({
  catalog,
  rmLogs,
  onSaveRmLogs,
  onGoToCatalog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // Quick log modal/form state for an existing exercise
  const [quickLogTarget, setQuickLogTarget] = useState<ExerciseRmLog | null>(null);
  const [quickWeight, setQuickWeight] = useState<string>('');
  const [quickDate, setQuickDate] = useState<string>(getTodayDateString());
  const [quickNotes, setQuickNotes] = useState<string>('');

  // Editing existing record
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Add exercise from catalog modal state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogExercise, setSelectedCatalogExercise] = useState<ExerciseDefinition | null>(null);
  const [initialWeight, setInitialWeight] = useState<string>('');
  const [initialDate, setInitialDate] = useState<string>(getTodayDateString());
  const [initialNotes, setInitialNotes] = useState<string>('');

  // Filter tracked exercises
  const filteredRmLogs = useMemo(() => {
    const term = normalizeExerciseTitle(searchTerm);
    if (!term) return rmLogs;
    return rmLogs.filter((log) => {
      const matchName = normalizeExerciseTitle(log.exerciseName).includes(term);
      const matchCat = log.category ? normalizeExerciseTitle(log.category).includes(term) : false;
      return matchName || matchCat;
    });
  }, [rmLogs, searchTerm]);

  // Set of exercise names already in rmLogs
  const trackedNormalizedNames = useMemo(() => {
    return new Set(rmLogs.map((l) => normalizeExerciseTitle(l.exerciseName)));
  }, [rmLogs]);

  // Available catalog exercises not yet tracked
  const availableCatalog = useMemo(() => {
    const term = normalizeExerciseTitle(catalogSearch);
    return catalog.filter((def) => {
      const isTracked = trackedNormalizedNames.has(normalizeExerciseTitle(def.name));
      if (isTracked) return false;
      if (!term) return true;
      const matchName = normalizeExerciseTitle(def.name).includes(term);
      const matchCat = def.category ? normalizeExerciseTitle(def.category).includes(term) : false;
      return matchName || matchCat;
    });
  }, [catalog, trackedNormalizedNames, catalogSearch]);

  // Add new tracked exercise with initial record
  const handleConfirmAddExercise = () => {
    if (!selectedCatalogExercise) return;
    const weightNum = parseFloat(initialWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('Por favor introduce un peso válido mayor a 0 kg');
      return;
    }

    const newRecord: RmRecord = {
      id: `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      weight: weightNum,
      date: initialDate || getTodayDateString(),
      notes: initialNotes.trim() ? initialNotes.trim() : undefined,
    };

    const newLog: ExerciseRmLog = {
      id: `rm-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      exerciseId: selectedCatalogExercise.id,
      exerciseName: selectedCatalogExercise.name,
      category: selectedCatalogExercise.category,
      records: [newRecord],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveRmLogs([newLog, ...rmLogs]);
    setIsAddModalOpen(false);
    setSelectedCatalogExercise(null);
    setInitialWeight('');
    setInitialNotes('');
    setInitialDate(getTodayDateString());
    setExpandedExerciseId(newLog.id);
  };

  // Delete whole exercise from RM logs
  const handleDeleteExercise = (logId: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el registro de RM de "${name}" y todo su historial?`)) {
      onSaveRmLogs(rmLogs.filter((l) => l.id !== logId));
      if (expandedExerciseId === logId) {
        setExpandedExerciseId(null);
      }
    }
  };

  // Add a new record to an existing exercise log
  const handleAddRecordToLog = (logId: string) => {
    const weightNum = parseFloat(quickWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('Por favor introduce un peso válido mayor a 0 kg');
      return;
    }

    const newRecord: RmRecord = {
      id: `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      weight: weightNum,
      date: quickDate || getTodayDateString(),
      notes: quickNotes.trim() ? quickNotes.trim() : undefined,
    };

    const updated = rmLogs.map((log) => {
      if (log.id === logId) {
        const newRecords = [newRecord, ...log.records];
        // Sort newest date first
        newRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
          ...log,
          records: newRecords,
          updatedAt: new Date().toISOString(),
        };
      }
      return log;
    });

    onSaveRmLogs(updated);
    setQuickLogTarget(null);
    setQuickWeight('');
    setQuickNotes('');
    setQuickDate(getTodayDateString());
  };

  // Start editing an existing record
  const handleStartEditRecord = (record: RmRecord) => {
    setEditingRecordId(record.id);
    setEditWeight(record.weight.toString());
    setEditDate(record.date);
    setEditNotes(record.notes || '');
  };

  // Save edited record
  const handleSaveEditRecord = (logId: string, recordId: string) => {
    const weightNum = parseFloat(editWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('Por favor introduce un peso válido mayor a 0 kg');
      return;
    }

    const updated = rmLogs.map((log) => {
      if (log.id === logId) {
        const newRecords = log.records.map((r) => {
          if (r.id === recordId) {
            return {
              ...r,
              weight: weightNum,
              date: editDate || r.date,
              notes: editNotes.trim() ? editNotes.trim() : undefined,
            };
          }
          return r;
        });
        newRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
          ...log,
          records: newRecords,
          updatedAt: new Date().toISOString(),
        };
      }
      return log;
    });

    onSaveRmLogs(updated);
    setEditingRecordId(null);
  };

  // Delete an individual record from an exercise log
  const handleDeleteRecord = (logId: string, recordId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro de RM?')) {
      const targetLog = rmLogs.find((l) => l.id === logId);
      if (!targetLog) return;

      if (targetLog.records.length <= 1) {
        if (window.confirm(`Este es el único registro de "${targetLog.exerciseName}". ¿Deseas eliminar el ejercicio del seguimiento de RMs?`)) {
          onSaveRmLogs(rmLogs.filter((l) => l.id !== logId));
          return;
        }
      }

      const updated = rmLogs.map((log) => {
        if (log.id === logId) {
          return {
            ...log,
            records: log.records.filter((r) => r.id !== recordId),
            updatedAt: new Date().toISOString(),
          };
        }
        return log;
      });

      onSaveRmLogs(updated);
    }
  };

  // Map to get definition images if available
  const catalogImageMap = useMemo(() => {
    const map = new Map<string, string>();
    catalog.forEach((def) => {
      if (def.imageUrl) {
        map.set(normalizeExerciseTitle(def.name), def.imageUrl);
      }
    });
    return map;
  }, [catalog]);

  return (
    <div id="rm-logs-container" className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-24">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 p-4 sm:p-6 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
              <Trophy className="w-6 h-6 text-amber-600 fill-amber-600/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                  Registro de RMs
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {rmLogs.length} ejercicios
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
                Historial de pesos máximos (1RM) en ejercicios de tu biblioteca.
              </p>
            </div>
          </div>

          <button
            id="btn-open-add-rm-exercise"
            type="button"
            onClick={() => {
              setSelectedCatalogExercise(null);
              setInitialWeight('');
              setInitialNotes('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Ejercicio</span>
          </button>
        </div>

        {/* Search filter */}
        {rmLogs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="search-rm-exercises"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por ejercicio o grupo muscular..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main List */}
      {rmLogs.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl border-2 border-dashed border-zinc-200 bg-white shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-amber-500/80" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">
            Aún no tienes ejercicios con RM registrado
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto mb-6 leading-relaxed">
            Lleva el control de tus marcas personales (1RM). Selecciona cualquier ejercicio de tu
            biblioteca y anota tus progresos a lo largo del tiempo.
          </p>

          {catalog.length > 0 ? (
            <button
              id="btn-empty-add-rm"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir primer ejercicio</span>
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-amber-800 font-semibold bg-amber-50 p-3 rounded-xl max-w-sm mx-auto border border-amber-200">
                Tu biblioteca de ejercicios está vacía. Añade ejercicios primero en la Biblioteca para poder registrar su RM.
              </p>
              <button
                type="button"
                onClick={onGoToCatalog}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all"
              >
                <span>Ir a la Biblioteca</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : filteredRmLogs.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-white border border-zinc-200">
          <Search className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-800">
            No se encontraron ejercicios que coincidan con &quot;{searchTerm}&quot;
          </p>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="mt-3 text-xs text-emerald-600 font-bold hover:underline"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRmLogs.map((log) => {
            const isExpanded = expandedExerciseId === log.id;
            const latestRecord = getLatestRmRecord(log);
            const highestRecord = getHighestRmRecord(log);
            const normName = normalizeExerciseTitle(log.exerciseName);
            const imageUrl = catalogImageMap.get(normName);

            return (
              <div
                key={log.id}
                id={`rm-exercise-card-${log.id}`}
                className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
              >
                {/* Exercise Summary Header */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    {/* Left: Image / Name / Badges */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-100 border border-zinc-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={log.exerciseName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Dumbbell className="w-6 h-6 text-zinc-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {log.category && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600">
                              {log.category}
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-600 font-medium">
                            {log.records.length} {log.records.length === 1 ? 'registro' : 'registros'}
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight truncate">
                          {log.exerciseName}
                        </h2>
                      </div>
                    </div>

                    {/* Right: Metrics + Action buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                      {/* Metric 1: Latest RM */}
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-1.5 text-center min-w-[90px]">
                        <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                          Último RM
                        </span>
                        <span className="text-base sm:text-lg font-black text-zinc-900 font-mono">
                          {latestRecord ? `${latestRecord.weight} kg` : '--'}
                        </span>
                        {latestRecord && (
                          <span className="block text-[10px] text-emerald-700 font-medium">
                            {formatRmDate(latestRecord.date)}
                          </span>
                        )}
                      </div>

                      {/* Metric 2: PR Record */}
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-1.5 text-center min-w-[90px] hidden xs:block">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Récord Max</span>
                        </div>
                        <span className="text-base sm:text-lg font-black text-zinc-900 font-mono">
                          {highestRecord ? `${highestRecord.weight} kg` : '--'}
                        </span>
                        {highestRecord && (
                          <span className="block text-[10px] text-amber-700 font-medium">
                            {formatRmDate(highestRecord.date)}
                          </span>
                        )}
                      </div>

                      {/* Expand / Quick Log / Delete buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-quick-log-${log.id}`}
                          type="button"
                          onClick={() => {
                            setQuickLogTarget(log);
                            setQuickWeight(latestRecord ? latestRecord.weight.toString() : '');
                            setQuickDate(getTodayDateString());
                            setQuickNotes('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
                          title="Añadir nuevo registro rápido"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Nuevo RM</span>
                        </button>

                        <button
                          id={`btn-toggle-history-${log.id}`}
                          type="button"
                          onClick={() => setExpandedExerciseId(isExpanded ? null : log.id)}
                          className={`p-2 rounded-xl border transition-colors ${
                            isExpanded
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                          }`}
                          title={isExpanded ? 'Ocultar historial' : 'Ver historial'}
                          aria-label={isExpanded ? 'Ocultar historial' : 'Ver historial'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          id={`btn-delete-rm-exercise-${log.id}`}
                          type="button"
                          onClick={() => handleDeleteExercise(log.id, log.exerciseName)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar ejercicio de RMs"
                          aria-label="Eliminar ejercicio de RMs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* History Drawer Section */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50/60 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Historial de registros ({log.records.length})</span>
                      </h3>

                      <button
                        type="button"
                        onClick={() => {
                          setQuickLogTarget(log);
                          setQuickWeight(latestRecord ? latestRecord.weight.toString() : '');
                          setQuickDate(getTodayDateString());
                          setQuickNotes('');
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> <span>Añadir registro hoy</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {log.records.map((record, rIdx) => {
                        // Compare with previous chronological record
                        const nextRecord = log.records[rIdx + 1];
                        const diff = nextRecord ? record.weight - nextRecord.weight : 0;
                        const isEditingThis = editingRecordId === record.id;

                        if (isEditingThis) {
                          return (
                            <div
                              key={record.id}
                              className="p-3 rounded-2xl bg-white border border-emerald-500 shadow-xs"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">
                                    Peso (kg) *
                                  </label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={editWeight}
                                    onChange={(e) => setEditWeight(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">
                                    Fecha *
                                  </label>
                                  <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">
                                    Notas (opcional)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="RPE 9.5, agarre cerrado..."
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingRecordId(null)}
                                  className="px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditRecord(log.id, record.id)}
                                  className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 shadow-2xs"
                                >
                                  <Check className="w-3.5 h-3.5" /> Guardar
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white border border-zinc-200/80 text-xs hover:border-zinc-300 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-sm sm:text-base text-zinc-900 min-w-[70px]">
                                {record.weight} kg
                              </span>

                              {nextRecord && (
                                <span
                                  className={`inline-flex items-center gap-0.5 font-bold text-[11px] px-1.5 py-0.5 rounded-md ${
                                    diff > 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : diff < 0
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-zinc-100 text-zinc-600'
                                  }`}
                                >
                                  {diff > 0 ? (
                                    <>
                                      <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                                      +{diff.toFixed(1)} kg
                                    </>
                                  ) : diff < 0 ? (
                                    <>
                                      <ArrowDownRight className="w-3 h-3 text-rose-600" />
                                      {diff.toFixed(1)} kg
                                    </>
                                  ) : (
                                    <>
                                      <Minus className="w-3 h-3 text-zinc-500" />
                                      0 kg
                                    </>
                                  )}
                                </span>
                              )}

                              <span className="text-zinc-600 font-medium">
                                {formatRmDate(record.date)}
                              </span>

                              {record.notes && (
                                <span className="hidden sm:inline-flex items-center gap-1 text-zinc-600 bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-200/60 truncate max-w-xs">
                                  <FileText className="w-3 h-3 shrink-0 text-zinc-400" />
                                  <span className="truncate">{record.notes}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditRecord(record)}
                                className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                                title="Editar registro"
                                aria-label="Editar registro"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(log.id, record.id)}
                                className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar registro"
                                aria-label="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add RM Record Modal for an existing tracked exercise */}
      {quickLogTarget && (
        <div
          id="modal-quick-add-rm"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setQuickLogTarget(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
                    Nuevo registro de RM
                  </h3>
                  <p className="text-xs text-zinc-600 font-semibold">{quickLogTarget.exerciseName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickLogTarget(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  Peso Máximo (kg) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Ej: 100"
                  value={quickWeight}
                  onChange={(e) => setQuickWeight(e.target.value)}
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  Notas / Observaciones (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Nueva barra, RPE 10, técnica perfecta..."
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setQuickLogTarget(null)}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                id="btn-submit-quick-rm"
                type="button"
                onClick={() => handleAddRecordToLog(quickLogTarget.id)}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Guardar RM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Add Exercise from Library to RM Logs */}
      {isAddModalOpen && (
        <div
          id="modal-add-rm-from-catalog"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-zinc-900">
                    Añadir ejercicio a RMs
                  </h3>
                  <p className="text-xs text-zinc-600 font-medium">
                    Selecciona un ejercicio de tu biblioteca
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {!selectedCatalogExercise ? (
                <>
                  {/* Search within available catalog */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar en tu biblioteca de ejercicios..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* List of library exercises */}
                  <div className="space-y-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
                    {availableCatalog.length === 0 ? (
                      <div className="text-center py-8 text-zinc-600 text-xs">
                        {catalog.length === 0 ? (
                          <span>No hay ejercicios creados en la biblioteca.</span>
                        ) : (
                          <span>Todos los ejercicios de tu biblioteca ya están añadidos al seguimiento de RMs.</span>
                        )}
                      </div>
                    ) : (
                      availableCatalog.map((exercise) => (
                        <button
                          key={exercise.id}
                          type="button"
                          onClick={() => {
                            setSelectedCatalogExercise(exercise);
                            setInitialWeight(
                              exercise.defaultWeight && exercise.defaultWeight > 0
                                ? exercise.defaultWeight.toString()
                                : ''
                            );
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {exercise.imageUrl ? (
                                <img
                                  src={exercise.imageUrl}
                                  alt={exercise.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Dumbbell className="w-5 h-5 text-zinc-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="block font-bold text-xs sm:text-sm text-zinc-900 truncate group-hover:text-emerald-950">
                                {exercise.name}
                              </span>
                              {exercise.category && (
                                <span className="text-[10px] text-zinc-600 font-semibold">
                                  {exercise.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 shrink-0 ml-2">
                            Elegir &rarr;
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                /* Step 2: Form to set initial RM */
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100 border border-zinc-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {selectedCatalogExercise.imageUrl ? (
                          <img
                            src={selectedCatalogExercise.imageUrl}
                            alt={selectedCatalogExercise.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Dumbbell className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-900 block truncate">
                          {selectedCatalogExercise.name}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-medium">
                          {selectedCatalogExercise.category || 'General'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCatalogExercise(null)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-800"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                      Peso Máximo (1RM) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="Ej: 100"
                        value={initialWeight}
                        onChange={(e) => setInitialWeight(e.target.value)}
                        autoFocus
                        className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                        kg
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                      Fecha del registro *
                    </label>
                    <input
                      type="date"
                      value={initialDate}
                      onChange={(e) => setInitialDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                      Notas / Observaciones (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Marca conseguida en competición, RPE 10..."
                      value={initialNotes}
                      onChange={(e) => setInitialNotes(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {selectedCatalogExercise && (
              <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedCatalogExercise(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 rounded-xl"
                >
                  Volver
                </button>
                <button
                  id="btn-confirm-add-rm"
                  type="button"
                  onClick={handleConfirmAddExercise}
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Guardar en RMs
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
