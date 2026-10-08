// Web adapter verifies actual shared controls. Device rendering is covered by the native QA checklist.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
import { Button, Input, ErrorState } from '../components/ui';
afterEach(cleanup);
describe('shared mobile controls', () => {
  it('disables submissions while an operation is pending', () => {
    const click = vi.fn();
    render(<Button title="Publish" onPress={click} loading />);
    const button = screen.getByRole('button', { name: 'Publish' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(click).not.toHaveBeenCalled();
  });
  it('provides accessible input labels and inline validation errors', () => {
    render(<Input label="Email" error="Enter a valid email" />);
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid email');
  });
  it('allows retry after a network failure', () => {
    const retry = vi.fn();
    render(<ErrorState message="Connection unavailable" onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
