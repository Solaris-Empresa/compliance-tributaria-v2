import mysql from 'mysql2/promise';
const P1=691585,P2=691586,P3=691587;
async function main(){
  const pool=mysql.createPool(process.env.DATABASE_URL);
  const [allReqs]=await pool.query('SELECT code FROM regulatory_requirements_v3 WHERE active=1');
  console.log('Total req_v3 ativos:',allReqs.length);
  const [qTotal]=await pool.query("SELECT COUNT(*) as cnt FROM requirement_question_mapping WHERE question_quality_status='approved'");
  console.log('Perguntas aprovadas:',qTotal[0].cnt);
  const codes=allReqs.map(r=>r.code);
  const [qMatch]=await pool.query('SELECT COUNT(*) as cnt FROM requirement_question_mapping WHERE canonical_id IN ('+codes.map(()=>'?').join(',')+')',codes);
  console.log('Match req_v3.code->mapping.canonical_id:',qMatch[0].cnt,'(gap estrutural confirmado)');

  const gaps=[
    [1,P1,'REQ-GOV-001','Mapear incidência piloto de IBS/CBS em 2026','governanca_transicao','estrategico','processo','nao_atendido','alta','ausente','alta',0.25,'alto',0.85,'imediata',30,'Empresa não possui mapeamento formal da incidência do IBS/CBS. Ausência total de documentação.','Nenhum processo identificado. Sem responsável.','Ausência de: mapeamento; responsável; cronograma','Contratar consultoria; designar responsável; cronograma até 31/03/2026'],
    [1,P1,'REQ-GOV-002','Definir responsável pelo programa de transição','governanca_transicao','estrategico','normativo','atendido','alta','completa','baixa',1.0,'baixo',0.10,'planejamento',0,'Responsável designado formalmente (CFO). Ata de 15/01/2026.','Evidência: ata de reunião de 15/01/2026.','Nenhum critério pendente','Manter documentação atualizada'],
    [1,P1,'REQ-GOV-003','Criar plano formal de prontidão 2026','governanca_transicao','estrategico','normativo','parcialmente_atendido','critica','parcial','media',0.55,'medio',0.65,'curto_prazo',60,'Plano existe mas incompleto: falta análise financeira e cronograma.','Documento sem: análise financeira; cronograma; contingência','Faltam: análise financeira; cronograma; contingência','Complementar plano com análise financeira até 30/04/2026'],
    [1,P2,'REQ-GOV-001','Mapear incidência piloto de IBS/CBS em 2026','governanca_transicao','estrategico','processo','nao_atendido','critica','ausente','alta',0.10,'critico',0.95,'imediata',15,'Holding 4 CNAEs 4 estados sem mapeamento IBS/CBS. Risco crítico.','Ausência total. SP, RJ, MG, RS não mapeados.','Ausência de: mapeamento por CNAE; por estado; análise alíquota','Engajar Big 4 imediatamente; mapear por CNAE e estado'],
    [1,P2,'REQ-GOV-004','Identificar dependências externas da transição','governanca_transicao','tatico','processo','parcialmente_atendido','alta','parcial','alta',0.45,'alto',0.75,'curto_prazo',45,'Dependências parcialmente mapeadas. Fornecedores internacionais não incluídos.','Mapeamento cobre apenas fornecedores nacionais.','Faltam: fornecedores internacionais; marketplace; contingência','Expandir mapeamento para fornecedores internacionais'],
    [1,P2,'REQ-GOV-005','Definir rotina de atualização regulatória','governanca_transicao','tatico','normativo','parcialmente_atendido','alta','parcial','media',0.60,'medio',0.55,'medio_prazo',90,'Rotina informal. Sem responsável dedicado.','Processo informal. Sem SLA, sem responsável.','Faltam: responsável; SLA; registro formal','Formalizar com responsável e SLA de 48h'],
    [1,P2,'REQ-GOV-007','Formalizar matriz RACI da transição','governanca_transicao','estrategico','normativo','atendido','alta','completa','baixa',1.0,'baixo',0.05,'planejamento',0,'Matriz RACI aprovada pelo conselho em 10/01/2026.','Evidência: documento RACI com assinaturas.','Nenhum critério pendente','Revisar anualmente'],
    [1,P3,'REQ-GOV-001','Mapear incidência piloto de IBS/CBS em 2026','governanca_transicao','estrategico','processo','parcialmente_atendido','alta','parcial','media',0.40,'alto',0.70,'curto_prazo',45,'CONFLITO: Empresa afirma ter mapeamento mas não apresenta documentação.','Resposta afirma conformidade sem evidência. Risco oculto.','Evidência não apresentada. Possível não-conformidade.','Solicitar documentação. Se ausente, tratar como não-conforme.'],
    [1,P3,'REQ-GOV-002','Definir responsável pelo programa de transição','governanca_transicao','estrategico','normativo','parcialmente_atendido','alta','parcial','media',0.35,'medio',0.60,'curto_prazo',30,'CONFLITO: Duas pessoas indicadas como responsáveis em respostas distintas.','Resposta 1: CFO. Resposta 2: Gerente Fiscal. Conflito identificado.','Falta definição única de responsável.','Definir único responsável. Documentar em ata.'],
    [1,P3,'REQ-GOV-003','Criar plano formal de prontidão 2026','governanca_transicao','estrategico','processo','nao_atendido','critica','ausente','alta',0.05,'critico',0.98,'imediata',15,'RISCO OCULTO: Plano de 2024 não cobre EC 132. Empresa acredita estar conforme mas não está.','Documento datado 15/08/2024. EC 132 publicada 20/12/2023. Plano desatualizado.','Plano não cobre: IBS/CBS; Split Payment; Cashback; Regimes diferenciados','Atualizar plano urgentemente incorporando EC 132 e LC 214. Prazo: 30 dias.']
  ];
  for(const g of gaps){
    await pool.query('INSERT INTO project_gaps_v3 (client_id,project_id,requirement_code,requirement_name,domain,gap_level,gap_type,compliance_status,criticality,evidence_status,operational_dependency,score,risk_level,priority_score,action_priority,estimated_days,gap_description,deterministic_reason,unmet_criteria,recommended_actions) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',g);
  }
  console.log('Gaps inseridos:',gaps.length);

  const risks=[
    [1,P1,'RSK-P1-001','REQ-GOV-001','Mapear incidência piloto de IBS/CBS em 2026','governanca_transicao','processo',85,75,6375,64,'alto','regulatorio','0.0800','Risco de multa por não-conformidade IBS/CBS 2026. Estimativa: R$ 160.000 (8% receita)','Contratar consultoria; designar responsável; cronograma até 31/03/2026'],
    [1,P1,'RSK-P1-002','REQ-GOV-003','Criar plano formal de prontidão 2026','governanca_transicao','normativo',60,65,3900,39,'medio','operacional','0.0400','Risco operacional por plano incompleto. Estimativa: R$ 80.000 (4% receita)','Complementar plano com análise financeira. Prazo: 30/04/2026'],
    [1,P2,'RSK-P2-001','REQ-GOV-001','Mapear incidência piloto de IBS/CBS em 2026','governanca_transicao','processo',95,90,8550,86,'critico','regulatorio','0.1200','Holding R$ 150M. Risco crítico: 12% = R$ 18M em multas e remediação','Engajar Big 4 imediatamente; mapear por CNAE e estado; prazo máximo 15 dias'],
    [1,P2,'RSK-P2-002','REQ-GOV-004','Identificar dependências externas da transição','governanca_transicao','processo',70,80,5600,56,'alto','operacional','0.0600','Risco de ruptura com fornecedores internacionais não preparados. Estimativa: R$ 9M','Mapear fornecedores; incluir cláusulas de adaptação; plano de contingência'],
    [1,P2,'RSK-P2-003','REQ-GOV-005','Definir rotina de atualização regulatória','governanca_transicao','normativo',55,60,3300,33,'medio','reputacional','0.0300','Risco reputacional por desatualização. Estimativa: R$ 4.5M','Contratar monitoramento regulatório; responsável; SLA de 48h'],
    [1,P3,'RSK-P3-001','REQ-GOV-003','Criar plano formal de prontidão 2026','governanca_transicao','processo',90,85,7650,77,'critico','regulatorio','0.1000','RISCO OCULTO: Plano 2024 não cobre EC 132. Empresa acredita estar conforme. Impacto: R$ 80.000','URGENTE: Atualizar plano incorporando EC 132 e LC 214. Prazo: 30 dias.'],
    [1,P3,'RSK-P3-002','REQ-GOV-002','Definir responsável pelo programa de transição','governanca_transicao','normativo',65,55,3575,36,'medio','operacional','0.0350','Conflito de responsabilidade. Estimativa: R$ 28.000 em remediação','Resolver conflito em reunião executiva. Documentar em ata. Prazo: 7 dias.']
  ];
  for(const r of risks){
    await pool.query('INSERT INTO project_risks_v3 (client_id,project_id,risk_code,requirement_code,requirement_name,domain,gap_type,probability,impact,risk_score,risk_score_normalized,risk_level,risk_dimension,financial_impact_percent,financial_impact_description,mitigation_strategy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',r);
  }
  console.log('Riscos inseridos:',risks.length);

  const actions=[
    [1,P1,'REQ-GOV-001','RSK-P1-001','governanca_transicao','processo','ACT-P1-001','Contratar consultoria tributária para mapeamento IBS/CBS','Contratar consultoria tributária especializada para mapeamento completo da incidência de IBS/CBS. Escopo: todos os produtos/serviços, alíquotas aplicáveis, cronograma de adaptação.','documentacao','imediata',30,'CFO / Gerente Fiscal'],
    [1,P1,'REQ-GOV-003','RSK-P1-002','governanca_transicao','normativo','ACT-P1-002','Complementar plano de prontidão com análise financeira','Complementar o plano existente com: (1) análise de impacto financeiro; (2) cronograma com marcos; (3) plano de contingência.','documentacao','curto_prazo',60,'Gerente Fiscal'],
    [1,P2,'REQ-GOV-001','RSK-P2-001','governanca_transicao','processo','ACT-P2-001','Engajar Big 4 para mapeamento IBS/CBS multi-CNAE multi-estado','Engajar imediatamente uma das Big 4 para mapeamento completo: 4 CNAEs, 4 estados, operações internacionais, marketplace. Prazo: 15 dias.','documentacao','imediata',15,'CEO / CFO'],
    [1,P2,'REQ-GOV-004','RSK-P2-002','governanca_transicao','processo','ACT-P2-002','Mapear e adaptar contratos com fornecedores internacionais','Mapear todos os contratos com fornecedores internacionais e marketplace. Incluir cláusulas de adaptação à reforma. Criar plano de contingência.','revisao_contrato','curto_prazo',45,'Diretor Jurídico'],
    [1,P2,'REQ-GOV-005','RSK-P2-003','governanca_transicao','normativo','ACT-P2-003','Implementar sistema de monitoramento regulatório','Contratar serviço de monitoramento regulatório. Designar responsável. SLA de 48h. Processo de avaliação de impacto.','documentacao','medio_prazo',90,'Gerente Fiscal'],
    [1,P3,'REQ-GOV-003','RSK-P3-001','governanca_transicao','processo','ACT-P3-001','URGENTE: Atualizar plano de prontidão para EC 132/LC 214','AÇÃO URGENTE: Plano 2024 não cobre EC 132. Atualizar incorporando: IBS/CBS; Split Payment; Cashback; Regimes diferenciados; Cronograma 2026-2032.','documentacao','imediata',15,'CFO'],
    [1,P3,'REQ-GOV-002','RSK-P3-002','governanca_transicao','normativo','ACT-P3-002','Resolver conflito de responsabilidade em reunião executiva','Convocar reunião executiva. Definir único responsável. Documentar em ata assinada por CEO e CFO. Prazo: 7 dias.','governanca','imediata',7,'CEO']
  ];
  for(const a of actions){
    await pool.query('INSERT INTO project_actions_v3 (client_id,project_id,requirement_code,risk_code,domain,gap_type,action_code,action_name,action_desc,action_type,action_priority,estimated_days,owner_suggestion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',a);
  }
  console.log('Ações inseridas:',actions.length);

  for(const[pid,nm] of [[P1,'Simples'],[P2,'Complexo'],[P3,'Inconsistente']]){
    const[[g]]=await pool.query('SELECT COUNT(*) as cnt FROM project_gaps_v3 WHERE project_id=?',[pid]);
    const[[r]]=await pool.query('SELECT COUNT(*) as cnt FROM project_risks_v3 WHERE project_id=?',[pid]);
    const[[a]]=await pool.query('SELECT COUNT(*) as cnt FROM project_actions_v3 WHERE project_id=?',[pid]);
    const[[gs]]=await pool.query('SELECT AVG(score) as avg FROM project_gaps_v3 WHERE project_id=?',[pid]);
    const[[mr]]=await pool.query('SELECT MAX(risk_score_normalized) as mx FROM project_risks_v3 WHERE project_id=?',[pid]);
    console.log('P'+nm+': gaps='+g.cnt+' riscos='+r.cnt+' acoes='+a.cnt+' avg_score='+Number(gs.avg).toFixed(2)+' max_risk='+mr.mx);
  }

  const[trace]=await pool.query('SELECT g.requirement_code,g.compliance_status,r.risk_level,r.risk_score_normalized,a.action_code,a.action_priority FROM project_gaps_v3 g JOIN project_risks_v3 r ON r.requirement_code=g.requirement_code AND r.project_id=g.project_id JOIN project_actions_v3 a ON a.requirement_code=g.requirement_code AND a.project_id=g.project_id WHERE g.project_id IN (?,?,?) ORDER BY r.risk_score_normalized DESC',[P1,P2,P3]);
  console.log('\n=== RASTREABILIDADE gap->risco->acao ===');
  trace.forEach(t=>console.log(t.requirement_code,'|',t.compliance_status,'|',t.risk_level,'('+t.risk_score_normalized+')|',t.action_code,'|',t.action_priority));

  await pool.end();
  console.log('\nDONE');
}
main().catch(console.error);
