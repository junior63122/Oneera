// ===== Confort mobile : clavier qui ne masque jamais un champ, zoom involontaire bloqué =====
(function () {
  const vv = window.visualViewport;
  const isPhone = () => innerWidth <= 820;
  // Le clavier réduit la zone visible : l'écran de l'app est redimensionné à cette zone (comme une app native),
  // la barre du bas et les boutons restent au-dessus du clavier, et le champ actif est ramené en vue.
  function fit() {
    if (!SCREEN || !isPhone() || !vv) return;
    const h = Math.round(vv.height), full = Math.round(innerHeight);
    const kb = full - h > 120; // clavier ouvert
    SCREEN.style.height = kb ? h + 'px' : '';
    SCREEN.classList.toggle('kbopen', kb);
    if (kb) { window.scrollTo(0, 0); reveal(); }
  }
  function reveal() {
    const a = document.activeElement; if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    requestAnimationFrame(() => { try { a.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (_) { a.scrollIntoView(); } });
  }
  if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', () => { if (SCREEN && SCREEN.classList.contains('kbopen')) window.scrollTo(0, 0); }); }
  addEventListener('resize', fit);
  document.addEventListener('focusin', (e) => { if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) setTimeout(reveal, 280); });
  document.addEventListener('focusout', () => setTimeout(fit, 120));
  // Double-tape / pincement sur l'interface (hors carte) : pas de zoom de la page.
  document.addEventListener('gesturestart', (e) => { if (!e.target.closest || !e.target.closest('#mv')) e.preventDefault(); }, { passive: false });
})();
