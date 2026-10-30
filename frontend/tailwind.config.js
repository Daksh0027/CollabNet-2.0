/** @type {import('tailwindcss').Config} */
module.exports = {
    // `overline` is a Tailwind utility; without this an app's own eyebrow-label class draws a line above the text.
    blocklist: ["overline"],
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2lg': '10px'
      },
      boxShadow: {
        sidebar: '0 1px 0 0 rgb(0 0 0 / 0.02), 0 1px 12px 0 rgb(0 0 0 / 0.06), 0 0 1px 0 rgb(0 0 0 / 0.32)',
        'nav-selected': '0 0 0 1px oklch(var(--primary)), inset 0 1px 0 0 rgb(255 255 255 / 0.25)'
      },
      fontSize: {
        'body-medium': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'body-regular': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'caption-1-semibold': ['0.75rem', { lineHeight: '1rem', fontWeight: '600' }]
      },
      colors: {
        'background-full': 'oklch(var(--background) / <alpha-value>)',
        'background-primary-default': 'oklch(var(--card) / <alpha-value>)',
        'background-primary-hover': 'oklch(var(--accent) / <alpha-value>)',
        'background-secondary-default': 'oklch(var(--secondary) / <alpha-value>)',
        'background-secondary-hover': 'oklch(var(--secondary) / <alpha-value>)',
        'background-tertiary-default': 'oklch(var(--muted) / <alpha-value>)',
        'background-tertiary-hover': 'oklch(var(--accent) / <alpha-value>)',
        'border-button-default': 'oklch(var(--border) / <alpha-value>)',
        'border-button-white': 'oklch(var(--border) / <alpha-value>)',
        'border-button-hover': 'oklch(var(--ring) / <alpha-value>)',
        'border-button-active': 'oklch(var(--ring) / <alpha-value>)',
        'border-focus-ring': 'oklch(var(--ring) / <alpha-value>)',
        'text-primary': 'oklch(var(--foreground) / <alpha-value>)',
        'text-secondary': 'oklch(var(--muted-foreground) / <alpha-value>)',
        'text-tertiary': 'oklch(var(--muted-foreground) / <alpha-value>)',
        'foreground-icon-secondary': 'oklch(var(--muted-foreground) / <alpha-value>)',
        'foreground-icon-tertiary': 'oklch(var(--muted-foreground) / <alpha-value>)',
        'badge-neutral-background': 'oklch(var(--secondary) / <alpha-value>)',
        'kbd-background': 'oklch(var(--secondary) / <alpha-value>)',
        'kbd-foreground': 'oklch(var(--muted-foreground) / <alpha-value>)',
        accent: {
          400: 'oklch(var(--primary) / <alpha-value>)',
          500: 'oklch(var(--primary) / <alpha-value>)',
          600: 'oklch(var(--primary) / <alpha-value>)',
          DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
          foreground: 'oklch(var(--accent-foreground) / <alpha-value>)'
        },
        background: 'oklch(var(--background) / <alpha-value>)',
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'oklch(var(--card) / <alpha-value>)',
          foreground: 'oklch(var(--card-foreground) / <alpha-value>)'
        },
        popover: {
          DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
          foreground: 'oklch(var(--popover-foreground) / <alpha-value>)'
        },
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-foreground) / <alpha-value>)'
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
          foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)'
        },
        muted: {
          DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
          foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
          foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)'
        },
        border: 'oklch(var(--border) / <alpha-value>)',
        input: 'oklch(var(--input) / <alpha-value>)',
        ring: 'oklch(var(--ring) / <alpha-value>)',
        chart: {
          '1': 'oklch(var(--chart-1) / <alpha-value>)',
          '2': 'oklch(var(--chart-2) / <alpha-value>)',
          '3': 'oklch(var(--chart-3) / <alpha-value>)',
          '4': 'oklch(var(--chart-4) / <alpha-value>)',
          '5': 'oklch(var(--chart-5) / <alpha-value>)'
        },
        sidebar: {
          DEFAULT: 'oklch(var(--sidebar) / <alpha-value>)',
          foreground: 'oklch(var(--sidebar-foreground) / <alpha-value>)',
          primary: 'oklch(var(--sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'oklch(var(--sidebar-primary-foreground) / <alpha-value>)',
          accent: 'oklch(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'oklch(var(--sidebar-accent-foreground) / <alpha-value>)',
          border: 'oklch(var(--sidebar-border) / <alpha-value>)',
          ring: 'oklch(var(--sidebar-ring) / <alpha-value>)'
        }
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};