import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Perguntas Frequentes',
  description:
    'Respostas para as perguntas mais comuns sobre o KpopQuiz: e gratuito, precisa de conta, como criar um quiz de K-pop, quais grupos estao disponiveis, os mini-jogos e mais.',
  alternates: {
    canonical: '/pt/faq',
    languages: {
      en: '/faq',
      'pt-BR': '/pt/faq',
      'x-default': '/faq',
    },
  },
  openGraph: {
    title: 'KpopQuiz FAQ',
    description: 'Tudo que voce precisa saber sobre jogar e criar quizzes de K-pop no KpopQuiz.',
    url: '/pt/faq',
    locale: 'pt_BR',
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: 'O que e o KpopQuiz?',
    a: 'O KpopQuiz e uma plataforma gratuita feita por fas onde voce pode jogar e criar quizzes de K-pop sobre seus grupos favoritos, jogar mini-jogos e competir com outros fas nos rankings.',
  },
  {
    q: 'O KpopQuiz e gratuito?',
    a: 'Sim. Todos os quizzes e mini-jogos sao completamente gratuitos para jogar e criar. Nao ha nada para pagar.',
  },
  {
    q: 'Preciso de conta para jogar?',
    a: 'Nao. Voce pode jogar qualquer quiz ou jogo sem fazer login. Criar uma conta gratuita permite salvar suas pontuacoes, subir no ranking e criar seus proprios quizzes.',
  },
  {
    q: 'Como criar meu proprio quiz de K-pop?',
    a: 'Toque em "Criar" na barra superior, escolha um tipo de quiz, adicione suas perguntas e respostas, e publique. Voce pode compartilhar seu quiz com outros fas em poucos minutos.',
  },
  {
    q: 'Quais tipos de quiz existem?',
    a: 'Existem cinco tipos: Multipla escolha classica, Imagem, Intruso, Verdadeiro ou Falso, e Adivinhe pelas Dicas.',
  },
  {
    q: 'Quais grupos de K-pop estao disponiveis?',
    a: 'BTS, BLACKPINK, Stray Kids, aespa, NewJeans, TWICE, SEVENTEEN, ENHYPEN, IVE, LE SSERAFIM e mais de 30 outros, com novos grupos adicionados pela comunidade.',
  },
  {
    q: 'O que sao os mini-jogos?',
    a: 'Existem dois modos principais. This or That permite escolher seu bias em duelos, e Nomeie todos os membros desafia voce a digitar cada membro de um grupo antes do tempo acabar.',
  },
  {
    q: 'Como funciona o ranking?',
    a: 'Voce ganha pontos jogando quizzes e pontuando bem. O ranking classifica fas semanal e geral, entao sempre ha uma nova chance de chegar ao topo.',
  },
  {
    q: 'Posso jogar no celular?',
    a: 'Sim. O KpopQuiz funciona em qualquer navegador mobile, sem precisar instalar app ou fazer download.',
  },
  {
    q: 'Os quizzes sao precisos?',
    a: 'Os quizzes sao feitos por fas que conhecem seus grupos. A comunidade reporta erros, e os quizzes mais jogados sobem para o topo, facilitando encontrar o melhor conteudo.',
  },
];

export default function PtFaqPage(): React.ReactElement {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-semibold">
          Central de ajuda
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Perguntas frequentes
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Tudo o que voce precisa saber sobre jogar e criar quizzes de K-pop no KpopQuiz.
        </p>
      </div>

      <div className="mt-7 flex flex-col gap-2.5">
        {FAQS.map((f, i) => (
          <details key={i} className="faq-item group rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
            <summary className="faq-summary flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-3.5">
              <span className="text-sm font-semibold text-[var(--text-primary)]">{f.q}</span>
              <svg
                className="faq-chevron shrink-0 text-[var(--text-tertiary)] transition-transform duration-200"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <p className="px-4 pb-4 -mt-0.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {f.a}
            </p>
          </details>
        ))}
      </div>

      <p className="mt-8 text-center text-[13px] text-[var(--text-tertiary)]">
        Ainda tem alguma duvida?{' '}
        <Link href="/contact" className="font-medium text-[var(--accent)] hover:underline">
          Fale conosco
        </Link>
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </div>
  );
}
