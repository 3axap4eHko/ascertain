import { defaultTheme } from '@vuepress/theme-default';
import { defineUserConfig } from 'vuepress/cli';
import { viteBundler } from '@vuepress/bundler-vite';

export default defineUserConfig({
  lang: 'en-US',
  base: '/ascertain/',
  title: 'Ascertain',
  description: 'Compiled schema-and-constraint validation for JavaScript-native runtime values.',

  theme: defaultTheme({
    colorMode: 'dark',
    colorModeSwitch: false,
    navbar: [
      { text: 'Home', link: '/' },
      {
        text: 'Guide',
        children: [
          { text: 'Why Ascertain', link: '/why-ascertain.html' },
          { text: 'Ascertain vs Zod', link: '/ascertain-vs-zod.html' },
          { text: 'Ascertain vs AJV', link: '/ascertain-vs-ajv.html' },
          { text: 'Migrate from Zod', link: '/migrate-from-zod.html' },
          { text: 'Benchmarks', link: '/benchmarks.html' },
        ],
      },
      { text: 'GitHub', link: 'https://github.com/3axap4ehko/ascertain' },
    ],
    sidebar: [
      {
        text: 'Guide',
        children: [
          '/',
          '/why-ascertain.html',
          '/ascertain-vs-zod.html',
          '/ascertain-vs-ajv.html',
          '/migrate-from-zod.html',
          '/benchmarks.html',
        ],
      },
    ],
  }),

  bundler: viteBundler(),

  markdown: {
    anchor: {
      slugify: (s) =>
        s
          .replace(/[\s-]+/g, '-')
          .replace(/[^\w-]+/g, '')
          .toLowerCase(),
    },
  },
});
