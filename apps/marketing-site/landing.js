const translations = {
  fr: {
    meta: {
      title: "Naaval.eu - Le système d'exploitation de la logistique du dernier kilomètre",
      description:
        "Naaval est la plateforme SaaS qui permet aux transporteurs et aux équipes logistiques de piloter leurs opérations, optimiser leurs tournées et automatiser leur pricing."
    },
    brand: {
      tagline: "Control tower pour les équipes livraison modernes"
    },
    nav: {
      solution: "Solution",
      product: "Produit",
      pricing: "Pricing",
      audience: "Pour qui",
      vision: "Vision"
    },
    cta: {
      book: "Book a demo",
      signup: "S’inscrire",
      discover: "Découvrir la plateforme"
    },
    hero: {
      eyebrow: "Naaval.eu",
      title: "Naaval - Le système d'exploitation de la logistique du dernier kilomètre",
      subtitle: "Digitalise, optimise et scale ton activité de livraison - sans complexité.",
      body:
        "Naaval est une plateforme SaaS qui permet aux transporteurs et aux équipes logistiques de gérer leurs opérations, optimiser leurs tournées et automatiser leur pricing en temps réel.",
      metrics: {
        opsLabel: "Ops",
        opsValue: "Control tower",
        routingLabel: "Routing",
        routingValue: "VRP intelligent",
        executionLabel: "Exécution",
        executionValue: "Apps chauffeur + client"
      },
      cards: {
        controlLabel: "Control Tower",
        controlValue: "Commandes, routes, drivers, pricing, clients.",
        realtimeLabel: "Temps réel",
        realtimeValue: "ETA, proof, tracking, live operations."
      }
    },
    problem: {
      label: "Problème",
      title: "La logistique est encore bloquée en 2010",
      body:
        "Aujourd'hui, les transporteurs et petites sociétés de livraison gèrent encore leur croissance avec des outils qui ne sont plus adaptés au terrain.",
      items: [
        "Gèrent leurs tournées sur Excel",
        "N'ont aucune optimisation intelligente",
        "Perdent du temps sur la planification",
        "Fixent leurs prix à l'aveugle",
        "Dépendent d'intermédiaires qui prennent leur marge"
      ],
      note: "Résultat : perte de temps, perte d'argent, impossibilité de scaler."
    },
    solution: {
      label: "Solution",
      title: "Une seule plateforme pour tout gérer",
      body:
        "Naaval centralise toutes tes opérations dans un seul outil et remplace Excel, WhatsApp et plusieurs logiciels fragmentés.",
      items: [
        {
          title: "Planification des tournées",
          body: "VRP intelligent avec optimisation des distances, du temps et des contraintes terrain."
        },
        {
          title: "Gestion des livraisons en temps réel",
          body: "Exécution chauffeur, statuts, preuves de livraison et suivi live."
        },
        {
          title: "Pricing automatisé",
          body: "Distance, zone, volume, type de véhicule et logique commerciale dans un seul moteur."
        },
        {
          title: "Suivi des chauffeurs et interface client",
          body: "Un écosystème complet pour l'ops, le transporteur et le client final."
        }
      ],
      panel: {
        label: "Remplace 5 outils",
        items: [
          "Excel",
          "WhatsApp",
          "Tableaux de planification",
          "Fichiers de pricing manuels",
          "Mises à jour client fragmentées"
        ]
      }
    },
    features: {
      label: "Produit",
      title: "Le produit Naaval",
      body:
        "Un socle unique pour piloter la livraison, optimiser la marge et fluidifier l'exécution terrain.",
      items: [
        {
          title: "Routing intelligent",
          body: "Optimise automatiquement les tournées selon la distance, le temps et les contraintes."
        },
        {
          title: "Pricing engine",
          body: "Définis tes prix automatiquement selon la distance, la zone, le volume et le véhicule."
        },
        {
          title: "Driver app",
          body: "Navigation, preuves de livraison, signatures et statuts temps réel dans une app simple."
        },
        {
          title: "Dashboard ops",
          body: "Commandes, routes, performance et pilotage quotidien dans une seule vue."
        },
        {
          title: "Customer experience",
          body: "Suivi live, notifications, ETA et portail client pour une expérience professionnelle."
        }
      ]
    },
    audience: {
      label: "Pour qui",
      title: "Conçu pour les acteurs du terrain",
      body: "Tous ceux qui veulent reprendre le contrôle de leur logistique sans ajouter de complexité.",
      items: [
        "Transporteurs indépendants",
        "PME de livraison",
        "Retail / e-commerce",
        "Fournisseurs / grossistes"
      ]
    },
    comparison: {
      label: "Différenciation",
      title: "Pourquoi Naaval est différent",
      head: {
        naaval: "Naaval",
        other: "Autres outils"
      },
      rows: [
        { left: "Ultra simple", right: "Complexes" },
        { left: "Pricing intégré", right: "Pricing externe" },
        { left: "Pensé terrain", right: "Pensé corporate" },
        { left: "Rapide à déployer", right: "Long à implémenter" },
        { left: "Abordable", right: "Très cher" }
      ]
    },
    pricing: {
      label: "Pricing",
      title: "Des offres qui grandissent avec ton opération",
      body:
        "Choisis le niveau de pilotage adapté à ta flotte aujourd'hui, puis monte en puissance sans changer d'outil.",
      planDriversLabel: "Chauffeurs inclus",
      plans: [
        { name: "STARTER", price: "79€/mois", drivers: "3 chauffeurs" },
        { name: "GROWTH", price: "199€/mois", drivers: "15 chauffeurs" },
        { name: "SCALE", price: "449€/mois", drivers: "75 chauffeurs" },
        { name: "ENTERPRISE", price: "Sur devis", drivers: "Illimité / custom" }
      ],
      featureHeader: "Features",
      rows: [
        { label: "Prix", values: ["79€/mois", "199€/mois", "449€/mois", "Sur devis"] },
        { label: "Chauffeurs inclus", values: ["3", "15", "75", "Illimité / custom"] },
        { label: "Commandes", values: ["Illimitées", "Illimitées", "Illimitées", "Illimitées"] },
        { label: "Driver App", values: ["✅", "✅", "✅", "✅"] },
        { label: "POD photo/signature", values: ["✅", "✅", "✅", "✅"] },
        { label: "Tracking client", values: ["✅", "✅", "✅", "✅"] },
        { label: "VRP intelligent", values: ["✅", "✅", "✅", "✅"] },
        { label: "Multi Pickup -> Multi Drop", values: ["✅", "✅", "✅", "✅"] },
        { label: "Time Windows", values: ["✅", "✅", "✅", "✅"] },
        { label: "Optimisation kilométrique", values: ["✅", "✅", "✅", "✅"] },
        { label: "Algo pricing Per Drop", values: ["✅", "✅", "✅", "✅"] },
        { label: "Algo pricing Just Price", values: ["✅", "✅", "✅", "✅"] },
        { label: "Algo pricing Point of Sales", values: ["✅", "✅", "✅", "✅"] },
        { label: "Algo pricing Prix Palette", values: ["✅", "✅", "✅", "✅"] },
        { label: "Import CSV", values: ["✅", "✅", "✅", "✅"] },
        { label: "Export CSV", values: ["✅", "✅", "✅", "✅"] },
        { label: "Dashboard opérationnel", values: ["Basique", "Avancé", "Avancé + Analytics", "Custom"] },
        { label: "Historique commandes", values: ["30 jours", "Illimité", "Illimité", "Illimité"] },
        { label: "Gestion zones tarifaires", values: ["-", "✅", "✅", "✅"] },
        { label: "Suggestions automatiques dispatch", values: ["-", "✅", "✅", "✅"] },
        { label: "Optimisation capacité véhicules", values: ["-", "✅", "✅", "✅"] },
        { label: "Analyse coût/km & rentabilité", values: ["-", "✅", "✅", "✅"] },
        { label: "Notifications automatiques clients", values: ["-", "✅", "✅", "✅"] },
        { label: "Templates SMS / Email", values: ["-", "✅", "✅", "✅"] },
        { label: "Gestion équipes", values: ["-", "✅", "✅", "✅"] },
        { label: "Permissions avancées", values: ["-", "-", "✅", "✅"] },
        { label: "Multi-entrepôts", values: ["-", "-", "✅", "✅"] },
        { label: "API", values: ["-", "API légère", "API complète", "API custom"] },
        { label: "Webhooks", values: ["-", "-", "✅", "✅"] },
        { label: "Intégrations ERP / Shopify / WMS", values: ["-", "-", "✅", "✅"] },
        { label: "Portail client", values: ["-", "-", "✅", "✅"] },
        { label: "White-label tracking", values: ["-", "-", "✅", "✅"] },
        { label: "Export GeoJSON", values: ["-", "-", "✅", "✅"] },
        { label: "Analytics performance chauffeurs", values: ["-", "-", "✅", "✅"] },
        { label: "Branding personnalisé", values: ["-", "-", "✅", "✅"] },
        { label: "Support", values: ["Standard", "Prioritaire", "Premium", "Dédié"] },
        { label: "Onboarding personnalisé", values: ["-", "-", "✅", "✅"] },
        { label: "SLA / accompagnement OPS", values: ["-", "-", "-", "✅"] },
        { label: "Hébergement dédié", values: ["-", "-", "-", "✅"] },
        { label: "Développements spécifiques", values: ["-", "-", "-", "✅"] }
      ],
      cta: "Besoin d'un setup sur mesure, d'un SLA ops ou d'intégrations spécifiques ? Parlons-en.",
      contact: "Contact sales"
    },
    vision: {
      label: "Vision",
      title: "Construire le futur de la logistique indépendante",
      body:
        "Naaval permet aux transporteurs de devenir autonomes, se concentrer sur le commercial, augmenter leur rentabilité et digitaliser sans friction.",
      columnTitle: "Ce que Naaval débloque",
      items: [
        "Devenir autonomes",
        "Se concentrer sur le commercial",
        "Augmenter leur rentabilité",
        "Digitaliser sans friction"
      ],
      quote: "L'objectif : créer un réseau de transporteurs indépendants ultra performants."
    },
    finalCta: {
      label: "Démarrer",
      title: "Prêt à simplifier tes opérations de livraison ?"
    },
    footer: {
      product: "Produit",
      pricing: "Pricing",
      contact: "Contact",
      legal: "Legal",
      ops: "Accès ops"
    }
  },
  en: {
    meta: {
      title: "Naaval.eu - The operating system for last-mile logistics",
      description:
        "Naaval is the SaaS platform that helps carriers and logistics teams run operations, optimize routes, and automate pricing."
    },
    brand: {
      tagline: "Control tower for modern delivery teams"
    },
    nav: {
      solution: "Solution",
      product: "Product",
      pricing: "Pricing",
      audience: "For who",
      vision: "Vision"
    },
    cta: {
      book: "Book a demo",
      signup: "Sign up",
      discover: "Discover the platform"
    },
    hero: {
      eyebrow: "Naaval.eu",
      title: "Naaval - The operating system for last-mile logistics",
      subtitle: "Digitize, optimize, and scale your delivery business - without complexity.",
      body:
        "Naaval is a SaaS platform that enables carriers and logistics teams to run operations, optimize routes, and automate pricing in real time.",
      metrics: {
        opsLabel: "Ops",
        opsValue: "Control tower",
        routingLabel: "Routing",
        routingValue: "Intelligent VRP",
        executionLabel: "Execution",
        executionValue: "Driver + customer apps"
      },
      cards: {
        controlLabel: "Control Tower",
        controlValue: "Orders, routes, drivers, pricing, customers.",
        realtimeLabel: "Realtime",
        realtimeValue: "ETA, proof, tracking, and live operations."
      }
    },
    problem: {
      label: "Problem",
      title: "Logistics is still stuck in 2010",
      body:
        "Today, carriers and small delivery companies still manage growth with tools that no longer fit operational reality.",
      items: [
        "They manage routes in Excel",
        "They have no smart optimization",
        "They lose time on planning",
        "They price blindly",
        "They depend on intermediaries that take their margin"
      ],
      note: "Result: wasted time, lost money, and no real ability to scale."
    },
    solution: {
      label: "Solution",
      title: "One platform to run everything",
      body:
        "Naaval centralizes your operations in one tool and replaces Excel, WhatsApp, and multiple fragmented systems.",
      items: [
        {
          title: "Route planning",
          body: "An intelligent VRP engine that optimizes distance, time, and field constraints."
        },
        {
          title: "Real-time delivery management",
          body: "Driver execution, live statuses, proof of delivery, and operational tracking."
        },
        {
          title: "Automated pricing",
          body: "Distance, zone, volume, vehicle type, and commercial logic in one pricing engine."
        },
        {
          title: "Driver tracking and customer interface",
          body: "A full ecosystem for ops teams, carriers, and end customers."
        }
      ],
      panel: {
        label: "Replaces 5 tools",
        items: [
          "Excel",
          "WhatsApp",
          "Route planning spreadsheets",
          "Manual pricing sheets",
          "Fragmented customer updates"
        ]
      }
    },
    features: {
      label: "Product",
      title: "What Naaval delivers",
      body: "A single operating layer to run delivery, protect margin, and simplify field execution.",
      items: [
        {
          title: "Intelligent routing",
          body: "Automatically optimizes routes based on distance, time, and operating constraints."
        },
        {
          title: "Pricing engine",
          body: "Define prices automatically based on distance, area, volume, and vehicle type."
        },
        {
          title: "Driver app",
          body: "Navigation, proof of delivery, signatures, and real-time statuses in a simple app."
        },
        {
          title: "Ops dashboard",
          body: "Orders, routes, performance, and daily control in one clear interface."
        },
        {
          title: "Customer experience",
          body: "Live tracking, notifications, ETA, and a customer portal for a professional experience."
        }
      ]
    },
    audience: {
      label: "Audience",
      title: "Built for teams in the field",
      body: "Anyone who wants to take back control of logistics without adding complexity.",
      items: [
        "Independent carriers",
        "Delivery SMEs",
        "Retail / e-commerce",
        "Suppliers / wholesalers"
      ]
    },
    comparison: {
      label: "Differentiation",
      title: "Why Naaval is different",
      head: {
        naaval: "Naaval",
        other: "Other tools"
      },
      rows: [
        { left: "Ultra simple", right: "Complex" },
        { left: "Built-in pricing", right: "External pricing" },
        { left: "Built for the field", right: "Built for corporate workflows" },
        { left: "Fast to deploy", right: "Long to implement" },
        { left: "Affordable", right: "Very expensive" }
      ]
    },
    pricing: {
      label: "Pricing",
      title: "Plans that scale with your operations",
      body:
        "Start with the level of operational control you need today, then scale up without changing tools.",
      planDriversLabel: "Included drivers",
      plans: [
        { name: "STARTER", price: "79€/month", drivers: "3 drivers" },
        { name: "GROWTH", price: "199€/month", drivers: "15 drivers" },
        { name: "SCALE", price: "449€/month", drivers: "75 drivers" },
        { name: "ENTERPRISE", price: "Custom quote", drivers: "Unlimited / custom" }
      ],
      featureHeader: "Features",
      rows: [
        { label: "Price", values: ["79€/month", "199€/month", "449€/month", "Custom quote"] },
        { label: "Included drivers", values: ["3", "15", "75", "Unlimited / custom"] },
        { label: "Orders", values: ["Unlimited", "Unlimited", "Unlimited", "Unlimited"] },
        { label: "Driver App", values: ["✅", "✅", "✅", "✅"] },
        { label: "Photo / signature POD", values: ["✅", "✅", "✅", "✅"] },
        { label: "Customer tracking", values: ["✅", "✅", "✅", "✅"] },
        { label: "Intelligent VRP", values: ["✅", "✅", "✅", "✅"] },
        { label: "Multi Pickup -> Multi Drop", values: ["✅", "✅", "✅", "✅"] },
        { label: "Time Windows", values: ["✅", "✅", "✅", "✅"] },
        { label: "Kilometric optimization", values: ["✅", "✅", "✅", "✅"] },
        { label: "Per Drop pricing algo", values: ["✅", "✅", "✅", "✅"] },
        { label: "Just Price pricing algo", values: ["✅", "✅", "✅", "✅"] },
        { label: "Point of Sales pricing algo", values: ["✅", "✅", "✅", "✅"] },
        { label: "Pallet pricing algo", values: ["✅", "✅", "✅", "✅"] },
        { label: "CSV import", values: ["✅", "✅", "✅", "✅"] },
        { label: "CSV export", values: ["✅", "✅", "✅", "✅"] },
        { label: "Operations dashboard", values: ["Basic", "Advanced", "Advanced + Analytics", "Custom"] },
        { label: "Order history", values: ["30 days", "Unlimited", "Unlimited", "Unlimited"] },
        { label: "Pricing zones", values: ["-", "✅", "✅", "✅"] },
        { label: "Automatic dispatch suggestions", values: ["-", "✅", "✅", "✅"] },
        { label: "Vehicle capacity optimization", values: ["-", "✅", "✅", "✅"] },
        { label: "Cost/km & profitability analysis", values: ["-", "✅", "✅", "✅"] },
        { label: "Automatic customer notifications", values: ["-", "✅", "✅", "✅"] },
        { label: "SMS / Email templates", values: ["-", "✅", "✅", "✅"] },
        { label: "Team management", values: ["-", "✅", "✅", "✅"] },
        { label: "Advanced permissions", values: ["-", "-", "✅", "✅"] },
        { label: "Multi-warehouse", values: ["-", "-", "✅", "✅"] },
        { label: "API", values: ["-", "Light API", "Full API", "Custom API"] },
        { label: "Webhooks", values: ["-", "-", "✅", "✅"] },
        { label: "ERP / Shopify / WMS integrations", values: ["-", "-", "✅", "✅"] },
        { label: "Customer portal", values: ["-", "-", "✅", "✅"] },
        { label: "White-label tracking", values: ["-", "-", "✅", "✅"] },
        { label: "GeoJSON export", values: ["-", "-", "✅", "✅"] },
        { label: "Driver performance analytics", values: ["-", "-", "✅", "✅"] },
        { label: "Custom branding", values: ["-", "-", "✅", "✅"] },
        { label: "Support", values: ["Standard", "Priority", "Premium", "Dedicated"] },
        { label: "Personalized onboarding", values: ["-", "-", "✅", "✅"] },
        { label: "SLA / ops enablement", values: ["-", "-", "-", "✅"] },
        { label: "Dedicated hosting", values: ["-", "-", "-", "✅"] },
        { label: "Custom development", values: ["-", "-", "-", "✅"] }
      ],
      cta: "Need a custom setup, ops SLA, or specific integrations? Let's talk.",
      contact: "Contact sales"
    },
    vision: {
      label: "Vision",
      title: "Building the future of independent logistics",
      body:
        "Naaval helps carriers become autonomous, focus on sales, increase profitability, and digitize operations without friction.",
      columnTitle: "What Naaval unlocks",
      items: [
        "Become autonomous",
        "Focus on growth and sales",
        "Increase profitability",
        "Digitize without friction"
      ],
      quote: "The goal: build a network of high-performance independent carriers."
    },
    finalCta: {
      label: "Get started",
      title: "Ready to simplify your delivery operations?"
    },
    footer: {
      product: "Product",
      pricing: "Pricing",
      contact: "Contact",
      legal: "Legal",
      ops: "Ops access"
    }
  }
};

const opsTargets = ["localhost", "127.0.0.1", "192.168.1.156"];
const currentHost = window.location.hostname;
const hostedOpsHref = "https://ops-web-eta.vercel.app";
const opsHref = opsTargets.includes(currentHost) ? "/ops/" : hostedOpsHref;
const opsLinks = document.querySelectorAll("#footer-ops-link");
const languageButtons = document.querySelectorAll("[data-language]");
const titleNode = document.querySelector("title");
const descriptionNode = document.querySelector('meta[name="description"]');
const pricingPlanGridNode = document.querySelector("#pricing-plan-grid");
const pricingTableHeadNode = document.querySelector("#pricing-table-head");
const pricingTableBodyNode = document.querySelector("#pricing-table-body");
const languageStorageKey = "naaval-marketing-language";

function getNestedValue(source, key) {
  return key.split(".").reduce((current, part) => {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      return current[part];
    }
    return undefined;
  }, source);
}

function setActiveLanguageButton(language) {
  languageButtons.forEach((button) => {
    const isActive = button.dataset.language === language;
    button.classList.toggle("language-switch__button--active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderPricingSection(dictionary) {
  const pricing = dictionary.pricing;
  if (!pricingPlanGridNode || !pricingTableHeadNode || !pricingTableBodyNode || !pricing) {
    return;
  }

  pricingPlanGridNode.innerHTML = pricing.plans
    .map(
      (plan) => `
        <article class="pricing-plan-card">
          <span class="pricing-plan-card__name">${plan.name}</span>
          <strong class="pricing-plan-card__price">${plan.price}</strong>
          <span class="pricing-plan-card__drivers">${pricing.planDriversLabel}</span>
          <p class="pricing-plan-card__value">${plan.drivers}</p>
        </article>
      `
    )
    .join("");

  pricingTableHeadNode.innerHTML = `
    <tr>
      <th>${pricing.featureHeader}</th>
      ${pricing.plans.map((plan) => `<th>${plan.name}</th>`).join("")}
    </tr>
  `;

  pricingTableBodyNode.innerHTML = pricing.rows
    .map(
      (row) => `
        <tr>
          <th>${row.label}</th>
          ${row.values.map((value) => `<td>${value}</td>`).join("")}
        </tr>
      `
    )
    .join("");
}

function applyLanguage(language) {
  const dictionary = translations[language] || translations.fr;

  document.documentElement.lang = language;
  if (titleNode) {
    titleNode.textContent = dictionary.meta.title;
  }
  if (descriptionNode) {
    descriptionNode.setAttribute("content", dictionary.meta.description);
  }

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    const value = getNestedValue(dictionary, key);
    if (typeof value === "string") {
      node.textContent = value;
    }
  });

  renderPricingSection(dictionary);

  setActiveLanguageButton(language);
  window.localStorage.setItem(languageStorageKey, language);

  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);
  window.history.replaceState({}, "", url.toString());
}

function resolveInitialLanguage() {
  const url = new URL(window.location.href);
  const queryLanguage = url.searchParams.get("lang");
  if (queryLanguage === "fr" || queryLanguage === "en") {
    return queryLanguage;
  }

  const savedLanguage = window.localStorage.getItem(languageStorageKey);
  if (savedLanguage === "fr" || savedLanguage === "en") {
    return savedLanguage;
  }

  return "fr";
}

opsLinks.forEach((link) => {
  link.setAttribute("href", opsHref);
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.language === "en" ? "en" : "fr");
  });
});

applyLanguage(resolveInitialLanguage());
