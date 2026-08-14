// Barrel file — re-exports every domain module so existing imports keep working
// unchanged, e.g. `import * as api from '../services/api'` or
// `import { fetchMedicines } from '../../services/api'`.
//
// The ~90 functions that used to live directly in this file were split into
// domain modules (mirroring the backend controllers they call) during a
// mechanical refactor — see src/services/core.js, auth.js, medicines.js,
// suppliers.js, news.js, inventory.js, orders.js, patients.js, appointments.js,
// prescriptions.js, reviews.js, chat.js, reports.js, admin-import.js.
export * from './core';
export * from './auth';
export * from './medicines';
export * from './suppliers';
export * from './news';
export * from './inventory';
export * from './orders';
export * from './patients';
export * from './appointments';
export * from './prescriptions';
export * from './reviews';
export * from './chat';
export * from './reports';
export * from './admin-import';
export * from './auditlogs';
export * from './loyalty';
export * from './categories';
