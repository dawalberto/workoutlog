import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpDown,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Dumbbell,
  Check,
  RotateCcw
} from 'lucide-react';
import { Exercise } from '../types';

interface ReorderExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onSaveOrder: (newOrderedExercises: Exercise[]) => void;
}

export const ReorderExercisesModal: React.FC<ReorderExercisesModalProps> = ({
  isOpen,
  onClose,
  exercises,
  onSaveOrder,
}) => {
  const [items, setItems] = useState<Exercise[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setItems([...exercises]);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }, [isOpen, exercises]);

  if (!isOpen) return null;

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setItems(updated);
  };

  const handleMoveToPosition = (fromIndex: number, targetPosition: number) => {
    const toIndex = targetPosition - 1;
    handleMove(fromIndex, toIndex);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    handleMove(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleReset = () => {
    setItems([...exercises]);
  };

  const handleSave = () => {
    onSaveOrder(items);
    onClose();
  };

  return (
    <div
      id="reorder-exercises-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="reorder-exercises-modal"
        className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                Ordenar Ejercicios
              </h3>
              <p className="text-xs text-zinc-500">
                Arrastra o selecciona la posición para organizar tu rutina
              </p>
            </div>
          </div>
          <button
            id="btn-close-reorder-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable Exercise List */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              No hay ejercicios en esta rutina para ordenar.
            </p>
          ) : (
            items.map((ex, index) => {
              const isDraggingThis = draggedIndex === index;
              const isTargetThis = dragOverIndex === index && !isDraggingThis;

              return (
                <div
                  key={ex.id}
                  id={`reorder-item-${ex.id}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all ${
                    isDraggingThis
                      ? 'opacity-40 border-dashed border-emerald-500 bg-emerald-50/30'
                      : isTargetThis
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-md scale-[1.01]'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs'
                  }`}
                >
                  {/* Drag Handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-700 p-1 shrink-0"
                    title="Mantén pulsado y arrastra para reordenar"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Position Dropdown */}
                  <div className="relative shrink-0">
                    <select
                      id={`select-reorder-pos-${ex.id}`}
                      aria-label={`Posición para ${ex.name}`}
                      value={index + 1}
                      onChange={(e) => handleMoveToPosition(index, Number(e.target.value))}
                      className="appearance-none cursor-pointer w-8 h-8 rounded-lg text-xs font-black text-center bg-zinc-900 text-white hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 transition-colors border-0"
                      title="Selecciona la posición deseada"
                    >
                      {items.map((_, i) => (
                        <option key={i} value={i + 1} className="bg-white text-zinc-900 font-semibold">
                          #{i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Thumbnail / Icon */}
                  <div className="w-10 h-10 rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {ex.imageUrl ? (
                      <img
                        src={ex.imageUrl}
                        alt={ex.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Dumbbell className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>

                  {/* Exercise Title and Sets Info */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                      {ex.name || 'Ejercicio sin nombre'}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                      <span>{ex.sets.length} {ex.sets.length === 1 ? 'serie' : 'series'}</span>
                      {ex.category && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium truncate">{ex.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Up / Down Move Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, index - 1)}
                      title="Subir un puesto"
                      className="p-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => handleMove(index, index + 1)}
                      title="Bajar un puesto"
                      className="p-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-200/80 bg-zinc-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reestablecer
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-confirm-reorder"
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
            >
              <Check className="w-4 h-4" /> Guardar Orden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
