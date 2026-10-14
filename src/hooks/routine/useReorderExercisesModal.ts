import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { selectActiveRoutine } from '../../store/selectors';
import type { Exercise } from '../../types';

export function useReorderExercisesModal(isOpen: boolean) {
  const routine = useAppStore(selectActiveRoutine);
  const saveRoutine = useAppStore((state) => state.saveRoutine);
  const exercises = routine?.exercises ?? EMPTY_EXERCISES;
  const [items, setItems] = useState<Exercise[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchActiveIndex, setTouchActiveIndex] = useState<number | null>(null);
  const [touchOverIndex, setTouchOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setItems([...exercises]);
      setDraggedIndex(null);
      setDragOverIndex(null);
      setTouchActiveIndex(null);
      setTouchOverIndex(null);
    }
  }, [isOpen, exercises]);

  const move = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setItems(updated);
  };

  const moveToPosition = (fromIndex: number, targetPosition: number) => {
    move(fromIndex, targetPosition - 1);
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDrop = (event: React.DragEvent, dropIndex: number) => {
    event.preventDefault();
    if (draggedIndex === null) return;
    move(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (touchActiveIndex === null) return;
    const touch = event.touches[0];
    if (!touch) return;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const itemElement = element?.closest('[data-reorder-index]');
    if (!itemElement) return;
    const targetIndex = Number(itemElement.getAttribute('data-reorder-index'));
    if (!Number.isNaN(targetIndex) && targetIndex !== touchOverIndex) {
      setTouchOverIndex(targetIndex);
    }
  };

  const handleTouchEnd = () => {
    if (
      touchActiveIndex !== null &&
      touchOverIndex !== null &&
      touchActiveIndex !== touchOverIndex
    ) {
      move(touchActiveIndex, touchOverIndex);
    }
    setTouchActiveIndex(null);
    setTouchOverIndex(null);
  };

  const saveOrder = () => {
    if (!routine) return;
    saveRoutine({ ...routine, exercises: items, updatedAt: new Date().toISOString() });
  };

  return {
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
    reset: () => setItems([...exercises]),
    saveOrder,
  };
}

const EMPTY_EXERCISES: Exercise[] = [];
