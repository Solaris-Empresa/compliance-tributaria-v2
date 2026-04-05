# Decision Kernel — Datasets

Diretório de fontes oficiais para o Milestone 1 — Decision Kernel.

## Estrutura

```
datasets/
├── lc214/
│   └── lc214-2025.pdf              — Lei Complementar 214/2025 (6.7 MB)
├── nbs/
│   ├── nbs-2-0.csv                 — Tabela NBS 2.0 (ISO-8859-1, 1.237 registros)
│   ├── nbs-2-0-utf8.csv            — Tabela NBS 2.0 (UTF-8, pronto para uso)
│   ├── nbs-2-0-anexo.pdf           — Anexo I NBS 2.0 com notas explicativas (1.1 MB)
│   └── nbs-de-para-compilado.xlsx  — Correlação NBS ↔ ISS/outras (85 KB)
├── reports/
│   └── GATE-EXT-01-documentos.md  — Relatório de coleta GATE-EXT-01
└── lc214-source/                   — Arquivos originais do ZIP entregue pelo P.O.
```

## Fontes Oficiais

| Arquivo | Origem | Data |
|---------|--------|------|
| `lc214-2025.pdf` | Portal Reforma Tributária (gov.br) | Jan/2025 |
| `nbs-2-0.csv` | MDIC/SECEX (gov.br) | Dez/2018 |
| `nbs-2-0-anexo.pdf` | MDIC/SECEX (gov.br) | Dez/2018 |
| `nbs-de-para-compilado.xlsx` | MDIC/SECEX (gov.br) | Dez/2018 |

## Status GATE-EXT-01

- **LC 214/2025:** ✅ PDF completo com 11 Anexos (I–XI)
- **NBS 2.0:** ✅ CSV com 1.237 registros + PDF com notas explicativas
- **Próximo passo:** Orquestrador identifica 3 NCM + 3 NBS → Dr. Rodrigues valida → Manus converte para JSON

## Uso pelo Bloco C (engine)

Os arquivos `nbs-2-0-utf8.csv` e `lc214-2025.pdf` serão a base para geração de:
- `ncm-dataset.json` — lookup determinístico NCM → regime/alíquota/fonte
- `nbs-dataset.json` — lookup interpretativo NBS → regime/alíquota/fonte

**Atenção:** Geração dos JSON bloqueada até validação de Dr. Rodrigues (GATE-EXT-01).

---

*Coletado em: 2026-04-05 | Milestone 1 — Decision Kernel*
