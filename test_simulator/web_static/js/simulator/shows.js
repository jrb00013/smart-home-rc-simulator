/**
 * TV Simulator – all draw* content (Home, apps, TV shows, boot sequence).
 * Depends: globals (getTVShow, tvShows), utils (Easing).
 */
function drawHomeScreen(ctx, canvas, brightness, time, state) {
    // Animated gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const baseColor = { r: 26, g: 26, b: 46 };
    const animPhase = Math.sin(time * 0.5) * 0.1;
    gradient.addColorStop(0, `rgba(${baseColor.r + animPhase * 20}, ${baseColor.g + animPhase * 20}, ${baseColor.b + animPhase * 30}, ${brightness})`);
    gradient.addColorStop(1, `rgba(${baseColor.r - animPhase * 10}, ${baseColor.g - animPhase * 10}, ${baseColor.b - animPhase * 10}, ${brightness * 0.8})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated grid of app icons
    const gridCols = 4;
    const gridRows = 3;
    const iconSize = 80;
    const spacing = 20;
    const startX = (canvas.width - (gridCols * (iconSize + spacing) - spacing)) / 2;
    const startY = (canvas.height - (gridRows * (iconSize + spacing) - spacing)) / 2;
    
    const apps = ['YouTube', 'Netflix', 'Prime', 'HBO', 'Music', 'Games', 'Settings', 'Photos', 'Weather', 'News', 'Sports', 'Kids'];
    const appColors = [
        { r: 255, g: 0, b: 0 },      // YouTube
        { r: 229, g: 9, b: 20 },      // Netflix
        { r: 0, g: 168, b: 225 },     // Prime
        { r: 128, g: 0, b: 128 },     // HBO
        { r: 255, g: 165, b: 0 },     // Music
        { r: 76, g: 175, b: 80 },     // Games
        { r: 158, g: 158, b: 158 },   // Settings
        { r: 33, g: 150, b: 243 },    // Photos
        { r: 255, g: 152, b: 0 },     // Weather
        { r: 244, g: 67, b: 54 },     // News
        { r: 233, g: 30, b: 99 },     // Sports
        { r: 156, g: 39, b: 176 }     // Kids
    ];
    
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const index = row * gridCols + col;
            if (index >= apps.length) break;
            
            const x = startX + col * (iconSize + spacing);
            const y = startY + row * (iconSize + spacing);
            
            // Animated pulse effect
            const pulse = Math.sin(time * 2 + index * 0.5) * 0.1 + 1;
            const iconBrightness = brightness * (0.8 + pulse * 0.2);
            
            // Icon background with glow
            const color = appColors[index];
            const glowGradient = ctx.createRadialGradient(x + iconSize/2, y + iconSize/2, 0, x + iconSize/2, y + iconSize/2, iconSize/2);
            glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${iconBrightness * 0.8})`);
            glowGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${iconBrightness * 0.2})`);
            ctx.fillStyle = glowGradient;
            ctx.fillRect(x, y, iconSize, iconSize);
            
            // Icon border
            ctx.strokeStyle = `rgba(255, 255, 255, ${iconBrightness * 0.5})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 5, y + 5, iconSize - 10, iconSize - 10);
            
            // App name
            ctx.fillStyle = `rgba(255, 255, 255, ${iconBrightness})`;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(apps[index], x + iconSize/2, y + iconSize/2);
        }
    }
    
    // Animated particles in background
    for (let i = 0; i < 20; i++) {
        const phase = (time * 0.5 + i * 0.3) % (Math.PI * 2);
        const x = (Math.sin(phase) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(phase * 1.3) * 0.5 + 0.5) * canvas.height;
        const alpha = (Math.sin(phase) + 1) * 0.5 * brightness * 0.3;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawYouTubeContent(ctx, canvas, brightness, time, state) {
    // Red gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(255, 0, 0, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(200, 0, 0, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // YouTube logo area
    ctx.save();
    ctx.translate(canvas.width / 2, 100);
    ctx.scale(1 + Math.sin(time * 2) * 0.05, 1);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YouTube', 0, 0);
    ctx.restore();
    
    // Video thumbnail grid
    const thumbCols = 3;
    const thumbRows = 2;
    const thumbWidth = 140;
    const thumbHeight = 100;
    const thumbSpacing = 15;
    const startX = (canvas.width - (thumbCols * (thumbWidth + thumbSpacing) - thumbSpacing)) / 2;
    const startY = 180;
    
    for (let row = 0; row < thumbRows; row++) {
        for (let col = 0; col < thumbCols; col++) {
            const x = startX + col * (thumbWidth + thumbSpacing);
            const y = startY + row * (thumbHeight + thumbSpacing);
            
            // Thumbnail background (simulating video)
            const animPhase = (time * 0.3 + (row * thumbCols + col) * 0.5) % (Math.PI * 2);
            const thumbBrightness = brightness * (0.6 + Math.sin(animPhase) * 0.2);
            
            // Video-like gradient
            const thumbGradient = ctx.createLinearGradient(x, y, x, y + thumbHeight);
            thumbGradient.addColorStop(0, `rgba(40, 40, 40, ${thumbBrightness})`);
            thumbGradient.addColorStop(0.5, `rgba(60, 60, 60, ${thumbBrightness})`);
            thumbGradient.addColorStop(1, `rgba(30, 30, 30, ${thumbBrightness})`);
            ctx.fillStyle = thumbGradient;
            ctx.fillRect(x, y, thumbWidth, thumbHeight);
            
            // Play button overlay
            ctx.fillStyle = `rgba(255, 255, 255, ${thumbBrightness * 0.8})`;
            ctx.beginPath();
            ctx.arc(x + thumbWidth/2, y + thumbHeight/2, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Play triangle
            ctx.fillStyle = `rgba(255, 0, 0, ${thumbBrightness})`;
            ctx.beginPath();
            ctx.moveTo(x + thumbWidth/2 - 8, y + thumbHeight/2 - 12);
            ctx.lineTo(x + thumbWidth/2 - 8, y + thumbHeight/2 + 12);
            ctx.lineTo(x + thumbWidth/2 + 12, y + thumbHeight/2);
            ctx.closePath();
            ctx.fill();
            
            // Duration badge
            ctx.fillStyle = `rgba(0, 0, 0, ${thumbBrightness * 0.7})`;
            ctx.fillRect(x + thumbWidth - 50, y + thumbHeight - 25, 45, 20);
            ctx.fillStyle = `rgba(255, 255, 255, ${thumbBrightness})`;
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.floor(animPhase * 10)}:${Math.floor(animPhase * 60) % 60}`, x + thumbWidth - 5, y + thumbHeight - 10);
        }
    }
    
    // Animated progress bar at bottom
    const progressWidth = canvas.width * 0.8;
    const progressHeight = 4;
    const progressX = (canvas.width - progressWidth) / 2;
    const progressY = canvas.height - 40;
    const progress = (time * 0.1) % 1;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
    ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.fillRect(progressX, progressY, progressWidth * progress, progressHeight);
}

function drawNetflixContent(ctx, canvas, brightness, time, state) {
    // Dark background with Netflix red accent
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(20, 20, 20, ${brightness})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.9})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Netflix logo
    ctx.fillStyle = `rgba(229, 9, 20, ${brightness})`;
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NETFLIX', canvas.width / 2, 80);
    
    // Featured content banner
    const bannerHeight = 180;
    const bannerY = 120;
    const bannerGradient = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerHeight);
    bannerGradient.addColorStop(0, `rgba(229, 9, 20, ${brightness * 0.6})`);
    bannerGradient.addColorStop(1, `rgba(150, 0, 0, ${brightness * 0.4})`);
    ctx.fillStyle = bannerGradient;
    ctx.fillRect(0, bannerY, canvas.width, bannerHeight);
    
    // Featured title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Featured Title', canvas.width / 2, bannerY + 60);
    ctx.font = '18px Arial';
    ctx.fillText('Watch Now', canvas.width / 2, bannerY + 100);
    
    // Content row
    const cardWidth = 100;
    const cardHeight = 140;
    const cardSpacing = 15;
    const startX = (canvas.width - (4 * (cardWidth + cardSpacing) - cardSpacing)) / 2;
    const startY = bannerY + bannerHeight + 20;
    
    for (let i = 0; i < 4; i++) {
        const x = startX + i * (cardWidth + cardSpacing);
        const y = startY;
        
        // Card with animated shimmer
        const shimmer = Math.sin(time * 2 + i) * 0.1 + 0.9;
        const cardBrightness = brightness * shimmer;
        
        // Card gradient
        const cardGradient = ctx.createLinearGradient(x, y, x, y + cardHeight);
        cardGradient.addColorStop(0, `rgba(40, 40, 40, ${cardBrightness})`);
        cardGradient.addColorStop(1, `rgba(20, 20, 20, ${cardBrightness})`);
        ctx.fillStyle = cardGradient;
        ctx.fillRect(x, y, cardWidth, cardHeight);
        
        // Card border
        ctx.strokeStyle = `rgba(229, 9, 20, ${cardBrightness * 0.5})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, cardWidth - 4, cardHeight - 4);
        
        // Title placeholder
        ctx.fillStyle = `rgba(255, 255, 255, ${cardBrightness * 0.6})`;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Title ${i + 1}`, x + cardWidth/2, y + cardHeight - 20);
    }
}

function drawPrimeContent(ctx, canvas, brightness, time, state) {
    // Blue gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(0, 168, 225, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(0, 120, 180, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Prime logo
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PRIME VIDEO', canvas.width / 2, 80);
    
    // Content cards with animation
    const cardWidth = 120;
    const cardHeight = 160;
    const cardSpacing = 20;
    const startX = (canvas.width - (3 * (cardWidth + cardSpacing) - cardSpacing)) / 2;
    const startY = 130;
    
    for (let i = 0; i < 3; i++) {
        const x = startX + i * (cardWidth + cardSpacing);
        const y = startY + Math.sin(time + i) * 5; // Subtle float animation
        
        // Card
        const cardBrightness = brightness * (0.85 + Math.sin(time * 2 + i) * 0.15);
        ctx.fillStyle = `rgba(20, 40, 60, ${cardBrightness})`;
        ctx.fillRect(x, y, cardWidth, cardHeight);
        
        // Card highlight
        ctx.fillStyle = `rgba(0, 168, 225, ${cardBrightness * 0.6})`;
        ctx.fillRect(x, y, cardWidth, 30);
        
        // Play icon
        ctx.fillStyle = `rgba(255, 255, 255, ${cardBrightness})`;
        ctx.beginPath();
        ctx.arc(x + cardWidth/2, y + cardHeight/2, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(0, 168, 225, ${cardBrightness})`;
        ctx.beginPath();
        ctx.moveTo(x + cardWidth/2 - 8, y + cardHeight/2 - 12);
        ctx.lineTo(x + cardWidth/2 - 8, y + cardHeight/2 + 12);
        ctx.lineTo(x + cardWidth/2 + 12, y + cardHeight/2);
        ctx.closePath();
        ctx.fill();
    }
}

function drawHBOMaxContent(ctx, canvas, brightness, time, state) {
    // Purple gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(128, 0, 128, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(80, 0, 80, ${brightness * 0.5})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // HBO Max logo
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 45px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HBO MAX', canvas.width / 2, 80);
    
    // Featured content
    const featuredHeight = 200;
    const featuredGradient = ctx.createLinearGradient(0, 100, 0, 100 + featuredHeight);
    featuredGradient.addColorStop(0, `rgba(100, 0, 100, ${brightness * 0.8})`);
    featuredGradient.addColorStop(1, `rgba(50, 0, 50, ${brightness * 0.6})`);
    ctx.fillStyle = featuredGradient;
    ctx.fillRect(0, 100, canvas.width, featuredHeight);
    
    // Featured title with glow
    ctx.shadowColor = `rgba(255, 255, 255, ${brightness * 0.5})`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 36px Arial';
    ctx.fillText('Featured Series', canvas.width / 2, 180);
    ctx.shadowBlur = 0;
    
    // Content grid
    const gridCols = 4;
    const gridRows = 2;
    const itemWidth = 100;
    const itemHeight = 120;
    const itemSpacing = 15;
    const gridStartX = (canvas.width - (gridCols * (itemWidth + itemSpacing) - itemSpacing)) / 2;
    const gridStartY = 320;
    
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const x = gridStartX + col * (itemWidth + itemSpacing);
            const y = gridStartY + row * (itemHeight + itemSpacing);
            
            const itemBrightness = brightness * (0.7 + Math.sin(time + row + col) * 0.2);
            ctx.fillStyle = `rgba(60, 0, 60, ${itemBrightness})`;
            ctx.fillRect(x, y, itemWidth, itemHeight);
            
            ctx.strokeStyle = `rgba(200, 0, 200, ${itemBrightness * 0.5})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, itemWidth - 4, itemHeight - 4);
        }
    }
}

function drawDefaultContent(ctx, canvas, brightness, time, state) {
    // Default animated background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const phase = time * 0.3;
    gradient.addColorStop(0, `rgba(30, 30, 50, ${brightness})`);
    gradient.addColorStop(0.5, `rgba(50, 30, 70, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(30, 30, 50, ${brightness})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated circles
    for (let i = 0; i < 5; i++) {
        const radius = 30 + Math.sin(time + i) * 10;
        const x = canvas.width / 2 + Math.cos(time * 0.5 + i) * 100;
        const y = canvas.height / 2 + Math.sin(time * 0.5 + i) * 80;
        const alpha = brightness * (0.2 + Math.sin(time + i) * 0.1);
        
        ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // App name
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.current_app || 'Home', canvas.width / 2, canvas.height / 2);
}

// Draw TV Show Content - Multiple different shows with unique visuals
function drawTVShowContent(ctx, canvas, brightness, time, state, tvShow) {
    const showType = tvShow.type;
    const showColor = tvShow.color;
    
    // Route to specific show type renderer
    switch(showType) {
        case 'news':
            drawNewsShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'sports':
            drawSportsShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'drama':
            drawDramaShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'comedy':
            drawComedyShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'movie':
            drawMovieShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'cartoon':
            drawCartoonShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'music':
            drawMusicShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'weather':
            drawWeatherShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'horror':
            drawHorrorShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'documentary':
            drawDocumentaryShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'bigreddog':
            drawBigRedDogShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'pabst':
            drawPabstShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'lifeguard':
            drawLifeguardShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'cups':
            drawCupsShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'trashcan':
            drawTrashCanShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'lochness':
            drawLochNessShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'banana':
            drawBananaShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'driving':
            drawDrivingShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'oceanvolcano':
            drawOceanVolcanoShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'fridgeplanet':
            drawFridgePlanetShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'toaster':
            drawToasterShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'clouds':
            drawCloudsShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'paint':
            drawPaintShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'rubberduck':
            drawRubberDuckShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'revolutionary':
            drawRevolutionaryShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        default:
            drawGeneralTVShow(ctx, canvas, brightness, time, state, tvShow);
    }
}

// Reality Breach – fourth-wall, glitch, "the TV is watching"
function drawRevolutionaryShow(ctx, canvas, brightness, time, state, tvShow) {
    const phase = time * 0.3;
    const flicker = Math.sin(time * 40) * 0.5 + 0.5;
    const intrusion = Math.floor(phase) % 4;
    ctx.fillStyle = `rgba(10, 0, 20, ${brightness})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Chromatic bleed
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `rgba(255, 0, 255, ${0.15 * brightness * flicker})`);
    gradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.1 * brightness})`);
    gradient.addColorStop(1, `rgba(255, 255, 0, ${0.15 * brightness * flicker})`);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.4 + Math.sin(time * 3) * 0.2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    // Fourth-wall messages
    const messages = [
        'SIGNAL INTRUSION',
        'YOU ARE BEING WATCHED',
        'REALITY BREACH',
        'CHANNEL 0',
    ];
    ctx.save();
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * (0.8 + flicker * 0.2)})`;
    ctx.shadowColor = 'magenta';
    ctx.shadowBlur = 20;
    ctx.fillText(messages[intrusion] || messages[0], canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '16px monospace';
    ctx.fillStyle = `rgba(200, 200, 255, ${brightness * 0.7})`;
    ctx.fillText('THE SIMULATOR IS THE MESSAGE', canvas.width / 2, canvas.height / 2 + 20);
    ctx.restore();
    // Scan chaos
    ctx.strokeStyle = `rgba(255, 0, 255, ${0.3 * brightness * flicker})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
        const y = (canvas.height * 0.3 + Math.sin(time + i) * 50 + i * 25) % canvas.height;
        const offset = Math.sin(time * 2 + i * 0.5) * 30;
        ctx.beginPath();
        ctx.moveTo(0 + offset, y);
        ctx.lineTo(canvas.width + offset, y);
        ctx.stroke();
    }
    ctx.fillStyle = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.9})`;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height - 30);
}

// News Show - Breaking news style
function drawNewsShow(ctx, canvas, brightness, time, state, tvShow) {
    // News background with scrolling ticker
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.5}, ${tvShow.color.g * 0.5}, ${tvShow.color.b * 0.5}, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // News desk area
    ctx.fillStyle = `rgba(50, 50, 50, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // News anchor area
    ctx.fillStyle = `rgba(100, 100, 100, ${brightness * 0.6})`;
    ctx.fillRect(canvas.width * 0.2, canvas.height * 0.65, canvas.width * 0.6, canvas.height * 0.3);
    
    // Breaking news banner
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.fillRect(0, 0, canvas.width, 60);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BREAKING NEWS', canvas.width / 2, 40);
    
    // Scrolling news ticker
    const tickerY = canvas.height - 30;
    const tickerText = `${tvShow.name} - Latest updates and breaking news stories...`;
    const tickerX = (canvas.width - (time * 50) % (canvas.width + 200)) % (canvas.width + 200);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = '20px Arial';
    ctx.fillText(tickerText, tickerX, tickerY);
    
    // News headlines
    const headlines = [
        'Major Development in Technology',
        'Weather Alert Issued',
        'Sports Update',
        'Business Report'
    ];
    ctx.font = 'bold 24px Arial';
    headlines.forEach((headline, i) => {
        const y = 100 + i * 40;
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * (0.7 + Math.sin(time + i) * 0.2)})`;
        ctx.fillText(`• ${headline}`, canvas.width / 2, y);
    });
}

// Sports Show - Live game style
function drawSportsShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sports field background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(0, ${tvShow.color.g}, 0, ${brightness * 0.8})`);
    gradient.addColorStop(0.5, `rgba(0, ${tvShow.color.g * 0.7}, 0, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(0, ${tvShow.color.g * 0.5}, 0, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Field lines
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
    
    // Score display
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.8})`;
    ctx.fillRect(canvas.width / 2 - 150, 20, 300, 80);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 36px Arial';
    ctx.fillText('HOME 24 - 18 AWAY', canvas.width / 2, 70);
    
    // Live indicator
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(30, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 16px Arial';
    ctx.fillText('LIVE', 45, 35);
    
    // Animated players (circles)
    for (let i = 0; i < 10; i++) {
        const team = i < 5 ? 1 : -1;
        const x = canvas.width / 2 + team * (100 + Math.sin(time + i) * 30);
        const y = canvas.height / 2 + (Math.cos(time * 0.5 + i) * 60);
        const color = team > 0 ? { r: 255, g: 0, b: 0 } : { r: 0, g: 0, b: 255 };
        
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${brightness * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Show name
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.9})`;
    ctx.font = 'bold 28px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height - 40);
}

// Drama Show - Cinematic style
function drawDramaShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark cinematic background
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
    );
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.9})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Character silhouettes
    for (let i = 0; i < 3; i++) {
        const x = canvas.width * (0.2 + i * 0.3);
        const y = canvas.height * 0.7;
        const scale = 0.8 + Math.sin(time + i) * 0.1;
        
        ctx.fillStyle = `rgba(50, 50, 50, ${brightness * 0.7})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 40 * scale, 80 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Show title with dramatic effect
    ctx.shadowColor = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.8})`;
    ctx.shadowBlur = 30;
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2 - 50);
    ctx.shadowBlur = 0;
    
    // Episode info
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness * 0.8})`;
    ctx.font = '20px Arial';
    ctx.fillText('Season 3 • Episode 12', canvas.width / 2, canvas.height / 2);
    
    // Subtle particles
    for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time * 0.5 + i) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.3 + i) * 0.5 + 0.5) * canvas.height;
        const alpha = (Math.sin(time + i) + 1) * 0.5 * brightness * 0.3;
        ctx.fillStyle = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Comedy Show - Bright and colorful
function drawComedyShow(ctx, canvas, brightness, time, state, tvShow) {
    // Bright colorful background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.9})`);
    gradient.addColorStop(0.5, `rgba(${tvShow.color.r * 0.8}, ${tvShow.color.g * 0.8}, ${tvShow.color.b * 0.8}, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.6}, ${tvShow.color.g * 0.6}, ${tvShow.color.b * 0.6}, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated comedy accents
    const accents = ['Ha', 'Ha', 'Ha', 'Ha', 'Ha'];
    for (let i = 0; i < 5; i++) {
        const x = canvas.width * (0.1 + i * 0.2) + Math.sin(time + i) * 20;
        const y = canvas.height * 0.3 + Math.cos(time * 0.7 + i) * 30;
        const scale = 1 + Math.sin(time * 2 + i) * 0.2;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.font = `bold ${36 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(accents[i % accents.length], 0, 0);
        ctx.restore();
    }
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 36px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2);
    
    // Laugh track indicator
    ctx.fillStyle = `rgba(255, 200, 0, ${brightness * 0.8})`;
    ctx.font = '20px Arial';
    ctx.fillText('LAUGH TRACK', canvas.width / 2, canvas.height / 2 + 40);
}

// Movie Show - Cinema style
function drawMovieShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark movie theater background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${brightness * 0.95})`);
    gradient.addColorStop(0.5, `rgba(${tvShow.color.r * 0.3}, ${tvShow.color.g * 0.3}, ${tvShow.color.b * 0.3}, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.95})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Movie screen effect
    ctx.fillStyle = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.6})`;
    ctx.fillRect(canvas.width * 0.1, canvas.height * 0.2, canvas.width * 0.8, canvas.height * 0.6);
    
    // Film grain effect
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const alpha = Math.random() * 0.1 * brightness;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
    }
    
    // Movie title
    ctx.shadowColor = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness})`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
    
    // Rating and info
    ctx.fillStyle = `rgba(255, 200, 0, ${brightness})`;
    ctx.font = '24px Arial';
    ctx.fillText('5 Stars', canvas.width / 2, canvas.height / 2 + 40);
    
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness * 0.8})`;
    ctx.font = '18px Arial';
    ctx.fillText('Now Playing', canvas.width / 2, canvas.height / 2 + 70);
}

// Cartoon Show - Animated and fun
function drawCartoonShow(ctx, canvas, brightness, time, state, tvShow) {
    // Bright cartoon background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.95})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.7}, ${tvShow.color.g * 0.7}, ${tvShow.color.b * 0.7}, ${brightness * 0.85})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated cartoon characters (simple shapes)
    for (let i = 0; i < 4; i++) {
        const x = canvas.width * (0.15 + i * 0.25) + Math.sin(time * 2 + i) * 15;
        const y = canvas.height * 0.6 + Math.cos(time * 1.5 + i) * 20;
        const size = 30 + Math.sin(time + i) * 5;
        
        // Character body
        ctx.fillStyle = `rgba(${tvShow.color.r}, ${tvShow.color.g + 50}, ${tvShow.color.b + 50}, ${brightness * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x - 10, y - 5, 5, 0, Math.PI * 2);
        ctx.arc(x + 10, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x - 10 + Math.sin(time * 3) * 2, y - 5, 2, 0, Math.PI * 2);
        ctx.arc(x + 10 + Math.sin(time * 3) * 2, y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 32px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, 80);
    
    // Floating stars
    for (let i = 0; i < 10; i++) {
        const x = (Math.sin(time * 0.5 + i) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.3 + i) * 0.5 + 0.5) * canvas.height;
        ctx.fillStyle = `rgba(255, 255, 0, ${brightness * (0.5 + Math.sin(time + i) * 0.3)})`;
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 2, y);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x - 2, y);
        ctx.closePath();
        ctx.fill();
    }
}

// Music Show - Visualizer style
function drawMusicShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark music background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r * 0.3}, ${tvShow.color.g * 0.3}, ${tvShow.color.b * 0.3}, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.95})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Audio visualizer bars
    const barCount = 20;
    const barWidth = canvas.width / (barCount + 1);
    for (let i = 0; i < barCount; i++) {
        const x = barWidth * (i + 1);
        const height = (Math.sin(time * 2 + i * 0.5) + 1) * 0.5 * canvas.height * 0.6;
        const barY = canvas.height - height;
        
        const barGradient = ctx.createLinearGradient(x, barY, x, canvas.height);
        barGradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness})`);
        barGradient.addColorStop(1, `rgba(${tvShow.color.r * 0.5}, ${tvShow.color.g * 0.5}, ${tvShow.color.b * 0.5}, ${brightness * 0.7})`);
        ctx.fillStyle = barGradient;
        ctx.fillRect(x - barWidth / 2, barY, barWidth - 2, height);
    }
    
    // Show name
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 36px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, 80);
    
    // Now playing
    ctx.fillStyle = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.9})`;
    ctx.font = '24px Arial';
    ctx.fillText('Now Playing', canvas.width / 2, 120);
}

// Weather Show - Weather graphics
function drawWeatherShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.6}, ${tvShow.color.g * 0.6}, ${tvShow.color.b * 0.6}, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Sun
    const sunX = canvas.width * 0.7;
    const sunY = canvas.height * 0.3;
    const sunRadius = 40 + Math.sin(time) * 5;
    ctx.fillStyle = `rgba(255, 255, 0, ${brightness * 0.9})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Clouds
    for (let i = 0; i < 3; i++) {
        const cloudX = (canvas.width * 0.2 + i * canvas.width * 0.3 + time * 10) % (canvas.width + 100) - 50;
        const cloudY = canvas.height * 0.4 + i * 30;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, 20, 0, Math.PI * 2);
        ctx.arc(cloudX + 25, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(cloudX + 50, cloudY, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Temperature display
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 48px Arial';
    ctx.fillText('72°F', canvas.width / 2, canvas.height / 2);
    
    // Weather info
    ctx.font = '24px Arial';
    ctx.fillText('Sunny • Partly Cloudy', canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height - 40);
}

// Horror Show - Dark and spooky
function drawHorrorShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark horror background
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.95})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Flickering effect
    const flicker = Math.random() > 0.7 ? 1 : 0.3;
    ctx.fillStyle = `rgba(${tvShow.color.r * flicker}, 0, 0, ${brightness * flicker})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Spooky silhouette
    const silhouetteX = canvas.width / 2;
    const silhouetteY = canvas.height * 0.7;
    ctx.fillStyle = `rgba(20, 20, 20, ${brightness * 0.9})`;
    ctx.beginPath();
    ctx.ellipse(silhouetteX, silhouetteY, 60, 120, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Glowing eyes
    const eyeGlow = Math.sin(time * 3) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness * eyeGlow})`;
    ctx.beginPath();
    ctx.arc(silhouetteX - 20, silhouetteY - 30, 8, 0, Math.PI * 2);
    ctx.arc(silhouetteX + 20, silhouetteY - 30, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Show title with spooky effect
    ctx.shadowColor = `rgba(255, 0, 0, ${brightness * eyeGlow})`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(200, 0, 0, ${brightness})`;
    ctx.font = 'bold 40px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
}

// Documentary Show - Nature/educational
function drawDocumentaryShow(ctx, canvas, brightness, time, state, tvShow) {
    // Nature background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.8})`);
    gradient.addColorStop(0.7, `rgba(${tvShow.color.r * 0.7}, ${tvShow.color.g * 0.7}, ${tvShow.color.b * 0.7}, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.5}, ${tvShow.color.g * 0.5}, ${tvShow.color.b * 0.5}, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Nature elements (trees, animals)
    for (let i = 0; i < 5; i++) {
        const x = canvas.width * (0.1 + i * 0.2);
        const y = canvas.height * 0.7;
        
        // Tree
        ctx.fillStyle = `rgba(50, 100, 50, ${brightness * 0.8})`;
        ctx.fillRect(x - 5, y, 10, 60);
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Animal silhouette
    const animalX = canvas.width * 0.5 + Math.sin(time * 0.5) * 50;
    const animalY = canvas.height * 0.65;
    ctx.fillStyle = `rgba(80, 60, 40, ${brightness * 0.7})`;
    ctx.beginPath();
    ctx.ellipse(animalX, animalY, 40, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 32px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, 80);
    
    // Educational text
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness * 0.8})`;
    ctx.font = '18px Arial';
    ctx.fillText('Exploring Nature', canvas.width / 2, canvas.height - 40);
}

// General TV Show - Default style
function drawGeneralTVShow(ctx, canvas, brightness, time, state, tvShow) {
    // General TV background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.5}, ${tvShow.color.g * 0.5}, ${tvShow.color.b * 0.5}, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2 - 20);
    
    // Genre
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness * 0.8})`;
    ctx.font = '24px Arial';
    ctx.fillText(tvShow.genre, canvas.width / 2, canvas.height / 2 + 20);
    
    // Channel number
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.6})`;
    ctx.font = '20px Arial';
    ctx.fillText(`Channel ${state.channel}`, canvas.width / 2, canvas.height - 40);
}

// 1. Big Red Dog Smoking - Comedy show
function drawBigRedDogShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sky blue background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(135, 206, 250, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(100, 150, 200, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ground
    ctx.fillStyle = `rgba(34, 139, 34, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    
    // Big red dog body
    const dogX = canvas.width / 2;
    const dogY = canvas.height * 0.65;
    const dogSize = 120 + Math.sin(time * 0.5) * 5;
    
    // Dog body (big red circle)
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness * 0.9})`;
    ctx.beginPath();
    ctx.ellipse(dogX, dogY, dogSize * 0.6, dogSize * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Dog head
    ctx.beginPath();
    ctx.arc(dogX, dogY - dogSize * 0.4, dogSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Dog eyes
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.beginPath();
    ctx.arc(dogX - 20, dogY - dogSize * 0.5, 12, 0, Math.PI * 2);
    ctx.arc(dogX + 20, dogY - dogSize * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(dogX - 20, dogY - dogSize * 0.5, 6, 0, Math.PI * 2);
    ctx.arc(dogX + 20, dogY - dogSize * 0.5, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Dog nose
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(dogX, dogY - dogSize * 0.3, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cigarette in mouth
    const cigX = dogX + 30;
    const cigY = dogY - dogSize * 0.35;
    const cigAngle = Math.sin(time * 0.3) * 0.1;
    
    ctx.save();
    ctx.translate(cigX, cigY);
    ctx.rotate(cigAngle);
    
    // Cigarette
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.fillRect(-25, -2, 25, 4);
    
    // Cigarette tip (orange)
    ctx.fillStyle = `rgba(255, 140, 0, ${brightness})`;
    ctx.fillRect(-25, -2, 5, 4);
    
    // Smoke particles
    for (let i = 0; i < 8; i++) {
        const smokeX = -30 - i * 5 + Math.sin(time * 2 + i) * 3;
        const smokeY = -2 + Math.cos(time * 1.5 + i) * 2;
        const smokeSize = 3 + i * 0.5;
        const smokeAlpha = (1 - i / 8) * brightness * 0.6;
        ctx.fillStyle = `rgba(200, 200, 200, ${smokeAlpha})`;
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Big Red Dog', canvas.width / 2, 60);
}

// 2. Pabst Blue Ribbon - Life problems drama
function drawPabstShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark bar background
    ctx.fillStyle = `rgba(20, 20, 40, ${brightness * 0.9})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Bar counter
    ctx.fillStyle = `rgba(80, 60, 40, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // Pabst Blue Ribbon can
    const canX = canvas.width / 2;
    const canY = canvas.height * 0.5;
    const canTilt = Math.sin(time * 0.2) * 0.1;
    
    ctx.save();
    ctx.translate(canX, canY);
    ctx.rotate(canTilt);
    
    // Can body (blue)
    const canGradient = ctx.createLinearGradient(-20, -40, -20, 40);
    canGradient.addColorStop(0, `rgba(0, 50, 150, ${brightness * 0.9})`);
    canGradient.addColorStop(0.5, `rgba(0, 100, 200, ${brightness})`);
    canGradient.addColorStop(1, `rgba(0, 50, 150, ${brightness * 0.9})`);
    ctx.fillStyle = canGradient;
    ctx.fillRect(-20, -40, 40, 80);
    
    // Can top
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(0, -40, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pabst logo text
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PABST', 0, -10);
    ctx.fillText('BLUE RIBBON', 0, 10);
    
    ctx.restore();
    
    // Animated character (simple stick figure) going through problems
    const charX = canvas.width * 0.3 + Math.sin(time * 0.3) * 20;
    const charY = canvas.height * 0.7;
    
    // Character body
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Head
    ctx.arc(charX, charY - 30, 10, 0, Math.PI * 2);
    // Body
    ctx.moveTo(charX, charY - 20);
    ctx.lineTo(charX, charY);
    // Arms (sad pose)
    ctx.moveTo(charX, charY - 15);
    ctx.lineTo(charX - 15, charY - 5);
    ctx.moveTo(charX, charY - 15);
    ctx.lineTo(charX + 15, charY - 5);
    // Legs
    ctx.moveTo(charX, charY);
    ctx.lineTo(charX - 10, charY + 20);
    ctx.moveTo(charX, charY);
    ctx.lineTo(charX + 10, charY + 20);
    ctx.stroke();
    
    // Problem text bubbles
    const problems = ['Rent Due', 'Job Lost', 'Car Broke', 'Life Hard'];
    const problemIndex = Math.floor(time * 0.1) % problems.length;
    ctx.fillStyle = `rgba(255, 200, 200, ${brightness * 0.9})`;
    ctx.fillRect(charX - 40, charY - 60, 80, 25);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(problems[problemIndex], charX, charY - 45);
    
    // Show title
    ctx.fillStyle = `rgba(0, 100, 200, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Pabst Blue Ribbon', canvas.width / 2, 50);
}

// 3. Pool Lifeguard Live - Reality show
function drawLifeguardShow(ctx, canvas, brightness, time, state, tvShow) {
    // Pool water background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(0, 150, 255, ${brightness * 0.9})`);
    gradient.addColorStop(0.5, `rgba(0, 120, 200, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(0, 100, 180, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Pool tiles/pattern
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 6; j++) {
            ctx.strokeRect(i * 80, j * 60, 80, 60);
        }
    }
    
    // Water ripples
    for (let i = 0; i < 5; i++) {
        const rippleX = canvas.width * (0.2 + i * 0.15);
        const rippleY = canvas.height * 0.6;
        const rippleRadius = 30 + Math.sin(time * 2 + i) * 10;
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rippleX, rippleY, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Lifeguard chair
    const chairX = canvas.width * 0.85;
    const chairY = canvas.height * 0.3;
    
    // Chair pole
    ctx.fillStyle = `rgba(150, 100, 50, ${brightness})`;
    ctx.fillRect(chairX - 3, chairY, 6, 150);
    
    // Chair seat
    ctx.fillStyle = `rgba(200, 150, 100, ${brightness})`;
    ctx.fillRect(chairX - 25, chairY, 50, 20);
    
    // Lifeguard (simple figure)
    const guardX = chairX;
    const guardY = chairY - 20;
    const guardSway = Math.sin(time * 0.5) * 3;
    
    // Guard body
    ctx.fillStyle = `rgba(255, 200, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(guardX + guardSway, guardY, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Guard arms (waving)
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(guardX + guardSway, guardY);
    ctx.lineTo(guardX - 15 + guardSway + Math.sin(time * 2) * 5, guardY - 10);
    ctx.moveTo(guardX + guardSway, guardY);
    ctx.lineTo(guardX + 15 + guardSway - Math.sin(time * 2) * 5, guardY - 10);
    ctx.stroke();
    
    // Whistle
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness})`;
    ctx.fillRect(guardX + guardSway - 2, guardY - 8, 4, 6);
    
    // "LIVE" indicator
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(30, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LIVE', 45, 35);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Pool Lifeguard Live', canvas.width / 2, 50);
}

// 4. Cup Show - Documentary about cups
function drawCupsShow(ctx, canvas, brightness, time, state, tvShow) {
    // Clean white background
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.95})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Table surface
    ctx.fillStyle = `rgba(200, 180, 160, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    
    // Multiple cups arranged
    const cupPositions = [
        { x: 0.2, y: 0.6, size: 1.0 },
        { x: 0.4, y: 0.65, size: 0.9 },
        { x: 0.6, y: 0.6, size: 1.1 },
        { x: 0.8, y: 0.65, size: 0.95 }
    ];
    
    cupPositions.forEach((pos, i) => {
        const cupX = canvas.width * pos.x;
        const cupY = canvas.height * pos.y;
        const cupSize = 40 * pos.size;
        const cupRotation = Math.sin(time * 0.3 + i) * 0.05;
        
        ctx.save();
        ctx.translate(cupX, cupY);
        ctx.rotate(cupRotation);
        
        // Cup body
        const cupGradient = ctx.createLinearGradient(-cupSize * 0.4, -cupSize, -cupSize * 0.4, cupSize);
        cupGradient.addColorStop(0, `rgba(240, 240, 240, ${brightness})`);
        cupGradient.addColorStop(0.5, `rgba(255, 255, 255, ${brightness})`);
        cupGradient.addColorStop(1, `rgba(220, 220, 220, ${brightness})`);
        ctx.fillStyle = cupGradient;
        ctx.beginPath();
        ctx.moveTo(-cupSize * 0.4, -cupSize);
        ctx.lineTo(-cupSize * 0.3, cupSize);
        ctx.lineTo(cupSize * 0.3, cupSize);
        ctx.lineTo(cupSize * 0.4, -cupSize);
        ctx.closePath();
        ctx.fill();
        
        // Cup rim
        ctx.strokeStyle = `rgba(180, 180, 180, ${brightness})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -cupSize, cupSize * 0.4, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Cup handle
        ctx.strokeStyle = `rgba(150, 150, 150, ${brightness})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cupSize * 0.5, -cupSize * 0.3, cupSize * 0.25, 0, Math.PI);
        ctx.stroke();
        
        ctx.restore();
    });
    
    // Documentary text overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.7})`;
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('The Fascinating World of Cups', canvas.width / 2, canvas.height - 80);
    ctx.fillText('Episode 7: Ceramic vs. Porcelain', canvas.width / 2, canvas.height - 50);
    
    // Show title
    ctx.fillStyle = `rgba(100, 100, 150, ${brightness})`;
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Cup Show', canvas.width / 2, 50);
}

// 5. Trash Can Life - Fantasy show
function drawTrashCanShow(ctx, canvas, brightness, time, state, tvShow) {
    // Urban background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(100, 100, 120, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(60, 60, 80, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ground
    ctx.fillStyle = `rgba(80, 80, 80, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height * 0.25);
    
    // Trash can
    const canX = canvas.width / 2;
    const canY = canvas.height * 0.7;
    const canAnimation = Math.sin(time * 0.5) * 0.1;
    
    ctx.save();
    ctx.translate(canX, canY);
    ctx.rotate(canAnimation);
    
    // Can body (gray)
    const canGradient = ctx.createLinearGradient(-30, -60, -30, 60);
    canGradient.addColorStop(0, `rgba(100, 100, 100, ${brightness})`);
    canGradient.addColorStop(0.5, `rgba(150, 150, 150, ${brightness})`);
    canGradient.addColorStop(1, `rgba(80, 80, 80, ${brightness})`);
    ctx.fillStyle = canGradient;
    ctx.fillRect(-30, -60, 60, 120);
    
    // Can lid
    ctx.fillStyle = `rgba(120, 120, 120, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(0, -60, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Magical glow effect (coming to life)
    const glowIntensity = (Math.sin(time * 2) + 1) * 0.5;
    ctx.shadowColor = `rgba(100, 200, 255, ${brightness * glowIntensity})`;
    ctx.shadowBlur = 30;
    ctx.fillStyle = `rgba(100, 200, 255, ${brightness * glowIntensity * 0.3})`;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Eyes (magical life)
    const eyeGlow = Math.sin(time * 3) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(100, 255, 100, ${brightness * eyeGlow})`;
    ctx.beginPath();
    ctx.arc(-15, -30, 8, 0, Math.PI * 2);
    ctx.arc(15, -30, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth (smile)
    ctx.strokeStyle = `rgba(100, 255, 100, ${brightness * eyeGlow})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -10, 15, 0, Math.PI);
    ctx.stroke();
    
    ctx.restore();
    
    // Magical particles
    for (let i = 0; i < 15; i++) {
        const particleX = canX + (Math.sin(time + i) * 0.5 + 0.5) * 100 - 50;
        const particleY = canY + (Math.cos(time * 0.7 + i) * 0.5 + 0.5) * 80 - 40;
        const particleAlpha = (Math.sin(time * 2 + i) + 1) * 0.5 * brightness * 0.6;
        ctx.fillStyle = `rgba(100, 200, 255, ${particleAlpha})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Show title
    ctx.fillStyle = `rgba(100, 200, 255, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Trash Can Life', canvas.width / 2, 50);
}

// 6. Loch Ness Kid - Adventure show
function drawLochNessShow(ctx, canvas, brightness, time, state, tvShow) {
    // Lake/water background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(100, 150, 200, ${brightness * 0.8})`);
    gradient.addColorStop(0.6, `rgba(50, 100, 150, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(30, 70, 120, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Water ripples
    for (let i = 0; i < 8; i++) {
        const rippleX = canvas.width * (0.1 + i * 0.1);
        const rippleY = canvas.height * 0.7;
        const rippleRadius = 20 + Math.sin(time + i) * 8;
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(rippleX, rippleY, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Loch Ness Monster (large, morphing to small kid)
    const morphProgress = (Math.sin(time * 0.3) + 1) * 0.5; // 0 = monster, 1 = kid
    const monsterX = canvas.width / 2;
    const monsterY = canvas.height * 0.6;
    
    if (morphProgress < 0.5) {
        // Loch Ness Monster form
        const monsterSize = 80 * (1 - morphProgress * 2);
        const neckLength = 100 * (1 - morphProgress * 2);
        
        // Monster body
        ctx.fillStyle = `rgba(0, 100, 50, ${brightness * 0.8})`;
        ctx.beginPath();
        ctx.ellipse(monsterX, monsterY, monsterSize, monsterSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Monster neck and head
        ctx.beginPath();
        ctx.ellipse(monsterX, monsterY - neckLength, monsterSize * 0.4, monsterSize * 0.3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Monster eyes
        ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(monsterX - 10, monsterY - neckLength - 5, 5, 0, Math.PI * 2);
        ctx.arc(monsterX + 10, monsterY - neckLength - 5, 5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Puny kid form
        const kidSize = 20 + (morphProgress - 0.5) * 40;
        const kidX = monsterX;
        const kidY = monsterY + 30;
        
        // Kid body
        ctx.fillStyle = `rgba(255, 200, 150, ${brightness})`;
        ctx.beginPath();
        ctx.arc(kidX, kidY, kidSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Kid head
        ctx.beginPath();
        ctx.arc(kidX, kidY - kidSize - 10, kidSize * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Kid eyes (sad/bullied)
        ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(kidX - 5, kidY - kidSize - 5, 2, 0, Math.PI * 2);
        ctx.arc(kidX + 5, kidY - kidSize - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Kid arms (small)
        ctx.strokeStyle = `rgba(255, 200, 150, ${brightness})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(kidX, kidY);
        ctx.lineTo(kidX - 8, kidY + 5);
        ctx.moveTo(kidX, kidY);
        ctx.lineTo(kidX + 8, kidY + 5);
        ctx.stroke();
    }
    
    // Bully kid (small, on the side)
    const bullyX = canvas.width * 0.2;
    const bullyY = canvas.height * 0.7;
    
    ctx.fillStyle = `rgba(200, 150, 100, ${brightness})`;
    ctx.beginPath();
    ctx.arc(bullyX, bullyY, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Bully pointing
    ctx.strokeStyle = `rgba(200, 150, 100, ${brightness})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bullyX, bullyY);
    ctx.lineTo(bullyX + 20, bullyY - 10);
    ctx.stroke();
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Loch Ness Kid', canvas.width / 2, 50);
}

// 7. Rotten Banana - Nature/timescale show
function drawBananaShow(ctx, canvas, brightness, time, state, tvShow) {
    // Kitchen/floor background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(200, 180, 160, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(150, 130, 110, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Floor tiles
    ctx.strokeStyle = `rgba(120, 100, 80, ${brightness * 0.5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 5; j++) {
            ctx.strokeRect(i * 100, j * 80, 100, 80);
        }
    }
    
    // Banana on floor
    const bananaX = canvas.width / 2;
    const bananaY = canvas.height * 0.7;
    
    // Rot progression (0 = fresh, 1 = completely rotten)
    const rotTime = (time * 0.1) % 1; // Slow time progression
    
    // Banana shape (curved)
    ctx.save();
    ctx.translate(bananaX, bananaY);
    ctx.rotate(-0.3);
    
    // Banana body color based on rot
    const freshYellow = { r: 255, g: 255, b: 0 };
    const rottenBrown = { r: 100, g: 50, b: 0 };
    const currentColor = {
        r: freshYellow.r + (rottenBrown.r - freshYellow.r) * rotTime,
        g: freshYellow.g + (rottenBrown.g - freshYellow.g) * rotTime,
        b: freshYellow.b + (rottenBrown.b - freshYellow.b) * rotTime
    };
    
    ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 60, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rot spots (appear over time)
    const spotCount = Math.floor(rotTime * 8);
    for (let i = 0; i < spotCount; i++) {
        const spotX = (Math.random() - 0.5) * 100;
        const spotY = (Math.random() - 0.5) * 40;
        ctx.fillStyle = `rgba(50, 25, 0, ${brightness * rotTime})`;
        ctx.beginPath();
        ctx.arc(spotX, spotY, 3 + rotTime * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Banana stem (browns over time)
    ctx.fillStyle = `rgba(${100 + rotTime * 50}, ${50 + rotTime * 25}, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(-50, -5, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Time indicator
    const timeLabels = ['Day 1', 'Day 3', 'Day 5', 'Day 7', 'Day 9', 'Rotten'];
    const timeIndex = Math.floor(rotTime * timeLabels.length);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.8})`;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(timeLabels[timeIndex], canvas.width / 2, canvas.height - 100);
    
    // Show title
    ctx.fillStyle = `rgba(255, 200, 0, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Rotten Banana', canvas.width / 2, 50);
}

// 8. Endless Drive - Action show
function drawDrivingShow(ctx, canvas, brightness, time, state, tvShow) {
    // Road background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(135, 206, 250, ${brightness * 0.9})`);
    gradient.addColorStop(0.7, `rgba(100, 150, 200, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(80, 80, 80, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Road surface
    ctx.fillStyle = `rgba(60, 60, 60, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // Road lines (moving)
    ctx.strokeStyle = `rgba(255, 255, 0, ${brightness})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = (time * 100) % 40;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height * 0.6);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Car (animated, driving non-stop)
    const carX = canvas.width / 2;
    const carY = canvas.height * 0.75;
    const carBounce = Math.sin(time * 3) * 2;
    
    // Car body
    ctx.fillStyle = `rgba(200, 50, 50, ${brightness})`;
    ctx.fillRect(carX - 40, carY - 20 + carBounce, 80, 30);
    
    // Car roof
    ctx.fillStyle = `rgba(150, 30, 30, ${brightness})`;
    ctx.fillRect(carX - 25, carY - 40 + carBounce, 50, 25);
    
    // Car windows
    ctx.fillStyle = `rgba(100, 150, 200, ${brightness * 0.6})`;
    ctx.fillRect(carX - 20, carY - 35 + carBounce, 20, 15);
    ctx.fillRect(carX + 0, carY - 35 + carBounce, 20, 15);
    
    // Car wheels (spinning)
    const wheelRotation = time * 5;
    ctx.save();
    // Left wheel
    ctx.translate(carX - 25, carY + 10 + carBounce);
    ctx.rotate(wheelRotation);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(100, 100, 100, ${brightness})`;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    // Right wheel
    ctx.translate(carX + 25, carY + 10 + carBounce);
    ctx.rotate(wheelRotation);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(100, 100, 100, ${brightness})`;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Driver (simple stick figure)
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(carX, carY - 20 + carBounce, 5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Scenery passing by
    for (let i = 0; i < 5; i++) {
        const treeX = (canvas.width * 0.1 + i * canvas.width * 0.2 - (time * 50) % (canvas.width * 1.2)) % (canvas.width * 1.2);
        const treeY = canvas.height * 0.5;
        
        // Tree trunk
        ctx.fillStyle = `rgba(100, 50, 0, ${brightness})`;
        ctx.fillRect(treeX - 5, treeY, 10, 40);
        
        // Tree leaves
        ctx.fillStyle = `rgba(0, 150, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(treeX, treeY, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Speed indicator
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('SPEED: 65 MPH', canvas.width / 2, 40);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Endless Drive', canvas.width / 2, canvas.height - 30);
}

// 9. Ocean Meets Volcano - Nature/live view
function drawOceanVolcanoShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sky gradient (sunset)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
    const sunsetPhase = (Math.sin(time * 0.1) + 1) * 0.5; // Slow sunset cycle
    skyGradient.addColorStop(0, `rgba(255, ${100 + sunsetPhase * 100}, ${sunsetPhase * 50}, ${brightness * 0.9})`);
    skyGradient.addColorStop(0.5, `rgba(255, ${150 + sunsetPhase * 50}, ${50 + sunsetPhase * 100}, ${brightness * 0.8})`);
    skyGradient.addColorStop(1, `rgba(100, 50, ${sunsetPhase * 100}, ${brightness * 0.7})`);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);
    
    // Sun
    const sunX = canvas.width * 0.8;
    const sunY = canvas.height * 0.3;
    const sunSize = 40 + sunsetPhase * 20;
    ctx.fillStyle = `rgba(255, ${200 + sunsetPhase * 55}, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Ocean
    const oceanGradient = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
    oceanGradient.addColorStop(0, `rgba(0, ${100 + sunsetPhase * 50}, 200, ${brightness * 0.8})`);
    oceanGradient.addColorStop(1, `rgba(0, 50, 150, ${brightness * 0.7})`);
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // Ocean waves
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.4})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const waveY = canvas.height * 0.6 + i * 20;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 5) {
            const y = waveY + Math.sin((x + time * 20) * 0.1) * 5;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Volcano (on the right)
    const volcanoX = canvas.width * 0.85;
    const volcanoY = canvas.height * 0.6;
    
    // Volcano base
    ctx.fillStyle = `rgba(80, 40, 20, ${brightness})`;
    ctx.beginPath();
    ctx.moveTo(volcanoX - 80, volcanoY);
    ctx.lineTo(volcanoX, volcanoY - 120);
    ctx.lineTo(volcanoX + 80, volcanoY);
    ctx.closePath();
    ctx.fill();
    
    // Lava glow
    const lavaGlow = (Math.sin(time * 2) + 1) * 0.5;
    ctx.shadowColor = `rgba(255, 100, 0, ${brightness * lavaGlow})`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, ${100 + lavaGlow * 100}, 0, ${brightness * lavaGlow})`;
    ctx.beginPath();
    ctx.moveTo(volcanoX - 20, volcanoY - 120);
    ctx.lineTo(volcanoX, volcanoY - 140);
    ctx.lineTo(volcanoX + 20, volcanoY - 120);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Lava flowing down
    for (let i = 0; i < 3; i++) {
        const lavaY = volcanoY - 100 + i * 15;
        const lavaX = volcanoX + (Math.sin(time * 3 + i) - 0.5) * 10;
        ctx.fillStyle = `rgba(255, ${50 + lavaGlow * 100}, 0, ${brightness * lavaGlow})`;
        ctx.beginPath();
        ctx.arc(lavaX, lavaY, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Steam/smoke from volcano
    for (let i = 0; i < 5; i++) {
        const smokeX = volcanoX + (Math.sin(time + i) - 0.5) * 30;
        const smokeY = volcanoY - 140 - i * 15 - time * 10;
        const smokeSize = 8 + i * 2;
        const smokeAlpha = (1 - i / 5) * brightness * 0.5;
        ctx.fillStyle = `rgba(200, 200, 200, ${smokeAlpha})`;
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // "LIVE" indicator
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(30, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LIVE', 45, 35);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Ocean Meets Volcano', canvas.width / 2, 60);
}

// 10. Fridge Planet - Sitcom
function drawFridgePlanetShow(ctx, canvas, brightness, time, state, tvShow) {
    // Space background
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
    );
    gradient.addColorStop(0, `rgba(50, 50, 100, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(0, 0, 20, ${brightness * 0.8})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Stars
    for (let i = 0; i < 50; i++) {
        const starX = (i * 37) % canvas.width;
        const starY = (i * 73) % canvas.height;
        const twinkle = (Math.sin(time * 2 + i) + 1) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * twinkle})`;
        ctx.fillRect(starX, starY, 2, 2);
    }
    
    // Fridge Planet (large, floating)
    const planetX = canvas.width / 2;
    const planetY = canvas.height / 2;
    const planetFloat = Math.sin(time * 0.5) * 10;
    const planetSize = 150;
    
    // Planet body (fridge shape)
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness})`;
    ctx.fillRect(planetX - planetSize * 0.4, planetY - planetSize * 0.6 + planetFloat, planetSize * 0.8, planetSize * 1.2);
    
    // Fridge door
    ctx.strokeStyle = `rgba(150, 150, 150, ${brightness})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(planetX - planetSize * 0.4, planetY - planetSize * 0.6 + planetFloat, planetSize * 0.8, planetSize * 1.2);
    
    // Fridge handle
    ctx.fillStyle = `rgba(100, 100, 100, ${brightness})`;
    ctx.fillRect(planetX + planetSize * 0.35, planetY - planetSize * 0.2 + planetFloat, 8, 30);
    
    // Fridge door seam
    ctx.strokeStyle = `rgba(120, 120, 120, ${brightness})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(planetX, planetY - planetSize * 0.6 + planetFloat);
    ctx.lineTo(planetX, planetY + planetSize * 0.6 + planetFloat);
    ctx.stroke();
    
    // Fridge interior glow (when open)
    const doorOpen = Math.sin(time * 0.3) > 0;
    if (doorOpen) {
        ctx.fillStyle = `rgba(255, 255, 200, ${brightness * 0.6})`;
        ctx.fillRect(planetX - planetSize * 0.35, planetY - planetSize * 0.5 + planetFloat, planetSize * 0.35, planetSize);
    }
    
    // Fridge contents (simple shapes)
    if (doorOpen) {
        // Milk carton
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fillRect(planetX - planetSize * 0.3, planetY - planetSize * 0.3 + planetFloat, 20, 30);
        
        // Apple
        ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(planetX - planetSize * 0.1, planetY + planetFloat, 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Planet rings (saturn-like)
    ctx.strokeStyle = `rgba(150, 200, 255, ${brightness * 0.6})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(planetX, planetY + planetSize * 0.7 + planetFloat, planetSize * 0.6, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Sitcom characters (small, floating around)
    for (let i = 0; i < 3; i++) {
        const charX = planetX + Math.cos(time + i * 2) * (planetSize * 0.8);
        const charY = planetY + Math.sin(time + i * 2) * (planetSize * 0.8) + planetFloat;
        
        // Character (simple circle with face)
        ctx.fillStyle = `rgba(255, 200, 150, ${brightness})`;
        ctx.beginPath();
        ctx.arc(charX, charY, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Face
        ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(charX - 3, charY - 2, 1, 0, Math.PI * 2);
        ctx.arc(charX + 3, charY - 2, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Smile
        ctx.strokeStyle = `rgba(0, 0, 0, ${brightness})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(charX, charY + 2, 4, 0, Math.PI);
        ctx.stroke();
    }
    
    // Show title
    ctx.fillStyle = `rgba(200, 255, 255, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Fridge Planet', canvas.width / 2, 50);
    
    // Episode info
    ctx.fillStyle = `rgba(150, 200, 255, ${brightness * 0.8})`;
    ctx.font = '18px Arial';
    ctx.fillText('Season 2 • Episode 5', canvas.width / 2, canvas.height - 40);
}

// 11. Talking Toaster - Comedy show
function drawToasterShow(ctx, canvas, brightness, time, state, tvShow) {
    // Kitchen background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(200, 200, 180, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(150, 150, 130, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Counter
    ctx.fillStyle = `rgba(120, 100, 80, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    
    // Toaster
    const toasterX = canvas.width / 2;
    const toasterY = canvas.height * 0.65;
    const toasterBounce = Math.sin(time * 2) * 2;
    
    // Toaster body
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness})`;
    ctx.fillRect(toasterX - 40, toasterY - 30 + toasterBounce, 80, 60);
    
    // Toaster slots
    ctx.fillStyle = `rgba(50, 50, 50, ${brightness})`;
    ctx.fillRect(toasterX - 35, toasterY - 25 + toasterBounce, 30, 50);
    ctx.fillRect(toasterX + 5, toasterY - 25 + toasterBounce, 30, 50);
    
    // Toast popping up
    const toastPop = Math.sin(time * 1.5) * 0.5 + 0.5;
    if (toastPop > 0.3) {
        ctx.fillStyle = `rgba(200, 150, 100, ${brightness})`;
        ctx.fillRect(toasterX - 32, toasterY - 50 - toastPop * 30 + toasterBounce, 26, 20);
        ctx.fillRect(toasterX + 6, toasterY - 50 - toastPop * 30 + toasterBounce, 26, 20);
    }
    
    // Toaster face (talking)
    const mouthOpen = Math.sin(time * 3) * 0.5 + 0.5;
    // Eyes
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(toasterX - 15, toasterY - 10 + toasterBounce, 3, 0, Math.PI * 2);
    ctx.arc(toasterX + 15, toasterY - 10 + toasterBounce, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth (talking animation)
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(toasterX, toasterY + 5 + toasterBounce, 8, 3 + mouthOpen * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Speech bubble
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.9})`;
    ctx.fillRect(toasterX - 60, toasterY - 80 + toasterBounce, 120, 30);
    ctx.strokeStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(toasterX - 60, toasterY - 80 + toasterBounce, 120, 30);
    
    const quotes = ['Hello!', 'I toast!', 'Pop!', 'Yum!'];
    const quoteIndex = Math.floor(time * 0.5) % quotes.length;
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(quotes[quoteIndex], toasterX, toasterY - 60 + toasterBounce);
    
    // Show title
    ctx.fillStyle = `rgba(200, 150, 100, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Talking Toaster', canvas.width / 2, 50);
}

// 12. Cloud Watching - Relaxation show
function drawCloudsShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(135, 206, 250, ${brightness * 0.95})`);
    gradient.addColorStop(1, `rgba(100, 150, 200, ${brightness * 0.85})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Multiple clouds drifting
    for (let i = 0; i < 6; i++) {
        const cloudX = (canvas.width * 0.1 + i * canvas.width * 0.15 + time * 10) % (canvas.width + 150) - 75;
        const cloudY = canvas.height * (0.2 + (i % 3) * 0.25);
        const cloudSize = 40 + (i % 3) * 20;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.9})`;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, cloudSize * 0.6, 0, Math.PI * 2);
        ctx.arc(cloudX + cloudSize * 0.5, cloudY, cloudSize * 0.7, 0, Math.PI * 2);
        ctx.arc(cloudX + cloudSize, cloudY, cloudSize * 0.6, 0, Math.PI * 2);
        ctx.arc(cloudX + cloudSize * 0.3, cloudY - cloudSize * 0.3, cloudSize * 0.5, 0, Math.PI * 2);
        ctx.arc(cloudX + cloudSize * 0.7, cloudY - cloudSize * 0.3, cloudSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Sun
    const sunX = canvas.width * 0.85;
    const sunY = canvas.height * 0.2;
    ctx.fillStyle = `rgba(255, 255, 0, ${brightness * 0.9})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Relaxing text
    ctx.fillStyle = `rgba(100, 150, 200, ${brightness * 0.7})`;
    ctx.font = 'italic 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Just Breathe...', canvas.width / 2, canvas.height - 60);
    
    // Show title
    ctx.fillStyle = `rgba(200, 220, 255, ${brightness})`;
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Cloud Watching', canvas.width / 2, 50);
}

// 13. Paint Drying Live - Documentary
function drawPaintShow(ctx, canvas, brightness, time, state, tvShow) {
    // Wall background
    ctx.fillStyle = `rgba(240, 240, 240, ${brightness * 0.9})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Paint area
    const paintX = canvas.width / 2;
    const paintY = canvas.height / 2;
    const paintWidth = 200;
    const paintHeight = 150;
    
    // Paint drying progression (very slow)
    const dryProgress = (time * 0.01) % 1;
    
    // Fresh paint (wet, shiny)
    const freshColor = { r: 150, g: 200, b: 255 };
    const dryColor = { r: 120, g: 160, b: 200 };
    const currentColor = {
        r: freshColor.r + (dryColor.r - freshColor.r) * dryProgress,
        g: freshColor.g + (dryColor.g - freshColor.g) * dryProgress,
        b: freshColor.b + (dryColor.b - freshColor.b) * dryProgress
    };
    
    ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${brightness})`;
    ctx.fillRect(paintX - paintWidth / 2, paintY - paintHeight / 2, paintWidth, paintHeight);
    
    // Wet shine effect (fades as it dries)
    if (dryProgress < 0.7) {
        const shineAlpha = (1 - dryProgress / 0.7) * brightness * 0.4;
        ctx.fillStyle = `rgba(255, 255, 255, ${shineAlpha})`;
        ctx.fillRect(paintX - paintWidth / 2 + 20, paintY - paintHeight / 2 + 20, paintWidth * 0.3, paintHeight * 0.2);
    }
    
    // Paint brush marks
    ctx.strokeStyle = `rgba(${currentColor.r - 20}, ${currentColor.g - 20}, ${currentColor.b - 20}, ${brightness * 0.6})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(paintX - paintWidth / 2 + i * 40, paintY - paintHeight / 2);
        ctx.lineTo(paintX - paintWidth / 2 + i * 40 + 10, paintY + paintHeight / 2);
        ctx.stroke();
    }
    
    // Timer
    const hours = Math.floor(dryProgress * 24);
    const minutes = Math.floor((dryProgress * 24 - hours) * 60);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.8})`;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Drying Time: ${hours}h ${minutes}m`, canvas.width / 2, paintY + paintHeight / 2 + 40);
    
    // "LIVE" indicator
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(30, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LIVE', 45, 35);
    
    // Show title
    ctx.fillStyle = `rgba(100, 150, 200, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Paint Drying Live', canvas.width / 2, 50);
}

// 14. Rubber Duck Adventures - Adventure show
function drawRubberDuckShow(ctx, canvas, brightness, time, state, tvShow) {
    // Bathtub/water background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(200, 220, 255, ${brightness * 0.8})`);
    gradient.addColorStop(0.6, `rgba(100, 150, 255, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(80, 120, 200, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Water surface
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const waveY = canvas.height * 0.5 + i * 15;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 5) {
            const y = waveY + Math.sin((x + time * 20) * 0.1) * 3;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Rubber duck (floating, animated)
    const duckX = canvas.width / 2 + Math.sin(time * 0.5) * 50;
    const duckY = canvas.height * 0.6 + Math.sin(time * 0.7) * 10;
    const duckBounce = Math.sin(time * 2) * 3;
    
    // Duck body (yellow)
    ctx.fillStyle = `rgba(255, 255, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(duckX, duckY + duckBounce, 40, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Duck head
    ctx.beginPath();
    ctx.arc(duckX + 25, duckY - 10 + duckBounce, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Duck bill (orange)
    ctx.fillStyle = `rgba(255, 140, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(duckX + 40, duckY - 5 + duckBounce, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Duck eye
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(duckX + 30, duckY - 15 + duckBounce, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Adventure props (islands, treasure)
    for (let i = 0; i < 3; i++) {
        const islandX = canvas.width * (0.1 + i * 0.3);
        const islandY = canvas.height * 0.7;
        
        // Island
        ctx.fillStyle = `rgba(100, 80, 60, ${brightness})`;
        ctx.beginPath();
        ctx.arc(islandX, islandY, 20 + i * 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Palm tree
        ctx.fillStyle = `rgba(0, 150, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(islandX, islandY - 15, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Treasure chest
    const chestX = canvas.width * 0.8;
    const chestY = canvas.height * 0.65;
    ctx.fillStyle = `rgba(150, 100, 50, ${brightness})`;
    ctx.fillRect(chestX - 15, chestY, 30, 20);
    ctx.fillStyle = `rgba(255, 215, 0, ${brightness * 0.8})`;
    ctx.fillRect(chestX - 10, chestY - 5, 20, 5);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 0, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Rubber Duck Adventures', canvas.width / 2, 50);
}

// Enhanced boot sequence animation with particles and energy waves
function drawBootSequence(ctx, canvas, brightness, powerAnimation) {
    const progress = powerAnimation.currentBrightness;
    const time = Date.now() * 0.001;
    
    // Update and render energy waves
    if (powerAnimation.energyWaves && powerAnimation.energyWaves.length > 0) {
        powerAnimation.energyWaves.forEach((wave, index) => {
            wave.radius += wave.speed * progress;
            wave.opacity = Math.max(0, 0.5 * (1 - wave.radius / wave.maxRadius));
            
            if (wave.radius < wave.maxRadius && wave.opacity > 0.01) {
                ctx.save();
                ctx.globalAlpha = wave.opacity * brightness;
                ctx.strokeStyle = `rgba(100, 150, 255, ${wave.opacity})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(wave.x || canvas.width / 2, wave.y || canvas.height / 2, wave.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }
    
    // Update and render particles
    if (powerAnimation.particles && powerAnimation.particles.length > 0) {
        powerAnimation.particles.forEach((particle, index) => {
            particle.x += particle.vx * progress;
            particle.y += particle.vy * progress;
            particle.life -= 0.02;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            if (particle.life > 0 && particle.x > 0 && particle.x < canvas.width && 
                particle.y > 0 && particle.y < canvas.height) {
                ctx.save();
                ctx.globalAlpha = particle.life * brightness * 0.6;
                ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.life})`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }
    
    // Phase 1: Initial flicker and logo fade-in (0-0.3 brightness)
    if (progress < 0.3) {
        const phaseProgress = progress / 0.3;
        const logoOpacity = Math.pow(phaseProgress, 2) * brightness;
        
        // TV brand logo (simulated)
        ctx.save();
        ctx.globalAlpha = logoOpacity;
        ctx.fillStyle = `rgba(255, 255, 255, ${logoOpacity})`;
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PHILIPS', canvas.width / 2, canvas.height / 2 - 50);
        
        // Subtitle
        ctx.font = '24px Arial';
        ctx.fillStyle = `rgba(200, 200, 200, ${logoOpacity})`;
        ctx.fillText('Smart TV', canvas.width / 2, canvas.height / 2 + 20);
        ctx.restore();
        
        // Flicker effect
        if (Math.random() > 0.7) {
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.1})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    // Phase 2: Loading animation (0.3-0.7 brightness)
    else if (progress < 0.7) {
        const phaseProgress = (progress - 0.3) / 0.4;
        
        // Animated background gradient
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width
        );
        const glowIntensity = phaseProgress * brightness;
        gradient.addColorStop(0, `rgba(100, 150, 255, ${glowIntensity * 0.3})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.8})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Loading spinner
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(time * 2);
        ctx.strokeStyle = `rgba(100, 150, 255, ${brightness})`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        
        // Draw spinner arcs
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, 40, (i * Math.PI) / 2, (i * Math.PI) / 2 + Math.PI / 3);
            ctx.stroke();
        }
        ctx.restore();
        
        // Loading text
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Starting...', canvas.width / 2, canvas.height / 2 + 80);
        
        // Progress bar
        const barWidth = canvas.width * 0.6;
        const barHeight = 6;
        const barX = (canvas.width - barWidth) / 2;
        const barY = canvas.height / 2 + 110;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.2})`;
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = `rgba(100, 150, 255, ${brightness})`;
        ctx.fillRect(barX, barY, barWidth * phaseProgress, barHeight);
        
        // Animated particles
        for (let i = 0; i < 15; i++) {
            const angle = (time * 2 + i * 0.4) % (Math.PI * 2);
            const radius = 60 + Math.sin(time + i) * 10;
            const x = canvas.width / 2 + Math.cos(angle) * radius;
            const y = canvas.height / 2 + Math.sin(angle) * radius;
            const alpha = (Math.sin(time * 3 + i) + 1) * 0.5 * brightness * 0.6;
            
            ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Phase 3: Content fade-in (0.7-1.0 brightness)
    else {
        const phaseProgress = (progress - 0.7) / 0.3;
        const fadeOpacity = Math.pow(phaseProgress, 1.5) * brightness;
        
        // Fade in welcome screen
        ctx.save();
        ctx.globalAlpha = fadeOpacity;
        
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `rgba(26, 26, 46, ${brightness})`);
        gradient.addColorStop(1, `rgba(10, 10, 20, ${brightness * 0.8})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Welcome text with glow
        ctx.shadowColor = `rgba(100, 150, 255, ${fadeOpacity * 0.5})`;
        ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Welcome', canvas.width / 2, canvas.height / 2 - 30);
        ctx.shadowBlur = 0;
        
        // Animated dots
        for (let i = 0; i < 3; i++) {
            const dotPhase = (time * 2 + i * 0.5) % (Math.PI * 2);
            const dotAlpha = (Math.sin(dotPhase) + 1) * 0.5 * fadeOpacity;
            ctx.fillStyle = `rgba(100, 150, 255, ${dotAlpha})`;
            ctx.beginPath();
            ctx.arc(canvas.width / 2 + (i - 1) * 30, canvas.height / 2 + 30, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

