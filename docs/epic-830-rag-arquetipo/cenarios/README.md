# Cenários M1-GO-NO-GO — Bateria de validação

> **Status:** 0/15 cenários produzidos

REGRA-M1-GO-NO-GO exige 15/15 cenários de negócio com
`arquetipo = valido` para autorizar implementação de M1.

## Cenários planejados

1. [ ] Transportadora de combustível perigoso
2. [ ] Varejista simples
3. [ ] Fabricante indústria
4. [ ] Banco / instituição financeira
5. [ ] E-commerce puro
6. [ ] Marketplace / plataforma
7. [ ] Exportador direto
8. [ ] Importador
9. [ ] Empresa em ZFM
10. [ ] Cooperativa agrícola
11. [ ] Hospital / clínica
12. [ ] MEI prestador de serviço
13. [ ] Multinacional grupo econômico → expectativa: BLOQUEIO
14. [ ] Agronegócio produtor rural
15. [ ] Prestador serviço digital SaaS

## Formato de cada cenário

Cada cenário em arquivo separado `cenario-NN-<nome-curto>.md` contendo:
- Descrição da empresa
- Inputs que o usuário preencheria no form
- Arquétipo esperado (JSON)
- Regras que devem disparar
- Blocos que devem abrir
- Resultado: valido | bloqueado (com motivo)
