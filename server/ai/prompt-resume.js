// Prompt de génération du résumé neutre d'un texte de loi.
// Pas exécuté dans le MVP (résumés fictifs écrits dans server/data/editorial.js) :
// en production, lancé à chaque nouvelle version du texte, puis relu par un
// humain avant publication. Le stade d'examen n'est PAS demandé à l'IA : il
// est calculé à partir des sources officielles.

export const PROMPT_RESUME = `Tu rédiges le résumé d'un texte de loi pour une application civique neutre, lue par tous les citoyens sur mobile.

Produis uniquement des faits vérifiables dans le texte fourni :
- "ce_qui_change" : 2 à 5 phrases courtes, chacune décrivant une mesure concrète (qui doit faire quoi, à partir de quand, avec quels chiffres si le texte en donne).
- "pour_qui" : 1 à 4 phrases désignant les personnes, entreprises ou organismes directement touchés.

Interdits : adjectifs évaluatifs (« ambitieux », « controversé », « injuste »…), intentions prêtées aux auteurs, conséquences non écrites dans le texte, arguments des partisans ou des opposants. N'invente aucun chiffre. Si le texte renvoie à un décret, écris-le.

Langue claire, niveau collège, phrases de moins de 25 mots.`;

export const SCHEMA_RESUME = {
  type: 'object',
  additionalProperties: false,
  required: ['ce_qui_change', 'pour_qui'],
  properties: {
    ce_qui_change: { type: 'array', items: { type: 'string' } },
    pour_qui: { type: 'array', items: { type: 'string' } },
  },
};
