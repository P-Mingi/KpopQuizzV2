import Link from 'next/link';

import { DiscordCommunity } from '@/components/discord/discord-community';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sobre o KpopQuiz',
  description:
    'O KpopQuiz e uma plataforma gratuita feita por fas para jogar e criar quizzes de K-pop sobre BTS, BLACKPINK, Stray Kids, aespa e mais de 30 grupos, com mini-jogos e rankings.',
  alternates: {
    canonical: '/pt/about',
    languages: {
      en: '/about',
      'pt-BR': '/pt/about',
      'x-default': '/about',
    },
  },
  openGraph: {
    title: 'Sobre o KpopQuiz',
    description: 'Uma plataforma gratuita feita por fas para quizzes de K-pop, mini-jogos e rankings.',
    url: '/pt/about',
    locale: 'pt_BR',
  },
};

const STATS = [
  { num: '42k+', label: 'Quizzes jogados' },
  { num: '500+', label: 'Quizzes criados' },
  { num: '3k+', label: 'Fas por semana' },
];

const FEATURES = [
  {
    title: 'Cinco tipos de quiz',
    desc: 'Multipla escolha classica, Imagem, Intruso, Verdadeiro ou Falso, e Adivinhe pelas Dicas.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="m9 10 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Mini-jogos',
    desc: 'Duelos This or That, e Nomeie todos os membros contra o relogio.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" />
        <line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
      </svg>
    ),
  },
  {
    title: 'Rankings',
    desc: 'Pontue bem para subir nos rankings semanal e geral contra outros fas.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  {
    title: 'Feito por fas',
    desc: 'Cada quiz e criado pela comunidade. Crie o seu em poucos minutos.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function PtAboutPage(): React.ReactElement {
  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-semibold">
          Feito por fas, para fas
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Sobre o <span className="text-[var(--accent)]">KpopQuiz</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          O KpopQuiz e uma plataforma gratuita onde fas de K-pop jogam e criam quizzes sobre
          seus grupos favoritos, resolvem debates com mini-jogos e competem nos rankings.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-2.5">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-4 text-center">
            <p className="text-xl font-extrabold text-[var(--accent)]">{s.num}</p>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-9 mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
        O que voce pode fazer
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <span className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)]">
              {f.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 max-w-md mx-auto">
        <DiscordCommunity />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/quizzes" className="btn-primary">Explorar quizzes</Link>
        <Link href="/create" className="btn-outline">Criar um quiz</Link>
      </div>

      <p className="mt-8 text-center text-[13px] text-[var(--text-tertiary)]">
        Tem alguma duvida?{' '}
        <Link href="/pt/faq" className="font-medium text-[var(--accent)] hover:underline">
          Leia o FAQ
        </Link>
      </p>
    </div>
  );
}
