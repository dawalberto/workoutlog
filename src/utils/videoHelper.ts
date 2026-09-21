export interface ParsedVideo {
  type: 'youtube' | 'vimeo' | 'direct' | 'unknown';
  embedUrl?: string;
  thumbnailUrl?: string;
}

export function parseVideoUrl(url: string | undefined): ParsedVideo {
  if (!url || !url.trim()) {
    return { type: 'unknown' };
  }

  const cleanUrl = url.trim();

  // YouTube regex: supports standard, youtu.be, shorts, and embed
  const ytMatch = cleanUrl.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // Vimeo regex
  const vimeoMatch = cleanUrl.match(
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/
  );

  if (vimeoMatch && vimeoMatch[1]) {
    const vimeoId = vimeoMatch[1];
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  // Direct MP4 / WebM / OGG
  if (/\.(mp4|webm|ogg)($|\?)/i.test(cleanUrl)) {
    return {
      type: 'direct',
      embedUrl: cleanUrl,
    };
  }

  return {
    type: 'unknown',
    embedUrl: cleanUrl,
  };
}
