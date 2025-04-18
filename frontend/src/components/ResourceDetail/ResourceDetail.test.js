import { render, screen } from '@testing-library/react';
import ResourceDetail from './ResourceDetail';

test('renders loading state', () => {
  render(<ResourceDetail />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
