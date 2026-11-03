import { describe, expect, it } from 'vitest';
import { fitFromValue } from '../lib/fit';

describe('fit (true to size)', () => {
  it('reads the three store values, any capitals', () => {
    expect(fitFromValue('Runs Small')).toEqual({ label: 'Runs Small', pos: 0 });
    expect(fitFromValue('true to size')?.pos).toBe(1);
    expect(fitFromValue(' Runs  Large ')?.pos).toBe(2);
  });
  it('shows nothing for empty or unknown values', () => {
    expect(fitFromValue('')).toBeNull();
    expect(fitFromValue(undefined)).toBeNull();
    expect(fitFromValue('Oversized')).toBeNull();
  });
});
