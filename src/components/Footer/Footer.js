const html = window.html || String.raw;

/**
 * Footer - Reusable site footer
 * Usage: template interpolation => ${Footer()}
 */
const Footer = () => html`
    <footer class="site-footer">
        © Gabriel Martín Moran. Todos los derechos reservados —
        <a href="LICENSE" target="_blank" rel="noopener">Licencia MIT</a>.
    </footer>
`;

export default Footer;


