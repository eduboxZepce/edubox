'use client';

import * as React from 'react';
import { DARK_CLASS } from './colorSchemeRules';

/**
 * The colour scheme the page is actually painted in — read from the class on
 * `<html>`, not from MUI's `useColorScheme()`.
 *
 * The two disagree whenever `<ColorSchemeScope>` holds a page light: with the
 * `themeSwitch` flag off, or on a page outside the themed list, MUI still
 * reports the user's stored (or OS) `dark` while the document is light. A
 * component that themes itself from MUI's value then renders dark inside a
 * light page — which is how the Markdown editor came to show up black.
 *
 * Use this only for third-party widgets that must be told a scheme explicitly;
 * MUI components already follow the class through CSS variables.
 */
export function usePaintedColorScheme(): 'light' | 'dark' {
  return React.useSyncExternalStore(subscribe, readScheme, () => 'light');
}

function readScheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains(DARK_CLASS) ? 'dark' : 'light';
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
