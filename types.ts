
export enum AdStyle {
  STUDIO = 'Studio Professional',
  OUTDOOR = 'Outdoor Lifestyle',
  MINIMAL = 'Minimalist Zen',
  CYBERPUNK = 'Cyberpunk Neon',
  VINTAGE = 'Vintage Retro',
  ELEGANT = 'Luxury Elegant',
  ENERGETIC = 'Energetic Pop'
}

export enum AspectRatio {
  SQUARE = '1:1',
  STORY = '9:16',
  LANDSCAPE = '16:9'
}

export interface AdData {
  originalImage: string;
  editedImage?: string;
  headline: string;
  subheadline: string;
  cta: string;
  style: AdStyle;
  aspectRatio: AspectRatio;
}

export interface StyleOption {
  id: AdStyle;
  label: string;
  icon: string;
  description: string;
}
