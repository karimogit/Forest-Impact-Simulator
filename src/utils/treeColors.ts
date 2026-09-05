/**
 * Tree category color utility functions
 * Provides consistent color styling across the application
 */

export type TreeCategory = 
  | 'deciduous' 
  | 'coniferous' 
  | 'tropical' 
  | 'mediterranean' 
  | 'boreal' 
  | 'arid' 
  | 'subtropical'
  | 'all';

type Variant = 'bg' | 'text' | 'border' | 'bg-light' | 'badge';

/**
 * Each category gets a distinct but muted hue so mixed selections are easy to
 * tell apart at a glance (distribution bars, badges, chips).
 */
const palette: Record<TreeCategory, Record<Variant, string>> = {
  deciduous: {
    bg: 'bg-lime-600 text-white',
    'bg-light': 'bg-lime-50 border-lime-200',
    text: 'text-lime-700',
    border: 'border-lime-300',
    badge: 'bg-lime-100 text-lime-800',
  },
  coniferous: {
    bg: 'bg-teal-600 text-white',
    'bg-light': 'bg-teal-50 border-teal-200',
    text: 'text-teal-700',
    border: 'border-teal-300',
    badge: 'bg-teal-100 text-teal-800',
  },
  tropical: {
    bg: 'bg-emerald-600 text-white',
    'bg-light': 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  mediterranean: {
    bg: 'bg-yellow-600 text-white',
    'bg-light': 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  boreal: {
    bg: 'bg-sky-600 text-white',
    'bg-light': 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
    border: 'border-sky-300',
    badge: 'bg-sky-100 text-sky-800',
  },
  arid: {
    bg: 'bg-orange-600 text-white',
    'bg-light': 'bg-orange-50 border-orange-200',
    text: 'text-orange-700',
    border: 'border-orange-300',
    badge: 'bg-orange-100 text-orange-800',
  },
  subtropical: {
    bg: 'bg-fuchsia-600 text-white',
    'bg-light': 'bg-fuchsia-50 border-fuchsia-200',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-300',
    badge: 'bg-fuchsia-100 text-fuchsia-800',
  },
  all: {
    bg: 'bg-ink-900 text-white',
    'bg-light': 'bg-sand-100 border-sand-200',
    text: 'text-ink-900',
    border: 'border-ink-900',
    badge: 'bg-sand-100 text-ink-700',
  },
};

/**
 * Get Tailwind CSS classes for tree category colors
 * @param category - The tree category
 * @param variant - The style variant (bg, text, border, bg-light, badge)
 * @returns Tailwind CSS class string
 */
export const getTreeCategoryColor = (
  category: TreeCategory,
  variant: Variant = 'bg'
): string => {
  return (palette[category] ?? palette.all)[variant];
};

/**
 * Check if a category is a valid tree category
 */
export const isValidTreeCategory = (category: string): category is TreeCategory => {
  return ['deciduous', 'coniferous', 'tropical', 'mediterranean', 'boreal', 'arid', 'subtropical', 'all'].includes(category);
};
