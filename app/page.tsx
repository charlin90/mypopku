import App from '../App';

export default function Home() {
  // App.tsx contains the client-side router and logic for the creation flow.
  // In a full Next.js migration, components/HomeScreen would be imported directly,
  // but wrapping App ensures the existing state logic (modals etc) works for the creation flow.
  return <App />;
}