import { drizzle } from 'drizzle-orm/mysql2';
import { projects } from './drizzle/schema';

// Monkey-patch to capture SQL
let capturedSQL = '';
const mockPool = {
  execute: async (q: string, p: any[]) => {
    capturedSQL = q;
    console.log('=== GENERATED SQL (first 1000 chars) ===');
    console.log(q.substring(0, 1000));
    console.log('');
    console.log('=== COLUMN COUNT ===');
    const colMatch = q.match(/\(([^)]+)\)\s+values/i);
    if (colMatch) {
      const cols = colMatch[1].split(',').map(c => c.trim());
      console.log('Total columns in INSERT:', cols.length);
      console.log('');
      console.log('=== ARCHETYPE COLUMNS PRESENT? ===');
      const archCols = cols.filter(c => c.includes('archetype') || c.includes('Archetype'));
      console.log('Archetype columns:', archCols.length > 0 ? archCols.join(', ') : 'NONE');
    }
    return [{ insertId: 1 }, []];
  }
} as any;

const db = drizzle(mockPool);

try {
  await db.insert(projects).values({
    name: 'TEST',
    description: 'Test desc',
    clientId: 1,
    status: 'rascunho',
    createdById: 1,
    createdByRole: 'equipe_solaris',
    notificationFrequency: 'semanal',
    currentStep: 1,
  } as any);
} catch (e: any) {
  console.log('Error:', e.message);
}
