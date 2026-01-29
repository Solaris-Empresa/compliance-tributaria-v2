import PDFDocument from 'pdfkit';

interface Template {
  id: number;
  name: string;
  description: string | null;
  taxRegime: string | null;
  companySize: string | null;
  businessType: string | null;
  templateData: string;
  usageCount: number;
  createdAt: Date;
  createdBy: number;
}

export async function generateTemplatePDF(template: Template): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Parse template data
      let planData: any;
      try {
        planData = JSON.parse(template.templateData);
      } catch (error) {
        planData = { fases: [], acoes: [], tarefas: [] };
      }

      const fases = planData.fases || [];
      const acoes = planData.acoes || [];
      const tarefas = planData.tarefas || [];

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Template de Plano de Ação', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).font('Helvetica').text(template.name, { align: 'center' });
      doc.moveDown(1);

      // Description
      if (template.description) {
        doc.fontSize(11).font('Helvetica').text(template.description, { align: 'justify' });
        doc.moveDown(1);
      }

      // Metadata section
      doc.fontSize(12).font('Helvetica-Bold').text('Metadados do Template');
      doc.moveDown(0.5);
      
      const metadata: string[] = [];
      if (template.taxRegime) {
        const regimeMap: Record<string, string> = {
          simples_nacional: 'Simples Nacional',
          lucro_presumido: 'Lucro Presumido',
          lucro_real: 'Lucro Real',
          mei: 'MEI',
        };
        metadata.push(`Regime Tributário: ${regimeMap[template.taxRegime] || template.taxRegime}`);
      }
      if (template.companySize) {
        const sizeMap: Record<string, string> = {
          mei: 'MEI',
          pequena: 'Pequena',
          media: 'Média',
          grande: 'Grande',
        };
        metadata.push(`Porte: ${sizeMap[template.companySize] || template.companySize}`);
      }
      if (template.businessType) {
        metadata.push(`Tipo de Negócio: ${template.businessType}`);
      }
      metadata.push(`Usado: ${template.usageCount} vez(es)`);

      doc.fontSize(10).font('Helvetica').list(metadata, { bulletRadius: 2 });
      doc.moveDown(1);

      // Statistics
      doc.fontSize(12).font('Helvetica-Bold').text('Estatísticas');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
        .text(`• Fases: ${fases.length}`)
        .text(`• Ações: ${acoes.length}`)
        .text(`• Tarefas: ${tarefas.length}`);
      doc.moveDown(1);

      // Structure
      doc.fontSize(14).font('Helvetica-Bold').text('Estrutura do Plano');
      doc.moveDown(0.5);

      fases.forEach((fase: any, faseIdx: number) => {
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        // Fase header
        doc.fontSize(12).font('Helvetica-Bold')
          .text(`Fase ${faseIdx + 1}: ${fase.nome}`, { underline: true });
        doc.moveDown(0.3);

        if (fase.descricao) {
          doc.fontSize(10).font('Helvetica').text(fase.descricao, { indent: 20 });
          doc.moveDown(0.5);
        }

        // Ações da fase
        const faseAcoes = acoes.filter((a: any) => a.faseId === fase.id);
        faseAcoes.forEach((acao: any, acaoIdx: number) => {
          if (doc.y > 720) {
            doc.addPage();
          }

          doc.fontSize(11).font('Helvetica-Bold')
            .text(`  ${acaoIdx + 1}. ${acao.titulo}`, { indent: 20 });
          
          if (acao.descricao) {
            doc.fontSize(9).font('Helvetica')
              .text(acao.descricao, { indent: 40 });
          }
          doc.moveDown(0.3);

          // Tarefas da ação
          const acaoTarefas = tarefas.filter((t: any) => t.acaoId === acao.id);
          if (acaoTarefas.length > 0) {
            acaoTarefas.forEach((tarefa: any) => {
              if (doc.y > 730) {
                doc.addPage();
              }

              doc.fontSize(9).font('Helvetica-Bold')
                .text(`    ◦ ${tarefa.titulo}`, { indent: 40 });

              if (tarefa.descricao) {
                doc.fontSize(8).font('Helvetica')
                  .text(tarefa.descricao, { indent: 50 });
              }

              // Detalhes da tarefa
              const detalhes: string[] = [];
              if (tarefa.prioridade) {
                const prioMap: Record<string, string> = {
                  alta: 'Alta',
                  media: 'Média',
                  baixa: 'Baixa',
                };
                detalhes.push(`Prioridade: ${prioMap[tarefa.prioridade] || tarefa.prioridade}`);
              }
              if (tarefa.responsavel) {
                detalhes.push(`Responsável: ${tarefa.responsavel}`);
              }
              if (tarefa.prazo) {
                detalhes.push(`Prazo: ${tarefa.prazo}`);
              }
              if (tarefa.horasEstimadas) {
                detalhes.push(`Horas: ${tarefa.horasEstimadas}h`);
              }

              if (detalhes.length > 0) {
                doc.fontSize(8).font('Helvetica')
                  .text(detalhes.join(' | '), { indent: 50, color: '#666666' });
              }

              doc.moveDown(0.3);
            });
          }

          doc.moveDown(0.3);
        });

        doc.moveDown(0.5);
      });

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica')
          .text(
            `Página ${i + 1} de ${pages.count} | Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
