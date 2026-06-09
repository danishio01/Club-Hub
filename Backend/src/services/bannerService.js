import { createCanvas } from 'canvas';

const THEMES = [
    {
        name: 'Modern Gradient',
        bg: (ctx) => {
            const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(1, '#3b0764');
            return grad;
        },
        primaryText: '#ffffff',
        accentText: '#f472b6',
        boxBg: 'rgba(255, 255, 255, 0.05)',
        boxBorder: 'rgba(244, 114, 182, 0.3)'
    },
    {
        name: 'Geometric',
        bg: (ctx) => {
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(0, 0, 1080, 1080);
            ctx.fillStyle = '#312e81';
            ctx.beginPath();
            ctx.arc(1080, 0, 600, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4338ca';
            ctx.beginPath();
            ctx.moveTo(0, 1080);
            ctx.lineTo(500, 1080);
            ctx.lineTo(0, 500);
            ctx.fill();
            return 'transparent';
        },
        primaryText: '#f8fafc',
        accentText: '#fbcfe8',
        boxBg: 'rgba(0, 0, 0, 0.4)',
        boxBorder: '#8b5cf6'
    },
    {
        name: 'Corporate',
        bg: (ctx) => {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, 1080, 1080);
            const grad = ctx.createLinearGradient(0, 0, 0, 350);
            grad.addColorStop(0, '#1e293b');
            grad.addColorStop(1, '#0f172a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1080, 350);
            return 'transparent';
        },
        primaryText: '#0f172a',
        accentText: '#e2e8f0',
        boxBg: '#ffffff',
        boxBorder: '#cbd5e1',
        isCorporate: true
    },
    {
        name: 'Minimal',
        bg: () => '#fafafa',
        primaryText: '#171717',
        accentText: '#db2777',
        boxBg: '#ffffff',
        boxBorder: '#e5e5e5'
    },
    {
        name: 'Tech',
        bg: (ctx) => {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1080, 1080);
            ctx.strokeStyle = '#166534';
            ctx.lineWidth = 1;
            for(let i=0; i<1080; i+=40) {
                ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,1080); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(1080,i); ctx.stroke();
            }
            return 'transparent';
        },
        primaryText: '#4ade80',
        accentText: '#ffffff',
        boxBg: 'rgba(22, 101, 52, 0.2)',
        boxBorder: '#22c55e'
    }
];

export const generatePosterBuffer = async (event) => {
    const categoryText = event.tags && event.tags.length > 0 
        ? event.tags.slice(0, 2).join(' | ').toUpperCase() 
        : 'OFFICIAL CAMPUS EVENT';

    const themeIndex = Math.floor(Math.random() * THEMES.length);
    const theme = THEMES[themeIndex];

    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d');
    
    const bgFill = theme.bg(ctx);
    if (bgFill !== 'transparent') {
        ctx.fillStyle = bgFill;
        ctx.fillRect(0, 0, 1080, 1080);
    }

    const safeTop = 150;

    ctx.font = 'italic 36px Arial';
    ctx.fillStyle = theme.accentText;
    ctx.textAlign = 'center';
    ctx.fillText(categoryText, 540, safeTop);

    ctx.font = 'bold 70px Arial';
    ctx.fillStyle = theme.isCorporate ? '#ffffff' : theme.primaryText;
    
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

    const lineHeight = 85;
    let startY = 250;
    
    for (const line of lines) {
        ctx.fillText(line, 540, startY);
        startY += lineHeight;
    }

    ctx.font = '40px Arial';
    ctx.fillStyle = theme.isCorporate ? '#0f172a' : (theme.primaryText === '#ffffff' ? '#94a3b8' : '#64748b');
    ctx.fillText(`Presented by ${event.club.name}`, 540, startY + 40);

    ctx.fillStyle = theme.boxBg;
    ctx.fillRect(90, 680, 900, 350);
    ctx.strokeStyle = theme.boxBorder;
    ctx.lineWidth = 4;
    ctx.strokeRect(90, 680, 900, 350);

    ctx.font = '36px Arial';
    ctx.fillStyle = theme.primaryText;
    ctx.fillText(`Date: ${new Date(event.date).toLocaleDateString()}`, 540, 740);
    ctx.fillText(`Time: ${event.time}`, 540, 800);
    ctx.fillText(`Venue: ${event.venue}`, 540, 860);

    const feeText = event.eventType === 'Free' ? 'FREE ENTRY' : `ENTRY FEE: ₹${event.price}`;
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = theme.isCorporate ? '#2563eb' : theme.accentText;
    ctx.fillText(feeText, 540, 930);

    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = theme.primaryText;
    ctx.fillText('REGISTER NOW ON CLUBHUB', 540, 990);

    return canvas.toBuffer('image/png');
};