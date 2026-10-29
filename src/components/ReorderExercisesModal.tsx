import React from 'react';
import {
  X,
  ArrowUpDown,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Check,
  RotateCcw
} from 'lucide-react';
import { useReorderExercisesModal } from '../hooks/routine/useReorderExercisesModal';
import { formatExerciseCategories } from '../utils/exerciseCategories';
import { ExerciseThumbnail } from './ExerciseThumbnail';

interface ReorderExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReorderExercisesModal: React.FC<ReorderExercisesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    items,
    draggedIndex,
    dragOverIndex,
    touchActiveIndex,
    touchOverIndex,
    move,
    moveToPosition,
    setDraggedIndex,
    setDragOverIndex,
    setTouchActiveIndex,
    setTouchOverIndex,
    handleDragOver,
    handleDrop,
    handleTouchMove,
    handleTouchEnd,
    reset,
    saveOrder,
  } = useReorderExercisesModal(isOpen);

  if (!isOpen) return null;

  return (
    <div
      id="reorder-exercises-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="reorder-exercises-modal"
        className="w-full max-w-lg bg-[#1C1C1E] rounded-2xl sm:rounded-3xl border border-white/[0.1] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] flex items-center justify-center shrink-0">
              <ArrowUpDown className="w-5 h-5 text-[#00FF87]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Ordenar Ejercicios
              </h3>
              <p className="text-xs text-zinc-400">
                Arrastra o selecciona la posición para organizar tu rutina
              </p>
            </div>
          </div>
          <button
            id="btn-close-reorder-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable Exercise List */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">
              No hay ejercicios en esta rutina para ordenar.
            </p>
          ) : (
            items.map((ex, index) => {
              const isDraggingThis = draggedIndex === index;
              const isTargetThis = dragOverIndex === index && !isDraggingThis;
              const isTouchActiveThis = touchActiveIndex === index;
              const isTouchTargetThis = touchOverIndex === index && !isTouchActiveThis;

              return (
                <div
                  key={ex.id}
                  id={`reorder-item-${ex.id}`}
                  data-reorder-index={index}
                  draggable
                  onDragStart={() => setDraggedIndex(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                    isDraggingThis || isTouchActiveThis
                      ? 'opacity-40 border-dashed border-[#00FF87] bg-[#00FF87]/10 scale-[0.99]'
                      : isTargetThis || isTouchTargetThis
                      ? 'border-[#00FF87] bg-[#00FF87]/15 shadow-lg ring-2 ring-[#00FF87]/50 scale-[1.01]'
                      : 'border-white/[0.08] bg-black/25 hover:border-white/20'
                  }`}
                >
                  {/* Drag Handle (Supports Mouse Drag & Mobile Touch Drag) */}
                  <div
                    className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-white p-2 -m-1 shrink-0 touch-none select-none"
                    title="Mantén pulsado y arrastra para reordenar"
                    onTouchStart={() => {
                      setTouchActiveIndex(index);
                      setTouchOverIndex(index);
                    }}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Position Dropdown */}
                  <div className="relative shrink-0">
                    <select
                      id={`select-reorder-pos-${ex.id}`}
                      aria-label={`Posición para ${ex.name}`}
                      value={index + 1}
                      onChange={(e) => moveToPosition(index, Number(e.target.value))}
                      className="appearance-none cursor-pointer w-8 h-8 rounded-lg text-xs font-black text-center bg-white/[0.08] text-white hover:bg-[#00FF87] hover:text-black focus:ring-2 focus:ring-[#00FF87] transition-all border border-white/10"
                      title="Selecciona la posición deseada"
                    >
                      {items.map((_, i) => (
                        <option key={i} value={i + 1} className="bg-[#1C1C1E] text-white font-bold">
                          #{i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Thumbnail / Icon */}
                  <div className="w-10 h-10 rounded-lg border border-white/10 bg-black/40 overflow-hidden shrink-0">
                    <ExerciseThumbnail
                      name={ex.name}
                      imageUrl={ex.imageUrl}
                      className="w-full h-full"
                      iconClassName="w-4 h-4 text-zinc-500"
                      initialsClassName="text-[10px]"
                    />
                  </div>

                  {/* Exercise Title and Sets Info */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                      {ex.name || 'Ejercicio sin nombre'}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                      <span>{ex.sets.length} {ex.sets.length === 1 ? 'serie' : 'series'}</span>
                      {formatExerciseCategories(ex) && (
                        <>
                          <span>•</span>
                          <span className="text-[#00FF87] font-semibold truncate">{formatExerciseCategories(ex)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Up / Down Move Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      title="Subir un puesto"
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-white/10 bg-black/30 text-zinc-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => move(index, index + 1)}
                      title="Bajar un puesto"
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-white/10 bg-black/30 text-zinc-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
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
        <div className="p-4 border-t border-white/[0.08] bg-black/30 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reestablecer
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-confirm-reorder"
              type="button"
              onClick={() => {
                saveOrder();
                onClose();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-extrabold rounded-xl bg-[#00FF87] text-black hover:bg-[#00e57a] active:scale-[0.97] transition-all shadow-[0_0_12px_rgba(0,255,135,0.3)]"
            >
              <Check className="w-4 h-4 stroke-[3]" /> Guardar Orden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
