import { render, screen } from '@testing-library/react';
import Recommendations from './Recommendations';

test('renders recommendations title', () => {
  render(<Recommendations userPreferences={{}} />);
  expect(screen.getByText(/recommended for you/i)).toBeInTheDocument();
});
