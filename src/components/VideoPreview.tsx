import React, { useState } from 'react';
import { Video, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { parseVideoUrl } from '../utils/videoHelper';

interface VideoPreviewProps {
  url?: string;
  exerciseName: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ url, exerciseName }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!url || !url.trim()) {
    return null;
  }

  const parsed = parseVideoUrl(url);

  return (
    <div id={`video-preview-wrapper-${exerciseName.toLowerCase().replace(/\s+/g, '-')}`} className="mt-2.5">
      <div className="flex items-center gap-2">
        <button
          id={`btn-toggle-video-${exerciseName.toLowerCase().replace(/\s+/g, '-')}`}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors active:scale-95"
        >
          <Video className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isOpen ? 'Ocultar video' : 'Ver técnica / video'}</span>
          {isOpen ? <EyeOff className="w-3 h-3 text-emerald-600" /> : <Eye className="w-3 h-3 text-emerald-600" />}
        </button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-600 hover:text-zinc-700 inline-flex items-center gap-1 hover:underline transition-colors"
          title="Abrir enlace en pestaña nueva"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {isOpen && (
        <div className="mt-2.5 rounded-xl overflow-hidden border border-zinc-200 bg-black aspect-video max-w-lg shadow-sm">
          {parsed.type === 'youtube' && parsed.embedUrl && (
            <iframe
              src={parsed.embedUrl}
              title={`Video técnica de ${exerciseName}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )}

          {parsed.type === 'vimeo' && parsed.embedUrl && (
            <iframe
              src={parsed.embedUrl}
              title={`Video técnica de ${exerciseName}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )}

          {parsed.type === 'direct' && parsed.embedUrl && (
            <video controls className="w-full h-full object-contain">
              <source src={parsed.embedUrl} type="video/mp4" />
              Tu navegador no soporta reproducción directa de este video.
            </video>
          )}

          {parsed.type === 'unknown' && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-zinc-300">
              <p className="text-sm font-medium">No se pudo incrustar el reproductor directamente.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium"
              >
                Abrir video en nueva pestaña <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
