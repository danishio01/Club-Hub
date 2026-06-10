import { createCanvas, loadImage } from 'canvas';

const LOGO_URLS = {
    left: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/CSE%20logo.jpg.jpeg?updatedAt=1781065495986',
    center: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/Gopalan%20Foundation%20heraldic%20crest.png?updatedAt=1781065667478',
    right: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/cseaimllogo.png?updatedAt=1781065578612'
};

let cachedLogos = null;

const loadLogos = async () => {
    if (cachedLogos) return cachedLogos;
    try {
        const [left, center, right] = await Promise.all([
            loadImage(LOGO_URLS.left),
            loadImage(LOGO_URLS.center),
            loadImage(LOGO_URLS.right)
        ]);
        cachedLogos = { left, center, right };
        return cachedLogos;
    } catch (err) {
        console.error("Failed to load header logos", err);
        return null;
    }
};

const THEMES = [
    {
        name: 'Midnight Purple',
        bg: (ctx) => {
            const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(1, '#3b0764');
            return grad;
        },
        primaryText: '#ffffff',
        accentText: '#f472b6',
        boxBg: 'rgba(0, 0, 0, 0.4)',
        boxBorder: 'rgba(244, 114, 182, 0.5)',
        logoBg: 'rgba(255, 255, 255, 0.05)'
    },
    {
        name: 'Clean White',
        bg: () => '#ffffff',
        primaryText: '#0f172a',
        accentText: '#2563eb',
        boxBg: '#f8fafc',
        boxBorder: '#cbd5e1',
        logoBg: 'transparent'
    },
    {
        name: 'Emerald Dark',
        bg: (ctx) => {
            const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
            grad.addColorStop(0, '#064e3b');
            grad.addColorStop(1, '#022c22');
            return grad;
        },
        primaryText: '#f8fafc',
        accentText: '#34d399',
        boxBg: 'rgba(0, 0, 0, 0.4)',
        boxBorder: '#10b981',
        logoBg: 'rgba(255, 255, 255, 0.05)'
    },
    {
        name: 'Crimson Slate',
        bg: (ctx) => {
            const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
            grad.addColorStop(0, '#1e293b');
            grad.addColorStop(1, '#7f1d1d');
            return grad;
        },
        primaryText: '#ffffff',
        accentText: '#fca5a5',
        boxBg: 'rgba(0, 0, 0, 0.5)',
        boxBorder: '#f87171',
        logoBg: 'rgba(255, 255, 255, 0.05)'
    },
    {
        name: 'Ocean Blue',
        bg: (ctx) => {
            const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
            grad.addColorStop(0, '#1e3a8a');
            grad.addColorStop(1, '#172554');
            return grad;
        },
        primaryText: '#ffffff',
        accentText: '#93c5fd',
        boxBg: 'rgba(255, 255, 255, 0.1)',
        boxBorder: '#60a5fa',
        logoBg: 'rgba(255, 255, 255, 0.05)'
    }
];

let lastThemeIndex = -1;

export const generatePosterBuffer = async (event) => {
    const logos = await loadLogos();

    let themeIndex;
    do {
        themeIndex = Math.floor(Math.random() * THEMES.length);
    } while (themeIndex === lastThemeIndex && THEMES.length > 1);
    lastThemeIndex = themeIndex;

    const theme = THEMES[themeIndex];

    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d');
    
    const bgFill = theme.bg(ctx);
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, 1080, 1080);

    if (theme.logoBg !== 'transparent') {
        ctx.fillStyle = theme.logoBg;
        ctx.fillRect(0, 0, 1080, 220);
    }

    if (logos) {
        ctx.drawImage(logos.left, 60, 40, 140, 140);
        
        const centerWidth = 150;
        const centerHeight = 150;
        ctx.drawImage(logos.center, (1080 - centerWidth) / 2, 35, centerWidth, centerHeight);
        
        ctx.drawImage(logos.right, 1080 - 60 - 140, 40, 140, 140);
    }

    const categoryText = event.tags && event.tags.length > 0 
        ? event.tags.slice(0, 2).join(' | ').toUpperCase() 
        : 'OFFICIAL CAMPUS EVENT';

    ctx.font = 'italic 32px Arial';
    ctx.fillStyle = theme.accentText;
    ctx.textAlign = 'center';
    ctx.fillText(categoryText, 540, 270);

    ctx.font = 'bold 65px Arial';
    ctx.fillStyle = theme.primaryText;
    
    const words = event.title.toUpperCase().split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let n = 0; n < words.length; n++) {
        const testLine = currentLine + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 900 && n > 0) {
            lines.push(currentLine.trim());
            currentLine = words[n] + ' ';
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());

    const lineHeight = 80;
    let startY = 350;
    
    for (const line of lines) {
        ctx.fillText(line, 540, startY);
        startY += lineHeight;
    }

    ctx.font = '36px Arial';
    ctx.fillStyle = theme.primaryText === '#ffffff' ? '#cbd5e1' : '#475569';
    ctx.fillText(`Presented by ${event.club.name}`, 540, startY + 20);

    ctx.fillStyle = theme.boxBg;
    ctx.fillRect(90, 640, 900, 390);
    ctx.strokeStyle = theme.boxBorder;
    ctx.lineWidth = 4;
    ctx.strokeRect(90, 640, 900, 390);

    ctx.font = '34px Arial';
    ctx.fillStyle = theme.primaryText;
    ctx.fillText(`Date: ${new Date(event.date).toLocaleDateString()}`, 540, 700);
    ctx.fillText(`Time: ${event.time}`, 540, 760);
    ctx.fillText(`Venue: ${event.venue}`, 540, 820);

    const feeText = event.eventType === 'Free' ? 'FREE ENTRY' : `ENTRY FEE: ₹${event.price}`;
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = theme.accentText;
    ctx.fillText(feeText, 540, 880);

    ctx.font = '32px Arial';
    ctx.fillStyle = theme.primaryText;
    ctx.fillText(`Capacity: ${event.maxParticipants} Students`, 540, 940);

    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = theme.primaryText;
    ctx.fillText('REGISTER NOW ON CLUBHUB', 540, 1000);

    return canvas.toBuffer('image/png');
};