/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
	  "./app/**/*.{js,ts,jsx,tsx,mdx}",
	  "./pages/**/*.{js,ts,jsx,tsx,mdx}",
	  "./components/**/*.{js,ts,jsx,tsx,mdx}",
	],
	darkMode: ["class", "class"],
	theme: {
	  extend: {
		animation: {
		  "meteor-effect": "meteor 5s linear infinite",
		},
		keyframes: {
		  meteor: {
			"0%": { 
			  transform: "rotate(215deg) translateX(0)",
			  opacity: 1
			},
			"70%": { 
			  opacity: 1
			},
			"100%": {
			  transform: "rotate(215deg) translateX(-500px)",
			  opacity: 0
			},
		  },
		},
	  },
	},
	plugins: [],
  };