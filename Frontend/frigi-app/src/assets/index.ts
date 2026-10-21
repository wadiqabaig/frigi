import logo from './img/frigi-logo.webp'
import main from './img/frigi-nobg.webp'
import leaning from './img/frigi-leaning-nobg.webp'
import appLogo from './img/animated-app-logo.webp'
import upload from './img/animated-upload-your-fridge.webp'
import scanning from './img/animated-scanning.webp'
import confirm from './img/animated-confirm-ingredients.webp'
import recommends from './img/animated-chef-ecommends.webp'
import cooking from './img/animated-cooking.webp'
import mealPlan from './img/animated-meal-plan.webp'
import allergy from './img/animated-allergy-warning.webp'
import success from './img/animated-success.webp'
import error from './img/animated-error.webp'
import iBroccoli from './img/icon-broccoli.webp'
import iCooking from './img/icon-cooking.webp'
import iHen from './img/icon-hen.webp'
import iKnife from './img/icon-knife.webp'
import iOnion from './img/icon-onion.webp'
import iWhisk from './img/icon-whisker.webp'

// Supplied Frigi brand assets. The "animated-*" scenes were cut out from their
// yellow backgrounds so Frigi can float on any surface; motion is added in CSS/Framer.
export const LOGO = logo
export const POSES = {
  main, leaning, appLogo, upload, scanning, confirm, recommends, cooking, mealPlan, allergy, success, error,
} as const
export type Pose = keyof typeof POSES

export const POSE_ALT: Record<Pose, string> = {
  main: 'Frigi the fridge chef whisking a bowl',
  leaning: 'Frigi peeking over the counter',
  appLogo: 'Frigi whisking happily',
  upload: 'Frigi holding a phone, ready for a photo',
  scanning: 'Frigi inspecting food with a magnifying glass',
  confirm: 'Frigi holding an ingredient checklist',
  recommends: 'Frigi serving a plate of spaghetti',
  cooking: 'Frigi stirring a pot on the stove',
  mealPlan: 'Frigi pointing at a meal-plan calendar',
  allergy: 'Frigi raising a hand with a warning sign',
  success: 'Frigi celebrating with confetti',
  error: 'Frigi shrugging, a little confused',
}

export const ICONS = { broccoli: iBroccoli, cooking: iCooking, hen: iHen, knife: iKnife, onion: iOnion, whisk: iWhisk }
