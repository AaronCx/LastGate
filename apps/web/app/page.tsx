import {
  Shield,
  Search,
  Copy,
  CheckCircle,
  Wrench,
  Package,
  Brain,
  ArrowRight,
  Github,
  Zap,
  Settings,
  Coffee,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Search,
    title: "Secret Scanner",
    description:
      "Detect API keys, tokens, passwords, and other secrets before they reach your repo. Supports 100+ patterns.",
  },
  {
    icon: Copy,
    title: "Duplicate Detector",
    description:
      "Catch AI agents copying code blocks or creating redundant files. Identify structural duplication across your codebase.",
  },
  {
    icon: CheckCircle,
    title: "Lint & Type Check",
    description:
      "Enforce code quality standards automatically. Run ESLint, TypeScript, and custom linters on every commit.",
  },
  {
    icon: Wrench,
    title: "Build Verifier",
    description:
      "Ensure every commit builds successfully. Catch broken imports, missing dependencies, and compilation errors.",
  },
  {
    icon: Package,
    title: "Dependency Auditor",
    description:
      "Scan for vulnerable, deprecated, or unnecessary dependencies. Prevent supply chain attacks from AI suggestions.",
  },
  {
    icon: Brain,
    title: "Agent Pattern Analysis",
    description:
      "Track AI agent behavior over time. Identify patterns, repeated mistakes, and quality trends across sessions.",
  },
];

const steps = [
  {
    icon: Github,
    step: "01",
    title: "Install",
    description:
      "Add the LastGate GitHub App to your repositories in one click. No config files needed to get started.",
  },
  {
    icon: Settings,
    step: "02",
    title: "Configure",
    description:
      "Fine-tune rules per repo with a simple .lastgate.yml file. Enable the checks that matter to your team.",
  },
  {
    icon: Coffee,
    step: "03",
    title: "Relax",
    description:
      "LastGate watches every push and PR. AI agents get instant feedback, and you get notified only when needed.",
  },
];

const techStack = [
  "Next.js",
  "TypeScript",
  "Supabase",
  "Bun",
  "GitHub App",
  "Tailwind CSS",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold tracking-tight text-gray-900">
                LastGate
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 mb-8">
            <Zap className="h-3.5 w-3.5" />
            Now in Public Beta
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
            Stop AI agents from
            <br />
            <span className="text-primary">breaking your repos</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed">
            LastGate is the final checkpoint before AI-generated code reaches
            your repository. Automated security scanning, quality checks, and
            intelligent feedback — all in real time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-primary-700 transition-all hover:shadow-blue-500/40"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/AaronCx/LastGate"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Github className="h-5 w-5" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Six layers of protection
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Every commit passes through a comprehensive pipeline of automated
              checks designed specifically for AI-generated code.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-blue-50 p-2.5 text-primary group-hover:bg-blue-100 transition-colors">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get up and running in under five minutes. No CI config, no YAML
              pipelines, no build scripts.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-blue-500/25">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
                  Step {step.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-500 mb-6">
            Built with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to protect your repos?
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
            Join developers who trust LastGate to keep AI agents in check.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-primary-700 transition-all"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Shield className="h-4 w-4" />
              <span className="text-sm">
                &copy; {new Date().getFullYear()} LastGate. Open source under
                MIT.
              </span>
            </div>
            <a
              href="https://github.com/AaronCx/LastGate"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
