import { describe, it, expect } from 'vitest';
import { applyTheme } from '../src/ui/theme';

describe('theme', () => {
  it('applies theme to documentElement', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
