
import { AdStyle, StyleOption, AspectRatio } from './types';

export const STYLE_OPTIONS: StyleOption[] = [
  { id: AdStyle.STUDIO, label: 'Studio', icon: 'fa-camera-retro', description: 'Clean, professional studio lighting with solid backgrounds.' },
  { id: AdStyle.ELEGANT, label: 'Luxury', icon: 'fa-gem', description: 'Premium marble, gold accents, and sophisticated bokeh.' },
  { id: AdStyle.OUTDOOR, label: 'Outdoor', icon: 'fa-mountain-sun', description: 'Natural lighting in scenic, high-end environments.' },
  { id: AdStyle.MINIMAL, label: 'Minimal', icon: 'fa-circle-dot', description: 'Simple, airy, focus purely on the product.' },
  { id: AdStyle.CYBERPUNK, label: 'Neon', icon: 'fa-bolt', description: 'Vibrant colors, dark shadows, and futuristic energy.' },
  { id: AdStyle.ENERGETIC, label: 'Pop', icon: 'fa-fire', description: 'Bold colors, dynamic shadows, and high-impact vibes.' },
];

export const ASPECT_RATIOS = [
  { id: AspectRatio.SQUARE, label: 'Square (Feed)', icon: 'fa-square' },
  { id: AspectRatio.STORY, label: 'Story (9:16)', icon: 'fa-mobile-screen' },
  { id: AspectRatio.LANDSCAPE, label: 'Landscape (16:9)', icon: 'fa-rectangle-list' },
];
