import { defaultTheme } from '@vuepress/theme-default';
import { defineUserConfig } from 'vuepress/cli';
import { viteBundler } from '@vuepress/bundler-vite';

export default defineUserConfig({
  lang: 'en-US',
  base: '/ascertain/',
  title: 'Ascertain',
  description: '0-Deps, simple, blazing fast, for browser and Node.js object schema validator',

  theme: defaultTheme({
    colorMode: 'dark',
    colorModeSwitch: false,
    navbar: [
      { text: 'Home', link: '/' },
      { text: 'GitHub', link: 'https://github.com/3axap4ehko/evnty' },
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
