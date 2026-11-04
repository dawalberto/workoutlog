# Exercise image library picker

## Objective

Let users pick an exercise cover from the images already shipped with the app, instead of only pasting a URL. The cover preview becomes the button that opens an album of bundled images, and the album still offers a custom-URL entry for images that are not in the library.

## Problem and rationale

The exercise create/edit forms only accepted an image URL, so most exercises ended up with no cover and relied on the initials fallback. The repository now ships 19 curated exercise photos, but there was no way to discover or choose them from the UI.

## Scope and constraints

- New shared picker used by both the catalog create/edit modal (`ExerciseFormModal`) and the in-the-moment custom form (`AddExerciseModal`).
- Images move from `public/assets/exercises/` to `src/assets/exercises/` and are auto-enumerated with `import.meta.glob`, so dropping a new file in the folder is enough.
- The synced `imageUrl` field stores a **stable library key** (`library:<slug>`) for bundled images and the raw URL for custom images. A resolver maps the key to the current content-hashed asset at render time, so stored values survive deploys and redeploys.
- Preview resolves to, in order: library image, URL image, initials/icon fallback.
- Spanish UI copy; English identifiers, comments, commits, and docs.
- No dependency, schema, RPC, or IndexedDB changes. `imageUrl` keeps its shape.

## Tasks

- [x] `T1` util: move bundled images into `src/assets/exercises/`, add `src/utils/exerciseImages.ts` (glob enumeration, Spanish labels, stable-key resolver) + tests.
- [x] `T2` ui: add `ExerciseImagePicker` and `ExerciseImageAlbumModal`; resolve library keys in `ExerciseThumbnail` and `ExercisePreviewModal` + tests.
- [x] `T3` integration: use the picker in `ExerciseFormModal` and `AddExerciseModal`; precache image formats in the service worker; refresh characterization snapshots.
- [x] `T4` docs: record evidence here and note the convention in the frontend architecture doc.

## Acceptance criteria and checks

- The "Imagen" preview is a button; tapping it opens the album with every bundled image plus a custom-URL field.
- Selecting a library image, a URL, or nothing updates the preview correctly; broken images fall back to the initials placeholder.
- A stored library image still resolves after a production rebuild (stable key, hashed URL).
- `pnpm test`, `pnpm lint`, `pnpm build` pass.

## Follow-up adjustments

- Album labels moved below each image; long names scroll as a horizontal banner (`MarqueeLabel`) instead of truncating.
- Album search matches both the Spanish label and the English file slug, accent-insensitive ("push up", "pushup", "Flexiones", "jalon").
- Clear option copy shortened to "Sin imagen".
- The image preview is now 1:1 in the exercise form (`ExerciseImagePicker`) and in the view modal (`ExercisePreviewModal`), so covers show uncropped.
- Removed the "Biblioteca" badge from the form preview.

## Progress and verification

- `src/assets/exercises/*.webp` (19 files moved from `public/assets/exercises/`).
- `src/utils/exerciseImages.ts`: `EXERCISE_IMAGE_LIBRARY`, `resolveExerciseImageUrl`, `filterExerciseImageOptions`, `exerciseLibrarySlug`.
- `src/components/ExerciseImagePicker.tsx`, `src/components/ExerciseImageAlbumModal.tsx`.
- `src/components/ExerciseThumbnail.tsx` and `exercise-catalog/ExercisePreviewModal.tsx` resolve library keys.
- `ExerciseFormModal` and `AddExerciseModal` custom form use the picker; `imageError` state removed from `useExerciseForm`.
- `vite.config.ts` precaches `webp`/`jpg`/`jpeg` for offline.
- Tests: `tests/exercise-images.test.ts` (6), `tests/exercise-image-picker.test.tsx` (5), extended `tests/exercise-thumbnail.test.tsx`; refreshed `tests/__snapshots__/exercise-catalog.test.tsx.snap` (`catalog-create-form-original`, `catalog-edit-form-original`).
- Docs: new "Exercise image library" subsection in `docs/architecture/frontend.md`.
- Checks: `pnpm test` 44 files / 320 tests passed; `pnpm lint` exit 0; `pnpm build` succeeded (chunk-size warning only; 19 hashed `.webp` precached, 42 SW entries).

## Next step

- Human decides whether to push, open a PR, and merge.
