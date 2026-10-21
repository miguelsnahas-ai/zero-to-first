/* =============================================================
   ANALYTICS (PostHog), compartilhado por todas as páginas do site
   -------------------------------------------------------------
   Preencha POSTHOG_KEY com a "Project API key" (começa com phc_) e
   POSTHOG_HOST com a região do projeto:
     EUA:    https://us.i.posthog.com
     Europa: https://eu.i.posthog.com
   Com a chave vazia, nada é carregado.

   O que é medido:
   - $pageview / $pageleave em cada página (acessos, origem, dispositivo)
   - cliques e navegação (autocapture)
   - eventos do site que já existem em window.dataLayer:
       cta_click           { cta, destination }   cliques em botões com data-cta
       schedule_completed                         agendamento concluído no Calendly
       lead_submit         { form }               envio do formulário da Mesa de Trabalho
       lead_success        { form }               cadastro gravado com sucesso
   Nenhum dado digitado no formulário (nome, e-mail, WhatsApp) é enviado.
   ============================================================= */
(function () {
  var POSTHOG_KEY = "";
  var POSTHOG_HOST = "https://us.i.posthog.com";

  window.dataLayer = window.dataLayer || [];
  if (!/^phc_\w+/.test(POSTHOG_KEY)) return;

  /* Snippet oficial do PostHog (carrega o SDK de forma assíncrona) */
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags onFeatureFlags onSessionId identify setPersonProperties group resetGroups reset get_distinct_id get_session_id alias set_config startSessionRecording stopSessionRecording opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  window.posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: { maskAllInputs: true }
  });

  // Página (principal, mesa de trabalho, legal) como propriedade de todos os eventos
  var path = location.pathname;
  window.posthog.register({
    site_page: /\/toolkit\/?/.test(path) ? "mesa_de_trabalho" : /privacidade|termos/.test(path) ? "legal" : "principal"
  });

  // Encaminha os eventos do dataLayer (já existentes e futuros) para o PostHog
  var FORWARD = { cta_click: 1, schedule_completed: 1, lead_submit: 1, lead_success: 1 };
  function forward(item) {
    if (!item || !FORWARD[item.event]) return;
    var props = {};
    for (var k in item) if (k !== "event") props[k] = item[k];
    window.posthog.capture(item.event, props);
  }
  var dl = window.dataLayer;
  for (var i = 0; i < dl.length; i++) forward(dl[i]);
  var push = dl.push;
  dl.push = function () {
    for (var j = 0; j < arguments.length; j++) forward(arguments[j]);
    return push.apply(dl, arguments);
  };
})();
