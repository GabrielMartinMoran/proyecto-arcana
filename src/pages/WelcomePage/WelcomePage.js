const html = window.html || String.raw;

import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import { ensureStyle } from '../../utils/style-utils.js';

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

                <p class="lead">
                    ARCANA es un juego de rol ligero, adaptable y centrado en la historia. Aquí tienes todo lo
                    necesario para aprender a jugar, crear personajes y lanzarte a la aventura en minutos.
                </p>

                <h2>¿Qué es Proyecto Arcana?</h2>
                <p>
                    Un sistema narrativo con tiradas sencillas y personalización a través de cartas. Elige tus
                    talentos, poderes y rasgos, y construye héroes únicos para cualquier ambientación: fantasía,
                    misterio, ciencia ficción o lo que imagines.
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
                            (l) => html`<a class="button primary" href="${l.href}" style="text-align:center;">${l.label}</a>`
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
                        Consejo: si es tu primera vez, empieza por el Manual del jugador y, si vas a dirigir,
                        mira la Guía del DJ. El Bestiario te ayudará a preparar aventuras en un instante.
                    </p>
                </div>

                <footer class="site-footer">
                    © Gabriel Martín Moran. Todos los derechos reservados —
                    <a href="LICENSE" target="_blank" rel="noopener">Licencia MIT</a>.
                </footer>
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


