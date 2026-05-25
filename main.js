gsap.registerPlugin(ScrollTrigger, CustomEase);

// M0,0 C0.16,1 0.3,1 1,1 → cubic-bezier(0.16, 1, 0.3, 1)
// Fast start, very long smooth deceleration — feels premium and physical
CustomEase.create("silky", "M0,0 C0.16,1 0.3,1 1,1");

const heroSection = document.querySelector("main > section:first-child");
const heading = heroSection.querySelector("h1");
const buttons = heroSection.querySelectorAll("a[href]");

gsap.timeline({
    scrollTrigger: {
        trigger: heroSection,
        start: "top 85%",
        once: true,
    },
})
.from(heading, {
    opacity: 0,
    y: 48,
    duration: 1.1,
    ease: "silky",
})
.from(buttons, {
    opacity: 0,
    y: 28,
    duration: 0.9,
    stagger: 0.13,
    ease: "silky",
}, "<0.25");

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
        { agency: 'Ontwikkeling duurt lang',     salamander: 'Korte doorlooptijden',      bg: 'var(--color-lime)'       },
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

        matterEngine = Engine.create({ gravity: { y: 2 }, enableSleeping: true });
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
                vx     = (Math.random() - 0.5) * 16;
                vy     = -(Math.random() * 7 + 3);
                angle  = 0;
                angVel = (Math.random() - 0.5) * 0.3;
            } else {
                // Drop from above, staggered
                x      = 80 + Math.random() * (W - 160);
                y      = -h - i * (h + 30);
                vx     = (Math.random() - 0.5) * 2;
                vy     = 0;
                angle  = (Math.random() - 0.5) * 0.5;
                angVel = 0;
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
        // Row 1: pills 0 + 1  |  Row 2: pills 2 + 3 + 4
        const r1w = pillEls[0].offsetWidth + gap + pillEls[1].offsetWidth;
        const r2w = pillEls[2].offsetWidth + gap + pillEls[3].offsetWidth + gap + pillEls[4].offsetWidth;
        const ph  = pillEls[0].offsetHeight;
        const y0  = (H - (ph * 2 + rowGap)) / 2;
        const y1  = y0 + ph + rowGap;
        return [
            { x: (W - r1w) / 2,                                                                      y: y0 },
            { x: (W - r1w) / 2 + pillEls[0].offsetWidth + gap,                                       y: y0 },
            { x: (W - r2w) / 2,                                                                       y: y1 },
            { x: (W - r2w) / 2 + pillEls[2].offsetWidth + gap,                                       y: y1 },
            { x: (W - r2w) / 2 + pillEls[2].offsetWidth + gap + pillEls[3].offsetWidth + gap,        y: y1 },
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
                    duration: 0.85, delay: i * 0.07, ease: 'silky',
                });
            });
        });
    }

    function toAgency() {
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

    // Trigger physics when section scrolls into view
    new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) {
            startPhysics(false);
            obs.disconnect();
        }
    }, { threshold: 0.15 }).observe(document.getElementById('comparison'));
})();
