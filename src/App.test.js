import { render, screen } from '@testing-library/react';
import App from './App';

test('renders slack theme generator', () => {
  render(<App />);
  const heading = screen.getByText(/Slack Theme Generator/i);
  expect(heading).toBeInTheDocument();
});
