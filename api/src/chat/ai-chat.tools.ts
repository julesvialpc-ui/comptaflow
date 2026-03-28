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
  {
    name: 'get_clients_summary',
    description: "Retourne le top clients par chiffre d'affaires, les devis en attente et les clients récents.",
    input_schema: {
      type: 'object' as const,
      properties: {
        top: {
          type: 'number',
          description: 'Nombre de clients à retourner dans le top (défaut: 5)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_employees_summary',
    description: "Retourne la liste des employés actifs, la masse salariale brute mensuelle et les dernières notes de frais.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_revenue_goal_progress',
    description: "Retourne la progression vers l'objectif de chiffre d'affaires annuel, le seuil micro-entreprise et les alertes de dépassement.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_expense',
    description: "Crée une nouvelle dépense dans le système. Utiliser uniquement après confirmation explicite de l'utilisateur.",
    input_schema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string', description: 'Description de la dépense' },
        amount: { type: 'number', description: 'Montant HT en euros' },
        category: {
          type: 'string',
          enum: ['OFFICE_SUPPLIES','TRAVEL','MEALS','EQUIPMENT','SOFTWARE','MARKETING','PROFESSIONAL_FEES','RENT','UTILITIES','INSURANCE','TAXES','SALARY','OTHER'],
          description: 'Catégorie de la dépense',
        },
        supplier: { type: 'string', description: 'Nom du fournisseur (optionnel)' },
        date: { type: 'string', description: 'Date au format YYYY-MM-DD (défaut: aujourd\'hui)' },
      },
      required: ['description', 'amount', 'category'],
    },
  },
];
