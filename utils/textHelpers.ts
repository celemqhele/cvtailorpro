
/**
 * Replaces AI-generated em-dashes with ", " to sound more natural.
 */
export const naturalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.replace(/—/g, ', ');
};

/**
 * Recursively applies naturalizeText to all string properties in an object.
 */
export const naturalizeObject = <T>(obj: T): T => {
  if (typeof obj === 'string') {
    return naturalizeText(obj) as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(naturalizeObject) as any;
  }
  if (obj && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = naturalizeObject((obj as any)[key]);
    }
    return newObj;
  }
  return obj;
};
