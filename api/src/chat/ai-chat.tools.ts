import Anthropic from '@anthropic-ai/sdk';

export const AI_CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_financial_summary',
    description:
      "Récupère le résumé financier de l'entreprise : chiffre d'affaires, dépenses, bénéfice net pour une période donnée.",
    input_schema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['current_month', 'last_month', 'current_year', 'last_year', 'all_time'],
          description: 'Période à analyser',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_recent_invoices',
    description: 'Récupère la liste des factures récentes avec leur statut (payée, en attente, en retard).',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Nombre de factures à retourner (défaut: 10)',
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'all'],
          description: 'Filtrer par statut',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_recent_expenses',
    description: 'Récupère les dépenses récentes par catégorie.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Nombre de dépenses à retourner (défaut: 10)',
        },
        category: {
          type: 'string',
          description: 'Filtrer par catégorie (optionnel)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_tax_deadlines',
    description: "Récupère les prochaines échéances fiscales et déclarations à venir (TVA, URSSAF, CFE, etc.).",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_unpaid_invoices_total',
    description: "Calcule le total des factures impayées et en retard.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];
