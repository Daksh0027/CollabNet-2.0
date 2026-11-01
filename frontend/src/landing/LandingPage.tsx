import "./styles/landing.css";
import { BlendProvider } from "./blend/provider";
import { WaitlistProvider } from "./waitlist/WaitlistProvider";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Showcase } from "./components/Showcase";
import { LogoMarquee } from "./components/LogoMarquee";
import { Features } from "./components/Features";
import { Stats } from "./components/Stats";
import { BeforeAfter } from "./components/BeforeAfter";
import { Faq } from "./components/Faq";
import { ClosingCta } from "./components/ClosingCta";
import { Footer } from "./components/Footer";

export default function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <BlendProvider theme="light">
      <WaitlistProvider>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <div id="top" className="page">
          <Navbar onSignIn={onSignIn} />
          <main id="main" tabIndex={-1}>
            <div className="hero-panel">
              <Hero />
              <Showcase />
            </div>
            <LogoMarquee />
            <Features />
            <Stats />
            <BeforeAfter />
            <Faq />
            <ClosingCta />
          </main>
          <Footer />
        </div>
      </WaitlistProvider>
    </BlendProvider>
  );
}
