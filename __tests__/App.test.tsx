import { MAIN_TABS } from '../src/Admin/Navigations/Bottombar';

test('defines five admin tabs with the requested screen routes', () => {
  expect(MAIN_TABS.map(({ label, route }) => [label, route])).toEqual([
    ['Home', 'home'],
    ['Loans', 'loans'],
    ['Pulse', 'billing'],
    ['Products', 'products'],
    ['More', 'more'],
  ]);
});
