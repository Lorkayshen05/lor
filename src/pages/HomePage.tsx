import { useApp } from '../state/AppContext';
import { Hero } from '../components/home/Hero';
import { FirstTimeSection } from '../components/home/FirstTimeSection';
import { WelcomeBackSection } from '../components/home/WelcomeBackSection';
import { SignaturesSection } from '../components/home/SignaturesSection';
import { TryNewSection } from '../components/home/TryNewSection';
import { LocationSection, MixSection, StorySection } from '../components/home/InfoSections';

/** Order of sections follows the ordering priority: identity → order → help choosing → discover → story → location. */
export function HomePage() {
  const { orders } = useApp();
  return (
    <>
      <Hero />
      {orders.length > 0 ? <WelcomeBackSection /> : <FirstTimeSection />}
      <SignaturesSection />
      <TryNewSection />
      <MixSection />
      <StorySection />
      <LocationSection />
    </>
  );
}
