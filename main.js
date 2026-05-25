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
