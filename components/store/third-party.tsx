import Script from "next/script";
import { env } from "@/lib/env";
import { VercelAnalytics } from "./vercel-analytics";

/**
 * Optional third-party analytics, enabled only when their env variables are
 * set. Loaded with `lazyOnload` so they never affect Core Web Vitals.
 */
export function ThirdPartyAnalytics() {
  return (
    <>
      {env.ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${env.ga4Id}`} strategy="lazyOnload" />
          <Script id="ga4" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${env.ga4Id}');`}
          </Script>
        </>
      )}
      {env.metaPixelId && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${env.metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}
      {env.vercelAnalytics && <VercelAnalytics />}
    </>
  );
}
