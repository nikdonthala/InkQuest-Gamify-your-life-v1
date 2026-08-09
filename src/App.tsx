import { AppProvider, useApp } from './state/AppContext';
import Shelf from './components/Shelf';
import NotebookView from './components/notebook/NotebookView';
import { InkQuestLogo } from './components/InkQuestLogo';
import { Toasts, LevelUpModal } from './components/gamify/Toasts';

function Splash() {
  return (
    <div className="h-full flex items-center justify-center bg-[#efe9da]">
      <div className="text-center">
        <InkQuestLogo size={84} className="mx-auto drop-shadow-sm animate-wobble" />
        <div className="mt-4 font-hand text-5xl text-ink/80">InkQuest</div>
        <div className="mt-1 font-hand text-xl text-accent-red">gamify your life</div>
        <div className="mt-3 text-ink-soft text-sm tracking-wide">opening your notebook…</div>
        <div className="mt-4 mx-auto w-40 h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div className="h-full w-1/2 bg-accent-red rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function Root() {
  const { state } = useApp();
  if (!state.loaded) return <Splash />;
  return (
    <div className="h-full w-full">
      {state.ui.currentNotebookId ? <NotebookView /> : <Shelf />}
      <Toasts />
      <LevelUpModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
