import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getEnv(key: string, defaultValue: string = ''): string {
  const value = import.meta.env[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return value;
}
