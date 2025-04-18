import { render, screen } from '@testing-library/react';
import Upload from './Upload';

test('renders upload form', () => {
  render(<Upload />);
  expect(screen.getByLabelText(/upload form/i)).toBeInTheDocument();
});
