gsap.registerPlugin(ScrollTrigger, CustomEase);

// M0,0 C0.16,1 0.3,1 1,1 → cubic-bezier(0.16, 1, 0.3, 1)
// Fast start, very long smooth deceleration — feels premium and physical
CustomEase.create("silky", "M0,0 C0.16,1 0.3,1 1,1");

// == Scroll-in Animations ==
// Add data-animate to any element to trigger a fade-up on scroll.
// Optional parameters (all via data attributes):
//   data-animate-y="48"          custom y offset (default: 40)
//   data-animate-duration="1.1"  duration in seconds (default: 1.0)
//   data-animate-delay="0.3"     delay in seconds (default: 0)
//   data-animate-stagger="0.13"  when set on a parent, staggers its children
(function initScrollAnimations() {
    document.querySelectorAll('[data-animate]').forEach(el => {
        const y        = parseFloat(el.dataset.animateY        ?? 40);
        const duration = parseFloat(el.dataset.animateDuration ?? 1.0);
        const delay    = parseFloat(el.dataset.animateDelay    ?? 0);
        const stagger  = el.dataset.animateStagger;
        const targets  = stagger !== undefined ? el.children : el;

        gsap.from(targets, {
            scrollTrigger: {
                trigger: el,
                start: 'top 75%',
                once: true,
            },
            opacity: 0,
            y,
            duration,
            delay,
            ease: 'silky',
            ...(stagger !== undefined && { stagger: parseFloat(stagger || 0.13) }),
        });
    });
})();

// == Logo Switcher ==
(function initLogos() {
    const LOGOS = [
        'images/references/logo_century21.svg',
        'images/references/logo_livingstone.svg',
        'images/references/logoipsum-211.svg',
        'images/references/logoipsum-212.svg',
        'images/references/logoipsum-213.svg',
        'images/references/logoipsum-214.svg',
        'images/references/logoipsum-215.svg',
        'images/references/logoipsum-216.svg',
        'images/references/logoipsum-217.svg',
        'images/references/logoipsum-218.svg',
        'images/references/logoipsum-219.svg',
        'images/references/logoipsum-220.svg',
    ];

    const row = document.getElementById('logos-row');
    if (!row) return;

    const slots = Array.from(row.querySelectorAll('.logo-slot'));
    const slotCurrent = []; // houdt bij welk logo-index per slot actief is
    let animating = false;

    // Initieel: verdeel logo's over de slots
    slots.forEach((slot, i) => {
        const idx = i % LOGOS.length;
        slotCurrent.push(idx);
        slot.appendChild(makeWrap(LOGOS[idx]));
    });

    function makeWrap(src) {
        const wrap = document.createElement('div');
        wrap.className = 'logo-item-wrap';
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        wrap.appendChild(img);
        return wrap;
    }

    function switchLogo() {
        if (animating) return;
        animating = true;

        // Kies willekeurig slot
        const slotIdx = Math.floor(Math.random() * slots.length);
        const slot = slots[slotIdx];

        // Kies een ander logo dan het huidige
        let newIdx;
        do {
            newIdx = Math.floor(Math.random() * LOGOS.length);
        } while (newIdx === slotCurrent[slotIdx] && LOGOS.length > 1);

        const outWrap = slot.querySelector('.logo-item-wrap');
        const inWrap  = makeWrap(LOGOS[newIdx]);
        slot.appendChild(inWrap);
        gsap.set(inWrap, { y: '100%' });

        gsap.timeline({
            onComplete: () => {
                outWrap.remove();
                slotCurrent[slotIdx] = newIdx;
                animating = false;
                scheduleNext();
            }
        })
        .to(outWrap, { y: '-100%', duration: 0.6, ease: 'power2.inOut' }, 0)
        .to(inWrap,  { y: '0%',    duration: 0.6, ease: 'power2.inOut' }, 0);
    }

    function scheduleNext() {
        gsap.delayedCall(0.5 + Math.random() * 0.5, switchLogo);
    }

    ScrollTrigger.create({
        trigger: '#logos-section',
        start: 'top bottom',
        once: true,
        onEnter: () => switchLogo(),
    });
})();

// == Comparison Toggle ==
(function initComparison() {
    const stage     = document.getElementById('pills-stage');
    const toggleBtn = document.getElementById('comparison-toggle');
    if (!stage || !toggleBtn || typeof Matter === 'undefined') return;

    const { Engine, Runner, Bodies, Body, Events, Composite } = Matter;

    const PILLS = [
        { agency: 'Hoge opstartkosten',          salamander: 'Jij kiest wat je betaald',  bg: 'var(--color-orange)'     },
        { agency: 'Eigen beheer is moeilijk',    salamander: 'Eenvoudig te beheren',      bg: 'var(--color-pink)'       },
        { agency: 'Verouderd en traag',          salamander: 'In jouw branding saus',     bg: 'var(--color-periwinkle)' },
        { agency: 'Ontwikkeling duurt lang',     salamander: 'Korte doorlooptijden',      bg: 'var(--color-yellow)'     },
        { agency: 'CRM en website praten niet',  salamander: 'Naadloze integraties',      bg: 'var(--color-purple)'     },
    ];

    // Build DOM pills (off-screen until physics starts)
    const pillEls = PILLS.map(data => {
        const el = document.createElement('span');
        el.className = 'pill';
        el.textContent = data.agency;
        el.style.cssText = `background-color:${data.bg};left:-9999px;top:0`;
        stage.appendChild(el);
        return el;
    });

    let matterEngine = null, matterRunner = null, syncFn = null;
    let physicsTimeout = null, isSalamander = false;
    const pillBodies = [], bodyDims = [];

    function syncDOM() {
        pillEls.forEach((el, i) => {
            const b = pillBodies[i], d = bodyDims[i];
            if (!b || !d) return;
            el.style.left      = `${b.position.x - d.w / 2}px`;
            el.style.top       = `${b.position.y - d.h / 2}px`;
            el.style.transform = `rotate(${b.angle}rad)`;
        });
    }

    function stopPhysics() {
        if (physicsTimeout) { clearTimeout(physicsTimeout); physicsTimeout = null; }
        if (!matterEngine) return;
        if (syncFn) Events.off(matterEngine, 'afterUpdate', syncFn);
        Runner.stop(matterRunner);
        Engine.clear(matterEngine);
        pillBodies.length = 0;
        bodyDims.length   = 0;
        matterEngine = matterRunner = syncFn = null;
    }

    function startPhysics(scatter) {
        stopPhysics();
        const W = stage.offsetWidth, H = stage.offsetHeight;

        // Scale gravity and velocities to stage height so fall speed feels
        // identical regardless of viewport size (30rem × 16px base = 480px ref).
        const scale = H / 480;

        matterEngine = Engine.create({ gravity: { y: 2 * scale }, enableSleeping: true });
        matterRunner = Runner.create();

        // Invisible walls + floor
        Composite.add(matterEngine.world, [
            Bodies.rectangle(W / 2, H + 25,  W * 2, 50,   { isStatic: true, friction: 0.5, restitution: 0.2 }),
            Bodies.rectangle(-25,   H / 2,    50,    H * 2, { isStatic: true }),
            Bodies.rectangle(W + 25, H / 2,  50,    H * 2, { isStatic: true }),
        ]);

        pillEls.forEach((el, i) => {
            const w = el.offsetWidth, h = el.offsetHeight;
            bodyDims.push({ w, h });

            let x, y, vx, vy, angle, angVel;
            if (scatter) {
                // Launch from current ordered positions
                x      = parseFloat(el.style.left || 0) + w / 2;
                y      = parseFloat(el.style.top  || 0) + h / 2;
                vx     = (Math.random() - 0.5) * 16 * scale;
                vy     = -(Math.random() * 7 + 3) * scale;
                angle  = 0;
                angVel = (Math.random() - 0.5) * 0.3;
            } else {
                // Drop from above the section (not just above the stage)
                const sectionRect = document.getElementById('comparison').getBoundingClientRect();
                const stageRect   = stage.getBoundingClientRect();
                const aboveStage  = stageRect.top - sectionRect.top + h + i * (h + 30);
                x      = 80 + Math.random() * (W - 160);
                y      = -aboveStage;
                vx     = (Math.random() - 0.5) * 2 * scale;
                vy     = 0;
                angle  = Math.random() * Math.PI * 2;
                angVel = (Math.random() - 0.5) * 0.4;
            }

            const body = Bodies.rectangle(x, y, w, h, {
                restitution: 0.3, friction: 0.55,
                frictionAir: 0.015, density: 0.001, angle,
            });
            Body.setVelocity(body, { x: vx, y: vy });
            if (scatter) Body.setAngularVelocity(body, angVel);

            pillBodies.push(body);
            Composite.add(matterEngine.world, body);
        });

        syncFn = syncDOM;
        Events.on(matterEngine, 'afterUpdate', syncFn);
        Runner.run(matterRunner, matterEngine);

        // Stop runner once pills have settled (~5s)
        physicsTimeout = setTimeout(() => {
            if (matterRunner) Runner.stop(matterRunner);
        }, 5000);
    }

    function getOrderedPositions() {
        const W = stage.offsetWidth, H = stage.offsetHeight;
        const gap = 12, rowGap = 12;

        const r1w = pillEls[0].offsetWidth + gap + pillEls[1].offsetWidth;
        const r2w = pillEls[2].offsetWidth + gap + pillEls[3].offsetWidth + gap + pillEls[4].offsetWidth;

        // Fall back to single column if the widest row doesn't fit
        if (Math.max(r1w, r2w) > W) {
            const colGap = 10;
            const totalH = pillEls.reduce((sum, el) => sum + el.offsetHeight, 0) + colGap * (pillEls.length - 1);
            let y = Math.max(0, (H - totalH) / 2);
            return pillEls.map(el => {
                const pos = { x: Math.max(0, (W - el.offsetWidth) / 2), y };
                y += el.offsetHeight + colGap;
                return pos;
            });
        }

        // Two-row layout: row 1 = pills 0+1, row 2 = pills 2+3+4
        const ph = pillEls[0].offsetHeight;
        const y0 = (H - (ph * 2 + rowGap)) / 2;
        const y1 = y0 + ph + rowGap;
        return [
            { x: (W - r1w) / 2,                                                                 y: y0 },
            { x: (W - r1w) / 2 + pillEls[0].offsetWidth + gap,                                  y: y0 },
            { x: (W - r2w) / 2,                                                                  y: y1 },
            { x: (W - r2w) / 2 + pillEls[2].offsetWidth + gap,                                  y: y1 },
            { x: (W - r2w) / 2 + pillEls[2].offsetWidth + gap + pillEls[3].offsetWidth + gap,   y: y1 },
        ];
    }

    function toSalamander() {
        stopPhysics();
        pillEls.forEach(el => gsap.killTweensOf(el));
        pillEls.forEach((el, i) => { el.textContent = PILLS[i].salamander; });
        requestAnimationFrame(() => {
            const targets = getOrderedPositions();
            pillEls.forEach((el, i) => {
                gsap.to(el, {
                    left: targets[i].x, top: targets[i].y, rotation: 0,
                    duration: 0.85, delay: i * 0.07, ease: 'back.out(1.6)',
                });
            });
        });
    }

    function toAgency() {
        stopPhysics();
        pillEls.forEach(el => gsap.killTweensOf(el));
        pillEls.forEach((el, i) => { el.textContent = PILLS[i].agency; });
        gsap.delayedCall(0.05, () => startPhysics(true));
    }

    toggleBtn.addEventListener('click', () => {
        isSalamander = !isSalamander;
        toggleBtn.setAttribute('aria-checked', String(isSalamander));
        const labels = document.querySelectorAll('.comparison-toggle-label');
        labels[0].classList.toggle('is-active', !isSalamander);
        labels[1].classList.toggle('is-active',  isSalamander);
        isSalamander ? toSalamander() : toAgency();
    });

    ScrollTrigger.create({
        trigger: document.getElementById('comparison-toggle'),
        start: 'top bottom',
        once: true,
        onEnter: () => startPhysics(false),
    });
})();
