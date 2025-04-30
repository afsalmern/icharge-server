const generateLightColors = (length) => {
    const colors = [];

    for (let i = 0; i < length; i++) {
        const hue = Math.floor((360 / length) * i); // even distribution of hues
        const saturation = 70 + Math.floor(Math.random() * 10); // 70–80%
        const lightness = 75 + Math.floor(Math.random() * 10); // 75–85%

        colors.push(hslToHex(hue, saturation, lightness));
    }

    return colors;
};

const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;

    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) =>
        Math.round(
            255 *
                (l - a * Math.max(-1, Math.min(Math.min(k(n) - 3, 9 - k(n)), 1)))
        ).toString(16).padStart(2, "0");

    return `#${f(0)}${f(8)}${f(4)}`;
};

module.exports = { generateLightColors };
