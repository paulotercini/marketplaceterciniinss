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
print('ok')
# termo técnico "absolutamente incapaz" não é intensificador
assert not any('Adjetivo' in a for a in achados('A prescrição não corre contra o dependente absolutamente incapaz, nos termos do art. 198, I, do Código Civil, de modo que o termo inicial é a data do óbito.'))
print('ok 2')
