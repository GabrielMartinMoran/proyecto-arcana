const html = window.html || String.raw;

import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import { ensureStyle } from '../../utils/style-utils.js';
import Footer from '../../components/Footer/Footer.js';

const WelcomePage = (container) => {
    const loadStyles = () => ensureStyle('./src/pages/WelcomePage/WelcomePage.css');

    const render = () => html`<div id="layout"></div>`;

    const mount = () => {
        const layoutRoot = container.querySelector('#layout');
        const layout = LayoutWithSidebar(layoutRoot, { title: 'Bienvenido/a a Proyecto Arcana' });
        layout.init();

        const links = [
            { href: '#/player', label: 'Manual del jugador' },
            { href: '#/gm', label: 'Manual del director de juego' },
            { href: '#/cards', label: 'Galería de cartas' },
            { href: '#/characters', label: 'Mis personajes' },
            { href: '#/characters/examples', label: 'Personajes de ejemplo' },
            { href: '#/bestiary', label: 'Bestiario' },
        ];

        layout.setMainHtml(html`
            <section class="welcome">
                <div class="hero">
                    <h1 class="hero-title">ARCANA: historias épicas, reglas sencillas</h1>
                    <p class="hero-subtitle">Aprende en minutos, personaliza con cartas y juega en cualquier mundo.</p>
                    <div class="hero-actions">
                        <a class="button primary" href="#/player">Empieza a jugar</a>
                        <a class="button" href="#/characters">Crea tu personaje</a>
                    </div>
                </div>

                <h2>¿Qué es Arcana?</h2>
                <p class="lead">
                    Arcana es un sistema de rol de mesa diseñado para ser simple, adaptable y centrado en la historia.
                    Es una caja de herramientas creada para directores de juego y jugadores que buscan la libertad de
                    contar sus propias historias, en cualquier universo imaginable, sin verse frenados por reglas
                    complejas. Si valoras la narrativa, la personalización profunda y un sistema que se aparta para
                    dejar brillar tus ideas, Arcana es para ti.
                </p>

                <p class="lead">
                    En el corazón de Arcana se encuentra un innovador sistema de cartas coleccionables. Aquí, tus
                    habilidades, conjuros, talentos y rasgos de linaje no están encerrados en una clase, sino que son
                    cartas que coleccionas y combinas para crear un héroe verdaderamente único.
                </p>

                <p class="lead">
                    Arcana no es solo un conjunto de reglas, es un lienzo en blanco para tus crónicas. Reúne a tus
                    amigos, baraja tus habilidades y prepárate para forjar tu propia leyenda.
                </p>

                <h2>Empieza en 3 pasos</h2>
                <ol>
                    <li>Lee el <strong>Manual del jugador</strong> para entender cómo se juega.</li>
                    <li>Explora la <strong>Galería de cartas</strong> y elige tus favoritas para tu personaje.</li>
                    <li>Ve a <strong>Mis personajes</strong> y crea tu primera hoja de personaje.</li>
                </ol>

                <div class="quick-links">
                    ${links
                        .map(
                            (l) =>
                                html`<a class="button primary" href="${l.href}" style="text-align:center;"
                                    >${l.label}</a
                                >`
                        )
                        .join('')}
                </div>

                <h2>Para Directores de Juego</h2>
                <p>
                    En la <strong>Guía del DJ</strong> encontrarás cómo plantear dificultades, premiar el progreso y
                    diseñar encuentros emocionantes con un bestiario listo para usar.
                </p>

                <h2>Por qué te va a gustar</h2>
                <ul>
                    <li>⚡ Reglas claras y rápidas: aprende en minutos, domina jugando.</li>
                    <li>🃏 Cartas para personalizar: crea estilos únicos sin complicarte.</li>
                    <li>🌍 Listo para cualquier mundo: adapta ARCANA a tu mesa.</li>
                </ul>

                <div class="notes">
                    <p>
                        Consejo: si es tu primera vez, empieza por el Manual del jugador y, si vas a dirigir, mira la
                        Guía del DJ. El Bestiario te ayudará a preparar aventuras en un instante.
                    </p>
                </div>

                ${Footer()}
            </section>
        `);
    };

    return {
        init() {
            loadStyles();
            container.innerHTML = render();
            mount();
        },
    };
};

export default WelcomePage;
