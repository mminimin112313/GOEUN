import { writable } from 'svelte/store';
import type { Question } from '../types';

export const allQuestions = writable<Question[]>([]);
