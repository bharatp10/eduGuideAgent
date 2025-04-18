import { render, screen } from '@testing-library/react';
import Search from './Search';

test('renders search input', () => {
  render(<Search />);
  expect(screen.getByLabelText(/search resources/i)).toBeInTheDocument();
});
