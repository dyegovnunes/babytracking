import { useReveal } from '../../hooks/useReveal'

export default function Problem() {
  const ref = useReveal()

  return (
    <section ref={ref} className="reveal py-20 px-5">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold mb-8 leading-tight">
          Lembrar cada mamada, cada fralda, cada soneca...{' '}
          <span className="text-primary">e impossivel fazer isso de cabeca.</span>
        </h2>

        <div className="space-y-5 font-body text-base text-on-surface-variant leading-relaxed">
          <p>
            Sao 4 da manha. Seu bebe esta chorando. Voce sabe que mamou, mas faz quanto tempo?
            Dois lados ou um? O cansaco embaralhou tudo.
          </p>
          <p>
            Voce tentou papel, planilha, notas no celular.
            Nada funcionou por mais de dois dias.
          </p>
          <p className="text-on-surface font-semibold text-lg">
            O Yaya foi criado exatamente para esse momento.
          </p>
        </div>
      </div>
    </section>
  )
}
