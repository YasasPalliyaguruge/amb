export interface FrameSequenceSceneConfig {
  id: string;
  label: string;
  frames: string[];
  fallback: string;
  scrollHeightVh: number;
  objectPosition?: string;
}

function buildFrames(timestamps: string[]) {
  return timestamps.map((time) => `/art/Screenshot 2026-03-23 ${time}.png`);
}

export const frameSequenceManifest = {
  hero: {
    id: 'hero',
    label: 'Hero Sequence',
    frames: buildFrames(['123803', '123829', '123903', '123952', '124000', '124049', '124118', '124157', '124209']),
    fallback: '/art/Screenshot 2026-03-23 124209.png',
    scrollHeightVh: 175,
    objectPosition: 'center center',
  },
  healing: {
    id: 'healing',
    label: 'Healing Sequence',
    frames: buildFrames(['123817', '123838', '123914', '123944', '124012', '124020', '124039', '124109', '124127']),
    fallback: '/art/Screenshot 2026-03-23 124020.png',
    scrollHeightVh: 150,
    objectPosition: 'center center',
  },
  studio: {
    id: 'studio',
    label: 'Studio Sequence',
    frames: buildFrames(['123846', '123854', '123924', '123934', '124029', '124059', '124139', '124148', '124217']),
    fallback: '/art/Screenshot 2026-03-23 124217.png',
    scrollHeightVh: 150,
    objectPosition: 'center center',
  },
} as const satisfies Record<string, FrameSequenceSceneConfig>;

export type FrameSequenceSceneId = keyof typeof frameSequenceManifest;
