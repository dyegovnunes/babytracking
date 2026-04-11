import Hero from '../components/landing/Hero'
import ProblemSolution from '../components/landing/ProblemSolution'
import Features from '../components/landing/Features'
import HowItWorks from '../components/landing/HowItWorks'
import SocialProof from '../components/landing/SocialProof'
import Testimonials from '../components/landing/Testimonials'
import Pricing from '../components/landing/Pricing'
import FAQ from '../components/landing/FAQ'
import CTAFooter from '../components/landing/CTAFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <ProblemSolution />
      <section id="funcionalidades">
        <Features />
      </section>
      <HowItWorks />
      <SocialProof />
      <Testimonials />
      <section id="precos">
        <Pricing />
      </section>
      <FAQ />
      <CTAFooter />
    </div>
  )
}
