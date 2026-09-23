import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { normalizeYouTubeThumbnail, getYouTubeThumbnailFallbacks } from '../../utils/youtube';

interface TrackThumbnailProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  videoId?: string;
  alt?: string;
  className?: string;
  fallbackGradient?: string;
}

export const TrackThumbnail: React.FC<TrackThumbnailProps> = ({
  src,
  videoId,
  alt = 'Track cover',
  className = 'w-full h-full object-cover',
  fallbackGradient = 'from-emerald-950 via-neutral-900 to-black',
  ...rest
}) => {
  const [sources, setSources] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const normalized = normalizeYouTubeThumbnail(src, videoId);
    const fallbacks = getYouTubeThumbnailFallbacks(normalized, videoId);
    setSources(fallbacks);
    setCurrentIndex(0);
    setHasError(false);
    setIsLoaded(false);
  }, [src, videoId]);

  const handleError = () => {
    if (currentIndex + 1 < sources.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const currentSrc = sources[currentIndex] || normalizeYouTubeThumbnail(src, videoId);

  if (hasError || !currentSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${fallbackGradient} text-neutral-400 select-none ${className}`}
        title={alt}
      >
        <Music className="w-1/2 h-1/2 opacity-60 text-emerald-400" />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      className={`${className} ${!isLoaded ? 'bg-neutral-800' : ''}`}
      {...rest}
    />
  );
};
