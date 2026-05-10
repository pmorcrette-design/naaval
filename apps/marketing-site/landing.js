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
      },
      visuals: [
        {
          label: "Cockpit ops",
          body: "Dispatch, pricing, tournées et contrôle multi-tenant dans une seule surface."
        },
        {
          label: "VRP GraphHopper",
          body: "Optimisation multi-stop lisible, exploitable et prête pour les équipes ops."
        },
        {
          label: "Exécution chauffeur",
          body: "Preuves terrain, tracking live et visibilité client en continu."
        }
      ]
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
    signup: {
      label: "Inscription",
      brandTitle: "Crée ton workspace Naaval.",
      brandBody:
        "Active ton espace ops, configure tes équipes et commence à piloter tes livraisons depuis une seule plateforme.",
      title: "Créer votre compte Naaval",
      subtitle:
        "Remplissez le formulaire ou continuez avec Google pour créer instantanément votre société sur Naaval.",
      google: "Continuer avec Google",
      divider: "ou",
      helper:
        "Votre tenant, votre compte admin et votre espace ops seront créés automatiquement.",
      submit: "Créer mon compte",
      close: "Fermer",
      highlights: [
        {
          tag: "Ops",
          body: "Dashboard, VRP, pricing et pilotage terrain dans un seul outil."
        },
        {
          tag: "Drivers",
          body: "Apps chauffeur, preuves de livraison et statuts temps réel."
        },
        {
          tag: "Clients",
          body: "Portail client, tracking live et notifications automatiques."
        }
      ],
      fields: {
        firstName: {
          label: "Prénom",
          placeholder: "Pierre"
        },
        lastName: {
          label: "Nom",
          placeholder: "Morcrette"
        },
        company: {
          label: "Société",
          placeholder: "Naaval Transport"
        },
        email: {
          label: "Email pro",
          placeholder: "contact@naaval.eu"
        },
        password: {
          label: "Mot de passe",
          placeholder: "Choisissez un mot de passe"
        },
        phone: {
          label: "Téléphone",
          placeholder: "+33 6 00 00 00 00"
        },
        volume: {
          label: "Volume mensuel estimé",
          options: {
            placeholder: "Choisir un volume",
            0: "0 à 250 livraisons / mois",
            1: "250 à 1 000 livraisons / mois",
            2: "1 000 à 5 000 livraisons / mois",
            3: "5 000+ livraisons / mois"
          }
        },
        message: {
          label: "Besoin principal",
          placeholder: "Expliquez votre besoin : tournée, pricing, portail client, flotte, retail..."
        }
      },
      status: {
        ready: "Compte créé. Redirection vers votre dashboard Naaval.",
        invalid: "Merci de renseigner votre prénom, votre nom, votre société, votre e-mail professionnel et un mot de passe.",
        googleFill: "Compte Google reconnu. Complétez votre société, choisissez un mot de passe et lancez la création.",
        creating: "Création de votre société Naaval en cours…",
        googleUnavailable:
          "Le bouton Google sera activé dès que le client Google sera configuré. Vous pouvez déjà utiliser le formulaire classique."
      }
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
      ops: "Ops Login"
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
      },
      visuals: [
        {
          label: "Ops cockpit",
          body: "Dispatch, pricing, routes, and tenant-level control in one surface."
        },
        {
          label: "GraphHopper VRP",
          body: "Readable multi-stop optimization that is ready for dispatch operations."
        },
        {
          label: "Driver execution",
          body: "Field proofs, live tracking, and continuous customer visibility."
        }
      ]
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
    signup: {
      label: "Sign up",
      brandTitle: "Create your Naaval workspace.",
      brandBody:
        "Activate your ops environment, configure your teams, and start running deliveries from one platform.",
      title: "Create your Naaval account",
      subtitle:
        "Fill in the form or continue with Google to instantly create your company workspace on Naaval.",
      google: "Continue with Google",
      divider: "or",
      helper:
        "Your tenant, admin account, and ops workspace will be created automatically.",
      submit: "Create my account",
      close: "Close",
      highlights: [
        {
          tag: "Ops",
          body: "Dashboard, VRP, pricing, and field operations in one tool."
        },
        {
          tag: "Drivers",
          body: "Driver apps, proof of delivery, and real-time execution statuses."
        },
        {
          tag: "Customers",
          body: "Customer portal, live tracking, and automatic notifications."
        }
      ],
      fields: {
        firstName: {
          label: "First name",
          placeholder: "Pierre"
        },
        lastName: {
          label: "Last name",
          placeholder: "Morcrette"
        },
        company: {
          label: "Company",
          placeholder: "Naaval Transport"
        },
        email: {
          label: "Work email",
          placeholder: "contact@naaval.eu"
        },
        password: {
          label: "Password",
          placeholder: "Choose a password"
        },
        phone: {
          label: "Phone",
          placeholder: "+33 6 00 00 00 00"
        },
        volume: {
          label: "Estimated monthly volume",
          options: {
            placeholder: "Choose a volume",
            0: "0 to 250 deliveries / month",
            1: "250 to 1,000 deliveries / month",
            2: "1,000 to 5,000 deliveries / month",
            3: "5,000+ deliveries / month"
          }
        },
        message: {
          label: "Main need",
          placeholder: "Tell us about your needs: routing, pricing, customer portal, fleet, retail..."
        }
      },
      status: {
        ready: "Account created. Redirecting to your Naaval dashboard.",
        invalid: "Please fill in your first name, last name, company, work email, and password.",
        googleFill: "Google account recognized. Complete your company, choose a password, and launch the signup.",
        creating: "Creating your Naaval company…",
        googleUnavailable:
          "Google sign-up will be available as soon as the Google client is configured. You can already use the classic form."
      }
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
      ops: "Ops Login"
    }
  }
};

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

const opsTargets = ["localhost", "127.0.0.1", "192.168.1.156"];
const currentHost = window.location.hostname;
const configuredOpsBaseUrl = normalizeBaseUrl(window.NAAVAL_OPS_BASE_URL);
const configuredAdminBaseUrl = normalizeBaseUrl(window.NAAVAL_ADMIN_BASE_URL);
const configuredMarketingApiBaseUrl = normalizeBaseUrl(window.NAAVAL_MARKETING_API_BASE_URL);
const hostedOpsHref = configuredOpsBaseUrl || "https://ops.naaval.eu";
const hostedAdminHref = configuredAdminBaseUrl || "https://admin.naaval.eu";
const opsHref = opsTargets.includes(currentHost) ? "/ops/" : hostedOpsHref;
const marketingApiCandidates = (() => {
  const candidates = [];
  if (configuredMarketingApiBaseUrl) {
    candidates.push(configuredMarketingApiBaseUrl);
  }
  if (window.location.protocol.startsWith("http")) {
    candidates.push(window.location.origin);
  }
  if (opsTargets.includes(currentHost)) {
    candidates.push("http://127.0.0.1:8787");
  }
  return [...new Set(candidates)];
})();
const opsLinks = document.querySelectorAll("#footer-ops-link");
const adminLinks = document.querySelectorAll("#footer-admin-link");
const languageButtons = document.querySelectorAll("[data-language]");
const titleNode = document.querySelector("title");
const descriptionNode = document.querySelector('meta[name="description"]');
const pricingPlanGridNode = document.querySelector("#pricing-plan-grid");
const pricingTableHeadNode = document.querySelector("#pricing-table-head");
const pricingTableBodyNode = document.querySelector("#pricing-table-body");
const languageStorageKey = "naaval-marketing-language";
const signupModalNode = document.querySelector("#signup-modal");
const signupFormNode = document.querySelector("#signup-form");
const signupStatusNode = document.querySelector("#signup-form-status");
const signupOpenButtons = document.querySelectorAll("[data-open-signup]");
const signupCloseButtons = document.querySelectorAll("[data-close-signup]");
const signupGoogleSlot = document.querySelector("#signup-google-slot");
const signupGoogleButton = document.querySelector("#signup-google-button");
let googleSignupRetryTimer = null;

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

function decodeJwtPayload(token) {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = window.atob(normalized);
    return JSON.parse(decoded);
  } catch (_error) {
    return null;
  }
}

function getCurrentLanguage() {
  return document.documentElement.lang === "en" ? "en" : "fr";
}

function getCurrentDictionary() {
  return translations[getCurrentLanguage()] || translations.fr;
}

function setSignupStatus(message, tone = "info") {
  if (!signupStatusNode) {
    return;
  }

  if (!message) {
    signupStatusNode.textContent = "";
    signupStatusNode.className = "signup-status hidden";
    return;
  }

  signupStatusNode.textContent = message;
  signupStatusNode.className = `signup-status signup-status--${tone}`;
}

function openSignupModal() {
  if (!signupModalNode) {
    return;
  }

  signupModalNode.classList.remove("hidden");
  signupModalNode.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => signupFormNode?.elements?.firstName?.focus(), 30);
}

function closeSignupModal() {
  if (!signupModalNode) {
    return;
  }

  signupModalNode.classList.add("hidden");
  signupModalNode.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  setSignupStatus("");
}

async function readApiError(response) {
  const contentType = response.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      return payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    }
    return (await response.text()) || `HTTP ${response.status}`;
  } catch (_error) {
    return `HTTP ${response.status}`;
  }
}

async function postMarketingJson(path, payload) {
  const errors = [];
  for (const baseUrl of marketingApiCandidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      return await response.json();
    } catch (error) {
      errors.push(`${baseUrl}: ${error.message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

function getSignupFormPayload() {
  if (!signupFormNode) {
    return null;
  }

  const payload = {
    firstName: signupFormNode.elements.firstName.value.trim(),
    lastName: signupFormNode.elements.lastName.value.trim(),
    company: signupFormNode.elements.company.value.trim(),
    email: signupFormNode.elements.email.value.trim(),
    password: signupFormNode.elements.password.value.trim(),
    phone: signupFormNode.elements.phone.value.trim(),
    volume: signupFormNode.elements.volume.value.trim(),
    message: signupFormNode.elements.message.value.trim()
  };

  if (!payload.firstName || !payload.lastName || !payload.company || !payload.email || !payload.password) {
    return null;
  }

  return payload;
}

function handleSignupSubmit(event) {
  event.preventDefault();
  void (async () => {
    const dictionary = getCurrentDictionary();
    const payload = getSignupFormPayload();

    if (!payload) {
      setSignupStatus(dictionary.signup.status.invalid, "error");
      return;
    }

    setSignupStatus(dictionary.signup.status.creating, "info");

    try {
      const session = await postMarketingJson("/auth/signup/company", payload);
      setSignupStatus(dictionary.signup.status.ready, "success");
      const redirectUrl = new URL(opsHref, window.location.origin);
      redirectUrl.searchParams.set("sessionToken", session.token);
      window.location.href = redirectUrl.toString();
    } catch (error) {
      setSignupStatus(error.message || dictionary.signup.status.googleUnavailable, "error");
    }
  })();
}

function prefillSignupFormFromGoogle(payload) {
  if (!signupFormNode) {
    return;
  }

  const [firstName = "", ...rest] = String(payload?.given_name || payload?.name || "").trim().split(" ");
  const lastName = String(payload?.family_name || rest.join(" ") || "").trim();

  if (firstName && !signupFormNode.elements.firstName.value.trim()) {
    signupFormNode.elements.firstName.value = firstName;
  }
  if (lastName && !signupFormNode.elements.lastName.value.trim()) {
    signupFormNode.elements.lastName.value = lastName;
  }
  if (payload?.email && !signupFormNode.elements.email.value.trim()) {
    signupFormNode.elements.email.value = payload.email;
  }
}

function setupGoogleSignup(retryCount = 0) {
  const clientId = String(window.NAAVAL_GOOGLE_CLIENT_ID || "").trim();

  if (!signupGoogleSlot || !signupGoogleButton) {
    return;
  }

  signupGoogleSlot.innerHTML = "";
  signupGoogleButton.classList.add("hidden");

  if (!clientId) {
    signupGoogleButton.classList.remove("hidden");
    return;
  }

  if (!window.google?.accounts?.id) {
    signupGoogleButton.classList.remove("hidden");
    if (retryCount < 10) {
      window.clearTimeout(googleSignupRetryTimer);
      googleSignupRetryTimer = window.setTimeout(() => setupGoogleSignup(retryCount + 1), 400);
    }
    return;
  }

  window.clearTimeout(googleSignupRetryTimer);
  googleSignupRetryTimer = null;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      const payload = decodeJwtPayload(response?.credential);
      const dictionary = getCurrentDictionary();
      if (!payload?.email) {
        setSignupStatus(dictionary.signup.status.googleUnavailable, "error");
        return;
      }

      prefillSignupFormFromGoogle(payload);
      setSignupStatus(dictionary.signup.status.googleFill, "info");
      openSignupModal();
    }
  });

  window.google.accounts.id.renderButton(signupGoogleSlot, {
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "continue_with",
    width: 340
  });
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

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    const value = getNestedValue(dictionary, key);
    if (typeof value === "string") {
      node.setAttribute("placeholder", value);
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

adminLinks.forEach((link) => {
  link.setAttribute("href", hostedAdminHref);
});

signupOpenButtons.forEach((button) => {
  button.addEventListener("click", openSignupModal);
});

signupCloseButtons.forEach((button) => {
  button.addEventListener("click", closeSignupModal);
});

signupFormNode?.addEventListener("submit", handleSignupSubmit);

signupGoogleButton?.addEventListener("click", () => {
  const dictionary = getCurrentDictionary();
  setSignupStatus(dictionary.signup.status.googleUnavailable, "info");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && signupModalNode && !signupModalNode.classList.contains("hidden")) {
    closeSignupModal();
  }
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.language === "en" ? "en" : "fr");
  });
});

applyLanguage(resolveInitialLanguage());
setupGoogleSignup();
