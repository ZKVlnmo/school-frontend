// tailwind.config.js
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        require("daisyui")
    ],
    daisyui: {
        themes: ["light"],      // только светлая тема
        styled: true,           // включить стилизованные компоненты
        base: true,             // включить базовые стили (reset)
        utils: true,            // включить утилиты (text-error, bg-base-100 и т.д.)
        logs: false,
        themeStrategy: "modern" // или можно не указывать — по умолчанию modern
    }
}