import { render, screen } from '@testing-library/react';
import UserPreferences from './UserPreferences';

test('renders preferences form', () => {
  render(<UserPreferences userPreferences={{}} onPreferencesUpdate={() => {}} />);
  expect(screen.getByLabelText(/user preferences form/i)).toBeInTheDocument();
});
