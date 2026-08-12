import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import campusHero from '../assets/campus-hero.jpg';

const FEATURES = [
  {
    title: 'AI-assisted topic suggestions',
    desc: 'Describe a rough idea and get ranked, non-duplicate topic matches from real embedding similarity — not a keyword guess.',
    tone: 'bg-indigo-50 text-indigo-700',
  },
  {
    title: 'Duplicate topic detection',
    desc: 'Every proposed topic is checked against existing ones the moment it is submitted, flagging close matches for review.',
    tone: 'bg-terracotta-100 text-terracotta-700',
  },
  {
    title: 'Plagiarism risk scoring',
    desc: 'Chapter and final submissions are compared against recent peer submissions and scored into low/medium/high risk bands.',
    tone: 'bg-tangerine-100 text-tangerine-700',
  },
  {
    title: 'Supervisor allocation scoring',
    desc: 'A transparent, rule-based ranking of supervisors by expertise overlap and current workload — the coordinator makes the final call.',
    tone: 'bg-indigo-50 text-indigo-700',
  },
  {
    title: 'Defense scheduling',
    desc: 'Automatic conflict checking across panel members, rooms, and candidate dates when scheduling a defense.',
    tone: 'bg-terracotta-100 text-terracotta-700',
  },
  {
    title: 'Searchable research repository',
    desc: 'Completed projects are archived and searchable by keyword, department, and year — browsable A-Z by every signed-in user.',
    tone: 'bg-tangerine-100 text-tangerine-700',
  },
];

const PORTALS = [
  {
    role: 'Student',
    desc: 'Browse or propose a topic, submit your proposal, upload chapters with version history, and track milestone progress and supervisor feedback.',
  },
  {
    role: 'Supervisor',
    desc: 'View your assigned students, track their submissions and stage, and give feedback and ratings on their work.',
  },
  {
    role: 'Coordinator',
    desc: 'Manage user accounts, monitor every project, allocate supervisors, schedule defenses, generate reports, and manage the topic bank and repository.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm shrink-0">
              U
            </span>
            <span className="font-semibold text-slate-900">University of Kigali</span>
          </span>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link to="/register">
              <Button className="text-sm">Create an account</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${campusHero})` }}
          role="img"
          aria-label="Architectural rendering of the University of Kigali campus"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950/90" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <p className="text-sm font-semibold text-tangerine-300 tracking-wide uppercase mb-3">
            University of Kigali
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-5">
            AI-Integrated Web-Based University of Kigali
            <br />
            Final Project Coordination System
          </h1>
          <p className="text-slate-200 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            One place for students, supervisors, and the coordinator&apos;s office to run final-year
            projects end to end — topic selection through defense — with AI-assisted duplicate
            detection, plagiarism risk scoring, and rule-based scheduling built in.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/register">
              <Button className="px-6 py-2.5">Get started</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="px-6 py-2.5">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-xl font-semibold text-slate-900 text-center mb-2">
            What the system does
          </h2>
          <p className="text-slate-500 text-center mb-10">
            A few genuinely useful AI and rule-based features, not a checklist of buzzwords.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="p-5">
                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${f.tone} mb-3`}>
                  {f.title}
                </span>
                <p className="text-sm text-slate-600">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-xl font-semibold text-slate-900 text-center mb-10">
          Built for three roles
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {PORTALS.map((p) => (
            <Card key={p.role} className="p-6">
              <h3 className="font-semibold text-slate-900 mb-2">{p.role}</h3>
              <p className="text-sm text-slate-500">{p.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-slate-400">
          University of Kigali — Final Project Coordination System. An academic final-year
          project; demo accounts and sample data are fictional.
        </div>
      </footer>
    </div>
  );
}
