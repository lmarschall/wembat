import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Wembat",
  description: "Wembat Webauthentication Client Library",
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Demo', link: 'https://demo.wembat.dev' },
      { text: 'Documentation', link: '/introduction' }
    ],

    sidebar: [
      {
        text: 'Wembat',
        items: [
          { text: 'Introduction', link: '/introduction' },
          { text: 'Setup Wembat', link: '/setup' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Client', link: '/client/exports' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lmarschall/wembat' }
    ]
  }
})
