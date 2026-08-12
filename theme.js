// ---------- theme ----------
(function initTheme(){
  const root = document.documentElement;
  const toggleBtn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (!toggleBtn) return;

  function applyTheme(theme){
    if (theme === 'dark'){
      root.setAttribute('data-theme', 'dark');
      icon.textContent = '☀️';
      label.textContent = 'Light';
    } else {
      root.removeAttribute('data-theme');
      icon.textContent = '🌙';
      label.textContent = 'Dark';
    }
  }

  let saved = null;
  try { saved = localStorage.getItem('bitfold-theme'); } catch(e){ /* storage unavailable */ }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  toggleBtn.addEventListener('click', ()=>{
    const isDark = root.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('bitfold-theme', next); } catch(e){ /* storage unavailable */ }
  });
})();
