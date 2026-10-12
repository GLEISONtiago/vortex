import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VÓRTEX — Canal Seguro GCMJP",
    short_name: "VÓRTEX",
    description: "Canal de denúncias e acompanhamento da Guarda Civil Municipal de João Pessoa.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#092940",
    theme_color: "#092940",
    icons: [
      { src: "/gcmjp-logo-clean.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}
