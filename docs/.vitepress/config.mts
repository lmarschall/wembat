import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Wembat",
  description: "Wembat Webauthentication Client Library",
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Demo', link: 'https://github.com/lmarschall/wembat' },
      { text: 'Documentation', link: '/getting-started' }
    ],

    sidebar: [
      {
        text: 'Wembat',
        items: [
          { text: 'Introduction', link: '/introduction' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Client', link: '/client/index' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lmarschall/wembat' }
    ]
  }
})
