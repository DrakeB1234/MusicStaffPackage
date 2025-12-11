// Re-export the main class as a named export
export { default as MusicStaff } from './classes/MusicStaff';

// Export the options type so users can strictly type their config objects
export type { MusicStaffOptions } from './classes/MusicStaff';

// Optional: If users need to manually type 'treble' | 'bass', etc.
export type { StaffTypes } from './types';