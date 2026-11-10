export type DashboardDatePreset = 'all' | 'month' | 'week';

const formatDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

export const getDashboardDateFilterParams = (
  preset: DashboardDatePreset,
  today = new Date(),
) => {
  if (preset === 'all') {
    return { datePreset: preset, startDate: '', endDate: '' };
  }

  const startDate = new Date(today);
  if (preset === 'month') {
    startDate.setDate(1);
  } else {
    const daysSinceMonday = (startDate.getDay() + 6) % 7;
    startDate.setDate(startDate.getDate() - daysSinceMonday);
  }

  return {
    datePreset: preset,
    startDate: formatDate(startDate),
    endDate: formatDate(today),
  };
};
