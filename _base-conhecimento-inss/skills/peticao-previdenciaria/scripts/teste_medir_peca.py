"""Autoteste do medidor (Onda 176). Rodar: python3 teste_medir_peca.py"""
import medir_peca as m

def achados(md, tipo='comum'):
    return [msg for _, msg, _ in m.medir(md, tipo)[0]]

# título do exemplo do titular passa; a versão coloquial com oração adjetiva cai
assert not any('Título' in a for a in achados('## 2. DO PERÍODO DE 60 DIAS DE TEMPO DE CONTRIBUIÇÃO ESTADUAL NÃO COMPUTADO NA REVISÃO\n\nTexto.'))
assert any('oração adjetiva' in a for a in achados('## 2. DOS SESSENTA DIAS DO TEMPO ESTADUAL QUE A REVISÃO NÃO LANÇOU\n\nTexto.'))
# data no título continua vedada
assert any('Título' in a for a in achados('## 3. DO PERÍODO DE 01/02/1990 A 03/04/1995\n\nTexto.'))
# vocabulário a trocar
assert any('posto que' in a for a in achados('O pedido procede, posto que o formulário registra a sujeição habitual e permanente ao agente nocivo durante todo o intervalo.'))
# frase longa sem transcrição cai; com transcrição passa
longa = ' '.join(['palavra']*45) + '.'
assert any('Frase com' in a for a in achados(longa))
assert not any('Frase com' in a for a in achados(' '.join(['palavra']*40) + ' "trecho literal do documento transcrito".'))
# Onda 184: lei em recuo é IMPORTANTE em laudo, embargos e CRPS; na inicial, um artigo por seção passa
recuo='## 2. DA OMISSÃO\n\n> **Art. 1.022.** Cabem embargos de declaração contra qualquer decisão judicial.\n'
assert any('Lei transcrita em recuo' in a for a in achados(recuo,'embargos'))
assert not any('Lei transcrita em recuo' in a for a in achados(recuo,'inicial'))
assert any('remissões a artigo' in a for a in achados(' '.join(f'art. {i}' for i in range(1,9)),'crps'))
print('ok')
# termo técnico "absolutamente incapaz" não é intensificador
assert not any('Adjetivo' in a for a in achados('A prescrição não corre contra o dependente absolutamente incapaz, nos termos do art. 198, I, do Código Civil, de modo que o termo inicial é a data do óbito.'))
print('ok 2')
# registro formal (12/10/2026): coloquialismo cai, a forma corrigida pelo titular passa
for col in ['Na revisão discutiram-se só os salários de contribuição.', 'A matéria ficou nos motivos da sentença.', 'A soma chega a 85 pontos.', 'A razão social mostra a atividade.', 'O agente está fora do rol.', 'A Parte Autora levou ao INSS os mesmos formulários.', 'A Parte Autora começou na roça.', 'É o caso que a regra dos pontos livra do fator.']:
    assert any('coloquial' in a for a in achados(col)), col
for formal in ['Na revisão discutiram-se apenas os salários de contribuição.', 'A matéria constou apenas dos motivos da sentença.', 'A soma alcança 85 pontos.', 'A razão social indica a atividade.', 'O agente não integra o rol.', 'A Parte Autora apresentou ao INSS os mesmos formulários.', 'A Parte Autora iniciou o trabalho rural.', 'É hipótese em que a regra dos pontos afasta o fator.']:
    assert not any('coloquial' in a for a in achados(formal)), formal
print('ok 3')
# 17/10/2026: "havia chegado", "manda" e o órgão reduzido caem; a forma do titular passa
ruim='O recurso especial havia chegado 395 dias após o acórdão da Junta, e o art. 26, § 1º, da Portaria DIRBEN/INSS 996/2022 manda desconsiderar a relevação.'
a=achados(ruim)
assert any('foi interposto' in x for x in a) and any('determina' in x for x in a) and any('Junta de Recursos' in x for x in a), a
boa='O recurso especial foi interposto 395 dias após a prolação do acórdão da Junta de Recursos. Para a aferição dessa definitividade, o art. 26, § 1º, da Portaria DIRBEN/INSS 996/2022 determina que seja afastada a hipótese de relevação da intempestividade prevista no Regimento Interno do CRPS.'
assert not any(('coloquial' in x or 'órgão reduzido' in x) for x in achados(boa)), achados(boa)
assert not any('determina' in x for x in achados('O mandado de segurança foi impetrado contra a autoridade.'))
print('ok 4')
# Onda 182: fórmulas do modelo de 2024 e lei transcrita em excesso
assert any('senão vejamos' in x for x in achados('Entretanto, está equivocado o entendimento da Autarquia Federal, pois a Parte Autora está incapacitada para o trabalho, senão vejamos.'))
duas='## 3. DO BENEFÍCIO\n\n> **Art. 42.** Texto.\n\n> **Art. 43.** Texto.\n\nA Parte Autora preenche os requisitos porque o laudo registra a incapacidade total desde a data do requerimento administrativo.'
assert any('artigos transcritos' in x for x in achados(duas))
uma='## 3. DO BENEFÍCIO\n\n> **Art. 42.** Texto.\n\n> **§ 2º** Texto.\n\nA Parte Autora preenche os requisitos porque o laudo registra a incapacidade total desde a data do requerimento administrativo.'
assert not any('artigos transcritos' in x for x in achados(uma))
print('ok 5')
