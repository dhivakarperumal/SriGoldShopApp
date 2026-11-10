import { getDashboardDateFilterParams } from '../src/Admin/Screens/dashboardDateFilters';

test('builds a full date range for each Home dashboard filter', () => {
  const today = new Date(2026, 10, 10);

  expect(getDashboardDateFilterParams('all', today)).toEqual({
    datePreset: 'all',
    startDate: '',
    endDate: '',
  });
  expect(getDashboardDateFilterParams('month', today)).toEqual({
    datePreset: 'month',
    startDate: '2026-11-01',
    endDate: '2026-11-10',
  });
  expect(getDashboardDateFilterParams('week', today)).toEqual({
    datePreset: 'week',
    startDate: '2026-11-09',
    endDate: '2026-11-10',
  });
});
