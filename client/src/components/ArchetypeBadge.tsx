/**
 * ArchetypeBadge — Sprint M3 NOVA-07
 * Badge compacto que exibe contexto do arquétipo (Perfil da Entidade) no header
 * de questionários e telas de diagnóstico.
 *
 * Backward-compat absoluta: archetype null/inválido → retorna null (não renderiza).
 * Hover revela contexto completo dimensão a dimensão.
 *
 * Refs:
 * - Documento canônico: docs/produto/PERFIL-DA-ENTIDADE-FONTE-DA-VERDADE.md
 * - ADR-0031 (modelo dimensional)
 */
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

interface PerfilDimensional {
  objeto?: string[];
  papel_na_cadeia?: string;
  tipo_de_relacao?: string[];
  territorio?: string[];
  regime?: string;
  subnatureza_setorial?: string[];
  orgao_regulador?: string[];
}

function parseArchetype(raw: unknown): PerfilDimensional | null {
  if (!raw) return null;
  let arch: unknown = raw;
  if (typeof raw === "string") {
    try {
      arch = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!arch || typeof arch !== "object" || Array.isArray(arch)) return null;
  return arch as PerfilDimensional;
}

function buildSummary(arch: PerfilDimensional): string {
  const parts: string[] = [];
  if (Array.isArray(arch.objeto) && arch.objeto.length > 0) parts.push(arch.objeto[0]);
  if (arch.papel_na_cadeia) parts.push(arch.papel_na_cadeia);
  if (arch.regime) parts.push(arch.regime);
  return parts.join(" · ");
}

function buildFullContext(arch: PerfilDimensional): string[] {
  const lines: string[] = [];
  if (Array.isArray(arch.objeto) && arch.objeto.length > 0) lines.push(`Objeto: ${arch.objeto.join(", ")}`);
  if (arch.papel_na_cadeia) lines.push(`Papel: ${arch.papel_na_cadeia}`);
  if (Array.isArray(arch.tipo_de_relacao) && arch.tipo_de_relacao.length > 0) lines.push(`Relação: ${arch.tipo_de_relacao.join(", ")}`);
  if (Array.isArray(arch.territorio) && arch.territorio.length > 0) lines.push(`Território: ${arch.territorio.join(", ")}`);
  if (arch.regime) lines.push(`Regime: ${arch.regime}`);
  if (Array.isArray(arch.subnatureza_setorial) && arch.subnatureza_setorial.length > 0) lines.push(`Subnatureza: ${arch.subnatureza_setorial.join(", ")}`);
  if (Array.isArray(arch.orgao_regulador) && arch.orgao_regulador.length > 0) lines.push(`Órgão regulador: ${arch.orgao_regulador.join(", ")}`);
  return lines;
}

export function ArchetypeBadge({ archetype }: { archetype: unknown }) {
  const arch = parseArchetype(archetype);
  if (!arch) return null;

  const summary = buildSummary(arch);
  const full = buildFullContext(arch);
  if (full.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-xs gap-1 border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 cursor-help"
            data-testid="archetype-badge"
          >
            <Sparkles className="h-3 w-3" />
            {summary || "Perfil M1"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-md">
          <div className="space-y-1">
            <p className="font-semibold text-xs mb-1">Perfil da Entidade (M1)</p>
            {full.map((line, i) => (
              <p key={i} className="text-xs">{line}</p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
